import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import { EMPTY_HAND, flattenHand, normalizeHand } from '../lib/landmarks'

const WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm'
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task'

let handLandmarker
let initialization

async function initialize() {
  if (handLandmarker) return
  initialization ??= (async () => {
    const vision = await FilesetResolver.forVisionTasks(WASM_ROOT)
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.55,
      minHandPresenceConfidence: 0.55,
      minTrackingConfidence: 0.55,
    })
  })()
  await initialization
}

function buildFrame(result, timestamp) {
  const frame = {
    // Normalized, fixed-size vectors for the future LSTM.
    leftHand: EMPTY_HAND(),
    rightHand: EMPTY_HAND(),
    // Raw MediaPipe normalized image coordinates are retained temporarily so
    // the unchanged Python classifier can still consume its original format.
    leftRaw: EMPTY_HAND(),
    rightRaw: EMPTY_HAND(),
    leftPresent: false,
    rightPresent: false,
    leftHandedness: null,
    rightHandedness: null,
    timestamp,
  }

  result.landmarks.forEach((handLandmarks, index) => {
    const label = result.handedness[index]?.[0]?.categoryName?.toLowerCase()
    // MediaPipe usually supplies Left/Right. Keep an unknown hand stable too.
    const side = label === 'left' || (!label && !frame.leftPresent) ? 'left' : 'right'
    const handedness = result.handedness[index]?.[0] ?? null
    if (side === 'left') {
      frame.leftHand = normalizeHand(handLandmarks)
      frame.leftRaw = flattenHand(handLandmarks)
      frame.leftPresent = true
      frame.leftHandedness = handedness
    } else {
      frame.rightHand = normalizeHand(handLandmarks)
      frame.rightRaw = flattenHand(handLandmarks)
      frame.rightPresent = true
      frame.rightHandedness = handedness
    }
  })
  return frame
}

self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'initialize') {
      await initialize()
      self.postMessage({ type: 'ready' })
      return
    }
    if (data.type === 'close') {
      handLandmarker?.close()
      handLandmarker = undefined
      initialization = undefined
      return
    }
    if (data.type !== 'frame') return
    await initialize()
    const result = handLandmarker.detectForVideo(data.bitmap, data.timestamp)
    data.bitmap.close()
    const frame = buildFrame(result, data.timestamp)
    const transfers = [
      frame.leftHand.buffer, frame.rightHand.buffer,
      frame.leftRaw.buffer, frame.rightRaw.buffer,
    ]
    self.postMessage({ type: 'landmarks', frame }, transfers)
  } catch (error) {
    data.bitmap?.close?.()
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) })
  }
}
