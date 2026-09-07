import { BrowserHandLandmarker } from './lib/browserHandLandmarker'
import './collector.css'

const params = new URLSearchParams(window.location.search)
const label = (params.get('label') || '').trim().toUpperCase()
const frameCount = Math.min(300, Math.max(2, Number(params.get('frames')) || 30))
const root = document.querySelector('#collector-root')
root.innerHTML = `<main class="collector-shell"><h1>Dynamic sign collector</h1><p><b>${label || 'Missing label'}</b> · one ${frameCount}-frame sequence</p><video muted playsinline></video><div class="collector-progress"><i></i></div><p class="collector-status">Preparing camera…</p><button ${label ? '' : 'disabled'}>Start sequence</button></main>`

const video = root.querySelector('video')
const button = root.querySelector('button')
const status = root.querySelector('.collector-status')
const progress = root.querySelector('.collector-progress i')
let collector; let stream; let frames = []; let collecting = false
const setStatus = (message) => { status.textContent = message }

async function saveSequence() {
  collecting = false; collector.stop(); setStatus('Saving sequence locally…')
  const response = await fetch('/api/datasets/dynamic', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label, frames }),
  })
  if (!response.ok) throw new Error(await response.text())
  const result = await response.json()
  setStatus(`Saved ${result.saved} frames to ${result.path}. Run the command again for another sequence.`)
  button.textContent = 'Saved'; stream?.getTracks().forEach(track => track.stop())
}

async function start() {
  button.disabled = true
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
    video.srcObject = stream; await video.play()
    collector = new BrowserHandLandmarker({
      targetFps: 20,
      onStatus: ({ state, message }) => state === 'error' && setStatus(`MediaPipe error: ${message}`),
      onFrame: async (frame) => {
        if (!collecting) return
        frames.push({ leftHand: Array.from(frame.leftHand), rightHand: Array.from(frame.rightHand), leftPresent: frame.leftPresent, rightPresent: frame.rightPresent, timestamp: frame.timestamp })
        progress.style.width = `${frames.length / frameCount * 100}%`
        setStatus(`Perform ${label}: ${frames.length}/${frameCount}`)
        if (frames.length >= frameCount) {
          try { await saveSequence() } catch (error) { setStatus(`Save failed: ${error.message}`); button.disabled = false }
        }
      },
    })
    frames = []; collecting = true; collector.start(video)
    setStatus(`Perform ${label} once now. Capturing 0/${frameCount}`)
  } catch (error) { setStatus(`Could not start: ${error.message}`); button.disabled = false; stream?.getTracks().forEach(track => track.stop()) }
}
button.addEventListener('click', start)
window.addEventListener('beforeunload', () => { collector?.destroy(); stream?.getTracks().forEach(track => track.stop()) })
