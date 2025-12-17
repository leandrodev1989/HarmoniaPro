export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const INTERVALS = {
  MAJOR: [0, 2, 4, 5, 7, 9, 11],
  MINOR: [0, 2, 3, 5, 7, 8, 10],
};

// Intervals relative to the CHORD root, not the scale root
export const CHORD_STRUCTURES = {
  MAJOR: [0, 4, 7],
  MINOR: [0, 3, 7],
  DIMINISHED: [0, 3, 6],
  DOMINANT7: [0, 4, 7, 10], // Tônica, 3ª Maior, 5ª Justa, 7ª Menor
};

export const ROMAN_NUMERALS_MAJOR = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
export const ROMAN_NUMERALS_MINOR = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];

export const FUNCTIONS_MAJOR = [
  'Tônica (Repouso)',
  'Subdominante (Afastamento)',
  'Tônica/Dominante (Relativo)',
  'Subdominante (Afastamento)',
  'Dominante (Tensão)',
  'Tônica (Relativo)',
  'Dominante (Tensão sensível)'
];

export const COMMON_PROGRESSIONS = {
  MAJOR: [
    { name: 'Pop 4 Chords', degrees: ['I', 'V', 'vi', 'IV'], description: 'A base de milhares de hits pop e rock.' },
    { name: 'Jazz Standard (ii-V-I)', degrees: ['ii', 'V', 'I'], description: 'A cadência mais importante do Jazz.' },
    { name: 'Balada 50s', degrees: ['I', 'vi', 'IV', 'V'], description: 'Clássica progressão Doo-wop.' },
    { name: 'Pop Punk', degrees: ['I', 'V', 'vi', 'iii', 'IV'], description: 'Comum em músicas estilo Canon in D.' },
    { name: 'Blues Básico', degrees: ['I', 'IV', 'I', 'V', 'IV', 'I'], description: 'Estrutura simplificada de Blues.' }
  ],
  MINOR: [
    { name: 'Épico / Pop', degrees: ['i', 'VI', 'III', 'VII'], description: 'Progressão moderna muito usada (ex: Adele).' },
    { name: 'Andaluz', degrees: ['i', 'VII', 'VI', 'v'], description: 'Som descendente, estilo flamenco ou Ray Charles.' },
    { name: 'Jazz Menor', degrees: ['ii°', 'v', 'i'], description: 'Cadência 2-5-1 em tom menor.' },
    { name: 'Balada Triste', degrees: ['i', 'iv', 'v', 'i'], description: 'Progressão menor clássica.' }
  ]
};