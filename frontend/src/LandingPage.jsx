import React from 'react'
import './LandingPage.css'

const Diamond = ({ className = '' }) => (
  <span className={`landing-diamond ${className}`} aria-hidden="true"><i /></span>
)

const FeatureIcon = ({ type }) => {
  const p = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.7', strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (type === 'learn') return <svg {...p}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z"/><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20"/><path d="M8 7h7M8 10h5"/></svg>
  if (type === 'practice') return <svg {...p}><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="12" cy="12" r="3.2"/><path d="M8 5l1-2h6l1 2"/></svg>
  return <svg {...p}><path d="M5 5h14v14H5z"/><path d="M8 9h8M8 12h5M8 15h7"/><circle cx="15" cy="15" r="3.2"/><path d="M17.5 17.5 20 20"/></svg>
}

export default function LandingPage({ dark, toggleTheme, onSignIn, onSignUp }) {
  return (
    <div className="landing-page">
      <div className="landing-noise" />
      <div className="landing-orb landing-orb-one" />
      <div className="landing-orb landing-orb-two" />
      <div className="landing-orb landing-orb-three" />

      <header className="landing-nav">
        <button className="landing-brand" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} aria-label="SPARSH home">
          <span className="landing-logo-wrap"><img src="/sparsh-logo.png" alt="" /></span>
          <span><strong>S-स्पर्श</strong><small>INDIAN SIGN LANGUAGE</small></span>
        </button>

        <nav className="landing-links">
          <a href="#about">About</a>
          <a href="#experience">Experience</a>
          <a href="#how">How it works</a>
        </nav>

        <div className="landing-nav-actions">
          <button className="landing-signin" onClick={onSignIn}>Sign in</button>
          <button className="landing-signup" onClick={onSignUp}>Create account</button>
          <button className="landing-theme" onClick={toggleTheme} aria-label="Toggle theme">{dark ? '☀' : '☾'}</button>
        </div>
      </header>

      <main>
        <section className="landing-hero" id="about">
          <div className="landing-hero-copy">
            <div className="landing-kicker"><Diamond /><span>MADE FOR CONNECTION</span></div>
            <h1>Give every <span>sign a voice.</span></h1>
            <p className="landing-lead">
              S-स्पर्श brings Indian Sign Language into an interactive space where learning,
              practice and real-time communication come together.
            </p>
            <div className="landing-hero-actions">
              <button className="landing-primary-cta" onClick={onSignUp}>Start your journey <span>→</span></button>
              <button className="landing-secondary-cta" onClick={onSignIn}>I already have an account</button>
            </div>
            <div className="landing-trust">
              <span><i /> Learn at your pace</span>
              <span><i /> Practice with your camera</span>
              <span><i /> Communicate naturally</span>
            </div>
          </div>

          <div className="landing-hero-visual">
            <div className="landing-ring ring-one" />
            <div className="landing-ring ring-two" />
            <div className="landing-ring ring-three" />
            <div className="landing-diamond-core">
  <img src="/sparsh-logo.png" alt="Sparsh logo" />
</div>

            <div className="floating-chip chip-recognition">
              <span><FeatureIcon type="practice" /></span>
              <div><small>REAL-TIME</small><strong>Sign → Speech</strong></div>
            </div>
            <div className="floating-chip chip-learning">
              <span><FeatureIcon type="learn" /></span>
              <div><small>LEARNING</small><strong>Build your skills</strong></div>
            </div>
            <div className="floating-chip chip-connect">
              <span><FeatureIcon type="connect" /></span>
              <div><small>CONNECTION</small><strong>Understand more</strong></div>
            </div>
            <i className="orbit-dot dot-one" /><i className="orbit-dot dot-two" /><i className="orbit-dot dot-three" />
          </div>
        </section>

        <section className="landing-marquee">
          <span>INDIAN SIGN LANGUAGE</span><Diamond />
          <span>SIGN RECOGNITION</span><Diamond />
          <span>ISL LEARNING</span><Diamond />
          <span>REAL-TIME TRANSLATION</span>
        </section>

        <section className="landing-experience" id="experience">
          <div className="landing-section-heading">
            <div><p className="landing-eyebrow">ONE SPACE. THREE WAYS TO GROW.</p><h2>Learn the language.<br/><em>Find your voice.</em></h2></div>
            <p>Whether you're starting from your first sign or communicating in the moment, SPARSH keeps the experience simple, visual and human.</p>
          </div>

          <div className="landing-feature-grid">
            <article className="landing-feature">
              <b className="feature-number">01</b><div className="feature-icon"><FeatureIcon type="learn"/></div>
              <p className="landing-eyebrow">LEARN ISL</p><h3>Build confidence, one sign at a time.</h3>
              <p>Follow guided levels, explore sign cards and practise each sign with camera-based feedback.</p>
              <div className="feature-line"><i/> Structured learning</div>
            </article>
            <article className="landing-feature">
              <b className="feature-number">02</b><div className="feature-icon"><FeatureIcon type="practice"/></div>
              <p className="landing-eyebrow">PRACTISE</p><h3>Turn your camera into a practice partner.</h3>
              <p>Get instant sign recognition and translations while you practise freely.</p>
              <div className="feature-line"><i/> Instant feedback</div>
            </article>
            <article className="landing-feature feature-wide">
              <b className="feature-number">03</b><div className="feature-icon"><FeatureIcon type="connect"/></div>
              <p className="landing-eyebrow">CONNECT</p><h3>Make communication feel more natural.</h3>
              <p>Use real-time sign recognition to turn ISL into readable speech and meaningful conversation.</p>
              <div className="feature-line"><i/> Sign → Speech</div>
            </article>
          </div>
        </section>

        <section className="landing-how" id="how">
          <div className="landing-how-card">
            <div className="landing-how-copy">
              <p className="landing-eyebrow">HOW SPARSH WORKS</p>
              <h2>From movement<br/><em>to meaning.</em></h2>
              <p>SPARSH uses your camera to recognise signs, turns them into readable language and gives you a space to keep learning.</p>
              <button className="landing-text-cta" onClick={onSignUp}>Explore SPARSH <span>→</span></button>
            </div>
            <div className="landing-process">
              <div className="process-step"><b>01</b><span><FeatureIcon type="practice"/></span><div><strong>Show a sign</strong><small>Use your camera</small></div></div>
              <div className="process-connector"/>
              <div className="process-step"><b>02</b><span><Diamond/></span><div><strong>SPARSH recognises</strong><small>AI-powered detection</small></div></div>
              <div className="process-connector"/>
              <div className="process-step"><b>03</b><span><FeatureIcon type="connect"/></span><div><strong>Understand & connect</strong><small>Speech and translation</small></div></div>
            </div>
          </div>
        </section>

        <section className="landing-final-cta">
          <div className="landing-final-glow"/>
          <Diamond className="final-diamond"/>
          <p className="landing-eyebrow">YOUR JOURNEY STARTS HERE</p>
          <h2>Every sign can open<br/><em>a new connection.</em></h2>
          <p>Start learning, practise freely, and discover what communication through ISL can feel like.</p>
          <div><button className="landing-primary-cta" onClick={onSignUp}>Create your account <span>→</span></button><button className="landing-secondary-cta" onClick={onSignIn}>Sign in</button></div>
        </section>
      </main>

      <footer className="landing-footer">
        <div><strong>S-स्पर्श</strong><span>Accessible learning through technology</span></div>
        <span>Indian Sign Language · Made for connection</span>
      </footer>
    </div>
  )
}
