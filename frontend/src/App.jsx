import { useEffect, useRef, useState } from 'react'
import { BrowserHandLandmarker } from './lib/browserHandLandmarker'
import { isWordSign } from './config/signs'

const API = '/api'
const SPECIAL = { SPACE: ' ', COMMA: ',', FULLSTOP: '.' }
const ignoredInConversation = new Set(Object.keys(SPECIAL))
const CONSENSUS_PREDICTIONS = 2

function speak(text, lang) {
  if (!text) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.rate = 0.95
  window.speechSynthesis.speak(utterance)
}

function App() {
  const videoRef = useRef(null)
  const landmarkerRef = useRef(null)
  const classifierInFlight = useRef(false)
  const lastClassificationAt = useRef(0)
  const recognizer = useRef({ buffer: [], previous: null, count: 0, lastAdded: '' })
  const stateRef = useRef({ mode: 'learning', word: '', buffer: '', lastHand: Date.now(), wordCommitted: true, messageSent: true })
  const [mode, setMode] = useState('learning')
  const [dark, setDark] = useState(true)
  const [running, setRunning] = useState(false)
  const [health, setHealth] = useState({ modelReady: true })
  const [prediction, setPrediction] = useState('·')
  const [confidence, setConfidence] = useState(0)
  const [hold, setHold] = useState(0)
  const [sentence, setSentence] = useState('')
  const [currentWord, setCurrentWord] = useState('')
  const [lastAdded, setLastAdded] = useState('')
  const [output, setOutput] = useState({ cleaned: '', marathi: '' })
  const [stats, setStats] = useState({ signs: 0, words: 0 })
  const [wordPause, setWordPause] = useState(1.5)
  const [messagePause, setMessagePause] = useState(6)
  const [chat, setChat] = useState([])
  const [reply, setReply] = useState('')
  const [lastReply, setLastReply] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light' }, [dark])
  useEffect(() => { fetch(`${API}/health`).then(r => r.json()).then(setHealth).catch(() => setHealth({ modelReady: false, modelError: 'API server is not running.' })) }, [])
  useEffect(() => { stateRef.current.mode = mode }, [mode])
  useEffect(() => { stateRef.current.word = currentWord }, [currentWord])
  useEffect(() => { stateRef.current.buffer = sentence }, [sentence])

  const resetCapture = () => {
    recognizer.current = { buffer: [], previous: null, count: 0, lastAdded: '' }
    setSentence(''); setCurrentWord(''); setLastAdded(''); setOutput({ cleaned: '', marathi: '' }); setStats({ signs: 0, words: 0 })
  }

  const stopCamera = () => {
    landmarkerRef.current?.stop()
    videoRef.current?.srcObject?.getTracks().forEach(track => track.stop())
    setRunning(false)
  }

  const addConfirmedSign = (letter) => {
    const capture = stateRef.current
    if (capture.mode === 'conversation') {
      if (isWordSign(letter)) {
        setSentence(value => value + letter + ' ')
      } else if (!ignoredInConversation.has(letter)) setCurrentWord(value => value + letter)
      return
    }
    setStats(value => ({ ...value, signs: value.signs + 1 }))
    if (SPECIAL[letter]) {
      const mark = SPECIAL[letter]
      if (mark === ' ') {
        if (capture.word) {
          setSentence(value => value + capture.word + ' ')
          setCurrentWord('')
          setStats(value => ({ ...value, words: value.words + 1 }))
        }
      } else {
        if (capture.word) {
          setSentence(value => value + capture.word + mark + ' ')
          setCurrentWord('')
          setStats(value => ({ ...value, words: value.words + 1 }))
        } else setSentence(value => value + mark + ' ')
      }
    } else setCurrentWord(value => value + letter)
  }

  const finalizeConversation = async (raw) => {
    try {
      const response = await fetch(`${API}/translate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: raw }) })
      const message = await response.json()
      setChat(items => [...items, { sender: 'isl', ...message, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])
    } catch { setNotice('Could not finalize the signed message. Check the API server.') }
  }

  const handleNoHand = () => {
    recognizer.current = { ...recognizer.current, buffer: [], previous: null, count: 0, lastAdded: '' }
    setPrediction('·'); setHold(0); setConfidence(0); setLastAdded('')
    const c = stateRef.current; const elapsed = (Date.now() - c.lastHand) / 1000
    if (c.mode === 'conversation') {
      if (elapsed >= wordPause && !c.wordCommitted && c.word) {
        setSentence(value => value + c.word + ' '); setCurrentWord('')
        stateRef.current.wordCommitted = true
      }
      if (elapsed >= messagePause && !c.messageSent && stateRef.current.buffer.trim()) {
        const raw = stateRef.current.buffer.trim(); setSentence('')
        stateRef.current.buffer = ''; stateRef.current.messageSent = true
        finalizeConversation(raw)
      }
    }
  }

  // The landmark callback runs outside React. Only classifier results update UI,
  // and they are throttled; the camera/video element never rerenders per frame.
  const handleLandmarkFrame = async (frame) => {
    if (!frame.leftPresent && !frame.rightPresent) return handleNoHand()
    const c = stateRef.current
    c.lastHand = Date.now(); c.wordCommitted = false; c.messageSent = false
    if (classifierInFlight.current || performance.now() - lastClassificationAt.current < 180) return
    const classifierInput = frame.rightPresent ? frame.rightRaw : frame.leftRaw
    classifierInFlight.current = true; lastClassificationAt.current = performance.now()
    try {
      const browserFeatures = [...frame.leftHand, ...frame.rightHand, Number(frame.leftPresent), Number(frame.rightPresent)]
      let response = await fetch(`${API}/classify-browser-static`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: browserFeatures }),
      })
      // Until the browser-trained model exists, retain the old model as a
      // compatibility fallback. Neither route ever receives a camera image.
      if (!response.ok) {
        response = await fetch(`${API}/classify-landmarks`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ landmarks: Array.from(classifierInput) }),
        })
      }
      if (!response.ok) throw new Error('Classifier unavailable')
      const result = await response.json()
      const r = recognizer.current
      r.buffer = [...r.buffer, result.prediction].slice(-5)
      const letter = [...r.buffer].sort((a, b) => r.buffer.filter(x => x === b).length - r.buffer.filter(x => x === a).length)[0]
      r.count = letter === r.previous ? r.count + 1 : 0; r.previous = letter
      setPrediction(letter); setConfidence(result.confidence); setHold(Math.min(100, Math.round(r.count / 20 * 100)))
      const requiredConsensus = c.mode === 'conversation' ? CONSENSUS_PREDICTIONS : 20
      if (r.count >= requiredConsensus && r.lastAdded !== letter) {
        r.lastAdded = letter; setLastAdded(letter); addConfirmedSign(letter)
      }
    } catch { setNotice('Hand landmarks are running locally, but the legacy classifier API is unavailable.') }
    finally { classifierInFlight.current = false }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      // The video element is always mounted, so this works before React has
      // rendered the "running" visual state.
      videoRef.current.srcObject = stream; await videoRef.current.play()
      stateRef.current.lastHand = Date.now(); setRunning(true); setNotice('')
      landmarkerRef.current ??= new BrowserHandLandmarker({
        onFrame: handleLandmarkFrame,
        onStatus: ({ state, message }) => {
          if (state === 'error') setNotice(`Browser MediaPipe error: ${message}`)
        },
      })
      landmarkerRef.current.start(videoRef.current)
    } catch (error) {
      videoRef.current?.srcObject?.getTracks().forEach(track => track.stop())
      const message = error instanceof Error ? error.message : String(error)
      setNotice(`Could not start the camera: ${message}`)
    }
  }
  useEffect(() => () => { stopCamera(); landmarkerRef.current?.destroy() }, [])

  const translate = async () => {
    const raw = `${sentence}${currentWord}`.trim()
    if (!raw) return setNotice('Nothing to translate yet.')
    setNotice('Translating…')
    try {
      const response = await fetch(`${API}/translate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: raw }) })
      setOutput(await response.json()); setNotice('')
    } catch { setNotice('Translation failed. Check the API server and GROQ_API_KEY.') }
  }
  const sendReply = async (event) => {
    event.preventDefault(); if (!reply.trim()) return
    const text = reply.trim(); setReply(''); setLastReply(text)
    let marathi = ''
    try { marathi = (await (await fetch(`${API}/translate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })).json()).marathi } catch {}
    setChat(items => [...items, { sender: 'you', text, marathi, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])
  }
  const switchMode = (next) => { stopCamera(); resetCapture(); setMode(next); stateRef.current = { ...stateRef.current, mode: next, lastHand: Date.now(), wordCommitted: true, messageSent: true } }
  const elapsed = running && mode === 'conversation' ? ((Date.now() - stateRef.current.lastHand) / 1000).toFixed(1) : '0.0'

  return <div className="app">
    <header><div className="brand"><span className="logo">🤟</span><div><h1>S-स्पर्श</h1><p>Indian Sign Language · Real-time AI Translation</p></div></div><div className="pills"><span className="pill live">● {mode === 'learning' ? 'Learning Mode' : 'Conversation Mode'}</span><span className="pill">MediaPipe · Groq</span></div></header>
    <aside><label className="section">Mode</label><button className={mode === 'learning' ? 'selected' : ''} onClick={() => switchMode('learning')}>🎓 Learning Mode</button><button className={mode === 'conversation' ? 'selected' : ''} onClick={() => switchMode('conversation')}>💬 Conversation Mode</button><p className="hint">{mode === 'learning' ? 'Use SPACE, COMMA and FULLSTOP signs to build your sentence.' : 'Pause between words. A longer pause sends the signed message.'}</p><label className="section">Display</label><button onClick={() => setDark(!dark)}>{dark ? '☀️ Light mode' : '🌙 Dark mode'}</button><label className="section">Camera</label><button className={running ? 'danger' : 'primary'} onClick={running ? stopCamera : startCamera}>{running ? '■ Stop camera' : '▶ Start camera'}</button>
    {mode === 'learning' ? <><label className="section">Actions</label><button className="primary" onClick={translate}>⚡ Translate</button><label className="section">Voice output</label><button onClick={() => speak(output.cleaned, 'en-US')}>🔊 Speak English</button><button onClick={() => speak(output.marathi, 'mr-IN')}>🔊 मराठी ऐका</button><button className="danger" onClick={resetCapture}>✕ Clear session</button></> : <><label className="section">Timing</label><label className="range">Word pause: {wordPause.toFixed(1)}s<input type="range" min="0.5" max="3" step="0.1" value={wordPause} onChange={e => setWordPause(+e.target.value)} /></label><label className="range">Message pause: {messagePause.toFixed(1)}s<input type="range" min="3" max="10" step="0.5" value={messagePause} onChange={e => setMessagePause(+e.target.value)} /></label><button className="danger" onClick={() => { setChat([]); resetCapture() }}>🗑 Clear chat</button></>}</aside>
    <main>{notice && <div className="notice">{notice}</div>}<section className="feed"><div className="camera"><video ref={videoRef} className={running ? '' : 'camera-video-hidden'} muted playsInline />{!running && <div className="placeholder"><b>{mode === 'learning' ? '🤟' : '💬'}</b><span>Start the camera to begin</span></div>}<i className="corner one"/><i className="corner two"/><i className="corner three"/><i className="corner four"/></div>{mode === 'learning' ? <Learning sentence={sentence} word={currentWord} prediction={prediction} hold={hold} confidence={confidence} lastAdded={lastAdded} output={output} stats={stats} /> : <Conversation chat={chat} reply={reply} setReply={setReply} sendReply={sendReply} lastReply={lastReply} prediction={prediction} word={currentWord} elapsed={elapsed} wordPause={wordPause} messagePause={messagePause} />}</section></main>
  </div>
}

function Learning({ sentence, word, prediction, hold, confidence, lastAdded, output, stats }) { return <div className="learning"><div className="metric"><span>Confidence</span><div><i style={{ width: `${confidence}%` }} /></div><b>{confidence}%</b></div><div className="hold"><strong>{prediction}</strong><div><span>Hold to register · {hold}%</span><div><i style={{ width: `${hold}%` }} /></div></div></div><div className="cards"><Card label="Current word" value={word || '…'} /><Card label="Last added sign" value={lastAdded || '…'} violet /></div><Card label="Raw capture" value={<div className="chips">{[...sentence, ...word].map((char, i) => char === ' ' ? <span key={i} className="gap"/> : <span key={i} className={i < sentence.length ? 'done' : ''}>{char}</span>)}{!sentence && !word && <em>Waiting for input…</em>}</div>} /><div className="output"><Card label="English" value={output.cleaned || 'Translate via the sidebar →'} /><Card label="मराठी" value={output.marathi || 'मराठी भाषांतर येथे दिसेल'} /></div><div className="stats"><Card label="Signs detected" value={stats.signs} /><Card label="Words formed" value={stats.words} /></div></div> }
function Conversation({ chat, reply, setReply, sendReply, lastReply, prediction, word, elapsed, wordPause, messagePause }) { return <div className="conversation"><div className="signer">{lastReply ? <><small>📱 Show this to the signer</small><strong>{lastReply}</strong></> : 'Your typed replies will appear here large enough to show the signer.'}</div><div className="cards"><Card label="Detecting" value={prediction} /><Card label="Building word" value={word || '…'} violet /></div><p className="pause">No hand for {elapsed}s · word at {wordPause.toFixed(1)}s · message at {messagePause.toFixed(1)}s</p><div className="chat"><label>Conversation</label>{chat.length ? chat.map((message, i) => <div key={i} className={`message ${message.sender}`}><small>{message.sender === 'you' ? 'You' : 'ISL'} · {message.time}</small><div>{message.text}{message.marathi && <span>{message.marathi}</span>}</div></div>) : <em>Signed and typed messages will appear here.</em>}<form onSubmit={sendReply}><input value={reply} onChange={e => setReply(e.target.value)} placeholder="Type a reply…"/><button>Send →</button></form></div></div> }
function Card({ label, value, violet }) { return <div className={`card ${violet ? 'violet' : ''}`}><small>{label}</small><div>{value}</div></div> }
export default App
