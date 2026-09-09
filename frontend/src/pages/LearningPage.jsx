import { Link, useSearchParams } from 'react-router-dom'
import { useEffect } from 'react'
import { CameraView } from '../components/shared/CameraView'

const speak = (text, lang) => { if (!text) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = lang; u.rate = .95; speechSynthesis.speak(u) }
export function LearningPage({ recognition, onLearned }) {
  const [params] = useSearchParams(), target = params.get('sign')
  const { sentence, word, output, stats, lastAdded, translate, resetCapture } = recognition
  useEffect(() => { if (target && lastAdded === target) onLearned?.(target) }, [lastAdded, onLearned, target])
  return <main className="page practice-page"><div className="page-intro"><div><p className="eyebrow">REAL-TIME PRACTICE{target ? ` · TARGET ${target}` : ''}</p><h1>Sign. Recognize.<br/><em>Build meaning.</em></h1></div><Link to="/learn" className="text-link">Explore learning journey →</Link></div><div className="practice-grid"><CameraView recognition={recognition} mode="learning" /><section className="learning-panel"><div className="panel-head"><span>Your signed message</span><button className="btn-primary" onClick={translate}>Translate</button></div><div className="transcript-display">{sentence || word ? <p>{sentence}<strong>{word}</strong></p> : <span>Waiting for your first sign…</span>}</div><div className="translation-output"><article><label>English</label><p>{output.cleaned || 'Your English translation will appear here.'}</p>{output.cleaned && <button onClick={() => speak(output.cleaned, 'en-US')}>Speak English</button>}</article><article><label>मराठी</label><p>{output.marathi || 'मराठी भाषांतर येथे दिसेल.'}</p>{output.marathi && <button onClick={() => speak(output.marathi, 'mr-IN')}>मराठी ऐका</button>}</article></div><div className="stats-section"><span><b>{stats.signs}</b>Signs detected</span><span><b>{stats.words}</b>Words formed</span><span><b>{lastAdded || '—'}</b>Last confirmed</span><button className="btn-ghost danger" onClick={resetCapture}>Clear session</button></div></section></div><p className="camera-hint">Sign SPACE, COMMA, or FULLSTOP to punctuate your sentence.</p></main>
}
