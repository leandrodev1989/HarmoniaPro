import React, { useMemo } from 'react';
import { NOTES } from '../constants';
import { Chord, Note, HarmonicField } from '../types';

interface PianoProps {
  activeChord: Chord | null;
  harmonicField?: HarmonicField;
  onNoteClick: (note: string, octave: number) => void;
  voicing?: { name: string; octave: number }[];
  pressedKeys?: { name: string; octave: number }[]; 
  exerciseMode?: boolean;
  foundNotes?: string[];
  showScale?: boolean;
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
  const keys = useMemo(() => {
    const generatedKeys: Note[] = [];
    const octaves = [2, 3, 4, 5];
    octaves.forEach(octave => {
      NOTES.forEach(noteName => {
        generatedKeys.push({ name: noteName, full: `${noteName}${octave}`, octave, isSharp: noteName.includes('#'), midi: 0 });
      });
    });
    generatedKeys.push({ name: 'C', full: 'C6', octave: 6, isSharp: false, midi: 0 });
    return generatedKeys;
  }, []);

  const scaleNotes = useMemo(() => {
    if (!harmonicField || !showScale) return [];
    const notes = new Set<string>();
    harmonicField.chords.forEach(chord => {
        if(chord.category === 'diatonic') chord.notes.forEach(n => notes.add(n));
    });
    return Array.from(notes);
  }, [harmonicField, showScale]);

  const isKeyActive = (note: Note) => {
    const isMidiPressed = pressedKeys.some(k => k.name === note.name && k.octave === note.octave);
    if (isMidiPressed) return true;
    if (exerciseMode) return foundNotes.includes(note.name);
    if (!activeChord) return false;
    if (voicing && voicing.length > 0) return voicing.some(v => v.name === note.name && v.octave === note.octave);
    return activeChord.notes.includes(note.name);
  };

  const getKeyStyle = (note: Note) => {
    const isMidiPressed = pressedKeys.some(k => k.name === note.name && k.octave === note.octave);
    if (isMidiPressed) {
       return {
         white: 'bg-yellow-400 dark:bg-yellow-500 border-yellow-600 text-yellow-900 shadow-[inset_0_-4px_8px_rgba(0,0,0,0.2)]',
         black: 'bg-yellow-600 border-yellow-800'
       }
    }
    if (exerciseMode && foundNotes.includes(note.name)) {
        return {
          white: 'bg-green-400 dark:bg-green-500 border-green-600 text-white shadow-[inset_0_-4px_8px_rgba(0,0,0,0.2)]',
          black: 'bg-green-600 border-green-800'
        };
    }
    const active = isKeyActive(note);
    let isRoot = false;
    if (active && activeChord && !exerciseMode) {
       if (voicing && voicing.length > 0) isRoot = voicing[0].name === note.name && voicing[0].octave === note.octave;
       else isRoot = activeChord.notes[0] === note.name;
    }
    if (active) {
       return {
         white: isRoot ? 'bg-blue-500 border-blue-700 text-white shadow-[inset_0_-4px_8px_rgba(0,0,0,0.2)]' : 'bg-blue-200 dark:bg-indigo-400 border-blue-400 text-blue-900',
         black: isRoot ? 'bg-indigo-600 border-indigo-800' : 'bg-indigo-400 border-indigo-600'
       };
    }
    return {
      white: 'bg-white dark:bg-gray-100 border-gray-200 dark:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-200 text-gray-400 dark:text-gray-500',
      black: 'bg-gray-900 dark:bg-black border-gray-700 dark:border-gray-800 hover:bg-gray-800 dark:hover:bg-gray-900'
    };
  };

  return (
    <div className="relative h-48 md:h-64 w-full bg-gray-200 dark:bg-gray-800 rounded-xl p-2 md:p-4 overflow-x-auto shadow-inner border border-gray-300 dark:border-gray-700 select-none scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
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
                className={`w-full h-full rounded-b-md border-b-[6px] transition-all duration-75 flex items-end justify-center pb-3 text-[10px] md:text-xs font-bold ${styles.white} active:border-b-0 active:translate-y-[2px] shadow-sm`}
              >
                {isInScale && <div className={`absolute bottom-10 w-2 h-2 rounded-full ${isScaleRoot ? 'bg-blue-600 dark:bg-blue-400 shadow-[0_0_8px_rgba(37,99,235,0.5)]' : 'bg-gray-400 dark:bg-gray-300 opacity-40'}`}></div>}
                <span className="opacity-40 pointer-events-none mb-1 flex flex-col items-center leading-tight">
                  <span>{note.name}</span>
                  <span className="text-[9px] opacity-60 font-normal">{note.octave}</span>
                </span>
              </button>
              {hasSharpNeighbor && sharpStyles && (
                <div className="absolute top-0 -right-3 md:-right-4 w-6 md:w-8 h-[60%] z-20 pointer-events-auto">
                   <button
                    onMouseDown={() => onNoteClick(nextNote.name, nextNote.octave)}
                    className={`w-full h-full rounded-b-md border-b-[4px] border-l border-r border-gray-900/10 transition-all duration-75 flex items-end justify-center pb-3 text-[10px] text-white ${sharpStyles.black} active:border-b-0 active:translate-y-[2px] shadow-lg`}
                  >
                    {isSharpInScale && <div className="absolute bottom-6 w-1.5 h-1.5 rounded-full bg-gray-400 opacity-50"></div>}
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