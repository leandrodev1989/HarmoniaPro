import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { NOTES, COMMON_PROGRESSIONS } from './constants';
import { ScaleType, Chord } from './types';
import { generateHarmonicField, mapProgressionToChords, getPianoVoicing } from './utils/music';
import { getChatResponse, resetChat } from './services/gemini';
import Piano from './components/Piano';
import Guitar from './components/Guitar';
import ChordCard from './components/ChordCard';
import MusicTeacherChat, { ChatMessage } from './components/MusicTeacherChat';
import { Music, Play, Square, Guitar as GuitarIcon, Activity, Settings2, ChevronsRight, Cable, Layers, Plus, Trash2, X, ListMusic, Trophy, RefreshCw, Target, Ear, Volume2, AlertCircle, Heart, Timer, Zap } from 'lucide-react';
import { getGuitarVoicing } from './utils/guitar';
import { useMidi } from './hooks/useMidi';

// Helper para criar a curva de distorção (Overdrive)
const makeDistortionCurve = (amount: number) => {
  const k = typeof amount === 'number' ? amount : 50;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = i * 2 / n_samples - 1;
    curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
  }
  return curve;
};

// Helper para criar Impulse Response para Reverb (Profissionalização do Áudio)
const createReverbImpulse = (ctx: AudioContext, duration: number = 2, decay: number = 2) => {
  const rate = ctx.sampleRate;
  const length = rate * duration;
  const impulse = ctx.createBuffer(2, length, rate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const n = i;
    // Envelope exponencial simples para simular decaimento de sala
    const multiplier = Math.pow(1 - n / length, decay);
    left[i] = (Math.random() * 2 - 1) * multiplier;
    right[i] = (Math.random() * 2 - 1) * multiplier;
  }
  return impulse;
};

// Cache da curva de distorção para performance
const DISTORTION_CURVE = makeDistortionCurve(400);

const App: React.FC = () => {
  // --- STATE INIT WITH LOCAL STORAGE (PERSISTÊNCIA) ---
  const [rootNote, setRootNote] = useState(() => localStorage.getItem('harmonia_root') || 'C');
  const [scaleType, setScaleType] = useState<ScaleType>(() => (localStorage.getItem('harmonia_scale') as ScaleType) || ScaleType.MAJOR);
  const [instrument, setInstrument] = useState<'piano' | 'guitar'>(() => (localStorage.getItem('harmonia_instrument') as 'piano' | 'guitar') || 'piano');
  const [bpm, setBpm] = useState(() => Number(localStorage.getItem('harmonia_bpm')) || 100);

  const [harmonicField, setHarmonicField] = useState(generateHarmonicField(rootNote, scaleType));
  const [activeChord, setActiveChord] = useState<Chord | null>(null);
  
  // Ref para garantir acesso ao instrumento atual mesmo em closures antigas (loops de playback)
  const instrumentRef = useRef<'piano' | 'guitar'>(instrument);
  
  const [inversion, setInversion] = useState<0 | 1 | 2>(0);
  
  // Playback Settings
  const [playbackMode, setPlaybackMode] = useState<'block' | 'arpeggio'>('block');
  const [showScale, setShowScale] = useState(false); // Guitarra
  const [showPianoScale, setShowPianoScale] = useState(false); // Nova feature: Escala no Piano
  const [jamMode, setJamMode] = useState(false); // Baixo automatico
  
  // Metronome State (Nova Feature)
  const [isMetronomeOn, setIsMetronomeOn] = useState(false);
  const metronomeIntervalRef = useRef<number | null>(null);
  
  // MIDI State
  const [pressedKeys, setPressedKeys] = useState<{name: string, octave: number}[]>([]);

  // Sequence Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingProgressionName, setPlayingProgressionName] = useState<string | null>(null);
  const shouldStopRef = useRef(false);

  // Custom Progression State
  const [customSequence, setCustomSequence] = useState<Chord[]>([]);
  
  // Exercise Mode State
  const [isExerciseMode, setIsExerciseMode] = useState(false);
  const [exerciseType, setExerciseType] = useState<'chord' | 'ear'>('chord'); 
  const [targetChord, setTargetChord] = useState<Chord | null>(null);
  const [targetNote, setTargetNote] = useState<{name: string, octave: number} | null>(null);
  const [foundNotes, setFoundNotes] = useState<string[]>([]);
  const [exerciseScore, setExerciseScore] = useState(0);
  const [exerciseFeedback, setExerciseFeedback] = useState<'idle' | 'success' | 'wrong' | 'gameover'>('idle');
  
  // Variáveis para lógica de tentativas e estatísticas
  const [attempts, setAttempts] = useState(0); // 0 a 3
  const [earStats, setEarStats] = useState<Record<string, { hits: number, misses: number }>>({});

  const audioCtxRef = useRef<AudioContext | null>(null);
  const reverbBufferRef = useRef<AudioBuffer | null>(null);
  const mainGainRef = useRef<GainNode | null>(null); // Master volume
  
  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // --- EFFECTS ---

  // Persistência
  useEffect(() => { localStorage.setItem('harmonia_root', rootNote); }, [rootNote]);
  useEffect(() => { localStorage.setItem('harmonia_scale', scaleType); }, [scaleType]);
  useEffect(() => { localStorage.setItem('harmonia_instrument', instrument); }, [instrument]);
  useEffect(() => { localStorage.setItem('harmonia_bpm', bpm.toString()); }, [bpm]);

  // Atualiza o ref sempre que o estado mudar
  useEffect(() => {
    instrumentRef.current = instrument;
  }, [instrument]);

  useEffect(() => {
    shouldStopRef.current = true;
    setIsPlaying(false);
    setPlayingProgressionName(null);

    const field = generateHarmonicField(rootNote, scaleType);
    setHarmonicField(field);
    
    // Se estiver no modo exercício e for de acordes, reseta para o novo tom
    if (isExerciseMode && exerciseType === 'chord') {
      startExercise(field);
    } else if (!isExerciseMode) {
      setActiveChord(null);
    }
    setInversion(0);
  }, [rootNote, scaleType]);

  // Audio Context Init & Reverb Setup
  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      
      // Criar buffer de reverb uma vez
      reverbBufferRef.current = createReverbImpulse(ctx, 2.5, 2.0);
      
      // Master Gain
      const mainGain = ctx.createGain();
      mainGain.gain.value = 0.8;
      mainGain.connect(ctx.destination);
      mainGainRef.current = mainGain;
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // --- AUDIO ENGINE ---

  const playMetronomeClick = useCallback((time: number) => {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.frequency.setValueAtTime(1200, time);
    osc.frequency.exponentialRampToValueAtTime(800, time + 0.05);
    
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    
    osc.connect(gain);
    gain.connect(ctx.destination); // Metrônomo direto na saída, sem reverb
    
    osc.start(time);
    osc.stop(time + 0.05);
  }, []);

  // Efeito de Metrônomo
  useEffect(() => {
    if (isMetronomeOn) {
      const ctx = getAudioContext();
      let nextNoteTime = ctx.currentTime;
      let timerID: number;

      const schedule = () => {
        const secondsPerBeat = 60.0 / bpm;
        const lookahead = 0.1; // 100ms de antecipação

        while (nextNoteTime < ctx.currentTime + lookahead) {
          playMetronomeClick(nextNoteTime);
          nextNoteTime += secondsPerBeat;
        }
        timerID = window.setTimeout(schedule, 25);
      };

      schedule();
      return () => clearTimeout(timerID);
    }
  }, [isMetronomeOn, bpm, playMetronomeClick]);

  const connectToReverb = (ctx: AudioContext, source: AudioNode) => {
      // Dry signal
      source.connect(mainGainRef.current || ctx.destination);
      
      // Wet signal (Reverb)
      if (reverbBufferRef.current) {
          const convolver = ctx.createConvolver();
          convolver.buffer = reverbBufferRef.current;
          const reverbGain = ctx.createGain();
          reverbGain.gain.value = 0.25; // Nível do reverb
          
          source.connect(convolver);
          convolver.connect(reverbGain);
          reverbGain.connect(mainGainRef.current || ctx.destination);
      }
  };

  const playPianoTone = useCallback((ctx: AudioContext, freq: number, duration: number, velocity: number = 0.15) => {
    const t = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gainNode = ctx.createGain();

    osc.type = 'sawtooth'; // Base rica
    osc.frequency.setValueAtTime(freq, t);

    // Filtro dinâmico para simular o martelo do piano
    filter.type = 'lowpass';
    filter.Q.value = 0; 
    const attackCutoff = Math.min(12000, freq * 8); 
    const sustainCutoff = Math.max(200, freq * 1.5);
    
    filter.frequency.setValueAtTime(attackCutoff, t); 
    filter.frequency.exponentialRampToValueAtTime(sustainCutoff, t + 0.8);

    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(velocity, t + 0.01); 
    gainNode.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(filter);
    filter.connect(gainNode);
    
    // Conectar ao mixer com reverb
    connectToReverb(ctx, gainNode);

    osc.start(t);
    osc.stop(t + duration);
  }, []);

  const playGuitarTone = useCallback((ctx: AudioContext, freq: number, duration: number) => {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain(); 
    const distortion = ctx.createWaveShaper(); 
    const cabinetSim = ctx.createBiquadFilter(); 
    const midBoost = ctx.createBiquadFilter(); 

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);

    distortion.curve = DISTORTION_CURVE;
    distortion.oversample = '4x';

    cabinetSim.type = 'lowpass';
    cabinetSim.frequency.value = 3500; 
    cabinetSim.Q.value = 0.5;

    midBoost.type = 'peaking';
    midBoost.frequency.value = 1000;
    midBoost.gain.value = 5;
    midBoost.Q.value = 1;

    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(0.15, t + 0.02); 
    gainNode.gain.exponentialRampToValueAtTime(0.08, t + 0.3); 
    gainNode.gain.exponentialRampToValueAtTime(0.001, t + duration); 

    osc.connect(distortion);
    distortion.connect(midBoost);
    midBoost.connect(cabinetSim);
    cabinetSim.connect(gainNode);
    
    // Guitarra com reverb
    connectToReverb(ctx, gainNode);

    osc.start(t);
    osc.stop(t + duration);
  }, []);

  // Synthesizer Bass Tone (Sine/Triangle mix)
  const playBassTone = useCallback((ctx: AudioContext, freq: number, duration: number) => {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle'; // Fat bottom end
    osc.frequency.setValueAtTime(freq, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + 0.3); // Plucky envelope

    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(0.4, t + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination); // Bass geralmente mais seco, sem reverb ou pouco

    osc.start(t);
    osc.stop(t + duration);
  }, []);

  const playTone = useCallback((freq: number, duration: number = 1.5, velocity: number = 0.15, forceInstrument?: 'piano' | 'guitar' | 'bass') => {
    const ctx = getAudioContext();
    const instr = forceInstrument || instrumentRef.current;

    if (instr === 'guitar') {
        playGuitarTone(ctx, freq, duration + 1.5); 
    } else if (instr === 'bass') {
        playBassTone(ctx, freq, duration);
    } else {
        playPianoTone(ctx, freq, duration, velocity);
    }
  }, [playPianoTone, playGuitarTone, playBassTone]); 

  const getFreq = (noteName: string, octave: number) => {
    const noteIndex = NOTES.indexOf(noteName);
    const midi = (octave + 1) * 12 + noteIndex;
    return 440 * Math.pow(2, (midi - 69) / 12);
  };

  // --- EXERCISE LOGIC ---
  const startExercise = (field: any = harmonicField, type: 'chord' | 'ear' = exerciseType) => {
    setFoundNotes([]);
    setExerciseFeedback('idle');
    setAttempts(0); // Reseta tentativas
    setActiveChord(null);

    if (type === 'chord') {
        if (!field) return;
        const randomChord = field.chords[Math.floor(Math.random() * field.chords.length)];
        setTargetChord(randomChord);
        setTargetNote(null);
    } else {
        // EAR TRAINING
        const octaves = [3, 4];
        const randomOctave = octaves[Math.floor(Math.random() * octaves.length)];
        const randomNoteName = NOTES[Math.floor(Math.random() * NOTES.length)];
        
        const note = { name: randomNoteName, octave: randomOctave };
        setTargetNote(note);
        setTargetChord(null);

        // Toca a nota automaticamente após um pequeno delay
        setTimeout(() => {
            playTone(getFreq(note.name, note.octave), 1.0, 0.4, 'piano');
        }, 500);
    }
  };

  const replayTargetNote = () => {
      if (targetNote) {
          playTone(getFreq(targetNote.name, targetNote.octave), 1.0, 0.4, 'piano');
      }
  };

  const toggleExerciseMode = () => {
    const newMode = !isExerciseMode;
    setIsExerciseMode(newMode);
    
    if (newMode) {
      setInstrument('piano'); // Força piano para o exercício
      setExerciseScore(0);
      setEarStats({}); // Reseta estatísticas da sessão ao reentrar? Opcional.
      startExercise(harmonicField, exerciseType);
    } else {
      setTargetChord(null);
      setTargetNote(null);
      setFoundNotes([]);
    }
  };

  const changeExerciseType = (type: 'chord' | 'ear') => {
      setExerciseType(type);
      setExerciseScore(0);
      startExercise(harmonicField, type);
  }

  // Atualiza as estatísticas de erro/acerto
  const updateStats = (note: string, isHit: boolean) => {
      setEarStats(prev => {
          const current = prev[note] || { hits: 0, misses: 0 };
          return {
              ...prev,
              [note]: {
                  hits: isHit ? current.hits + 1 : current.hits,
                  misses: isHit ? current.misses : current.misses + 1
              }
          };
      });
  };

  const checkNoteInput = (noteName: string, octave: number) => {
    if (!isExerciseMode || exerciseFeedback === 'success' || exerciseFeedback === 'gameover') return;

    if (exerciseType === 'chord' && targetChord) {
        // Lógica de Acordes (mantida igual)
        if (targetChord.notes.includes(noteName)) {
            if (!foundNotes.includes(noteName)) {
                const newFound = [...foundNotes, noteName];
                setFoundNotes(newFound);
                
                // Verifica vitória
                const allFound = targetChord.notes.every(n => newFound.includes(n));
                if (allFound) {
                    setExerciseFeedback('success');
                    setExerciseScore(prev => prev + 10);
                    playChord(targetChord); 
                    setTimeout(() => startExercise(harmonicField, 'chord'), 1500);
                }
            }
        } else {
            setExerciseFeedback('wrong');
            setTimeout(() => setExerciseFeedback('idle'), 500);
        }
    } else if (exerciseType === 'ear' && targetNote) {
        // Lógica de Ouvido
        if (noteName === targetNote.name) {
            // ACERTOU
            updateStats(targetNote.name, true);
            setFoundNotes([noteName]);
            setExerciseFeedback('success');
            
            // Pontuação baseada nas tentativas restantes
            const points = 15 - (attempts * 5); 
            setExerciseScore(prev => prev + Math.max(5, points));
            
            setTimeout(() => {
                playTone(getFreq(targetNote.name, targetNote.octave), 0.5, 0.4, 'piano');
                playTone(getFreq(targetNote.name, targetNote.octave) * 1.5, 0.5, 0.3, 'piano'); 
            }, 100);

            setTimeout(() => startExercise(harmonicField, 'ear'), 1500);
        } else {
            // ERROU
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            updateStats(targetNote.name, false);

            if (newAttempts >= 3) {
                // GAME OVER (PARA ESTA NOTA)
                setExerciseFeedback('gameover');
                // Revela a nota correta
                setFoundNotes([targetNote.name]); 
                // Toca um som triste ou apenas revela
                
                setTimeout(() => {
                    startExercise(harmonicField, 'ear');
                }, 2000);
            } else {
                // TENTE NOVAMENTE
                setExerciseFeedback('wrong');
                setTimeout(() => setExerciseFeedback('idle'), 500);
            }
        }
    }
  };


  // MIDI Hooks
  const handleMidiNoteOn = useCallback((note: string, octave: number) => {
      setPressedKeys(prev => [...prev, { name: note, octave }]);
      const freq = getFreq(note, octave);
      playTone(freq, 1.0, 0.3); // Play sound on MIDI press

      // MIDI Input para exercício
      if (isExerciseMode) {
        checkNoteInput(note, octave);
      }
  }, [playTone, isExerciseMode, targetChord, targetNote, foundNotes, exerciseType, attempts]); 

  const handleMidiNoteOff = useCallback((note: string, octave: number) => {
      setPressedKeys(prev => prev.filter(k => !(k.name === note && k.octave === octave)));
  }, []);

  const { inputs: midiInputs } = useMidi(handleMidiNoteOn, handleMidiNoteOff);

  // Effect para processar teclas MIDI no modo exercício
  useEffect(() => {
    if (isExerciseMode && pressedKeys.length > 0) {
       const lastKey = pressedKeys[pressedKeys.length - 1];
       checkNoteInput(lastKey.name, lastKey.octave);
    }
  }, [pressedKeys]); // Monitora alterações nas teclas pressionadas


  const playChord = useCallback((chord: Chord, forcedInversion?: number) => {
    const inv = forcedInversion !== undefined ? forcedInversion : inversion;
    const speedMultiplier = 60 / bpm;
    
    // Sempre verifica o instrumento atual via Ref
    const currentInstrument = instrumentRef.current;

    // Play Bass Root if Jam Mode is active
    if (jamMode) {
        const root = chord.notes[0];
        const bassFreq = getFreq(root, 2);
        playTone(bassFreq, 2.0, 0.5, 'bass');
    }

    if (currentInstrument === 'guitar') {
        const voicing = getGuitarVoicing(chord);
        if (voicing.length > 0) {
            const sortedVoicing = [...voicing].sort((a, b) => a.string - b.string);
            const tuningRefs = [
                {n:'E', o:2}, {n:'A', o:2}, {n:'D', o:3}, {n:'G', o:3}, {n:'B', o:3}, {n:'E', o:4}
            ];

            sortedVoicing.forEach((pos, index) => {
                if (pos.fret === -1) return;
                const stringRef = tuningRefs[pos.string];
                const rootIndex = NOTES.indexOf(stringRef.n);
                const totalSemitones = rootIndex + pos.fret;
                const noteName = NOTES[totalSemitones % 12];
                const octaveShift = Math.floor(totalSemitones / 12);
                const octave = stringRef.o + octaveShift;

                const strumDelay = playbackMode === 'arpeggio' ? index * (200 * speedMultiplier) : index * 30;

                setTimeout(() => {
                    playTone(getFreq(noteName, octave));
                }, strumDelay);
            });
            return;
        }
    }

    // Piano Logic
    const voicingNotes = getPianoVoicing(chord, inv, 3);
    
    if (playbackMode === 'block') {
      voicingNotes.forEach((note, i) => {
        setTimeout(() => {
          playTone(getFreq(note.name, note.octave));
        }, i * 10);
      });
    } else {
      const pattern = [...voicingNotes];
      if (pattern.length === 3) {
         pattern.push({ name: pattern[0].name, octave: pattern[0].octave + 1 });
      }
      pattern.forEach((note, i) => {
         const delay = i * (250 * speedMultiplier);
         setTimeout(() => {
            playTone(getFreq(note.name, note.octave), 0.5, 0.2);
         }, delay);
      });
    }
  }, [playTone, inversion, playbackMode, bpm, jamMode]); 

  const playNote = (noteName: string, octave: number = 4) => {
    const freq = getFreq(noteName, octave); 
    playTone(freq, 0.5);

    if (isExerciseMode) {
      checkNoteInput(noteName, octave);
    }
  };

  const playChordSequence = async (chordsToPlay: Chord[], progressionName?: string) => {
    if (isPlaying) {
      shouldStopRef.current = true;
      setIsPlaying(false);
      setPlayingProgressionName(null);
      return;
    }

    setIsPlaying(true);
    if (progressionName) setPlayingProgressionName(progressionName);
    shouldStopRef.current = false;

    const chordDuration = (60 / bpm) * 4 * 1000; 
    const waitTime = playbackMode === 'arpeggio' ? Math.max(chordDuration, 1500) : Math.max(chordDuration, 1000);

    for (const chord of chordsToPlay) {
      if (shouldStopRef.current) break;

      setActiveChord(chord);
      playChord(chord, 0);

      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    setIsPlaying(false);
    setPlayingProgressionName(null);
    shouldStopRef.current = false;
  };

  const handleChordClick = (chord: Chord) => {
    if (isExerciseMode) return; // Desativa clique no card durante exercício para não dar "cola"
    setActiveChord(chord);
    setInversion(0);
    playChord(chord, 0);
  };

  const handleAddToSequence = (e: React.MouseEvent, chord: Chord) => {
    e.stopPropagation();
    setCustomSequence(prev => [...prev, chord]);
  };

  const handleRemoveFromSequence = (index: number) => {
    setCustomSequence(prev => prev.filter((_, i) => i !== index));
  };

  const handleInversionChange = (inv: 0 | 1 | 2) => {
    if (!activeChord) return;
    setInversion(inv);
    playChord(activeChord, inv);
  }

  // --- CHAT LOGIC ---
  const handleSendMessage = async (text: string) => {
    const newUserMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text };
    setChatMessages(prev => [...prev, newUserMsg]);
    setIsChatLoading(true);

    const context = `Tom: ${rootNote} ${scaleType}, Instrumento: ${instrument}, Acorde Ativo: ${activeChord ? activeChord.name : 'Nenhum'}`;
    const responseText = await getChatResponse(text, context);

    const newAiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'ai', text: responseText };
    setChatMessages(prev => [...prev, newAiMsg]);
    setIsChatLoading(false);
  };

  const handleAiExplain = (e: React.MouseEvent, chord: Chord) => {
    e.stopPropagation();
    setIsChatOpen(true);
    setActiveChord(chord);
    
    // Dispara uma pergunta automática
    const question = `Qual a função do acorde ${chord.symbol} (${chord.roman}) neste tom?`;
    handleSendMessage(question);
  };

  const handleClearHistory = () => {
    setChatMessages([]);
    resetChat();
  }

  // Calcula notas fracas para o painel de estatísticas
  const weakestNotes = useMemo(() => {
      return (Object.entries(earStats) as [string, { hits: number, misses: number }][])
          .filter(([_, stats]) => stats.misses > 0)
          .sort((a, b) => b[1].misses - a[1].misses)
          .slice(0, 3); // Top 3 erros
  }, [earStats]);

  const progressions = scaleType === ScaleType.MAJOR ? COMMON_PROGRESSIONS.MAJOR : COMMON_PROGRESSIONS.MINOR;

  const currentPianoVoicing = useMemo(() => {
    if (!activeChord || instrument === 'guitar') return undefined;
    return getPianoVoicing(activeChord, inversion, 3);
  }, [activeChord, inversion, instrument]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col font-sans selection:bg-blue-500 selection:text-white pb-20 md:pb-0">
      {/* Header */}
      <header className="bg-gray-950 border-b border-gray-800 p-4 md:p-6 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/20">
              <Music className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">Harmonia Pro</h1>
              <p className="text-xs text-gray-400">Plataforma de Harmonia Funcional</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-gray-900 p-1.5 rounded-xl border border-gray-800">
            {/* Metronome Control (NEW) */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-gray-900 border-gray-700">
                <button
                   onClick={() => setIsMetronomeOn(!isMetronomeOn)}
                   className={`p-1 rounded-full transition-colors ${isMetronomeOn ? 'text-green-400 bg-green-900/30' : 'text-gray-500 hover:text-white'}`}
                   title="Metrônomo"
                >
                    <Timer size={16} />
                </button>
            </div>

            {/* MIDI Indicator */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${midiInputs.length > 0 ? 'bg-green-900/30 border-green-800 text-green-400' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                <Cable size={14} />
                <span className="text-[10px] uppercase font-bold tracking-wider hidden sm:inline">
                    {midiInputs.length > 0 ? `${midiInputs.length} MIDI` : 'Sem MIDI'}
                </span>
            </div>

            <div className="relative">
              <select 
                value={rootNote}
                onChange={(e) => setRootNote(e.target.value)}
                className="appearance-none bg-gray-800 hover:bg-gray-700 text-white pl-4 pr-10 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer transition-colors font-mono font-bold"
              >
                {NOTES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>

            <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700">
               <button 
                 onClick={() => setScaleType(ScaleType.MAJOR)}
                 className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${scaleType === ScaleType.MAJOR ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
               >
                 Maior
               </button>
               <button 
                 onClick={() => setScaleType(ScaleType.NATURAL_MINOR)}
                 className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${scaleType === ScaleType.NATURAL_MINOR ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
               >
                 Menor
               </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 flex flex-col gap-8">
        
        {/* Visualization & Controls Section */}
        <section className="w-full space-y-4">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-gray-800/30 p-4 rounded-xl border border-gray-800">
            
            {/* Left: View Controls */}
            <div className="flex flex-wrap gap-4 w-full xl:w-auto">
                 <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                    <button
                        onClick={() => {
                            setInstrument('piano');
                            setIsExerciseMode(false); // Reseta modo se trocar manualmente
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-all ${instrument === 'piano' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        Piano
                    </button>
                    <button
                        onClick={() => {
                            setInstrument('guitar');
                            setIsExerciseMode(false);
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-all ${instrument === 'guitar' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        <GuitarIcon size={14} /> Guitarra
                    </button>
                </div>

                {instrument === 'piano' && !isExerciseMode && activeChord && (
                    <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                        {[0, 1, 2].map(i => (
                            <button
                                key={i}
                                onClick={() => handleInversionChange(i as 0|1|2)}
                                className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${inversion === i ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                {i === 0 ? 'Fund.' : `${i}ª Inv`}
                            </button>
                        ))}
                    </div>
                )}
                
                {/* NEW: Toggle Escala no Piano */}
                {instrument === 'piano' && (
                    <button
                        onClick={() => setShowPianoScale(!showPianoScale)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${showPianoScale ? 'bg-purple-600 text-white border-purple-500' : 'bg-gray-900 text-gray-400 border-gray-700'}`}
                    >
                        {showPianoScale ? 'Ocultar Escala' : 'Ver Escala'}
                    </button>
                )}

                {instrument === 'guitar' && (
                    <button
                        onClick={() => setShowScale(!showScale)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${showScale ? 'bg-purple-600 text-white border-purple-500' : 'bg-gray-900 text-gray-400 border-gray-700'}`}
                    >
                        {showScale ? 'Ocultar Escala' : 'Ver Escala'}
                    </button>
                )}
            </div>

            {/* Middle: Exercise Mode Toggle */}
            <div className="flex-1 flex justify-center">
              <button
                onClick={toggleExerciseMode}
                className={`
                   flex items-center gap-2 px-6 py-2 rounded-full font-bold border transition-all shadow-lg
                   ${isExerciseMode 
                     ? 'bg-yellow-500 text-black border-yellow-400 hover:bg-yellow-400 animate-pulse' 
                     : 'bg-gray-700 text-gray-300 border-gray-600 hover:text-white hover:bg-gray-600'}
                `}
              >
                <Trophy size={18} />
                {isExerciseMode ? 'Sair do Treino' : 'Praticar Piano'}
              </button>
            </div>

            {/* Right: Playback Controls */}
            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-end">
                <button
                    onClick={() => setJamMode(!jamMode)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${jamMode ? 'bg-orange-900/30 text-orange-400 border-orange-800' : 'bg-gray-900 text-gray-500 border-gray-700'}`}
                    title="Adicionar Baixo automático"
                >
                    <Layers size={14} />
                    Jam Mode
                </button>

                <div className="flex items-center gap-2 bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-700">
                    <Settings2 size={14} className="text-gray-400" />
                    <span className="text-xs font-mono text-gray-400">BPM</span>
                    <input 
                        type="range" 
                        min="60" 
                        max="160" 
                        value={bpm} 
                        onChange={(e) => setBpm(Number(e.target.value))}
                        className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <span className="text-xs font-bold w-6">{bpm}</span>
                </div>

                <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                    <button
                        onClick={() => setPlaybackMode('block')}
                        className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${playbackMode === 'block' ? 'bg-blue-900/50 text-blue-200 border border-blue-800' : 'text-gray-400 hover:text-white'}`}
                    >
                        Bloco
                    </button>
                    <button
                        onClick={() => setPlaybackMode('arpeggio')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold transition-all ${playbackMode === 'arpeggio' ? 'bg-blue-900/50 text-blue-200 border border-blue-800' : 'text-gray-400 hover:text-white'}`}
                    >
                        <Activity size={12} /> Arpejo
                    </button>
                </div>
            </div>
          </div>
          
          {/* Exercise Panel */}
          {isExerciseMode && (
             <div className="w-full bg-gradient-to-r from-yellow-900/40 to-gray-900 border border-yellow-700/50 rounded-xl p-6 relative overflow-hidden animate-fade-in-up">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                   {exerciseType === 'chord' ? <Target size={100} /> : <Ear size={100} />}
                </div>
                
                <div className="flex flex-col gap-6 relative z-10">
                   {/* Top Tabs & Stats */}
                   <div className="flex flex-col md:flex-row justify-between gap-4">
                       <div className="flex gap-2">
                           <button 
                             onClick={() => changeExerciseType('chord')}
                             className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors border ${exerciseType === 'chord' ? 'bg-yellow-500 text-black border-yellow-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}
                           >
                              Montar Acordes
                           </button>
                           <button 
                             onClick={() => changeExerciseType('ear')}
                             className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors border ${exerciseType === 'ear' ? 'bg-yellow-500 text-black border-yellow-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}
                           >
                              Treino de Ouvido
                           </button>
                       </div>

                       {/* Painel de Notas Fracas (Onde Melhorar) */}
                       {exerciseType === 'ear' && weakestNotes.length > 0 && (
                          <div className="bg-black/30 border border-white/10 rounded-lg px-3 py-1 flex items-center gap-3">
                              <span className="text-[10px] text-red-300 uppercase font-bold flex items-center gap-1">
                                <AlertCircle size={10} /> Onde Melhorar:
                              </span>
                              <div className="flex gap-1">
                                {weakestNotes.map(([note, stat], i) => (
                                  <span key={i} className="text-xs font-mono font-bold text-white bg-red-500/20 px-1.5 rounded" title={`${stat.misses} erros`}>
                                    {note}
                                  </span>
                                ))}
                              </div>
                          </div>
                       )}
                   </div>

                   <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="text-center md:text-left">
                          <h3 className="text-yellow-400 font-bold uppercase tracking-wider text-xs mb-1">
                              {exerciseType === 'chord' ? 'Missão: Acordes' : 'Missão: Ouvido Absoluto'}
                          </h3>
                          
                          <div className="mb-2">
                              {/* Vidas/Tentativas para Treino de Ouvido */}
                              {exerciseType === 'ear' && (
                                <div className="flex justify-center md:justify-start gap-1 mb-2">
                                    {[0, 1, 2].map(i => (
                                        <Heart 
                                          key={i} 
                                          size={16} 
                                          className={`${i < (3 - attempts) ? 'fill-red-500 text-red-500' : 'text-gray-600 fill-gray-900/50'}`} 
                                        />
                                    ))}
                                </div>
                              )}
                              <h2 className="text-3xl font-bold text-white flex items-center gap-3 justify-center md:justify-start">
                                {exerciseType === 'chord' && targetChord ? (
                                    <>Encontre: <span className="text-yellow-300">{targetChord.symbol}</span></>
                                ) : exerciseType === 'ear' && targetNote ? (
                                    <>Que nota é essa? <span className="text-yellow-300 bg-yellow-900/30 px-3 rounded">?</span></>
                                ) : 'Preparando...'}
                              </h2>
                          </div>
                          
                          <p className="text-gray-400 text-sm">
                              {exerciseType === 'chord' 
                                  ? `Toque as ${targetChord?.notes.length} notas deste acorde no piano.` 
                                  : 'Ouça o som e clique na tecla correspondente no piano. Você tem 3 tentativas.'}
                          </p>
                      </div>

                      <div className="flex gap-4 items-center">
                          {exerciseType === 'ear' && (
                              <button
                                onClick={replayTargetNote}
                                className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm shadow-lg transition-all active:scale-95"
                              >
                                  <Volume2 size={18} /> Ouvir
                              </button>
                          )}

                          <div className="bg-black/40 rounded-lg p-3 text-center min-w-[100px] border border-gray-700">
                            <span className="block text-xs text-gray-500 uppercase">Pontos</span>
                            <span className="text-2xl font-mono font-bold text-green-400">{exerciseScore}</span>
                          </div>
                          
                          <button 
                            onClick={() => startExercise(harmonicField, exerciseType)} 
                            className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
                            title="Pular"
                          >
                            <RefreshCw size={20} />
                          </button>
                      </div>
                   </div>
                </div>

                {/* Feedback Messages */}
                {exerciseFeedback === 'wrong' && (
                   <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-1 rounded-full text-xs font-bold animate-bounce shadow-lg">
                      {exerciseType === 'chord' ? 'Nota Errada!' : `Não é essa! Restam ${3 - attempts} chances.`}
                   </div>
                )}
                 {exerciseFeedback === 'gameover' && (
                   <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-900 text-red-200 px-6 py-2 rounded-full text-sm font-bold animate-pulse shadow-lg border border-red-500">
                      Errou! A nota era {targetNote?.name}.
                   </div>
                )}
                 {exerciseFeedback === 'success' && (
                   <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-1 rounded-full text-xs font-bold animate-pulse shadow-lg">
                      Correto!
                   </div>
                )}
             </div>
          )}

          <div className="transition-all duration-300">
              {instrument === 'piano' ? (
                  <Piano 
                    activeChord={activeChord} 
                    harmonicField={harmonicField} 
                    onNoteClick={playNote} 
                    voicing={currentPianoVoicing}
                    pressedKeys={pressedKeys}
                    exerciseMode={isExerciseMode}
                    foundNotes={foundNotes}
                    showScale={showPianoScale} 
                  />
              ) : (
                  <Guitar 
                    activeChord={activeChord} 
                    harmonicField={harmonicField}
                    onNoteClick={playNote} 
                    showScale={showScale}
                  />
              )}
          </div>
        </section>

        {/* Harmonic Field Grid */}
        <section className={`w-full space-y-6 transition-opacity duration-300 ${isExerciseMode ? 'opacity-50 pointer-events-none filter blur-[1px]' : 'opacity-100'}`}>
           {/* Diatonic Chords */}
           <div className="space-y-4">
               <div className="flex flex-wrap justify-between items-center gap-4">
                <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                  <span className="w-2 h-8 bg-blue-500 rounded-full inline-block"></span>
                  Acordes Diatônicos
                </h2>
                
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => playChordSequence(harmonicField.chords)}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all
                            ${isPlaying && !playingProgressionName
                                ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30' 
                                : 'bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-900/20'
                            }
                        `}
                    >
                        {isPlaying && !playingProgressionName ? <Square size={16} className="fill-current" /> : <Play size={16} className="fill-current" />}
                        {isPlaying && !playingProgressionName ? 'Parar' : 'Tocar Escala'}
                    </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4">
                {harmonicField.chords.map((chord, idx) => (
                  <ChordCard 
                    key={idx}
                    chord={chord}
                    isActive={activeChord?.symbol === chord.symbol}
                    onClick={() => handleChordClick(chord)}
                    onExplain={(e) => handleAiExplain(e, chord)}
                    onAdd={(e) => handleAddToSequence(e, chord)}
                  />
                ))}
              </div>
           </div>

           {/* Secondary Dominants (Professional Feature) */}
           {harmonicField.secondaryDominants.length > 0 && (
             <div className="space-y-4 pt-4 border-t border-gray-800">
                <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                  <span className="w-2 h-8 bg-orange-500 rounded-full inline-block"></span>
                  Dominantes Secundários
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-mono border border-orange-500/30">PRO</span>
                </h2>
                <p className="text-sm text-gray-400">Acordes de empréstimo usados para criar tensão e preparar graus específicos.</p>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
                  {harmonicField.secondaryDominants.map((chord, idx) => (
                    <ChordCard 
                      key={`sec-${idx}`}
                      chord={chord}
                      isActive={activeChord?.symbol === chord.symbol}
                      onClick={() => handleChordClick(chord)}
                      onExplain={(e) => handleAiExplain(e, chord)}
                      onAdd={(e) => handleAddToSequence(e, chord)}
                    />
                  ))}
                </div>
             </div>
           )}
        </section>

        {/* Custom Progression Builder Section */}
        <section className={`w-full bg-gray-900/50 border border-dashed border-gray-700 rounded-xl p-4 md:p-6 space-y-4 relative overflow-hidden ${isExerciseMode ? 'hidden' : ''}`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                        <ListMusic className="text-blue-400" size={20} />
                        Minha Progressão
                    </h2>
                    <p className="text-xs text-gray-400">Clique no (+) dos acordes acima para montar sua música.</p>
                </div>
                
                <div className="flex gap-2">
                    <button 
                        onClick={() => setCustomSequence([])}
                        disabled={customSequence.length === 0}
                        className="px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-red-400 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors flex items-center gap-2"
                    >
                        <Trash2 size={14} /> Limpar
                    </button>
                    <button
                        onClick={() => playChordSequence(customSequence, 'custom')}
                        disabled={customSequence.length === 0}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg
                            ${isPlaying && playingProgressionName === 'custom'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30' 
                                : 'bg-blue-600 text-white hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:shadow-none'
                            }
                        `}
                    >
                        {isPlaying && playingProgressionName === 'custom' ? <Square size={16} className="fill-current" /> : <Play size={16} className="fill-current" />}
                        {isPlaying && playingProgressionName === 'custom' ? 'Parar' : 'Tocar Progressão'}
                    </button>
                </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent min-h-[100px] items-center">
                {customSequence.length === 0 ? (
                    <div className="w-full text-center py-8 border-2 border-dashed border-gray-800 rounded-lg text-gray-600 text-sm italic">
                        Sua sequência está vazia. Adicione acordes para começar.
                    </div>
                ) : (
                    customSequence.map((chord, idx) => {
                        const isActiveInSeq = isPlaying && playingProgressionName === 'custom' && activeChord?.symbol === chord.symbol;
                        return (
                            <div key={idx} className="relative group shrink-0 animate-fade-in-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                                <div 
                                    className={`
                                        flex flex-col items-center justify-center w-24 h-24 rounded-xl border-2 transition-all cursor-pointer
                                        ${isActiveInSeq 
                                            ? 'bg-blue-500/20 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] scale-105' 
                                            : 'bg-gray-800 border-gray-700 hover:border-gray-500'
                                        }
                                    `}
                                    onClick={() => handleChordClick(chord)}
                                >
                                    <span className="text-xs text-gray-500 font-mono mb-1">{chord.roman}</span>
                                    <span className="text-xl font-bold text-white">{chord.symbol}</span>
                                </div>
                                
                                {/* Remove Button */}
                                <button 
                                    onClick={() => handleRemoveFromSequence(idx)}
                                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity scale-75 group-hover:scale-100"
                                >
                                    <X size={12} strokeWidth={3} />
                                </button>
                                
                                {idx < customSequence.length - 1 && (
                                    <div className="absolute top-1/2 -right-4 transform -translate-y-1/2 text-gray-700 z-0">
                                        <ChevronsRight size={16} />
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>
        </section>

        {/* Common Progressions */}
        <section className={`w-full space-y-4 pb-20 border-t border-gray-800 pt-8 ${isExerciseMode ? 'hidden' : ''}`}>
          <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
            <span className="w-2 h-8 bg-purple-500 rounded-full inline-block"></span>
            Progressões Comuns
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {progressions.map((prog, idx) => {
                const progChords = mapProgressionToChords(harmonicField, prog.degrees);
                const isThisPlaying = isPlaying && playingProgressionName === prog.name;

                return (
                  <div key={idx} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 flex flex-col gap-3 hover:bg-gray-800 transition-colors group">
                    <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-gray-100 group-hover:text-blue-300 transition-colors">{prog.name}</h3>
                          <p className="text-xs text-gray-400">{prog.description}</p>
                        </div>
                        <button 
                           onClick={() => playChordSequence(progChords, prog.name)}
                           className={`p-2 rounded-full transition-colors ${isThisPlaying ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white'}`}
                        >
                            {isThisPlaying ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                        </button>
                    </div>
                    <div className="flex gap-2 items-center flex-wrap">
                      {prog.degrees.map((degree, i) => {
                        const c = progChords[i];
                        const isActiveInProg = isThisPlaying && activeChord?.symbol === c?.symbol;
                        return (
                          <div key={i} className="flex items-center">
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-mono transition-all duration-300 ${isActiveInProg ? 'bg-yellow-500/20 border-yellow-500 text-yellow-200 scale-105 shadow-lg shadow-yellow-500/10' : 'bg-gray-900 border-gray-600 text-gray-300'}`}>
                                <span className="opacity-50 text-xs">{degree}</span>
                                <span className="font-bold">{c?.symbol || '?'}</span>
                            </div>
                            {i < prog.degrees.length - 1 && (
                                <ChevronsRight size={12} className="mx-1 text-gray-600" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              })}
          </div>
        </section>
      </main>

      <footer className="bg-gray-950 border-t border-gray-800 py-6 text-center text-gray-500 text-sm">
        <p>Desenvolvido para ensino prático de música.</p>
        <p className="mt-1 text-xs opacity-50">API Key necessária para o Professor Virtual (Gemini).</p>
      </footer>

      {/* Music Teacher Chat Component - Replaces old AiTutor */}
      <MusicTeacherChat 
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        isLoading={isChatLoading}
        onClearHistory={handleClearHistory}
      />
    </div>
  );
};

export default App;