import { Chord } from '../types';

// Representa uma corda: { corda (0-5, 0 é E grave), casa (-1 é mute), dedo (0 é solta, 1-4 dedos) }
export interface GuitarPosition {
  string: number; // 0 = E grave, 5 = E aguda
  fret: number;   // -1 = X (não toca), 0 = Solta
  finger?: number; // 1 = Indicador, 2 = Médio, 3 = Anelar, 4 = Mínimo
}

// Mapeamento de formas básicas (Shapes)
// Este é um dicionário simplificado para acordes maiores, menores e diminutos nas 12 tonalidades
const CHORD_LIBRARY: Record<string, Record<string, GuitarPosition[]>> = {
  'C': {
    'Major': [
      { string: 0, fret: -1 }, { string: 1, fret: 3, finger: 3 }, { string: 2, fret: 2, finger: 2 },
      { string: 3, fret: 0 }, { string: 4, fret: 1, finger: 1 }, { string: 5, fret: 0 }
    ],
    'Minor': [ // Pestana C menor (Casa 3, shape Am)
      { string: 0, fret: -1 }, { string: 1, fret: 3, finger: 1 }, { string: 2, fret: 5, finger: 3 },
      { string: 3, fret: 5, finger: 4 }, { string: 4, fret: 4, finger: 2 }, { string: 5, fret: 3, finger: 1 }
    ],
    'Diminished': [ // C dim (xx1212)
       { string: 0, fret: -1 }, { string: 1, fret: -1 }, { string: 2, fret: 1, finger: 1 },
       { string: 3, fret: 2, finger: 2 }, { string: 4, fret: 1, finger: 1 }, { string: 5, fret: 2, finger: 3 }
    ]
  },
  'C#': {
    'Major': [ // Pestana C# (Casa 4, shape A)
      { string: 0, fret: -1 }, { string: 1, fret: 4, finger: 1 }, { string: 2, fret: 6, finger: 2 },
      { string: 3, fret: 6, finger: 3 }, { string: 4, fret: 6, finger: 4 }, { string: 5, fret: 4, finger: 1 }
    ],
    'Minor': [ // Pestana C#m (Casa 4, shape Am)
      { string: 0, fret: -1 }, { string: 1, fret: 4, finger: 1 }, { string: 2, fret: 6, finger: 3 },
      { string: 3, fret: 6, finger: 4 }, { string: 4, fret: 5, finger: 2 }, { string: 5, fret: 4, finger: 1 }
    ],
    'Diminished': [ // C# dim (xx2323)
       { string: 0, fret: -1 }, { string: 1, fret: -1 }, { string: 2, fret: 2, finger: 1 },
       { string: 3, fret: 3, finger: 2 }, { string: 4, fret: 2, finger: 1 }, { string: 5, fret: 3, finger: 3 }
    ]
  },
  'D': {
    'Major': [
      { string: 0, fret: -1 }, { string: 1, fret: -1 }, { string: 2, fret: 0 },
      { string: 3, fret: 2, finger: 1 }, { string: 4, fret: 3, finger: 3 }, { string: 5, fret: 2, finger: 2 }
    ],
    'Minor': [
      { string: 0, fret: -1 }, { string: 1, fret: -1 }, { string: 2, fret: 0 },
      { string: 3, fret: 2, finger: 2 }, { string: 4, fret: 3, finger: 3 }, { string: 5, fret: 1, finger: 1 }
    ],
    'Diminished': [ // D dim (xx0101)
       { string: 0, fret: -1 }, { string: 1, fret: -1 }, { string: 2, fret: 0 },
       { string: 3, fret: 1, finger: 1 }, { string: 4, fret: 0 }, { string: 5, fret: 1, finger: 2 }
    ]
  },
  'D#': {
    'Major': [ // Pestana Eb (Casa 6, shape A) ou Casa 3 shape C? Vamos usar Casa 6 shape A para consistencia
      { string: 0, fret: -1 }, { string: 1, fret: 6, finger: 1 }, { string: 2, fret: 8, finger: 2 },
      { string: 3, fret: 8, finger: 3 }, { string: 4, fret: 8, finger: 4 }, { string: 5, fret: 6, finger: 1 }
    ],
    'Minor': [ // D#m (Pestana Casa 6, shape Am)
      { string: 0, fret: -1 }, { string: 1, fret: 6, finger: 1 }, { string: 2, fret: 8, finger: 3 },
      { string: 3, fret: 8, finger: 4 }, { string: 4, fret: 7, finger: 2 }, { string: 5, fret: 6, finger: 1 }
    ],
    'Diminished': [ // D# dim (xx1212)
       { string: 0, fret: -1 }, { string: 1, fret: -1 }, { string: 2, fret: 1, finger: 1 },
       { string: 3, fret: 2, finger: 2 }, { string: 4, fret: 1, finger: 1 }, { string: 5, fret: 2, finger: 3 }
    ]
  },
  'E': {
    'Major': [
      { string: 0, fret: 0 }, { string: 1, fret: 2, finger: 2 }, { string: 2, fret: 2, finger: 3 },
      { string: 3, fret: 1, finger: 1 }, { string: 4, fret: 0 }, { string: 5, fret: 0 }
    ],
    'Minor': [
      { string: 0, fret: 0 }, { string: 1, fret: 2, finger: 2 }, { string: 2, fret: 2, finger: 3 },
      { string: 3, fret: 0 }, { string: 4, fret: 0 }, { string: 5, fret: 0 }
    ],
    'Diminished': [ // E dim (xx2323)
       { string: 0, fret: -1 }, { string: 1, fret: -1 }, { string: 2, fret: 2, finger: 1 },
       { string: 3, fret: 3, finger: 2 }, { string: 4, fret: 2, finger: 1 }, { string: 5, fret: 3, finger: 3 }
    ]
  },
  'F': {
    'Major': [ // Pestana F (Casa 1, shape E)
      { string: 0, fret: 1, finger: 1 }, { string: 1, fret: 3, finger: 3 }, { string: 2, fret: 3, finger: 4 },
      { string: 3, fret: 2, finger: 2 }, { string: 4, fret: 1, finger: 1 }, { string: 5, fret: 1, finger: 1 }
    ],
    'Minor': [ // Fm (Pestana Casa 1, shape Em)
      { string: 0, fret: 1, finger: 1 }, { string: 1, fret: 3, finger: 3 }, { string: 2, fret: 3, finger: 4 },
      { string: 3, fret: 1, finger: 1 }, { string: 4, fret: 1, finger: 1 }, { string: 5, fret: 1, finger: 1 }
    ],
    'Diminished': [ // F dim (xx3434)
       { string: 0, fret: -1 }, { string: 1, fret: -1 }, { string: 2, fret: 3, finger: 1 },
       { string: 3, fret: 4, finger: 2 }, { string: 4, fret: 3, finger: 1 }, { string: 5, fret: 4, finger: 3 }
    ]
  },
  'F#': {
    'Major': [ // Pestana F# (Casa 2, shape E)
      { string: 0, fret: 2, finger: 1 }, { string: 1, fret: 4, finger: 3 }, { string: 2, fret: 4, finger: 4 },
      { string: 3, fret: 3, finger: 2 }, { string: 4, fret: 2, finger: 1 }, { string: 5, fret: 2, finger: 1 }
    ],
    'Minor': [ // F#m (Pestana Casa 2, shape Em)
      { string: 0, fret: 2, finger: 1 }, { string: 1, fret: 4, finger: 3 }, { string: 2, fret: 4, finger: 4 },
      { string: 3, fret: 2, finger: 1 }, { string: 4, fret: 2, finger: 1 }, { string: 5, fret: 2, finger: 1 }
    ],
    'Diminished': [ // F# dim (xx4545)
       { string: 0, fret: -1 }, { string: 1, fret: -1 }, { string: 2, fret: 4, finger: 1 },
       { string: 3, fret: 5, finger: 2 }, { string: 4, fret: 4, finger: 1 }, { string: 5, fret: 5, finger: 3 }
    ]
  },
  'G': {
    'Major': [
      { string: 0, fret: 3, finger: 2 }, { string: 1, fret: 2, finger: 1 }, { string: 2, fret: 0 },
      { string: 3, fret: 0 }, { string: 4, fret: 0 }, { string: 5, fret: 3, finger: 3 } // Pode ser 4 tb
    ],
    'Minor': [ // Gm (Pestana Casa 3, shape Em)
      { string: 0, fret: 3, finger: 1 }, { string: 1, fret: 5, finger: 3 }, { string: 2, fret: 5, finger: 4 },
      { string: 3, fret: 3, finger: 1 }, { string: 4, fret: 3, finger: 1 }, { string: 5, fret: 3, finger: 1 }
    ],
    'Diminished': [ // G dim (xx5656)
       { string: 0, fret: -1 }, { string: 1, fret: -1 }, { string: 2, fret: 5, finger: 1 },
       { string: 3, fret: 6, finger: 2 }, { string: 4, fret: 5, finger: 1 }, { string: 5, fret: 6, finger: 3 }
    ]
  },
  'G#': {
    'Major': [ // Pestana Ab (Casa 4, shape E)
      { string: 0, fret: 4, finger: 1 }, { string: 1, fret: 6, finger: 3 }, { string: 2, fret: 6, finger: 4 },
      { string: 3, fret: 5, finger: 2 }, { string: 4, fret: 4, finger: 1 }, { string: 5, fret: 4, finger: 1 }
    ],
    'Minor': [ // G#m (Pestana Casa 4, shape Em)
      { string: 0, fret: 4, finger: 1 }, { string: 1, fret: 6, finger: 3 }, { string: 2, fret: 6, finger: 4 },
      { string: 3, fret: 4, finger: 1 }, { string: 4, fret: 4, finger: 1 }, { string: 5, fret: 4, finger: 1 }
    ],
    'Diminished': [ // G# dim (xx6767)
       { string: 0, fret: -1 }, { string: 1, fret: -1 }, { string: 2, fret: 6, finger: 1 },
       { string: 3, fret: 7, finger: 2 }, { string: 4, fret: 6, finger: 1 }, { string: 5, fret: 7, finger: 3 }
    ]
  },
  'A': {
    'Major': [
      { string: 0, fret: -1 }, { string: 1, fret: 0 }, { string: 2, fret: 2, finger: 1 },
      { string: 3, fret: 2, finger: 2 }, { string: 4, fret: 2, finger: 3 }, { string: 5, fret: 0 }
    ],
    'Minor': [
      { string: 0, fret: -1 }, { string: 1, fret: 0 }, { string: 2, fret: 2, finger: 2 },
      { string: 3, fret: 2, finger: 3 }, { string: 4, fret: 1, finger: 1 }, { string: 5, fret: 0 }
    ],
    'Diminished': [ // A dim (xx7878)
       { string: 0, fret: -1 }, { string: 1, fret: -1 }, { string: 2, fret: 7, finger: 1 },
       { string: 3, fret: 8, finger: 2 }, { string: 4, fret: 7, finger: 1 }, { string: 5, fret: 8, finger: 3 }
    ]
  },
  'A#': {
    'Major': [ // Bb (Pestana Casa 1, shape A)
      { string: 0, fret: -1 }, { string: 1, fret: 1, finger: 1 }, { string: 2, fret: 3, finger: 2 },
      { string: 3, fret: 3, finger: 3 }, { string: 4, fret: 3, finger: 4 }, { string: 5, fret: 1, finger: 1 }
    ],
    'Minor': [ // Bbm (Pestana Casa 1, shape Am)
      { string: 0, fret: -1 }, { string: 1, fret: 1, finger: 1 }, { string: 2, fret: 3, finger: 3 },
      { string: 3, fret: 3, finger: 4 }, { string: 4, fret: 2, finger: 2 }, { string: 5, fret: 1, finger: 1 }
    ],
    'Diminished': [ // A# dim (xx8989)
       { string: 0, fret: -1 }, { string: 1, fret: -1 }, { string: 2, fret: 8, finger: 1 },
       { string: 3, fret: 9, finger: 2 }, { string: 4, fret: 8, finger: 1 }, { string: 5, fret: 9, finger: 3 }
    ]
  },
  'B': {
    'Major': [ // B (Pestana Casa 2, shape A)
      { string: 0, fret: -1 }, { string: 1, fret: 2, finger: 1 }, { string: 2, fret: 4, finger: 2 },
      { string: 3, fret: 4, finger: 3 }, { string: 4, fret: 4, finger: 4 }, { string: 5, fret: 2, finger: 1 }
    ],
    'Minor': [ // Bm (Pestana Casa 2, shape Am)
      { string: 0, fret: -1 }, { string: 1, fret: 2, finger: 1 }, { string: 2, fret: 4, finger: 3 },
      { string: 3, fret: 4, finger: 4 }, { string: 4, fret: 3, finger: 2 }, { string: 5, fret: 2, finger: 1 }
    ],
    'Diminished': [ // B dim (xx9 10 9 10)
       { string: 0, fret: -1 }, { string: 1, fret: -1 }, { string: 2, fret: 9, finger: 1 },
       { string: 3, fret: 10, finger: 2 }, { string: 4, fret: 9, finger: 1 }, { string: 5, fret: 10, finger: 3 }
    ]
  }
};

export const getGuitarVoicing = (chord: Chord | null): GuitarPosition[] => {
  if (!chord) return [];
  
  // Pegar a nota fundamental (Ex: "C" de "Cm")
  // A nota fundamental está em chord.notes[0], mas chord.symbol pode ser mais direto para o dicionário se parseado
  // O chord.name é tipo "C Minor", chord.symbol é "Cm".
  // Vamos usar a primeira nota do array de notas como Root, pois nosso dicionário é baseado nisso.
  const root = chord.notes[0];
  
  const positions = CHORD_LIBRARY[root]?.[chord.type];
  
  return positions || [];
};