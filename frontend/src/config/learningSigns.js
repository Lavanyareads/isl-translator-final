const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const words = ['HELLO', 'THANKYOU', 'OK', 'STOP', 'NAMASTE', 'PLEASE', 'SORRY', 'NICE', 'YOU', 'WELCOME']

// Image metadata lives separately from LEVELS: LEVELS remains the existing
// source for learning order and progression.
export const LEARNING_SIGNS = Object.fromEntries([...alphabet, ...words].map(sign => [sign, {
  sign,
  title: sign,
  image: `/signs/${sign}.png`,
  description: `Show the sign for ${sign} to the camera.`,
}]))

export const getLearningSign = sign => LEARNING_SIGNS[sign] || {
  sign,
  title: sign,
  image: `/signs/${sign}.png`,
  description: `Show the sign for ${sign} to the camera.`,
}
