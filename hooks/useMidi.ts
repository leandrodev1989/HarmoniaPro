import { useState, useEffect } from 'react';
import { NOTES } from '../constants';

// Define types locally to avoid namespace errors if @types/webmidi is missing
type MIDIAccess = any;
type MIDIInput = any;
type MIDIMessageEvent = { data: Uint8Array };

export const useMidi = (onNoteOn: (note: string, octave: number) => void, onNoteOff: (note: string, octave: number) => void) => {
  const [midiAccess, setMidiAccess] = useState<MIDIAccess | null>(null);
  const [inputs, setInputs] = useState<MIDIInput[]>([]);

  useEffect(() => {
    if ((navigator as any).requestMIDIAccess) {
      (navigator as any).requestMIDIAccess()
        .then(onMIDISuccess, onMIDIFailure);
    }
  }, []);

  const onMIDISuccess = (access: MIDIAccess) => {
    setMidiAccess(access);
    const inputIterator = access.inputs.values();
    const inputsList = [];
    for (let input = inputIterator.next(); !input.done; input = inputIterator.next()) {
      inputsList.push(input.value);
      input.value.onmidimessage = getMIDIMessage;
    }
    setInputs(inputsList);
  };

  const onMIDIFailure = () => {
    console.warn('Could not access your MIDI devices.');
  };

  const getMIDIMessage = (message: MIDIMessageEvent) => {
    const command = message.data[0];
    const note = message.data[1];
    const velocity = (message.data.length > 2) ? message.data[2] : 0;

    // a velocity value might not be included with a noteOff command
    switch (command) {
      case 144: // noteOn
        if (velocity > 0) {
          handleNoteOn(note, velocity);
        } else {
          handleNoteOff(note);
        }
        break;
      case 128: // noteOff
        handleNoteOff(note);
        break;
    }
  };

  const handleNoteOn = (midiNote: number, velocity: number) => {
    const { name, octave } = midiToNote(midiNote);
    onNoteOn(name, octave);
  };

  const handleNoteOff = (midiNote: number) => {
    const { name, octave } = midiToNote(midiNote);
    onNoteOff(name, octave);
  };

  const midiToNote = (midi: number) => {
    const octave = Math.floor(midi / 12) - 1;
    const noteIndex = midi % 12;
    return { name: NOTES[noteIndex], octave };
  };

  return { inputs };
};