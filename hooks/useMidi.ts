import { useState, useEffect } from 'react';
import { NOTES } from '../constants';

export const useMidi = (
  onNoteOn: (note: string, octave: number) => void, 
  onNoteOff: (note: string, octave: number) => void
) => {
  const [inputs, setInputs] = useState<any[]>([]);

  useEffect(() => {
    if ((navigator as any).requestMIDIAccess) {
      (navigator as any).requestMIDIAccess().then((access: any) => {
        const updateInputs = () => {
          const list = Array.from(access.inputs.values());
          setInputs(list);
          list.forEach((input: any) => {
            input.onmidimessage = (msg: any) => {
              const [command, note, velocity] = msg.data;
              const octave = Math.floor(note / 12) - 1;
              const name = NOTES[note % 12];
              
              if (command === 144 && velocity > 0) onNoteOn(name, octave);
              else if (command === 128 || (command === 144 && velocity === 0)) onNoteOff(name, octave);
            };
          });
        };
        updateInputs();
        access.onstatechange = updateInputs;
      });
    }
  }, [onNoteOn, onNoteOff]);

  return { inputs };
};