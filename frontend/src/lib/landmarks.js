export const LANDMARK_COUNT = 21
export const HAND_VECTOR_SIZE = LANDMARK_COUNT * 3
export const EMPTY_HAND = () => new Float32Array(HAND_VECTOR_SIZE)

/**
 * Creates a fixed-shape representation for an eventual temporal model.
 *
 * Coordinates are translated to the wrist (landmark 0), then divided by the
 * wrist-to-middle-MCP distance (landmark 9). Missing hands are zero-filled;
 * their presence is carried separately in the mask instead of changing shape.
 */
export function normalizeHand(landmarks) {
  const output = EMPTY_HAND()
  if (!landmarks || landmarks.length !== LANDMARK_COUNT) return output

  const wrist = landmarks[0]
  const middleMcp = landmarks[9]
  let scale = Math.hypot(middleMcp.x - wrist.x, middleMcp.y - wrist.y, middleMcp.z - wrist.z)

  // This fallback handles the rare malformed/near-zero palm measurement.
  if (scale < 1e-5) {
    scale = [5, 9, 13, 17].reduce((sum, index) => {
      const point = landmarks[index]
      return sum + Math.hypot(point.x - wrist.x, point.y - wrist.y, point.z - wrist.z)
    }, 0) / 4
  }
  scale = Math.max(scale, 1e-5)

  landmarks.forEach((point, index) => {
    const offset = index * 3
    output[offset] = (point.x - wrist.x) / scale
    output[offset + 1] = (point.y - wrist.y) / scale
    output[offset + 2] = (point.z - wrist.z) / scale
  })
  return output
}

export function flattenHand(landmarks) {
  const output = EMPTY_HAND()
  if (!landmarks || landmarks.length !== LANDMARK_COUNT) return output
  landmarks.forEach((point, index) => {
    const offset = index * 3
    output[offset] = point.x
    output[offset + 1] = point.y
    output[offset + 2] = point.z
  })
  return output
}

/** A small ring buffer with stable [left(63), right(63)] entries per frame. */
export class TemporalLandmarkBuffer {
  constructor(capacity = 30) {
    this.capacity = capacity
    this.frames = []
  }

  push(frame) {
    this.frames.push(frame)
    if (this.frames.length > this.capacity) this.frames.shift()
  }

  clear() { this.frames.length = 0 }

  snapshot() { return this.frames.slice() }
}
