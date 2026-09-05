import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import * as ort from 'onnxruntime-web'
import { EMPTY_HAND, flattenHand, normalizeHand } from '../lib/landmarks'

const WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm'
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task'

let handLandmarker
let initialization
let staticSession = null
let staticLabels = []
let staticModelChecked = false
let dynamicSession = null
let dynamicLabels = []
let dynamicFrames = 30
let dynamicHistory = []
let dynamicModelChecked = false

async function initializeStaticModel() {
  if (staticModelChecked) return
  staticModelChecked = true
  try {
    const [modelResponse, labelsResponse] = await Promise.all([
      fetch('/models/static_sign.onnx'), fetch('/models/static_sign.labels.json'),
    ])
    if (!modelResponse.ok || !labelsResponse.ok) return
    staticSession = await ort.InferenceSession.create(await modelResponse.arrayBuffer(), { executionProviders: ['wasm'] })
    staticLabels = await labelsResponse.json()
    self.postMessage({ type: 'static-ready', labels: staticLabels })
  } catch (error) {
    self.postMessage({ type: 'static-unavailable', message: error instanceof Error ? error.message : String(error) })
  }
}

async function predictStatic(frame) {
  if (!staticSession) return null
  const features = new Float32Array(128)
  features.set(frame.leftHand, 0)
  features.set(frame.rightHand, 63)
  features[126] = Number(frame.leftPresent)
  features[127] = Number(frame.rightPresent)
  const output = await staticSession.run({ [staticSession.inputNames[0]]: new ort.Tensor('float32', features, [1, 128]) })
  const tensors = Object.values(output)
  const labelTensor = tensors.find(tensor => typeof tensor.data[0] === 'string')
  const probabilityTensor = tensors.find(tensor => typeof tensor.data[0] === 'number' && tensor.data.length > 1)
  if (labelTensor) {
    const label = String(labelTensor.data[0]).toUpperCase()
    const values = probabilityTensor ? Array.from(probabilityTensor.data) : []
    return { prediction: label, confidence: values.length ? Math.round(Math.max(...values) * 100) : 100 }
  }
  const values = Array.from(probabilityTensor?.data || [])
  if (!values.length) return null
  let index = 0
  for (let i = 1; i < values.length; i += 1) if (values[i] > values[index]) index = i
  return { prediction: staticLabels[index] || `CLASS_${index}`, confidence: Math.round(values[index] * 100) }
}

async function initializeDynamicModel() {
  if (dynamicModelChecked) return
  dynamicModelChecked = true
  try {
    const [modelResponse, labelsResponse] = await Promise.all([
      fetch('/models/dynamic_sign.onnx'), fetch('/models/dynamic_sign.labels.json'),
    ])
    if (!modelResponse.ok || !labelsResponse.ok) return
    const bytes = await modelResponse.arrayBuffer()
    dynamicLabels = await labelsResponse.json()
    dynamicSession = await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'] })
    const dimensions = dynamicSession.inputMetadata[dynamicSession.inputNames[0]]?.dimensions
    dynamicFrames = Number(dimensions?.[1]) || 30
    self.postMessage({ type: 'dynamic-ready', labels: dynamicLabels })
  } catch (error) {
    self.postMessage({ type: 'dynamic-unavailable', message: error instanceof Error ? error.message : String(error) })
  }
}

async function predictDynamic(frame) {
  if (!dynamicSession) return null
  const features = new Float32Array(128)
  features.set(frame.leftHand, 0)
  features.set(frame.rightHand, 63)
  features[126] = Number(frame.leftPresent)
  features[127] = Number(frame.rightPresent)
  dynamicHistory.push(features)
  if (dynamicHistory.length > dynamicFrames) dynamicHistory.shift()
  frame.dynamicWindowReady = dynamicHistory.length >= dynamicFrames
  if (!frame.dynamicWindowReady || dynamicHistory.length % 5 !== 0) return null
  const sequence = new Float32Array(dynamicFrames * 128)
  dynamicHistory.forEach((item, index) => sequence.set(item, index * 128))
  const input = new ort.Tensor('float32', sequence, [1, dynamicFrames, 128])
  const output = await dynamicSession.run({ [dynamicSession.inputNames[0]]: input })
  const logits = output[dynamicSession.outputNames[0]].data
  let index = 0
  for (let i = 1; i < logits.length; i += 1) if (logits[i] > logits[index]) index = i
  const exp = Array.from(logits, value => Math.exp(value - logits[index]))
  const confidence = exp[index] / exp.reduce((sum, value) => sum + value, 0)
  return { label: dynamicLabels[index] || `CLASS_${index}`, confidence: Math.round(confidence * 100) }
}

async function initialize() {
  if (handLandmarker) return
  initialization ??= (async () => {
    // This is an ES module worker. Tell MediaPipe to use its module WASM
    // loader; the classic loader expects a global ModuleFactory and causes
    // "ModuleFactory not set" in module-worker scopes.
    const vision = await FilesetResolver.forVisionTasks(WASM_ROOT, true)
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
      await initializeStaticModel()
      await initializeDynamicModel()
      self.postMessage({ type: 'ready' })
      return
    }
    if (data.type === 'close') {
      handLandmarker?.close()
      handLandmarker = undefined
      initialization = undefined
      dynamicHistory = []
      return
    }
    if (data.type !== 'frame') return
    await initialize()
    const result = handLandmarker.detectForVideo(data.bitmap, data.timestamp)
    data.bitmap.close()
    const frame = buildFrame(result, data.timestamp)
    frame.staticPrediction = await predictStatic(frame)
    frame.dynamicPrediction = await predictDynamic(frame)
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
