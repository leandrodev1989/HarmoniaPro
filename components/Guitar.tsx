import React, { useMemo } from 'react';
import { NOTES } from '../constants';
import { Chord, HarmonicField } from '../types';
import { getGuitarVoicing, GuitarPosition } from '../utils/guitar';

interface GuitarProps {
  activeChord: Chord | null;
  harmonicField: HarmonicField;
  onNoteClick: (note: string, octave: number) => void;
  showScale: boolean;
}

const TUNING = [
  { name: 'E', octave: 4 }, // 1ª Corda
  { name: 'B', octave: 3 }, // 2ª
  { name: 'G', octave: 3 }, // 3ª
  { name: 'D', octave: 3 }, // 4ª
  { name: 'A', octave: 2 }, // 5ª
  { name: 'E', octave: 2 }, // 6ª Corda
];

const Guitar: React.FC<GuitarProps> = ({ activeChord, harmonicField, onNoteClick, showScale }) => {
  const frets = Array.from({ length: 13 }, (_, i) => i);

  const voicing = useMemo(() => getGuitarVoicing(activeChord), [activeChord]);

  // Extrair todas as notas da escala atual para visualização
  const scaleNotes = useMemo(() => {
    // Flatten all notes from all chords in the field to get unique notes of the scale
    const notes = new Set<string>();
    harmonicField.chords.forEach(chord => {
        if(chord.category === 'diatonic') {
            chord.notes.forEach(n => notes.add(n));
        }
    });
    return Array.from(notes);
  }, [harmonicField]);

  const getNote = (stringOpenNote: string, stringOpenOctave: number, fret: number) => {
    const rootIndex = NOTES.indexOf(stringOpenNote);
    const totalSemitones = rootIndex + fret;
    const noteIndex = totalSemitones % 12;
    const octaveShift = Math.floor(totalSemitones / 12);
    return {
      name: NOTES[noteIndex],
      octave: stringOpenOctave + octaveShift
    };
  };

  const getActivePosition = (stringIndex: number, fret: number): GuitarPosition | undefined => {
    if (!activeChord || voicing.length === 0) return undefined;
    const voicingStringIndex = 5 - stringIndex;
    return voicing.find(p => p.string === voicingStringIndex && p.fret === fret);
  };
  
  const isStringMuted = (stringIndex: number): boolean => {
      if (!activeChord || voicing.length === 0) return false;
      const voicingStringIndex = 5 - stringIndex;
      return voicing.some(p => p.string === voicingStringIndex && p.fret === -1);
  };

  return (
    <div className="w-full overflow-x-auto bg-gray-900 rounded-lg p-4 md:p-6 border border-gray-700 shadow-inner select-none">
      <div className="min-w-[600px] relative">
        {/* Marcadores */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
             {[3, 5, 7, 9, 12].map(fret => (
                 <div key={fret} className="absolute flex flex-col justify-center h-full" style={{ left: `${(fret * (100/13)) - (50/13)}%`, width: `${100/13}%` }}>
                     <div className={`w-3 h-3 bg-gray-700 rounded-full self-center opacity-40 ${fret === 12 ? '-translate-y-3' : ''}`}></div>
                     {fret === 12 && <div className="w-3 h-3 bg-gray-700 rounded-full self-center opacity-40 translate-y-3"></div>}
                 </div>
             ))}
        </div>

        {/* Nut */}
        <div className="absolute left-[calc(7.69%-4px)] top-0 h-full w-2 bg-gray-600 z-0"></div>

        <div className="flex flex-col gap-4 py-2 pl-4">
          {TUNING.map((stringInfo, stringIndex) => {
            const muted = isStringMuted(stringIndex);

            return (
                <div key={stringIndex} className="flex relative h-4 items-center">
                <div 
                    className={`absolute w-full shadow-sm z-0 ${muted ? 'bg-gray-700 opacity-30' : 'bg-yellow-700/80'}`}
                    style={{ height: `${stringIndex + 1}px` }} 
                ></div>
                
                {muted && (
                     <div className="absolute -left-6 text-red-500 font-bold text-xs">✕</div>
                )}

                {frets.map(fret => {
                    const { name, octave } = getNote(stringInfo.name, stringInfo.octave, fret);
                    
                    const activePos = getActivePosition(stringIndex, fret);
                    const isActive = !!activePos;
                    const finger = activePos?.finger;
                    const isRoot = isActive && activeChord?.notes[0] === name;

                    // Lógica de visualização da Escala
                    const isInScale = showScale && !isActive && scaleNotes.includes(name);
                    const isScaleRoot = isInScale && name === harmonicField.root;

                    const canInteract = !activeChord || isActive || showScale;

                    return (
                    <div 
                        key={fret} 
                        className={`
                            flex-1 flex justify-center items-center z-10 relative h-10 border-r border-gray-800
                            ${fret === 0 ? 'w-16 flex-none border-r-4 border-gray-500' : ''}
                        `}
                    >
                        {/* Nota da Escala (Bolinha pequena) */}
                        {isInScale && (
                            <div className={`
                                absolute w-3 h-3 rounded-full pointer-events-none transition-all
                                ${isScaleRoot ? 'bg-blue-500 opacity-80' : 'bg-gray-500 opacity-40'}
                            `}></div>
                        )}

                        <button
                        onMouseDown={() => {
                            if (canInteract) onNoteClick(name, octave);
                        }}
                        className={`
                            w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-150 relative
                            ${isActive 
                            ? (isRoot 
                                ? 'bg-blue-600 text-white ring-2 ring-blue-400 scale-110 z-20 shadow-[0_0_15px_rgba(37,99,235,0.6)]' 
                                : 'bg-blue-400 text-blue-900 scale-100 z-20') 
                            : 'opacity-0 hover:opacity-100 bg-gray-600 text-white hover:scale-75'}
                            ${muted ? 'cursor-not-allowed hover:opacity-0' : ''}
                        `}
                        >
                        {finger ? finger : (isActive || fret === 0 ? name : '')}
                        </button>
                    </div>
                    );
                })}
                </div>
            )
          })}
        </div>
        
        <div className="flex text-gray-500 text-[10px] mt-2 text-center border-t border-gray-800 pt-1 pl-4">
             {frets.map(f => (
                 <div key={f} className="flex-1">{f}</div>
             ))}
        </div>
      </div>
    </div>
  );
};

export default Guitar;