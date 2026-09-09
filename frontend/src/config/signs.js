const letters = Object.fromEntries('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(label => [label, 'letter']))

// Add each newly collected vocabulary sign here. A word is committed as a
// whole token; a letter extends the active fingerspelled word.
export const SIGN_TYPES = {
  ...letters,
  SPACE: 'command',
  COMMA: 'command',
  FULLSTOP: 'command',
  HELLO: 'word',
  INDIAN: 'word',
  BYE: 'word',
  FINE: 'word',
  KNOW: 'word',
  MEET: 'word',
  NAMASTE: 'word',
  NICE: 'word',
  OK: 'word',
  PLEASE: 'word',
  SORRY: 'word',
  SPARSH: 'word',
  STOP: 'word',
  THANKYOU: 'word',
  WELCOME: 'word',
  YOU: 'word',
}

export const isWordSign = (label) => SIGN_TYPES[label] === 'word'
