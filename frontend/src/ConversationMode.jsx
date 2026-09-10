import { useEffect, useRef, useState } from 'react'
import { BrowserHandLandmarker } from './lib/browserHandLandmarker'
import { isWordSign } from './config/signs'

const API = '/api'
const ignoredInConversation = new Set(['SPACE', 'COMMA', 'FULLSTOP'])
// Conversation must favour a deliberate, stable sign over rapid guesses.
const STATIC_MIN_CONFIDENCE = 75
const STATIC_CONSENSUS_PREDICTIONS = 4
const DYNAMIC_MIN_CONFIDENCE = 85
const DYNAMIC_STABLE_PREDICTIONS = 3

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17]
]

function ConversationMode({ onBack }) {
  const videoRef = useRef(null)
  const overlayRef = useRef(null)
  const landmarkerRef = useRef(null)

  const classifierInFlight = useRef(false)
  const lastClassificationAt = useRef(0)
  const dynamicEnabledRef = useRef(false)

  const dynamicRecognizer = useRef({
    buffer: [],
    lastAdded: '',
    wasLocked: false,
    cooldownUntil: 0
  })

  const recognizer = useRef({
    buffer: [],
    previous: null,
    count: 0,
    lastAdded: ''
  })

  const stateRef = useRef({
    word: '',
    buffer: '',
    lastHand: Date.now(),
    wordCommitted: true,
    messageSent: true
  })

  const [dark, setDark] = useState(true)
  const [running, setRunning] = useState(false)
  const [prediction, setPrediction] = useState('·')
  const [confidence, setConfidence] = useState(0)

  const [sentence, setSentence] = useState('')
  const [currentWord, setCurrentWord] = useState('')

  const [wordPause, setWordPause] = useState(1.5)
  const [messagePause, setMessagePause] = useState(6)

  const [chat, setChat] = useState([])
  const [reply, setReply] = useState('')
  const [lastReply, setLastReply] = useState('')

  const [notice, setNotice] = useState('')
  const [dynamicReady, setDynamicReady] = useState(false)
  const [dynamicEnabled, setDynamicEnabled] = useState(false)
  const [staticReady, setStaticReady] = useState(false)
  const [facingMode, setFacingMode] = useState('user')
  const [canSwitchCamera, setCanSwitchCamera] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  }, [dark])

  useEffect(() => {
    stateRef.current.word = currentWord
  }, [currentWord])

  useEffect(() => {
    stateRef.current.buffer = sentence
  }, [sentence])

  useEffect(() => {
    dynamicEnabledRef.current = dynamicEnabled
  }, [dynamicEnabled])

  const drawSkeletons = (frame) => {
    const canvas = overlayRef.current
    const video = videoRef.current

    if (!canvas || !video) return

    const width = video.videoWidth
    const height = video.videoHeight

    if (!width || !height) return

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }

    const context = canvas.getContext('2d')
    context.clearRect(0, 0, width, height)

    const drawHand = (values, present, colour) => {
      if (!present) return

      context.strokeStyle = colour
      context.fillStyle = '#ffffff'
      context.lineWidth = Math.max(2, width / 450)

      context.beginPath()

      HAND_CONNECTIONS.forEach(([from, to]) => {
        context.moveTo(
          values[from * 3] * width,
          values[from * 3 + 1] * height
        )

        context.lineTo(
          values[to * 3] * width,
          values[to * 3 + 1] * height
        )
      })

      context.stroke()

      for (let i = 0; i < 21; i += 1) {
        context.beginPath()

        context.arc(
          values[i * 3] * width,
          values[i * 3 + 1] * height,
          Math.max(3, width / 220),
          0,
          Math.PI * 2
        )

        context.fill()
      }
    }

    drawHand(frame.leftRaw, frame.leftPresent, '#60a5fa')
    drawHand(frame.rightRaw, frame.rightPresent, '#c084fc')
  }

  const resetCapture = () => {
    recognizer.current = {
      buffer: [],
      previous: null,
      count: 0,
      lastAdded: ''
    }

    setSentence('')
    setCurrentWord('')
  }

  const stopCamera = () => {
    landmarkerRef.current?.stop()

    videoRef.current?.srcObject
      ?.getTracks()
      .forEach(track => track.stop())

    setRunning(false)
  }

  const updateCameraSwitchAvailability = async (stream) => {
    const facingModes = stream?.getVideoTracks?.()[0]
      ?.getCapabilities?.().facingMode || []

    if (facingModes.includes('user') && facingModes.includes('environment')) {
      setCanSwitchCamera(true)
      return
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      setCanSwitchCamera(
        devices.filter(device => device.kind === 'videoinput').length > 1
      )
    } catch {
      setCanSwitchCamera(false)
    }
  }

  const addConfirmedSign = (letter) => {
    const capture = stateRef.current

    if (isWordSign(letter)) {
      const nextSentence = `${capture.buffer}${letter} `
      capture.buffer = nextSentence
      setSentence(nextSentence)
    } else if (!ignoredInConversation.has(letter)) {
      const nextWord = `${capture.word}${letter}`
      capture.word = nextWord
      setCurrentWord(nextWord)
    }
  }

  // Dynamic recognition is triggered while the hand is still in view. Commit
  // any preceding fingerspelled word first so "I" then "EXCITED" preserves
  // the order in which the signer performed them.
  const flushPendingStaticWord = () => {
    const capture = stateRef.current
    const word = capture.word.trim()
    if (!word) return

    const nextSentence = `${capture.buffer}${word} `
    capture.word = ''
    capture.buffer = nextSentence
    capture.wordCommitted = true
    setCurrentWord('')
    setSentence(nextSentence)
  }

  const finalizeConversation = async (raw) => {
    try {
      const response = await fetch(`${API}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: raw
        })
      })

      const message = await response.json()

      setChat(items => [
        ...items,
        {
          sender: 'isl',
          text: message.cleaned || raw,
          marathi: message.marathi || '',
          time: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })
        }
      ])
    } catch {
      setNotice(
        'Could not finalize the signed message. Check the API server.'
      )
    }
  }

  const handleNoHand = () => {
    dynamicRecognizer.current = {
      buffer: [],
      lastAdded: '',
      wasLocked: false,
      cooldownUntil: 0
    }

    const canvas = overlayRef.current

    canvas
      ?.getContext('2d')
      ?.clearRect(0, 0, canvas.width, canvas.height)

    recognizer.current = {
      ...recognizer.current,
      buffer: [],
      previous: null,
      count: 0,
      lastAdded: ''
    }

    setPrediction('·')
    setConfidence(0)

    const c = stateRef.current
    const elapsed = (Date.now() - c.lastHand) / 1000

    if (elapsed >= wordPause && !c.wordCommitted && c.word) {
      setSentence(value => value + c.word + ' ')
      setCurrentWord('')

      stateRef.current.wordCommitted = true
    }

    if (
      elapsed >= messagePause &&
      !c.messageSent &&
      stateRef.current.buffer.trim()
    ) {
      const raw = stateRef.current.buffer.trim()

      setSentence('')
      stateRef.current.buffer = ''
      stateRef.current.messageSent = true

      finalizeConversation(raw)
    }
  }

  const handleLandmarkFrame = async (frame) => {
    drawSkeletons(frame)

    if (!frame.leftPresent && !frame.rightPresent) {
      return handleNoHand()
    }

    const c = stateRef.current

    c.lastHand = Date.now()
    c.wordCommitted = false
    c.messageSent = false

    const dynamic = dynamicRecognizer.current
    const dynamicActive = dynamicEnabledRef.current
    const dynamicLocked = dynamicActive && frame.dynamicLock

    if (dynamic.wasLocked && !dynamicLocked) {
      dynamic.cooldownUntil = Date.now() + 600
      dynamic.buffer = []
      dynamic.lastAdded = ''
    }

    if (!dynamic.wasLocked && dynamicLocked) {
      dynamic.buffer = []
      dynamic.lastAdded = ''
    }

    dynamic.wasLocked = dynamicLocked

    if (dynamicActive && frame.dynamicPrediction) {
      if (
        dynamicLocked &&
        Date.now() >= dynamic.cooldownUntil &&
        frame.dynamicWindowReady &&
        frame.dynamicPrediction.confidence >= DYNAMIC_MIN_CONFIDENCE
      ) {
        const label = frame.dynamicPrediction.label

        dynamic.buffer = [
          ...dynamic.buffer,
          label
        ].slice(-DYNAMIC_STABLE_PREDICTIONS)

        const stable =
          dynamic.buffer.length === DYNAMIC_STABLE_PREDICTIONS &&
          dynamic.buffer.every(item => item === label)

        setPrediction(label)
        setConfidence(frame.dynamicPrediction.confidence)

        if (
          stable &&
          dynamic.lastAdded !== label &&
          label !== 'IDLE' &&
          label !== 'NO_SIGN'
        ) {
          dynamic.lastAdded = label
          flushPendingStaticWord()
          const nextSentence = `${stateRef.current.buffer}${label} `
          stateRef.current.buffer = nextSentence
          setSentence(nextSentence)
        }

        return
      }

      if (dynamicLocked) {
        dynamic.buffer = []
      }
    }

    if (dynamicLocked) {
      setPrediction('…')
      setConfidence(0)
      return
    }

    if (
      classifierInFlight.current ||
      performance.now() - lastClassificationAt.current < 180
    ) {
      return
    }

    classifierInFlight.current = true
    lastClassificationAt.current = performance.now()

    try {
      let result = frame.staticPrediction

      if (!result) {
        const browserFeatures = [
          ...frame.leftHand,
          ...frame.rightHand,
          Number(frame.leftPresent),
          Number(frame.rightPresent)
        ]

        const response = await fetch(
          `${API}/classify-browser-static`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              features: browserFeatures
            })
          }
        )

        if (!response.ok) {
          throw new Error('Classifier unavailable')
        }

        result = await response.json()
      }

      const r = recognizer.current

      if (result.confidence < STATIC_MIN_CONFIDENCE) {
        r.buffer = []
        r.previous = null
        r.count = 0
        setPrediction('…')
        setConfidence(result.confidence)
        return
      }

      r.buffer = [...r.buffer, result.prediction].slice(-5)

      const letter = [...r.buffer].sort(
        (a, b) =>
          r.buffer.filter(x => x === b).length -
          r.buffer.filter(x => x === a).length
      )[0]

      r.count =
        letter === r.previous
          ? r.count + 1
          : 0

      r.previous = letter

      setPrediction(letter)
      setConfidence(result.confidence)

      if (
        r.count >= STATIC_CONSENSUS_PREDICTIONS &&
        r.lastAdded !== letter
      ) {
        r.lastAdded = letter
        addConfirmedSign(letter)
      }
    } catch {
      setNotice(
        'Hand landmarks are running locally, but the legacy classifier API is unavailable.'
      )
    } finally {
      classifierInFlight.current = false
    }
  }

  const startCamera = async (requestedFacingMode = facingMode) => {
    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: requestedFacingMode },
            width: {
              ideal: 1280
            },
            height: {
              ideal: 720
            }
          },
          audio: false
        })

      videoRef.current.srcObject = stream

      await videoRef.current.play()

      // `ideal` may fall back silently (common on laptops). Reflect the
      // actual camera direction so a front camera is always mirrored.
      const actualFacingMode = stream
        .getVideoTracks()[0]
        ?.getSettings?.().facingMode
      setFacingMode(actualFacingMode || requestedFacingMode)
      updateCameraSwitchAvailability(stream)

      stateRef.current.lastHand = Date.now()

      setRunning(true)
      setNotice('')

      landmarkerRef.current ??=
        new BrowserHandLandmarker({
          onFrame: handleLandmarkFrame,
          onLandmarks: drawSkeletons,

          onStatus: ({
            state,
            message,
            labels
          }) => {
            if (state === 'static-ready') {
              setStaticReady(true)

              setNotice(
                `Static ONNX ready: ${labels.join(', ')}`
              )
            }

            if (state === 'dynamic-ready') {
              setDynamicReady(true)

              setNotice(
                `Dynamic LSTM ready: ${labels.join(', ')}`
              )
            }

            if (state === 'dynamic-unavailable') {
              setNotice(
                `Dynamic LSTM could not load: ${message}`
              )
            }

            if (state === 'error') {
              setNotice(
                `Browser MediaPipe error: ${message}`
              )
            }
          }
        })

      landmarkerRef.current.start(videoRef.current)
    } catch (error) {
      videoRef.current
        ?.srcObject
        ?.getTracks()
        .forEach(track => track.stop())

      const message =
        error instanceof Error
          ? error.message
          : String(error)

      setNotice(
        `Could not start the camera: ${message}`
      )
    }
  }

  const switchCamera = async () => {
    const nextFacingMode = facingMode === 'user' ? 'environment' : 'user'
    const wasRunning = running

    stopCamera()

    if (wasRunning) {
      await startCamera(nextFacingMode)
    } else {
      setFacingMode(nextFacingMode)
    }
  }

  useEffect(() => {
    return () => {
      stopCamera()
      landmarkerRef.current?.destroy()
    }
  }, [])

  const sendReply = async (event) => {
    event.preventDefault()

    if (!reply.trim()) return

    const text = reply.trim()

    setReply('')
    setLastReply(text)

    let marathi = ''

    try {
      marathi = (
        await (
          await fetch(`${API}/translate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              text
            })
          })
        ).json()
      ).marathi
    } catch {}

    setChat(items => [
      ...items,
      {
        sender: 'you',
        text,
        marathi,
        time: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })
      }
    ])
  }

  const toggleDynamicMode = () => {
    const next = !dynamicEnabledRef.current

    dynamicEnabledRef.current = next

    landmarkerRef.current?.setDynamicEnabled(next)

    dynamicRecognizer.current = {
      buffer: [],
      lastAdded: '',
      wasLocked: false,
      cooldownUntil: 0
    }

    setDynamicEnabled(next)
    setPrediction('·')
    setConfidence(0)

    setNotice(
      next
        ? 'Dynamic assist is active. Static and dynamic models run together; confident sequence predictions take priority.'
        : 'Static sign classifier is active.'
    )
  }

  const elapsed = running
    ? (
        (Date.now() - stateRef.current.lastHand) /
        1000
      ).toFixed(1)
    : '0.0'

  return (
    <div className="sparsh-conversation-page">

      {/* HEADER */}
      <header className="conversation-header">

        <div className="conversation-header-left">
          <button
            type="button"
            className="conversation-back-button"
            onClick={onBack}
            aria-label="Back to welcome"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            <span>Back</span>
          </button>

          <div className="conversation-brand">
            <img
              src="/sparsh-logo.png"
              alt="Sparsh logo"
              className="conversation-logo"
            />

            <div>
              <h1>S-स्पर्श</h1>
              <p>
                Indian Sign Language
                <span> · </span>
                Sign → Speech
              </p>
            </div>
          </div>
        </div>

        <div className="conversation-header-right">

          <span className="conversation-status">
            <span className="status-dot" />
            Conversation Mode
          </span>

          <button
            className="conversation-theme-button"
            onClick={() => setDark(!dark)}
            aria-label="Toggle theme"
          >
            {dark ? '☀' : '☾'}
          </button>

        </div>

      </header>


      {/* MAIN */}
      <main className="conversation-main">

        {notice && (
          <div
            className="conversation-notice"
            role="status"
          >
            {notice}
          </div>
        )}


        <section className="conversation-layout">

          {/* CAMERA */}
          <div className="conversation-camera-card">

            <div className="conversation-section-heading">
              <div>
                <p className="conversation-eyebrow">
                  LIVE CAMERA
                </p>

                <h2>
                  Ready to communicate
                </h2>

                <p>
                  Sign naturally and SPARSH will translate
                  your conversation in real time.
                </p>
              </div>

              <span className="camera-status">
                {running ? 'LIVE' : 'READY'}
              </span>
            </div>


            <div className="conversation-camera">

              <video
                ref={videoRef}
                className={
                  running
                    ? `conversation-video ${facingMode === 'user' ? 'mirrored' : ''}`
                    : 'conversation-video-hidden'
                }
                muted
                playsInline
              />

              <canvas
                ref={overlayRef}
                className={
                  running
                    ? `conversation-hand-overlay ${facingMode === 'user' ? 'mirrored' : ''}`
                    : 'conversation-video-hidden'
                }
              />

              {!running && (
                <div className="conversation-camera-placeholder">

                  <img
                    src="/sparsh-logo.png"
                    alt=""
                  />

                  <strong>
                    Camera is ready
                  </strong>

                  <span>
                    Start the camera to begin your
                    ISL conversation.
                  </span>

                </div>
              )}

              <i className="conversation-corner top-left" />
              <i className="conversation-corner top-right" />
              <i className="conversation-corner bottom-left" />
              <i className="conversation-corner bottom-right" />

            </div>


            <div className="conversation-camera-actions">

              <button
                className={
                  running
                    ? 'conversation-button danger'
                    : 'conversation-button primary'
                }
                onClick={
                  running
                    ? stopCamera
                    : startCamera
                }
              >
                {running
                  ? 'Stop Camera'
                  : 'Start Camera'}
              </button>

              {canSwitchCamera && (
                <button
                  className="conversation-button secondary"
                  onClick={switchCamera}
                  aria-label="Switch between front and back camera"
                >
                  {facingMode === 'user'
                    ? 'Use Back Camera'
                    : 'Use Front Camera'}
                </button>
              )}

              <button
                className="conversation-button secondary"
                onClick={() => {
                  setChat([])
                  resetCapture()
                }}
              >
                Clear Chat
              </button>

            </div>

          </div>


          {/* RIGHT PANEL */}
          <aside className="conversation-side">

            {/* RECOGNITION */}
            <section className="conversation-panel">

              <div className="panel-heading">
                <div>
                  <p className="conversation-eyebrow">
                    RECOGNITION
                  </p>

                  <h3>
                    Live detection
                  </h3>
                </div>

                <span className="model-badge">
                  {staticReady
                    ? 'Local ONNX'
                    : 'Groq'}
                </span>
              </div>


              <div className="detection-grid">

                <div className="detection-card">
                  <span>Detecting</span>
                  <strong>
                    {prediction}
                  </strong>
                </div>

                <div className="detection-card violet">
                  <span>Building word</span>
                  <strong>
                    {currentWord || '—'}
                  </strong>
                </div>

              </div>


              <div className="conversation-live-status">

                <div>
                  <span>Confidence</span>
                  <strong>
                    {confidence
                      ? `${confidence.toFixed(0)}%`
                      : '—'}
                  </strong>
                </div>

                <div>
                  <span>No hand</span>
                  <strong>
                    {elapsed}s
                  </strong>
                </div>

              </div>

            </section>


            {/* DYNAMIC SIGNS */}
            <section className="conversation-panel">

              <div className="panel-heading">
                <div>
                  <p className="conversation-eyebrow">
                    ADVANCED RECOGNITION
                  </p>

                  <h3>
                    Dynamic signs
                  </h3>
                </div>

                <span
                  className={
                    dynamicEnabled
                      ? 'feature-state active'
                      : 'feature-state'
                  }
                >
                  {dynamicEnabled
                    ? 'ON'
                    : 'OFF'}
                </span>
              </div>


              <button
                disabled={!dynamicReady}
                className={
                  dynamicEnabled
                    ? 'dynamic-button active'
                    : 'dynamic-button'
                }
                onClick={toggleDynamicMode}
              >
                <span className="dynamic-icon">
                  {dynamicEnabled ? '✓' : '＋'}
                </span>

                <span>
                  {dynamicReady
                    ? dynamicEnabled
                      ? 'Dynamic assist active'
                      : 'Enable Dynamic assist'
                    : 'Dynamic LSTM not exported'}
                </span>
              </button>


              <p className="panel-description">
                Static classifier stays active.
                A confident 30-frame LSTM result
                takes priority for motion signs.
              </p>

            </section>


            {/* TIMING */}
            <section className="conversation-panel">

              <div className="panel-heading">
                <div>
                  <p className="conversation-eyebrow">
                    TIMING
                  </p>

                  <h3>
                    Conversation pauses
                  </h3>
                </div>
              </div>


              <label className="conversation-range">

                <div>
                  <span>Word pause</span>
                  <strong>
                    {wordPause.toFixed(1)}s
                  </strong>
                </div>

                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={wordPause}
                  onChange={e =>
                    setWordPause(+e.target.value)
                  }
                />

              </label>


              <label className="conversation-range">

                <div>
                  <span>Message pause</span>
                  <strong>
                    {messagePause.toFixed(1)}s
                  </strong>
                </div>

                <input
                  type="range"
                  min="3"
                  max="10"
                  step="0.5"
                  value={messagePause}
                  onChange={e =>
                    setMessagePause(+e.target.value)
                  }
                />

              </label>

            </section>


            {/* SIGNED MESSAGE */}
            <section className="conversation-panel signed-panel">

              <p className="conversation-eyebrow">
                SIGNED MESSAGE
              </p>

              <div className="signed-message">
                {sentence || currentWord
                  ? `${sentence}${currentWord}`
                  : 'Your signed message will appear here.'}
              </div>

            </section>

          </aside>

        </section>


        {/* CHAT */}
        <section className="conversation-chat-panel">

          <div className="chat-header">

            <div>
              <p className="conversation-eyebrow">
                CONVERSATION
              </p>

              <h2>
                Live conversation
              </h2>
            </div>

            {lastReply && (
              <div className="signer-reply">
                <span>
                  Show this to the signer
                </span>

                <strong>
                  {lastReply}
                </strong>
              </div>
            )}

          </div>


          <div className="conversation-messages">

            {chat.length ? (
              chat.map((message, index) => (

                <article
                  key={index}
                  className={`conversation-message ${message.sender}`}
                >

                  <div className="message-meta">
                    {message.sender === 'you'
                      ? 'You'
                      : 'ISL'}

                    <span>·</span>

                    {message.time}
                  </div>

                  <strong className="message-english">
                    {message.text}
                  </strong>

                  {message.marathi && (
                    <div className="message-marathi">

                      <span>
                        मराठी
                      </span>

                      <p>
                        {message.marathi}
                      </p>

                    </div>
                  )}

                </article>

              ))

            ) : (

              <div className="empty-conversation">

                <img
                  src="/sparsh-logo.png"
                  alt=""
                />

                <strong>
                  No messages yet
                </strong>

                <span>
                  Signed and typed messages
                  will appear here.
                </span>

              </div>

            )}

          </div>


          {/* REPLY */}
          <form
            className="conversation-reply"
            onSubmit={sendReply}
          >

            <input
              value={reply}
              onChange={e =>
                setReply(e.target.value)
              }
              placeholder="Type a reply…"
              aria-label="Type a reply"
            />

            <button type="submit">
              Send
              <span>→</span>
            </button>

          </form>

        </section>

      </main>

    </div>
  )
}

export default ConversationMode
