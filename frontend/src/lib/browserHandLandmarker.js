import { TemporalLandmarkBuffer } from './landmarks'

const DEFAULT_FPS = 20
const MAX_INFERENCE_SIDE = 640

/**
 * Owns the worker, frame scheduling and temporal buffer. It deliberately has
 * no React dependency: landmark data can flow to an LSTM later without making
 * the component tree render for each video frame.
 */
export class BrowserHandLandmarker {
  constructor({ onFrame, onLandmarks, onStatus, targetFps = DEFAULT_FPS, sequenceLength = 30 }) {
    this.onFrame = onFrame
    this.onLandmarks = onLandmarks
    this.onStatus = onStatus
    this.interval = 1000 / targetFps
    this.buffer = new TemporalLandmarkBuffer(sequenceLength)
    this.worker = new Worker(new URL('../workers/handLandmarker.worker.js', import.meta.url), { type: 'module' })
    this.worker.onmessage = ({ data }) => this.handleWorkerMessage(data)
    this.worker.onerror = (event) => this.onStatus?.({ state: 'error', message: event.message })
    this.worker.postMessage({ type: 'initialize' })
    this.running = false
    this.inFlight = false
    this.lastSubmittedAt = 0
    this.frameRequest = null
  }

  handleWorkerMessage(data) {
    if (data.type === 'ready') this.onStatus?.({ state: 'ready' })
    if (data.type === 'static-ready') this.onStatus?.({ state: 'static-ready', labels: data.labels })
    if (data.type === 'dynamic-ready') this.onStatus?.({ state: 'dynamic-ready', labels: data.labels })
    if (data.type === 'dynamic-unavailable') this.onStatus?.({ state: 'dynamic-unavailable', message: data.message })
    if (data.type === 'error') this.onStatus?.({ state: 'error', message: data.message })
    if (data.type === 'landmark-preview') {
      // This arrives immediately after MediaPipe. Keeping it separate from
      // model output lets the canvas stay responsive while ONNX is running.
      this.onLandmarks?.(data.frame)
    }
    if (data.type === 'landmarks') {
      this.inFlight = false
      this.buffer.push(data.frame)
      this.onFrame?.(data.frame, this.buffer)
    }
  }

  start(video) {
    this.video = video
    this.running = true
    this.schedule()
  }

  setDynamicEnabled(enabled) {
    this.worker.postMessage({ type: 'set-dynamic-enabled', enabled })
  }

  schedule() {
    if (!this.running) return
    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
      this.frameRequest = this.video.requestVideoFrameCallback(() => {
        this.submitIfDue()
        this.schedule()
      })
    } else {
      this.frameRequest = requestAnimationFrame(() => {
        this.submitIfDue()
        this.schedule()
      })
    }
  }

  async submitIfDue() {
    const now = performance.now()
    if (this.inFlight || now - this.lastSubmittedAt < this.interval || this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return
    this.inFlight = true
    this.lastSubmittedAt = now
    try {
      const scale = Math.min(1, MAX_INFERENCE_SIDE / Math.max(this.video.videoWidth, this.video.videoHeight))
      const bitmap = await createImageBitmap(this.video, {
        resizeWidth: Math.max(1, Math.round(this.video.videoWidth * scale)),
        resizeHeight: Math.max(1, Math.round(this.video.videoHeight * scale)),
        resizeQuality: 'low',
      })
      this.worker.postMessage({ type: 'frame', bitmap, timestamp: Math.round(now) }, [bitmap])
    } catch (error) {
      this.inFlight = false
      this.onStatus?.({ state: 'error', message: error instanceof Error ? error.message : String(error) })
    }
  }

  stop() {
    this.running = false
    if (this.frameRequest !== null && 'cancelVideoFrameCallback' in HTMLVideoElement.prototype) this.video?.cancelVideoFrameCallback(this.frameRequest)
    else if (this.frameRequest !== null) cancelAnimationFrame(this.frameRequest)
    this.frameRequest = null
    this.inFlight = false
    this.buffer.clear()
  }

  destroy() {
    this.stop()
    this.worker.postMessage({ type: 'close' })
    this.worker.terminate()
  }
}
