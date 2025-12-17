export enum ScaleType {
  MAJOR = 'Maior',
  NATURAL_MINOR = 'Menor Natural'
}

export interface Note {
  name: string; // e.g., "C", "C#"
  full: string; // e.g., "C4", "C#4"
  octave: number;
  isSharp: boolean;
  midi: number;
}

export interface Chord {
  roman: string; // e.g., "I", "ii"
  name: string; // e.g., "C Major", "D Minor"
  symbol: string; // e.g., "C", "Dm"
  notes: string[]; // e.g., ["C", "E", "G"]
  type: 'Major' | 'Minor' | 'Diminished' | 'Dominant7';
  intervals: number[]; // Semitones from root
  function?: string; // Tônica, Subdominante, etc.
  category?: 'diatonic' | 'secondary'; // Novo: diferencia o campo natural dos empréstimos
}

export interface HarmonicField {
  root: string;
  scale: ScaleType;
  chords: Chord[];
  secondaryDominants: Chord[]; // Novo array para dominantes secundários
}

export interface Progression {
  name: string;
  degrees: string[]; // e.g. ["I", "V", "vi", "IV"]
  description: string;
}

export interface AiExplanationState {
  loading: boolean;
  text: string | null;
  error: string | null;
}