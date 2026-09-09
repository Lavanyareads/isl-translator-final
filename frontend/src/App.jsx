import { useEffect, useRef, useState } from 'react'
import { BrowserHandLandmarker } from './lib/browserHandLandmarker'
import { isWordSign } from './config/signs'
import LearnLetters from './LearnLetters'
import ConversationMode from './ConversationMode'
import Practice from './Practice'
import Compete from './Compete'
import LandingPage from './LandingPage'

const API = '/api'
const SPECIAL = { SPACE: ' ', COMMA: ',', FULLSTOP: '.' }
const ignoredInConversation = new Set(Object.keys(SPECIAL))
const CONSENSUS_PREDICTIONS = 2

const LEVELS = [
  { id: 1, title: 'Basics', icon: '👋', color: 'mint', description: 'Start with the first five alphabet signs.', signs: ['A', 'B', 'C', 'D', 'E'] },
  { id: 2, title: 'Alphabet', icon: '🔤', color: 'blue', description: 'Keep building your fingerspelling skills.', signs: ['F', 'G', 'H', 'I', 'J'] },
  { id: 3, title: 'More letters', icon: '✋', color: 'violet', description: 'Practise the next group of alphabet signs.', signs: ['K', 'L', 'M', 'N', 'O'] },
  { id: 4, title: 'Everyday words', icon: '💬', color: 'pink', description: 'Learn useful signs for daily conversation.', signs: ['HELLO', 'THANKYOU', 'OK', 'STOP', 'NAMASTE'] },
  { id: 5, title: 'Connect', icon: '🤝', color: 'gold', description: 'Use warm, helpful words with confidence.', signs: ['PLEASE', 'SORRY', 'NICE', 'YOU', 'WELCOME'] },
]
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

const progressKey = 'sparsh-learning-progress'


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


function WelcomeScreen({ dark, toggleTheme, onLearn, onConversation, onSignIn, onSignUp }) {
  return <div className="welcome-page"><div className="orb orb-one"/><div className="orb orb-two"/><div className="welcome-actions"><button className="welcome-theme" onClick={toggleTheme} aria-label="Toggle colour theme">{dark ? '☀' : '☾'}</button></div><main className="welcome-main"><section className="welcome-brand"><div className="welcome-mark">
  <img
    src="/sparsh-logo.png"
    alt="Sparsh logo"
  />
</div><p className="eyebrow">INDIAN SIGN LANGUAGE · MADE FOR CONNECTION</p><h1>S-स्पर्श</h1><p>Learn, practise and communicate with Indian Sign Language—one meaningful sign at a time.</p><div className="streak-banner"><span>🔥</span><div><strong>1 day streak</strong><small>Your journey starts with today’s practice</small></div><i>›</i></div><div className="trust-row"><span>✦ Learn at your pace</span><span>✦ Built for connection</span></div></section><section className="mode-picker"><div className="picker-top"><p className="eyebrow">CHOOSE YOUR EXPERIENCE</p><span className="step-pill">1 / 1</span></div><h2>What would you like<br/>to do <em>today?</em></h2><p className="picker-subtitle">Pick a path. You can switch anytime.</p><div className="mode-choice-grid"><button className="mode-choice learn-choice" onClick={onLearn}><span className="choice-icon">🎓</span><div><small>LEARN ISL</small><strong>Start learning</strong><p>Levels, sign cards, streaks and camera practice.</p><em>Build your skill</em></div><b>→</b></button><button className="mode-choice talk-choice" onClick={onConversation}><span className="choice-icon">💬</span><div><small>REAL-TIME TRANSLATOR</small><strong>Start a conversation</strong><p>Sign, translate and communicate in the moment.</p><em>Connect instantly</em></div><b>→</b></button></div></section></main><footer><span>SPARSH</span> · Accessible learning through technology</footer></div>
}

function AuthScreen({ kind, dark, toggleTheme, onBack, onSubmit, switchKind, notice, onRegistered }) {
  const isSignUp = kind === 'signup'
  const [showPassword, setShowPassword] = useState(false)
  const [values, setValues] = useState({ username: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  useEffect(() => { setError(''); setValues({ username: '', email: '', password: '', confirmPassword: '' }) }, [kind])
  const update = event => setValues(value => ({ ...value, [event.target.name]: event.target.value }))
  const submit = async event => {
    event.preventDefault(); setError('')
    if (isSignUp && values.password !== values.confirmPassword) return setError('Passwords do not match.')
    setSubmitting(true)
    try {
      const response = await fetch(`${API}/auth/${isSignUp ? 'signup' : 'signin'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(isSignUp ? { username: values.username, email: values.email, password: values.password } : { identifier: values.email, password: values.password }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.detail || 'Something went wrong. Please try again.')
      if (isSignUp) { onRegistered('Account created successfully. Please sign in.'); switchKind('signin'); return }
      localStorage.setItem('sparsh-auth-token', result.token); localStorage.setItem('sparsh-user', JSON.stringify(result.user)); onSubmit(result.user)
    } catch (requestError) { setError(requestError.message) } finally { setSubmitting(false) }
  }
  return <div className="auth-page"><button className="auth-theme" onClick={toggleTheme}>{dark ? '☀' : '☾'}</button><main className="auth-shell"><section className="auth-art">{onBack && <button className="auth-back" onClick={onBack}>← Back to SPARSH</button>}<div className="auth-logo"><img src="/sparsh-logo.png" alt="Sparsh logo" /><b>S-स्पर्श</b></div><div className="auth-orbit"><i>✦</i><i>✧</i> <img src="/sparsh-logo.png" alt="Sparsh logo" /></div><div className="auth-copy"><p className="eyebrow">{isSignUp ? 'BEGIN YOUR JOURNEY' : 'WELCOME BACK'}</p><h1>{isSignUp ? <>Every sign opens<br/><em>a new world.</em></> : <>Your next sign<br/><em>is waiting.</em></>}</h1><p>{isSignUp ? 'Create your SPARSH account to save progress, collect treasures, and continue your ISL journey.' : 'Sign in to continue your ISL adventure and keep your learning streak alive.'}</p></div><div className="auth-benefits"><span>✦ Personal learning journey</span><span>✦ Progress saved securely</span></div></section><section className="auth-form-panel"><div className="auth-mobile-logo"><img src="/sparsh-logo.png" alt="Sparsh logo" /> <b>S-स्पर्श</b></div><p className="eyebrow">{isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN'}</p><h2>{isSignUp ? 'Create your account' : 'Welcome back!'}</h2><p className="auth-subtitle">{isSignUp ? 'Create an account, then sign in to begin learning ISL.' : 'Enter your email or username and password to continue.'}</p><form onSubmit={submit}>{isSignUp && <label>Username<input required name="username" value={values.username} onChange={update} pattern="[A-Za-z0-9_]{3,30}" placeholder="3–30 letters, numbers, or _" autoComplete="username" /></label>}<label>{isSignUp ? 'Email address' : 'Email address or username'}<input required name="email" value={values.email} onChange={update} type={isSignUp ? 'email' : 'text'} placeholder={isSignUp ? 'you@example.com' : 'you@example.com or username'} autoComplete={isSignUp ? 'email' : 'username'} /></label><label>Password<span className="password-wrap"><input required name="password" value={values.password} onChange={update} type={showPassword ? 'text' : 'password'} minLength="8" placeholder="At least 8 characters" autoComplete={isSignUp ? 'new-password' : 'current-password'} /><button type="button" onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Hide' : 'Show'}</button></span></label>{isSignUp && <label>Confirm password<input required name="confirmPassword" value={values.confirmPassword} onChange={update} type={showPassword ? 'text' : 'password'} minLength="8" placeholder="Repeat your password" autoComplete="new-password" /></label>}{error && <p className="auth-message error">⚠ {error}</p>}{notice && <p className="auth-message success">✓ {notice}</p>}<button className="auth-submit" disabled={submitting} type="submit">{submitting ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in to SPARSH'} {!submitting && <span>→</span>}</button></form><p className="auth-switch">{isSignUp ? 'Already have an account?' : 'New to SPARSH?'} <button type="button" onClick={() => switchKind(isSignUp ? 'signin' : 'signup')}>{isSignUp ? 'Sign in' : 'Create an account'}</button></p></section></main></div>
}



function LearningHub({
  page,
  setPage,
  learnedSigns,
  startLesson,
  openPractice,
  openCompete,
  competePassedSigns,
  startCompete,
  logout
}) {
  return <div className="learning-hub"><nav className="learn-nav">
  <button className="learn-parent">
    ⌂ Learn
  </button>

  <button
    className={page === 'levels' ? 'active' : ''}
    onClick={() => setPage('levels')}
  >
    <img className="sparsh-mini-logo" src="/sparsh-logo.png" alt="" />
    Level journey
  </button>

  <button
    className={page === 'cards' ? 'active' : ''}
    onClick={() => setPage('cards')}
  >
    <img className="sparsh-mini-logo" src="/sparsh-logo.png" alt="" />
    Sign cards
  </button>

  <button
    className={page === 'practice' ? 'active' : ''}
    onClick={openPractice}
  >
    <img className="sparsh-mini-logo" src="/sparsh-logo.png" alt="" />
    Practice
  </button>
  <button className="logout-button" onClick={logout}>
  Logout
</button>
</nav>
{page === 'choose' ? <LearningChoice
  learnedSigns={learnedSigns}
  openLevels={openCompete}
  openCards={() => setPage('cards')}
  openPractice={openPractice}
/> : page === 'levels'
  ? (
      <LearningPath
        competePassedSigns={competePassedSigns}
        startCompete={startCompete}
      />
    ) : <SignCards learnedSigns={learnedSigns} startLesson={startLesson} />}</div>
}

function LearningChoice({ learnedSigns, openLevels, openCards, openPractice }) {
  
  return (
    <div className="learning-choice">

      <section>
        <p className="eyebrow">YOUR LEARNING SPACE</p>

        <h2>
          How would you like<br />
          to <em>learn today?</em>
        </h2>

        <p>
          Choose a structured journey or explore signs at your own pace.
        </p>

        <div className="choice-stats">
          <span>🔥 1 day streak</span>
          <span>⚡ {learnedSigns.length * 10} XP</span>
        </div>
      </section>

      <div className="choice-grid">

        {/* Compete in Levels */}
        <button
          className="choice-card levels-choice"
          onClick={openLevels}
        >
          <span>🗺️</span>

          <div>
            <small>STRUCTURED ROUTE</small>
            <h3>Compete in levels</h3>
            <p>
              Unlock levels, build a streak and track your progress.
            </p>
          </div>

          <b>Start journey →</b>
        </button>


        {/* Learn from Cards */}
        <button
          className="choice-card cards-choice"
          onClick={openCards}
        >
          <img
  className="sparsh-mini-logo"
  src="/sparsh-logo.png"
  alt="Sparsh"
/>

          <div>
            <small>FLEXIBLE ROUTE</small>
            <h3>Learn from cards</h3>
            <p>
              Pick any available sign card and practise at your pace.
            </p>
          </div>

          <b>Explore cards →</b>
        </button>


        {/* Practice */}
        <button
          className="choice-card practice-choice"
          onClick={openPractice}
        >
          <span>◉</span>

          <div>
            <small>FREE PRACTICE</small>
            <h3>Practice</h3>
            <p>
              Practice signs freely with your camera and get instant
              translations.
            </p>
          </div>

          <b>Start practising →</b>
        </button>

      </div>
    </div>
  )
}

function SignCards({ learnedSigns, startLesson }) {
  return <div className="cards-page"><section className="cards-title"><div><p className="eyebrow">SIGN LIBRARY</p><h2>Choose a sign card</h2><p>Select a card to learn it and practise with your camera.</p></div><span className="diamond-icon">◆</span></section><div className="library-grid">{LEVELS.flatMap(level => level.signs.map(sign => { const done = learnedSigns.includes(`${level.id}:${sign}`); return <button className={done ? 'library-card done' : 'library-card'} onClick={() => startLesson(level, sign)} key={`${level.id}-${sign}`}><small>LEVEL {level.id}</small>
  <b>
  {sign.length === 1
    ? sign
    : <img className="sparsh-mini-logo" src="/sparsh-logo.png" alt="" />
  }
</b>
  <strong>{sign}</strong><span>{done ? '✓ Practise again' : 'Try this sign'}</span></button> }))}</div></div>
}

function LearningDashboard({ learnedSigns, startLesson, goToLevels }) {
  const nextLevel = LEVELS.find(level => level.signs.some(sign => !learnedSigns.includes(`${level.id}:${sign}`))) || LEVELS[0]
  const nextSign = nextLevel.signs.find(sign => !learnedSigns.includes(`${nextLevel.id}:${sign}`)) || nextLevel.signs[0]
  const completedLevels = LEVELS.filter(level => level.signs.every(sign => learnedSigns.includes(`${level.id}:${sign}`))).length
  return <div className="learning-dashboard"><section className="dashboard-hero"><div><p className="eyebrow">WELCOME BACK, SIGNER</p><h2>Small signs.<br/><em>Big connections.</em></h2><p>Continue your ISL journey with one focused practice session today.</p><button className="hero-cta" onClick={() => startLesson(nextLevel, nextSign)}>Continue: {nextSign} <span>→</span></button></div><div className="hero-illustration"><span>🤟</span><i>✦</i><b>✦</b></div></section><section className="stat-row"><div><span>🔥</span><strong>1</strong><small>day streak</small></div><div><span>⚡</span><strong>{learnedSigns.length * 10}</strong><small>total XP</small></div><div><span>✓</span><strong>{learnedSigns.length}</strong><small>signs learned</small></div><div><span>★</span><strong>{completedLevels}</strong><small>levels complete</small></div></section><section className="continue-card"><div className="continue-icon">{nextLevel.icon}</div><div><small>CONTINUE LEARNING · LEVEL {nextLevel.id}</small><h3>{nextLevel.title}</h3><p>Next up: learn the sign <b>{nextSign}</b></p><div className="big-progress"><i style={{ width: `${nextLevel.signs.filter(sign => learnedSigns.includes(`${nextLevel.id}:${sign}`)).length / nextLevel.signs.length * 100}%` }} /></div></div><button className="round-go" onClick={() => startLesson(nextLevel, nextSign)}>→</button></section><section className="dashboard-grid"><article className="daily-practice"><div><span>🎯</span><small>DAILY PRACTICE</small></div><h3>Keep your streak going</h3><p>Practise one sign today to make ISL a habit.</p><button onClick={() => startLesson(nextLevel, nextSign)}>Start a quick practice</button></article><article className="explore-levels"><span>🗺️</span><div><small>EXPLORE</small><h3>Your learning path</h3><p>See all levels, progress and unlocked signs.</p></div><button onClick={goToLevels}>View levels →</button></article></section></div>
}

function Achievements({ learnedSigns }) {
  const completedLevels = LEVELS.filter(level => level.signs.every(sign => learnedSigns.includes(`${level.id}:${sign}`))).length
  const badges = [
    { icon: '🌱', name: 'First sign', detail: 'Learn your first sign', unlocked: learnedSigns.length >= 1 },
    { icon: '🔥', name: 'On a roll', detail: 'Complete 5 sign practices', unlocked: learnedSigns.length >= 5 },
    { icon: '🔤', name: 'Alphabet explorer', detail: 'Finish a full level', unlocked: completedLevels >= 1 },
    { icon: '🤝', name: 'Connector', detail: 'Learn 15 signs', unlocked: learnedSigns.length >= 15 },
  ]
  return <div className="achievements-page"><section className="achievement-hero"><div><p className="eyebrow">YOUR PROGRESS</p><h2>Every practice<br/>is <em>progress.</em></h2><p>You have earned {learnedSigns.length * 10} XP through real ISL practice.</p></div><span>🏆</span></section><div className="achievement-summary"><div><b>{learnedSigns.length}</b><span>signs learned</span></div><div><b>{completedLevels}</b><span>levels complete</span></div><div><b>{Math.max(0, 25 - learnedSigns.length)}</b><span>signs to master</span></div></div><h3 className="section-heading">Your badges</h3><div className="badge-grid">{badges.map(badge => <article className={badge.unlocked ? 'badge-card unlocked' : 'badge-card'} key={badge.name}><span>{badge.unlocked ? badge.icon : '🔒'}</span><strong>{badge.name}</strong><p>{badge.detail}</p>{badge.unlocked && <small>UNLOCKED</small>}</article>)}</div></div>
}

function LearningPath({ competePassedSigns, startCompete }) {
  const completedCount = competePassedSigns.length
  return <div className="learning-home treasure-home"><div className="map-sparkles" aria-hidden="true"><i>✦</i><i>✧</i><i>✦</i><i>✧</i></div><section className="welcome-card treasure-banner"><div><p className="eyebrow">THE SPARSH TREASURE TRAIL</p><h2>Every sign is a<br/><em>new discovery.</em></h2><p>Follow the trail, unlock sign treasures, and grow your ISL confidence.</p><div className="welcome-stats"><span>🔥 1 day streak</span><span>⚡ {completedCount * 10} XP</span><span>🗝️ {completedCount} treasures</span></div></div></section><section className="quest-strip"><span className="quest-icon">🧭</span><div><small>TODAY’S QUEST</small><strong>Discover one new ISL sign</strong><p>Complete any sign card to collect your next trail treasure.</p></div><span className="quest-reward">+10 XP</span></section><section className="learning-top"><div><p className="eyebrow">YOUR ADVENTURE MAP</p><h2>Choose your next checkpoint</h2><p>Complete each checkpoint to reveal the next stretch of the trail.</p></div><div className="goal-orb"><b>{completedCount}</b><span>signs<br/>learned</span></div></section><div className="level-map">{LEVELS.map((item, index) => { const previous = LEVELS[index - 1]; const unlocked = index === 0 || previous.signs.every(sign => competePassedSigns.includes(`${previous.id}:${sign}`)); const complete = item.signs.every(sign => competePassedSigns.includes(`${item.id}:${sign}`)); const learned = item.signs.filter(sign => competePassedSigns.includes(`${item.id}:${sign}`)).length; return <article className={`level-card ${item.color} ${unlocked ? '' : 'locked'} ${complete ? 'complete' : ''}`} key={item.id}><div className="trail-pin"><span>{index + 1}</span></div><div className="level-badge">{complete ? '✓' : unlocked ? item.icon : '🔒'}</div><div className="level-copy"><small>CHECKPOINT {item.id}</small><h3>{item.title}</h3><p>{item.description}</p><div className="level-progress"><i style={{ width: `${learned / item.signs.length * 100}%` }} /></div><span>{learned} / {item.signs.length} sign treasures collected</span></div>{unlocked && <div className="sign-grid">{item.signs.map(sign => { const done = competePassedSigns.includes(sign); return <button key={sign}onClick={() => startCompete(sign)} className={done ? 'sign-card learned' : 'sign-card'}><b>{done ? '💎' : sign.length === 1 ? sign : '🤟'}</b><span>{done ? 'Treasure found' : `Discover ${sign}`}</span></button>})}</div>}{!unlocked && <div className="lock-message">🗝️ Complete Checkpoint {item.id - 1} to reveal this treasure</div>}</article> })}</div></div>
}
function Card({ label, value, violet }) { return <div className={`card ${violet ? 'violet' : ''}`}><small>{label}</small><div>{value}</div></div> }

function App() {
  const videoRef = useRef(null)
  const landmarkerRef = useRef(null)
  const classifierInFlight = useRef(false)
  const lastClassificationAt = useRef(0)
  const recognizer = useRef({ buffer: [], previous: null, count: 0, lastAdded: '' })
  const stateRef = useRef({ mode: 'learning', word: '', buffer: '', lastHand: Date.now(), wordCommitted: true, messageSent: true })

  const [mode, setMode] = useState('learning')
  const [dark, setDark] = useState(false)
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
  const [learningView, setLearningView] = useState('path')
  const [learningPage, setLearningPage] = useState('choose')
  const [appPage, setAppPage] = useState(() => {
  return localStorage.getItem('sparsh-auth-token')
    ? 'welcome'
    : 'landing'
})
  const [authKind, setAuthKind] = useState('signin')
  const [authNotice, setAuthNotice] = useState('')
  const [activeLevel, setActiveLevel] = useState(null)
  const [activeLesson, setActiveLesson] = useState(null)
const [currentUser, setCurrentUser] = useState(() => {
  try {
    return JSON.parse(localStorage.getItem('sparsh-user')) || null
  } catch {
    return null
  }
})

const [learnedSigns, setLearnedSigns] = useState([])

useEffect(() => {
  if (!currentUser) {
    setLearnedSigns([])
    return
  }

  const userKey = `sparsh-learning-progress-${currentUser.username}`

  try {
    setLearnedSigns(JSON.parse(localStorage.getItem(userKey)) || [])
  } catch {
    setLearnedSigns([])
  }
}, [currentUser])

const competeProgressKey = 'sparsh-compete-progress'

const [competePassedSigns, setCompetePassedSigns] = useState(() => {
  try {
    return JSON.parse(localStorage.getItem(competeProgressKey)) || []
  } catch {
    return []
  }
})

const [competeTarget, setCompeteTarget] = useState('A')

const [practiceFeedback, setPracticeFeedback] = useState('')

  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light' }, [dark])

  useEffect(() => {
    const token = localStorage.getItem('sparsh-auth-token')
    if (!token) return
    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(() => setAppPage('welcome'))
      .catch(() => {
        localStorage.removeItem('sparsh-auth-token')
        localStorage.removeItem('sparsh-user')
      })
  }, [])

  useEffect(() => {
    fetch(`${API}/health`)
      .then(r => r.json())
      .then(setHealth)
      .catch(() => setHealth({ modelReady: false, modelError: 'API server is not running.' }))
  }, [])

  useEffect(() => { stateRef.current.mode = mode }, [mode])
  useEffect(() => { stateRef.current.word = currentWord }, [currentWord])
  useEffect(() => { stateRef.current.buffer = sentence }, [sentence])
  useEffect(() => {
  if (!currentUser) return

  const userKey = `sparsh-learning-progress-${currentUser.username}`

  localStorage.setItem(userKey, JSON.stringify(learnedSigns))
}, [learnedSigns, currentUser])
  useEffect(() => {
  localStorage.setItem(
    competeProgressKey,
    JSON.stringify(competePassedSigns)
  )
}, [competePassedSigns])

  useEffect(() => {
    if (mode !== 'learning' || !activeLesson || !activeLevel || lastAdded !== activeLesson.sign) return
    const key = `${activeLevel.id}:${activeLesson.sign}`
    setLearnedSigns(items => items.includes(key) ? items : [...items, key])
    setPracticeFeedback(`Correct! ${activeLesson.sign} was recognised.`)
  }, [lastAdded, activeLesson, activeLevel, mode])

  const resetCapture = () => {
    recognizer.current = { buffer: [], previous: null, count: 0, lastAdded: '' }
    setSentence('')
    setCurrentWord('')
    setLastAdded('')
    setOutput({ cleaned: '', marathi: '' })
    setStats({ signs: 0, words: 0 })
    setPrediction('·')
    setConfidence(0)
    setHold(0)
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
      } else if (!ignoredInConversation.has(letter)) {
        setCurrentWord(value => value + letter)
      }
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
        } else {
          setSentence(value => value + mark + ' ')
        }
      }
    } else {
      setCurrentWord(value => value + letter)
    }
  }

  const finalizeConversation = async (raw) => {
    try {
      const response = await fetch(`${API}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: raw }),
      })
      const message = await response.json()

      setChat(items => [...items, {
        sender: 'isl',
        text: message.cleaned || message.text || '',
        marathi: message.marathi || '',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }])
    } catch {
      setNotice('Could not finalize the signed message. Check the API server.')
    }
  }

  const handleNoHand = () => {
    recognizer.current = { ...recognizer.current, buffer: [], previous: null, count: 0, lastAdded: '' }
    setPrediction('·')
    setHold(0)
    setConfidence(0)
    setLastAdded('')

    const c = stateRef.current
    const elapsed = (Date.now() - c.lastHand) / 1000

    if (c.mode === 'conversation') {
      if (elapsed >= wordPause && !c.wordCommitted && c.word) {
        setSentence(value => value + c.word + ' ')
        setCurrentWord('')
        stateRef.current.wordCommitted = true
      }

      if (elapsed >= messagePause && !c.messageSent && stateRef.current.buffer.trim()) {
        const raw = stateRef.current.buffer.trim()
        setSentence('')
        stateRef.current.buffer = ''
        stateRef.current.messageSent = true
        finalizeConversation(raw)
      }
    }
  }

  const handleLandmarkFrame = async (frame) => {
    if (!frame.leftPresent && !frame.rightPresent) return handleNoHand()

    const c = stateRef.current
    c.lastHand = Date.now()
    c.wordCommitted = false
    c.messageSent = false

    if (classifierInFlight.current || performance.now() - lastClassificationAt.current < 180) return

    const classifierInput = frame.rightPresent ? frame.rightRaw : frame.leftRaw
    classifierInFlight.current = true
    lastClassificationAt.current = performance.now()

    try {
      const browserFeatures = [
        ...frame.leftHand,
        ...frame.rightHand,
        Number(frame.leftPresent),
        Number(frame.rightPresent),
      ]

      let response = await fetch(`${API}/classify-browser-static`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: browserFeatures }),
      })

      if (!response.ok) {
        response = await fetch(`${API}/classify-landmarks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ landmarks: Array.from(classifierInput) }),
        })
      }

      if (!response.ok) throw new Error('Classifier unavailable')

      const result = await response.json()
      const r = recognizer.current

      r.buffer = [...r.buffer, result.prediction].slice(-5)
      const letter = [...r.buffer].sort(
        (a, b) => r.buffer.filter(x => x === b).length - r.buffer.filter(x => x === a).length
      )[0]

      r.count = letter === r.previous ? r.count + 1 : 0
      r.previous = letter

      setPrediction(letter)
      setConfidence(result.confidence)
      setHold(Math.min(100, Math.round(r.count / 20 * 100)))

      const requiredConsensus = c.mode === 'conversation' ? CONSENSUS_PREDICTIONS : 20

      if (r.count >= requiredConsensus && r.lastAdded !== letter) {
        r.lastAdded = letter
        setLastAdded(letter)
        addConfirmedSign(letter)
      }
    } catch {
      setNotice('Hand landmarks are running locally, but the legacy classifier API is unavailable.')
    } finally {
      classifierInFlight.current = false
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      if (!videoRef.current) {
        stream.getTracks().forEach(track => track.stop())
        throw new Error('Camera view is not ready yet.')
      }

      videoRef.current.srcObject = stream
      await videoRef.current.play()

      stateRef.current.lastHand = Date.now()
      setRunning(true)
      setNotice('')

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

  const handleCompetePassed = (sign) => {
  setCompetePassedSigns(items =>
    items.includes(sign)
      ? items
      : [...items, sign]
  )
}

  useEffect(() => () => {
    stopCamera()
    landmarkerRef.current?.destroy()
  }, [])

  const translate = async () => {
    const raw = `${sentence}${currentWord}`.trim()
    if (!raw) return setNotice('Nothing to translate yet.')

    setNotice('Translating…')

    try {
      const response = await fetch(`${API}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: raw }),
      })
      setOutput(await response.json())
      setNotice('')
    } catch {
      setNotice('Translation failed. Check the API server and GROQ_API_KEY.')
    }
  }

  const sendReply = async (event) => {
    event.preventDefault()
    if (!reply.trim()) return

    const text = reply.trim()
    setReply('')

    let marathi = ''
    try {
      const response = await fetch(`${API}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await response.json()
      marathi = data.marathi || ''
    } catch {}

    setLastReply({ text, marathi })

    setChat(items => [...items, {
      sender: 'you',
      text,
      marathi,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }])
  }

  const switchMode = (next) => {
    stopCamera()
    resetCapture()
    setMode(next)
    setLastReply({ text: '', marathi: '' })
    stateRef.current = {
      ...stateRef.current,
      mode: next,
      lastHand: Date.now(),
      wordCommitted: true,
      messageSent: true,
    }
  }

  const openLesson = (level, sign) => {
  stopCamera()
  resetCapture()

  setActiveLevel(level)
  setActiveLesson({ sign })

  setPracticeFeedback('Show the sign to the camera when you are ready.')

  setLearningView('practice')
}

const openPractice = () => {
  stopCamera()
  resetCapture()
  setActiveLesson(null)
  setActiveLevel(null)
  setPracticeFeedback('')
  setLearningView('practice-page')
}

const openCompete = () => {
  stopCamera()
  resetCapture()
  setActiveLesson(null)
  setActiveLevel(null)
  setPracticeFeedback('')
  setLearningPage('levels')
  setLearningView('path')
}

const startCompete = (sign) => {
  stopCamera()
  resetCapture()

  setActiveLesson(null)
  setActiveLevel(null)
  setPracticeFeedback('')

  setCompeteTarget(sign)
  setLearningView('compete')
}


  const handleNextLetter = () => {
  const current = activeLesson?.sign || 'A'
  const index = LETTERS.indexOf(current)

  if (index === -1 || index >= LETTERS.length - 1) return

  const nextLetter = LETTERS[index + 1]

  const nextLevel = LEVELS.find(level =>
    level.signs.includes(nextLetter)
  )

  if (!nextLevel) return

  stopCamera()
  resetCapture()

  setActiveLevel(nextLevel)
  setActiveLesson({ sign: nextLetter })

  setPracticeFeedback(
    `Show the sign for ${nextLetter} to the camera when you are ready.`
  )
}

const handlePreviousLetter = () => {
  const current = activeLesson?.sign || 'A'
  const index = LETTERS.indexOf(current)

  if (index <= 0) return

  const previousLetter = LETTERS[index - 1]

  const previousLevel = LEVELS.find(level =>
    level.signs.includes(previousLetter)
  )

  if (!previousLevel) return

  stopCamera()
  resetCapture()

  setActiveLevel(previousLevel)
  setActiveLesson({ sign: previousLetter })

  setPracticeFeedback(
    `Show the sign for ${previousLetter} to the camera when you are ready.`
  )
}

  const backToLearningPath = () => {
    stopCamera()
    resetCapture()
    setActiveLesson(null)
    setActiveLevel(null)
    setPracticeFeedback('')
    setLearningView('path')
    setLearningPage('choose')
  }

  const enterLearning = () => {
    switchMode('learning')
    setLearningView('path')
    setLearningPage('choose')
    setAppPage('workspace')
  }

  const enterConversation = () => {
    switchMode('conversation')
    setAppPage('workspace')
  }

  const goHome = () => {
    stopCamera()
    resetCapture()
    setAppPage('welcome')
  }
  const logout = () => {
  stopCamera()
  resetCapture()

  localStorage.removeItem('sparsh-auth-token')
  localStorage.removeItem('sparsh-user')

  setAppPage('landing')
}

  const elapsed = running && mode === 'conversation'
    ? ((Date.now() - stateRef.current.lastHand) / 1000).toFixed(1)
    : '0.0'

      // Dedicated learning pages
  if (mode === 'learning' && learningView === 'compete') {
    return (
      <Compete
  videoRef={videoRef}
  running={running}
  prediction={prediction}
  confidence={confidence}
  hold={hold}
  startCamera={startCamera}
  stopCamera={stopCamera}
  resetCapture={resetCapture}
  onBack={backToLearningPath}
  initialTarget={['A', 'B', 'C', 'D', 'E'].indexOf(competeTarget)}
  onPassed={handleCompetePassed}
/>
    )
  }

  if (mode === 'learning' && learningView === 'practice-page') {
    return (
      <Practice
        videoRef={videoRef}
        running={running}
        prediction={prediction}
        confidence={confidence}
        hold={hold}
        sentence={sentence}
        currentWord={currentWord}
        lastAdded={lastAdded}
        output={output}
        stats={stats}
        translate={translate}
        startCamera={startCamera}
        stopCamera={stopCamera}
        resetCapture={resetCapture}
        onBack={backToLearningPath}
      />
    )
  }

  if (
    mode === 'learning' &&
    learningView === 'practice' &&
    activeLesson
  ) {
    return (
      <LearnLetters
        sign={activeLesson.sign}
        level={activeLevel?.id || 1}
        videoRef={videoRef}
        running={running}
        prediction={prediction}
        confidence={confidence}
        practiceFeedback={practiceFeedback}
        learned={
          activeLevel && activeLesson
            ? learnedSigns.includes(
                `${activeLevel.id}:${activeLesson.sign}`
              )
            : false
        }
        onBack={backToLearningPath}
        onStartCamera={startCamera}
        onStopCamera={stopCamera}
        onNext={handleNextLetter}
        onPrevious={handlePreviousLetter}
        onSpeak={() =>
          speak(activeLesson.sign, 'en-IN')
        }
      />
    )
  }
  if (appPage === 'landing') {
  return (
    <LandingPage
      dark={dark}
      toggleTheme={() => setDark(!dark)}
      onSignIn={() => {
        setAuthNotice('')
        setAuthKind('signin')
        setAppPage('auth')
      }}
      onSignUp={() => {
        setAuthNotice('')
        setAuthKind('signup')
        setAppPage('auth')
      }}
    />
  )
}

  if (appPage === 'welcome') {
    return (
      <WelcomeScreen
        dark={dark}
        toggleTheme={() => setDark(!dark)}
        onLearn={enterLearning}
        onConversation={enterConversation}
        onSignIn={() => { setAuthNotice(''); setAuthKind('signin'); setAppPage('auth') }}
        onSignUp={() => { setAuthNotice(''); setAuthKind('signup'); setAppPage('auth') }}
      />
    )
  }

  if (appPage === 'auth') {
    return (
      <AuthScreen
        kind={authKind}
        dark={dark}
        toggleTheme={() => setDark(!dark)}
        onBack={() => setAppPage('landing')}
        notice={authNotice}
        onRegistered={setAuthNotice}
        onSubmit={(user) => {
  setCurrentUser(user)
  setAppPage('welcome')
}}
        switchKind={setAuthKind}
      />
    )
  }

  if (mode === 'learning' && learningView === 'path') {
    return (
      <div className="app">
        <header>
          <div className="brand">
            <button className="home-button" onClick={goHome} aria-label="Back to home">⌂</button>
            <img
  src="/sparsh-logo.png"
  alt="Sparsh logo"
  className="sparsh-logo"
/>
            <div>
              <h1>Sparsh</h1>
              <p>Indian Sign Language · Learn, practise, connect</p>
            </div>
          </div>
          <div className="pills">
            <span className="pill live">● Learning Mode</span>
            <button className="theme-button" onClick={() => setDark(!dark)} aria-label="Toggle theme">
              {dark ? '☀' : '☾'}
            </button>
          </div>
        </header>

        <main className="learning-main">
  <section className="feed">
    <LearningHub
      page={learningPage}
      setPage={setLearningPage}
      learnedSigns={learnedSigns}
      startLesson={openLesson}
      openPractice={openPractice}
      openCompete={openCompete}
      competePassedSigns={competePassedSigns}
      startCompete={startCompete}
      logout={logout}
    />
  </section>
</main>
      </div>
    )
  }

  return (
    <div className="app">
      <header>
        <div className="brand">
          <button className="home-button" onClick={goHome} aria-label="Back to home">⌂</button>
          <img
  src="/sparsh-logo.png"
  alt="Sparsh logo"
  className="sparsh-logo"
/>
          <div className="brand-text">
            <h1 className="brand-wordmark">S-स्पर्श</h1>
            <p className="brand-tagline">Indian Sign Language <span className="sep">·</span> Sign → Speech</p>
          </div>
        </div>

        <div className="mode-switch" role="tablist" aria-label="Mode">
          <button
            role="tab"
            aria-selected={mode === 'learning'}
            className={mode === 'learning' ? 'active' : ''}
            onClick={enterLearning}
          >
            Learning
          </button>
          <button
            role="tab"
            aria-selected={mode === 'conversation'}
            className={mode === 'conversation' ? 'active' : ''}
            onClick={enterConversation}
          >
            Conversation
          </button>
          <span
            className="mode-thumb"
            style={{ transform: mode === 'learning' ? 'translateX(0%)' : 'translateX(100%)' }}
          />
        </div>

        <div className="header-controls">
          <div
            className={`status-pill ${running ? 'live' : health.modelReady ? 'ready' : 'warn'}`}
            title={health.modelError || ''}
          >
            <span className="status-dot" />
            <span className="status-label">{running ? 'Live' : health.modelReady ? 'Ready' : 'Offline'}</span>
          </div>
          <button
            className="theme-toggle"
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={() => setDark(!dark)}
          >
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
                    <p>
                      {mode === 'learning'
                        ? 'Position your hands inside the frame and begin signing.'
                        : 'Start the camera to begin your ISL conversation.'}
                    </p>
                    <button className="btn-primary" onClick={startCamera}>
                      <Icon.play /> Start Camera
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="camera-overlay">
                    <span className="live-indicator"><i />Live</span>
                    <button className="btn-stop" aria-label="Stop camera" onClick={stopCamera}>
                      <Icon.stop />
                    </button>
                  </div>

                  <div className="scan-beam" />

                  <div className={`recognition-panel ${lastAdded ? 'confirmed' : ''}`}>
                    <div className="recognition-display">
                      <span className="recognition-letter">{prediction}</span>
                      <div className="recognition-label">{prediction === '·' ? 'No hand' : 'Detected'}</div>
                    </div>

                    <div className="recognition-metrics">
                      <div className="metric-row">
                        <span>Confidence</span>
                        <b>{confidence}%</b>
                      </div>
                      <div className="progress-bar">
                        <i style={{ width: `${confidence}%` }} />
                      </div>

                      <div className="metric-row">
                        <span>Hold to confirm</span>
                        <b>{hold >= 100 ? 'Done' : `${hold}%`}</b>
                      </div>
                      <div className={`progress-bar hold ${hold >= 100 ? 'complete' : ''}`}>
                        <i style={{ width: `${hold}%` }} />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="camera-corners">
                <i className="corner tl" />
                <i className="corner tr" />
                <i className="corner bl" />
                <i className="corner br" />
              </div>
            </div>

            {mode === 'conversation' && (
              <div className="camera-controls">
                <div className="timing-controls">
                  <label>
                    <span>Word pause</span>
                    <div className="range-group">
                      <input
                        type="range"
                        min="0.5"
                        max="3"
                        step="0.1"
                        value={wordPause}
                        onChange={e => setWordPause(+e.target.value)}
                      />
                      <b>{wordPause.toFixed(1)}s</b>
                    </div>
                  </label>

                  <label>
                    <span>Message pause</span>
                    <div className="range-group">
                      <input
                        type="range"
                        min="3"
                        max="10"
                        step="0.5"
                        value={messagePause}
                        onChange={e => setMessagePause(+e.target.value)}
                      />
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
              <p className="camera-hint">
                Sign SPACE, COMMA or FULLSTOP to punctuate your sentence.
              </p>
            )}
          </div>

          <ConversationMode
  chat={chat}
  reply={reply}
  setReply={setReply}
  sendReply={sendReply}
  lastReply={lastReply}
  resetChat={() => {
    setChat([])
    resetCapture()
    setLastReply({ text: '', marathi: '' })
  }}
  startCamera={startCamera}
  running={running}
/>
        </section>
      </main>
    </div>
  )
}

export default App
