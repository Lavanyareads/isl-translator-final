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

const Icon = {
  play: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" {...p}><path d="M8 5v14l11-7z" /></svg>,
  stop: (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" {...p}><rect x="6" y="6" width="12" height="12" rx="2" /></svg>,
  sun: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>,
  moon: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" {...p}><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" /></svg>,
  speaker: (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" {...p}><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M17 8a5 5 0 010 8" /></svg>,
  translate: (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 6h7M7.5 4v2.5S7 11 3 13" /><path d="M11 13s-1.8-1-3-3M14 20l4-9 4 9M15.5 17h5" /></svg>,
  trash: (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13" /></svg>,
  send: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" {...p}><path d="M3 11l18-8-8 18-2-8-8-2z" /></svg>,
  camera: (p) => <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><rect x="3" y="7" width="18" height="13" rx="2.5" /><path d="M8 7l1.6-3h4.8L16 7" /><circle cx="12" cy="13.5" r="3.2" /></svg>,
  mark: (p) => <svg viewBox="0 0 32 32" width="32" height="32" fill="none" {...p}><circle cx="16" cy="16" r="14" stroke="currentColor" strokeOpacity=".3" strokeWidth="1.5" /><path d="M9.5 21c1.8-6.2 3.8-9.3 6.5-9.3s4.7 3.1 6.5 9.3" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" /><circle cx="16" cy="9.4" r="2.4" fill="currentColor" /></svg>,
  arrowDown: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="M12 5v14M5 12l7 7 7-7" /></svg>,
  sparkle: (p) => <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" {...p}><path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5L12 2zM6 19l.75 2.25L9 22l-2.25.75L6 25l-.75-2.25L3 22l2.25-.75L6 19z" opacity=".6" /></svg>,
}

function App() {
  const videoRef = useRef(null)
  const landmarkerRef = useRef(null)
  const classifierInFlight = useRef(false)
  const lastClassificationAt = useRef(0)
  const recognizer = useRef({ buffer: [], previous: null, count: 0, lastAdded: '' })
  const stateRef = useRef({ mode: 'learning', word: '', buffer: '', lastHand: Date.now(), wordCommitted: true, messageSent: true })
  
  // Restored default mode to 'learning'
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
  const [lastReply, setLastReply] = useState({ text: '', marathi: '' })
  const [notice, setNotice] = useState('')
  const [signConfirmed, setSignConfirmed] = useState(false)

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
      
      // Normalized data model: maps cleaned -> text so both English & Marathi appear
      setChat(items => [...items, { 
        sender: 'isl', 
        text: message.cleaned || message.text || '',
        marathi: message.marathi || '', 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      }])
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
        setSignConfirmed(true)
        setTimeout(() => setSignConfirmed(false), 400)
      }
    } catch { setNotice('Hand landmarks are running locally, but the legacy classifier API is unavailable.') }
    finally { classifierInFlight.current = false }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
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
    const text = reply.trim(); setReply('')
    let marathi = ''
    try { 
      const response = await fetch(`${API}/translate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
      const data = await response.json()
      marathi = data.marathi || ''
    } catch {}
    
    setLastReply({ text, marathi })
    
    setChat(items => [...items, { 
      sender: 'you', 
      text, 
      marathi, 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    }])
  }
  
  const switchMode = (next) => { 
    stopCamera(); resetCapture(); setMode(next); setLastReply({ text: '', marathi: '' }); 
    stateRef.current = { ...stateRef.current, mode: next, lastHand: Date.now(), wordCommitted: true, messageSent: true } 
  }
  
  const elapsed = running && mode === 'conversation' ? ((Date.now() - stateRef.current.lastHand) / 1000).toFixed(1) : '0.0'

  return (
    <div className="app">
      <header>
        <div className="brand">
          <span className="brand-mark"><Icon.mark /></span>
          <div className="brand-text">
            <h1 className="brand-wordmark">S-स्पर्श</h1>
            <p className="brand-tagline">Indian Sign Language <span className="sep">·</span> Sign → Speech</p>
          </div>
        </div>

        <div className="mode-switch" role="tablist" aria-label="Mode">
          <button role="tab" aria-selected={mode === 'learning'} className={mode === 'learning' ? 'active' : ''} onClick={() => switchMode('learning')}>Learning</button>
          <button role="tab" aria-selected={mode === 'conversation'} className={mode === 'conversation' ? 'active' : ''} onClick={() => switchMode('conversation')}>Conversation</button>
          <span className="mode-thumb" style={{ transform: mode === 'learning' ? 'translateX(0%)' : 'translateX(100%)' }} />
        </div>

        <div className="header-controls">
          <div className={`status-pill ${running ? 'live' : health.modelReady ? 'ready' : 'warn'}`} title={health.modelError || ''}>
            <span className="status-dot" />
            <span className="status-label">{running ? 'Live' : health.modelReady ? 'Ready' : 'Offline'}</span>
          </div>
          <button className="theme-toggle" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setDark(!dark)}>
            {dark ? <Icon.sun /> : <Icon.moon />}
          </button>
        </div>
      </header>

      {notice && (
        <div className="notice" role="status">
          <span className="notice-dot" />
          {notice}
        </div>
      )}

      <main>
        <section className={`workspace ${mode}`}>
          <div className="camera-stage">
            <div className={`camera-container ${mode === 'conversation' ? 'compact' : ''}`}>
              <video ref={videoRef} className={running ? '' : 'camera-video-hidden'} muted playsInline />
              {!running ? (
                <div className="camera-placeholder">
                  <div className="placeholder-ambient" />
                  <div className="placeholder-content">
                    <Icon.camera />
                    <h3>{mode === 'learning' ? 'Ready to Sign' : 'Ready to Communicate'}</h3>
                    <p>{mode === 'learning' ? 'Position your hands inside the frame and begin signing.' : 'Start the camera to begin your ISL conversation.'}</p>
                    <button className="btn-primary" onClick={startCamera}><Icon.play /> Start Camera</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="camera-overlay">
                    <span className="live-indicator"><i />Live</span>
                    <button className="btn-stop" aria-label="Stop camera" onClick={stopCamera}><Icon.stop /></button>
                  </div>
                  <div className="scan-beam" />
                  <div className={`recognition-panel ${signConfirmed ? 'confirmed' : ''}`}>
                    <div className="recognition-display">
                      <span className="recognition-letter">{prediction}</span>
                      <div className="recognition-label">{prediction === '·' ? 'No hand' : 'Detected'}</div>
                    </div>
                    <div className="recognition-metrics">
                      <div className="metric-row">
                        <span>Confidence</span>
                        <b>{confidence}%</b>
                      </div>
                      <div className="progress-bar"><i style={{ width: `${confidence}%` }} /></div>
                      <div className="metric-row">
                        <span>Hold to confirm</span>
                        <b>{hold >= 100 ? 'Done' : `${hold}%`}</b>
                      </div>
                      <div className={`progress-bar hold ${hold >= 100 ? 'complete' : ''}`}><i style={{ width: `${hold}%` }} /></div>
                    </div>
                  </div>
                </>
              )}
              <div className="camera-corners">
                <i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />
              </div>
            </div>

            {mode === 'conversation' && (
              <div className="camera-controls">
                <div className="timing-controls">
                  <label>
                    <span>Word pause</span>
                    <div className="range-group">
                      <input type="range" min="0.5" max="3" step="0.1" value={wordPause} onChange={e => setWordPause(+e.target.value)} />
                      <b>{wordPause.toFixed(1)}s</b>
                    </div>
                  </label>
                  <label>
                    <span>Message pause</span>
                    <div className="range-group">
                      <input type="range" min="3" max="10" step="0.5" value={messagePause} onChange={e => setMessagePause(+e.target.value)} />
                      <b>{messagePause.toFixed(1)}s</b>
                    </div>
                  </label>
                </div>
                <div className="status-chips">
                  <div className="chip">
                    <span className="chip-dot" />
                    <span>Detecting: <b>{prediction}</b></span>
                  </div>
                  <div className="chip">
                    <span>Building: <b>{currentWord || '—'}</b></span>
                  </div>
                  <div className="chip dim">
                    <span>No hand: {elapsed}s</span>
                  </div>
                </div>
              </div>
            )}

            {mode === 'learning' && (
              <p className="camera-hint">Sign SPACE, COMMA or FULLSTOP to punctuate your sentence.</p>
            )}
          </div>

          {mode === 'learning' ? (
            <Learning
              sentence={sentence} word={currentWord} lastAdded={lastAdded}
              output={output} stats={stats} translate={translate} resetCapture={resetCapture}
            />
          ) : (
            <Conversation
              chat={chat} reply={reply} setReply={setReply} sendReply={sendReply} lastReply={lastReply}
              resetChat={() => { setChat([]); resetCapture(); setLastReply({ text: '', marathi: '' }) }}
              startCamera={startCamera}
              running={running}
            />
          )}
        </section>
      </main>
    </div>
  )
}

function Learning({ sentence, word, lastAdded, output, stats, translate, resetCapture }) {
  return (
    <div className="learning-panel">
      <div className="transcript-section">
        <div className="section-header">
          <Icon.arrowDown />
          <span>Your signed message</span>
        </div>
        <div className="transcript-display">
          {(sentence || word) ? (
            <div className="transcript-text">
              {sentence.split('').map((char, i) => (
                char === ' '
                  ? <span key={`s-${i}`} className="space" />
                  : <span key={`s-${i}`} className="settled">{char}</span>
              ))}
              {word.split('').map((char, i) => (
                <span key={`w-${i}`} className="live">{char}</span>
              ))}
            </div>
          ) : (
            <div className="transcript-empty">Waiting for your first sign…</div>
          )}
        </div>
      </div>

      <div className="translation-section">
        <div className="translation-header">
          <button className="btn-primary" onClick={translate}>
            <Icon.translate /> Translate
          </button>
          <div className="translation-actions">
            {output.cleaned && (
              <>
                <button className="btn-ghost" onClick={() => speak(output.cleaned, 'en-US')}>
                  <Icon.speaker /> English
                </button>
                <button className="btn-ghost" onClick={() => speak(output.marathi, 'mr-IN')}>
                  <Icon.speaker /> मराठी
                </button>
              </>
            )}
            <button className="btn-ghost danger" onClick={resetCapture}>
              <Icon.trash /> Clear
            </button>
          </div>
        </div>

        <div className="translation-output">
          <div className="lang-output">
            <label>English</label>
            <p className={output.cleaned ? 'has-content' : ''}>{output.cleaned || 'Your translation will appear here.'}</p>
          </div>
          <div className="output-divider" />
          <div className="lang-output marathi">
            <label>मराठी</label>
            <p className={output.marathi ? 'has-content' : ''}>{output.marathi || 'मराठी भाषांतर येथे दिसेल.'}</p>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <div className="stat">
          <span className="stat-value">{stats.signs}</span>
          <span className="stat-label">Signs detected</span>
        </div>
        <div className="stat-divider" />
        <div className="stat">
          <span className="stat-value">{stats.words}</span>
          <span className="stat-label">Words formed</span>
        </div>
        <div className="stat-divider" />
        <div className="stat">
          <span className="stat-value">{lastAdded || '—'}</span>
          <span className="stat-label">Last confirmed</span>
        </div>
        <div className="stat-divider" />
        <div className="stat">
          {/* FIXED: Changed `currentWord` to `word` so Learning Mode renders without crashing */}
          <span className="stat-value">{word || '—'}</span>
          <span className="stat-label">Current word</span>
        </div>
      </div>
    </div>
  )
}

function Conversation({ chat, reply, setReply, sendReply, lastReply, resetChat, startCamera, running }) {
  const scrollRef = useRef(null)
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [chat])

  return (
    <div className="conversation-panel">
      <div className="signer-display" aria-live="polite">
        {lastReply.text ? (
          <div className="signer-content" key={lastReply.text}>
            <label>Show this to the signer</label>
            <div className="signer-primary">{lastReply.text}</div>
            {lastReply.marathi && <div className="signer-secondary">{lastReply.marathi}</div>}
          </div>
        ) : (
          <div className="signer-empty">
            <p>Your typed replies will appear here, large enough to show the person you're signing with.</p>
          </div>
        )}
      </div>

      <div className="chat-container">
        <div className="chat-header">
          <span className="chat-title">Conversation</span>
          {chat.length > 0 && <button className="btn-clear" onClick={resetChat}><Icon.trash /> Clear</button>}
        </div>
        <div className="chat-messages" ref={scrollRef}>
          {chat.length ? chat.map((message, i) => (
            <div key={i} className={`message ${message.sender}`}>
              <div className="message-header">
                <span className="message-sender">{message.sender === 'you' ? 'YOU' : 'ISL'}</span>
                <span className="message-time">{message.time}</span>
              </div>
              <div className="message-bubble">
                <div className="message-text">{message.text}</div>
                {message.marathi && <div className="message-marathi">{message.marathi}</div>}
              </div>
            </div>
          )) : (
            <div className="chat-empty">
              <div className="empty-glow" />
              <Icon.sparkle />
              <h3>Start a Conversation</h3>
              <p>Sign naturally in front of the camera. S-स्पर्श will recognize your signs, translate them, and build the conversation.</p>
              {!running && <button className="btn-primary" onClick={startCamera}><Icon.play /> Start Camera</button>}
            </div>
          )}
        </div>
        <form onSubmit={sendReply} className="chat-composer">
          <input value={reply} onChange={e => setReply(e.target.value)} placeholder="Type a reply…" aria-label="Type a reply" />
          <button type="submit" aria-label="Send reply"><Icon.send /></button>
        </form>
      </div>
    </div>
  )
}

export default App