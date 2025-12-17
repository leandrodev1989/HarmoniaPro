import { NOTES, INTERVALS, CHORD_STRUCTURES, ROMAN_NUMERALS_MAJOR, ROMAN_NUMERALS_MINOR, FUNCTIONS_MAJOR } from '../constants';
import { Chord, HarmonicField, ScaleType } from '../types';

export const getNoteIndex = (note: string): number => {
  return NOTES.indexOf(note);
};

export const getNoteFromInterval = (rootIndex: number, interval: number): string => {
  const noteIndex = (rootIndex + interval) % 12;
  return NOTES[noteIndex];
};

export const generateHarmonicField = (root: string, scaleType: ScaleType): HarmonicField => {
  const rootIndex = getNoteIndex(root);
  const scaleIntervals = scaleType === ScaleType.MAJOR ? INTERVALS.MAJOR : INTERVALS.MINOR;
  const romanNumerals = scaleType === ScaleType.MAJOR ? ROMAN_NUMERALS_MAJOR : ROMAN_NUMERALS_MINOR;
  
  // 1. Generate Diatonic Chords
  const chords: Chord[] = scaleIntervals.map((scaleInterval, index) => {
    // Determine chord root
    const chordRootIndex = (rootIndex + scaleInterval) % 12;
    const chordRootName = NOTES[chordRootIndex];
    
    // Determine chord type based on scale position (Basic Triads)
    let type: 'Major' | 'Minor' | 'Diminished' | 'Dominant7' = 'Major';
    let chordStructure = CHORD_STRUCTURES.MAJOR;

    if (scaleType === ScaleType.MAJOR) {
      if ([1, 2, 5].includes(index)) { // ii, iii, vi
        type = 'Minor';
        chordStructure = CHORD_STRUCTURES.MINOR;
      } else if (index === 6) { // vii°
        type = 'Diminished';
        chordStructure = CHORD_STRUCTURES.DIMINISHED;
      }
    } else {
      // Natural Minor: i, ii°, III, iv, v, VI, VII
      if ([0, 3, 4].includes(index)) { // i, iv, v
        type = 'Minor';
        chordStructure = CHORD_STRUCTURES.MINOR;
      } else if (index === 1) { // ii°
        type = 'Diminished';
        chordStructure = CHORD_STRUCTURES.DIMINISHED;
      }
    }

    // Generate notes for the chord
    const notes = chordStructure.map(interval => {
      return NOTES[(chordRootIndex + interval) % 12];
    });

    // Construct symbol
    let symbol = chordRootName;
    if (type === 'Minor') symbol += 'm';
    if (type === 'Diminished') symbol += 'dim';

    // Approximate function
    let harmonicFunction = '';
    if (scaleType === ScaleType.MAJOR) {
      harmonicFunction = FUNCTIONS_MAJOR[index];
    } else {
       const minorFuncs = ['Tônica', 'Subdominante', 'Tônica', 'Subdominante', 'Dominante', 'Subdominante', 'Dominante'];
       harmonicFunction = minorFuncs[index];
    }

    return {
      roman: romanNumerals[index],
      name: `${chordRootName} ${type === 'Diminished' ? 'Diminuta' : type}`,
      symbol,
      notes,
      type,
      intervals: chordStructure,
      function: harmonicFunction,
      category: 'diatonic'
    };
  });

  // 2. Generate Secondary Dominants (Only for Major Scale for now for simplicity)
  // V7/ii, V7/iii, V7/IV, V7/V, V7/vi
  const secondaryDominants: Chord[] = [];
  
  if (scaleType === ScaleType.MAJOR) {
    const targets = [
      { degreeIndex: 1, label: 'V7/ii' },
      { degreeIndex: 2, label: 'V7/iii' },
      { degreeIndex: 3, label: 'V7/IV' },
      { degreeIndex: 4, label: 'V7/V' },
      { degreeIndex: 5, label: 'V7/vi' },
    ];

    targets.forEach(target => {
      const targetChord = chords[target.degreeIndex];
      const targetRootIndex = NOTES.indexOf(targetChord.notes[0]);
      
      // Dominant is a perfect 5th (7 semitones) ABOVE the target root
      const domRootIndex = (targetRootIndex + 7) % 12; 
      const domRootName = NOTES[domRootIndex];

      // Structure: Major Triad + Minor 7th (0, 4, 7, 10)
      const domNotes = CHORD_STRUCTURES.DOMINANT7.map(interval => {
        return NOTES[(domRootIndex + interval) % 12];
      });

      secondaryDominants.push({
        roman: target.label,
        name: `${domRootName} Dominante`,
        symbol: `${domRootName}7`,
        notes: domNotes,
        type: 'Dominant7',
        intervals: CHORD_STRUCTURES.DOMINANT7,
        function: `Prepara para ${targetChord.symbol}`,
        category: 'secondary'
      });
    });
  }

  return {
    root,
    scale: scaleType,
    chords,
    secondaryDominants
  };
};

export const isNoteInChord = (noteName: string, chord: Chord | null): boolean => {
  if (!chord) return false;
  return chord.notes.includes(noteName);
};

export const getKeyColor = (noteName: string, activeChord: Chord | null, isSharp: boolean) => {
  if (!activeChord) return isSharp ? 'bg-black text-gray-500' : 'bg-white text-gray-400';

  const isRoot = activeChord.notes[0] === noteName;
  const isInChord = activeChord.notes.includes(noteName);

  if (isInChord) {
    if (isRoot) return 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] z-10'; // Root note highlight
    return 'bg-blue-300 z-10'; // Other chord notes
  }

  return isSharp ? 'bg-black text-gray-800' : 'bg-white text-gray-300';
};

export const mapProgressionToChords = (harmonicField: HarmonicField, degrees: string[]): Chord[] => {
  return degrees.map(degree => {
    // Try finding in diatonic
    let found = harmonicField.chords.find(chord => chord.roman === degree);
    // If not found, try secondary (though common progressions usually use simple romans)
    if (!found) found = harmonicField.secondaryDominants.find(chord => chord.roman === degree);
    return found;
  }).filter((c): c is Chord => !!c);
};

export const getPianoVoicing = (chord: Chord, inversion: number = 0, baseOctave: number = 3) => {
  let notesWithOctave = chord.notes.map(note => ({
    name: note,
    octave: baseOctave
  }));

  const rootIndex = NOTES.indexOf(notesWithOctave[0].name);
  for (let i = 1; i < notesWithOctave.length; i++) {
    const currentIndex = NOTES.indexOf(notesWithOctave[i].name);
    if (currentIndex < rootIndex) {
      notesWithOctave[i].octave += 1;
    }
  }

  for (let i = 0; i < inversion; i++) {
    const noteToShift = notesWithOctave.shift();
    if (noteToShift) {
      noteToShift.octave += 1;
      notesWithOctave.push(noteToShift);
    }
  }

  return notesWithOctave;
};