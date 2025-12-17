import React, { useMemo } from 'react';
import { NOTES } from '../constants';
import { Chord, Note, HarmonicField } from '../types';

interface PianoProps {
  activeChord: Chord | null;
  harmonicField?: HarmonicField; // Novo prop para saber a escala
  onNoteClick: (note: string, octave: number) => void;
  voicing?: { name: string; octave: number }[];
  pressedKeys?: { name: string; octave: number }[]; 
  // Props do modo exercício
  exerciseMode?: boolean;
  foundNotes?: string[]; // Notas que o usuário já acertou
  showScale?: boolean; // Novo prop para ativar visualização da escala
}

const Piano: React.FC<PianoProps> = ({ 
  activeChord, 
  harmonicField,
  onNoteClick, 
  voicing, 
  pressedKeys = [],
  exerciseMode = false,
  foundNotes = [],
  showScale = false
}) => {
  // Generate 4 octaves of notes starting from C2 to C6
  const keys = useMemo(() => {
    const generatedKeys: Note[] = [];
    const octaves = [2, 3, 4, 5]; // Show octaves 2 (Low), 3, 4, 5 (High)
    
    octaves.forEach(octave => {
      NOTES.forEach(noteName => {
        generatedKeys.push({
          name: noteName,
          full: `${noteName}${octave}`,
          octave,
          isSharp: noteName.includes('#'),
          midi: 0 
        });
      });
    });
    generatedKeys.push({ name: 'C', full: 'C6', octave: 6, isSharp: false, midi: 0 });
    
    return generatedKeys;
  }, []);

  // Extrair notas da escala se showScale estiver ativo
  const scaleNotes = useMemo(() => {
    if (!harmonicField || !showScale) return [];
    // Collect unique notes from all diatonic chords
    const notes = new Set<string>();
    harmonicField.chords.forEach(chord => {
        if(chord.category === 'diatonic') {
            chord.notes.forEach(n => notes.add(n));
        }
    });
    return Array.from(notes);
  }, [harmonicField, showScale]);

  const isKeyActive = (note: Note) => {
    // Check MIDI press first
    const isMidiPressed = pressedKeys.some(k => k.name === note.name && k.octave === note.octave);
    if (isMidiPressed) return true;

    // Se estiver em modo exercício, não mostra o acorde ativo automaticamente (o usuário tem que adivinhar)
    // Apenas mostra as notas que ele JÁ encontrou.
    if (exerciseMode) {
      return foundNotes.includes(note.name);
    }

    if (!activeChord) return false;

    if (voicing && voicing.length > 0) {
      return voicing.some(v => v.name === note.name && v.octave === note.octave);
    }

    return activeChord.notes.includes(note.name);
  };

  const getKeyStyle = (note: Note) => {
    const isMidiPressed = pressedKeys.some(k => k.name === note.name && k.octave === note.octave);
    
    // MIDI Feedback visual
    if (isMidiPressed) {
       return {
         white: 'bg-yellow-400 border-yellow-600 text-yellow-900 shadow-[inset_0_-10px_20px_rgba(0,0,0,0.1)]',
         black: 'bg-yellow-600 border-yellow-800'
       }
    }

    // Lógica do Modo Exercício (Acerto = Verde)
    if (exerciseMode && foundNotes.includes(note.name)) {
        return {
          white: 'bg-green-400 border-green-600 text-white shadow-[inset_0_-10px_20px_rgba(0,0,0,0.1)]',
          black: 'bg-green-600 border-green-800'
        };
    }

    const active = isKeyActive(note);
    
    let isRoot = false;
    // Lógica normal de visualização de acordes
    if (active && activeChord && !exerciseMode) {
       if (voicing && voicing.length > 0) {
          isRoot = voicing[0].name === note.name && voicing[0].octave === note.octave;
       } else {
          isRoot = activeChord.notes[0] === note.name;
       }
    }

    if (active) {
       return {
         white: isRoot ? 'bg-blue-400 border-blue-600 text-white shadow-[inset_0_-10px_20px_rgba(0,0,0,0.1)]' : 'bg-blue-200 border-blue-400 text-blue-900',
         black: isRoot ? 'bg-indigo-600 border-indigo-800' : 'bg-indigo-400 border-indigo-600'
       };
    }

    return {
      white: 'bg-white border-gray-300 hover:bg-gray-100 text-gray-400',
      black: 'bg-black border-gray-800 hover:bg-gray-800'
    };
  };

  return (
    <div className="relative h-48 md:h-64 w-full bg-gray-800 rounded-lg p-2 md:p-4 overflow-x-auto shadow-inner border border-gray-700 select-none scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
      <div className="flex h-full min-w-[1200px] relative justify-center mx-auto">
        {keys.map((note, index) => {
          const styles = getKeyStyle(note);
          const isInScale = showScale && scaleNotes.includes(note.name) && !isKeyActive(note);
          const isScaleRoot = isInScale && harmonicField && note.name === harmonicField.root;
          
          if (note.isSharp) return null;
          
          const nextNote = keys[index + 1];
          const hasSharpNeighbor = nextNote?.isSharp;
          const sharpStyles = nextNote ? getKeyStyle(nextNote) : null;
          const isSharpInScale = showScale && nextNote && scaleNotes.includes(nextNote.name) && !isKeyActive(nextNote);

          return (
            <div key={note.full} className="relative group flex-1 h-full mx-[1px]">
              <button
                onMouseDown={() => onNoteClick(note.name, note.octave)}
                className={`
                  w-full h-full rounded-b-md border-b-4 transition-all duration-75 flex items-end justify-center pb-2 text-xs font-bold
                  ${styles.white}
                  active:border-b-0 active:translate-y-1 relative
                `}
              >
                {isInScale && (
                    <div className={`absolute bottom-8 w-2 h-2 rounded-full ${isScaleRoot ? 'bg-blue-500' : 'bg-gray-300 opacity-50'}`}></div>
                )}
                <span className="opacity-50 pointer-events-none mb-1 flex flex-col items-center leading-tight">
                  <span>{note.name}</span>
                  <span className="text-[9px] opacity-60 font-normal">{note.octave}</span>
                </span>
              </button>

              {hasSharpNeighbor && sharpStyles && (
                <div className="absolute top-0 -right-3 md:-right-4 w-6 md:w-8 h-[60%] z-20 pointer-events-auto">
                   <button
                    onMouseDown={() => onNoteClick(nextNote.name, nextNote.octave)}
                    className={`
                      w-full h-full rounded-b-md border-b-4 border-l border-r border-gray-900 transition-all duration-75 flex items-end justify-center pb-2 text-[10px] text-white
                      ${sharpStyles.black}
                      active:border-b-0 active:translate-y-1 shadow-lg relative
                    `}
                  >
                    {isSharpInScale && (
                        <div className="absolute bottom-4 w-1.5 h-1.5 rounded-full bg-gray-400 opacity-50"></div>
                    )}
                    <span className="opacity-0 hover:opacity-100 pointer-events-none">{nextNote.name}</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Piano;