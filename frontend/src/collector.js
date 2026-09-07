import { BrowserHandLandmarker } from './lib/browserHandLandmarker'
import './collector.css'

const params = new URLSearchParams(window.location.search)
const label = (params.get('label') || '').trim().toUpperCase()
const samples = Math.min(2000, Math.max(1, Number(params.get('samples')) || 200))
const root = document.querySelector('#collector-root')

root.innerHTML = `
  <main class="collector-shell">
    <h1>Static sign collector</h1>
    <p><b>${label || 'Missing label'}</b> · ${samples} browser landmark frames</p>
    <video muted playsinline></video>
    <div class="collector-progress"><i></i></div>
    <p class="collector-status">Preparing camera…</p>
    <button ${label ? '' : 'disabled'}>Start collection</button>
  </main>`

const video = root.querySelector('video')
const button = root.querySelector('button')
const status = root.querySelector('.collector-status')
const progress = root.querySelector('.collector-progress i')
let collector
let stream
let frames = []
let isCollecting = false

function setStatus(message) { status.textContent = message }

async function save() {
  isCollecting = false
  collector.stop()
  setStatus('Saving landmark recording locally…')
  const response = await fetch('/api/datasets/static', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label, frames }),
  })
  if (!response.ok) throw new Error(await response.text())
  const result = await response.json()
  setStatus(`Saved ${result.saved} samples to ${result.path}. You can close this page.`)
  button.textContent = 'Saved'
  stream?.getTracks().forEach(track => track.stop())
}

async function start() {
  if (!label) return
  button.disabled = true
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false,
    })
    video.srcObject = stream
    await video.play()
    collector = new BrowserHandLandmarker({
      targetFps: 20,
      onStatus: ({ state, message }) => state === 'error' && setStatus(`MediaPipe error: ${message}`),
      onFrame: async (frame) => {
        if (!isCollecting || (!frame.leftPresent && !frame.rightPresent)) return
        frames.push({
          leftHand: Array.from(frame.leftHand), rightHand: Array.from(frame.rightHand),
          leftPresent: frame.leftPresent, rightPresent: frame.rightPresent, timestamp: frame.timestamp,
        })
        progress.style.width = `${frames.length / samples * 100}%`
        setStatus(`Capturing ${label}: ${frames.length}/${samples}`)
        if (frames.length >= samples) {
          try { await save() } catch (error) { setStatus(`Save failed: ${error.message}`); button.disabled = false }
        }
      },
    })
    collector.start(video)
    frames = []
    isCollecting = true
    setStatus(`Hold ${label} steady. Capturing 0/${samples}`)
  } catch (error) {
    setStatus(`Could not start: ${error.message}`)
    button.disabled = false
    stream?.getTracks().forEach(track => track.stop())
  }
}

button.addEventListener('click', start)
window.addEventListener('beforeunload', () => { collector?.destroy(); stream?.getTracks().forEach(track => track.stop()) })
