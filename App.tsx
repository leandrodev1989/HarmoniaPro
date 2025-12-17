
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { NOTES, COMMON_PROGRESSIONS } from './constants';
import { ScaleType, Chord } from './types';
import { generateHarmonicField, mapProgressionToChords, getPianoVoicing } from './utils/music';
import { getChatResponse, resetChat } from './services/gemini';
import Piano from './components/Piano';
import Guitar from './components/Guitar';
import ChordCard from './components/ChordCard';
import MusicTeacherChat, { ChatMessage } from './components/MusicTeacherChat';
import { Music, Play, Square, Guitar as GuitarIcon, Activity, Settings2, ChevronsRight, Cable, Layers, Plus, Trash2, X, ListMusic, Trophy, RefreshCw, Target, Ear, Volume2, AlertCircle, Heart, Timer, Zap, Sun, Moon } from 'lucide-react';
import { getGuitarVoicing } from './utils/guitar';
import { useMidi } from './hooks/useMidi';

const App: React.FC = () => {
  // --- ESTADOS ---
  const [rootNote, setRootNote] = useState(() => localStorage.getItem('harmonia_root') || 'C');
  const [scaleType, setScaleType] = useState<ScaleType>(() => (localStorage.getItem('harmonia_scale') as ScaleType) || ScaleType.MAJOR);
  const [instrument, setInstrument] = useState<'piano' | 'guitar'>(() => (localStorage.getItem('harmonia_instrument') as 'piano' | 'guitar') || 'piano');
  const [bpm, setBpm] = useState(() => Number(localStorage.getItem('harmonia_bpm')) || 100);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('harmonia_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [harmonicField, setHarmonicField] = useState(generateHarmonicField(rootNote, scaleType));
  const [activeChord, setActiveChord] = useState<Chord | null>(null);
  const [inversion, setInversion] = useState<0 | 1 | 2>(0);
  const [playbackMode, setPlaybackMode] = useState<'block' | 'arpeggio'>('block');
  const [showPianoScale, setShowPianoScale] = useState(false); 
  const [pressedKeys, setPressedKeys] = useState<{name: string, octave: number}[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingProgressionName, setPlayingProgressionName] = useState<string | null>(null);
  const shouldStopRef = useRef(false);

  // Sequência Customizada
  const [customSequence, setCustomSequence] = useState<Chord[]>([]);

  // Estados do Treino
  const [isExerciseMode, setIsExerciseMode] = useState(false);
  const [exerciseType, setExerciseType] = useState<'chord' | 'ear'>('chord'); 
  const [targetChord, setTargetChord] = useState<Chord | null>(null);
  const [targetNote, setTargetNote] = useState<{name: string, octave: number} | null>(null);
  const [foundNotes, setFoundNotes] = useState<string[]>([]);
  const [exerciseScore, setExerciseScore] = useState(0);
  const [exerciseFeedback, setExerciseFeedback] = useState<'idle' | 'success' | 'wrong' | 'gameover'>('idle');
  const [attempts, setAttempts] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const mainGainRef = useRef<GainNode | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // --- EFEITOS ---
  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('harmonia_theme', theme);
  }, [theme]);

  useEffect(() => {
    const field = generateHarmonicField(rootNote, scaleType);
    setHarmonicField(field);
    localStorage.setItem('harmonia_root', rootNote);
    localStorage.setItem('harmonia_scale', scaleType);
  }, [rootNote, scaleType]);

  // --- ÁUDIO ---
  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const mainGain = ctx.createGain();
      mainGain.gain.value = 0.8;
      mainGain.connect(ctx.destination);
      mainGainRef.current = mainGain;
    }
    return audioCtxRef.current;
  };

  const playTone = useCallback((freq: number, duration: number = 1.2, velocity: number = 0.15) => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gainNode = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(12000, freq * 8), t); 
    filter.frequency.exponentialRampToValueAtTime(Math.max(200, freq * 1.5), t + 0.8);

    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(velocity, t + 0.01); 
    gainNode.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(mainGainRef.current || ctx.destination);

    osc.start(t);
    osc.stop(t + duration);
  }, []);

  const getFreq = (noteName: string, octave: number) => {
    const noteIndex = NOTES.indexOf(noteName);
    const midi = (octave + 1) * 12 + noteIndex;
    return 440 * Math.pow(2, (midi - 69) / 12);
  };

  // --- LÓGICA DE EXERCÍCIO ---
  const startExercise = useCallback((field: any = harmonicField, type: 'chord' | 'ear' = exerciseType) => {
    setFoundNotes([]);
    setExerciseFeedback('idle');
    setAttempts(0); 
    setActiveChord(null);
    if (type === 'chord') {
        const randomChord = field.chords[Math.floor(Math.random() * field.chords.length)];
        setTargetChord(randomChord);
        setTargetNote(null);
    } else {
        const note = { name: NOTES[Math.floor(Math.random() * NOTES.length)], octave: 4 };
        setTargetNote(note);
        setTargetChord(null);
        setTimeout(() => playTone(getFreq(note.name, note.octave), 1.5, 0.4), 500);
    }
  }, [harmonicField, exerciseType, playTone]);

  const checkNoteInput = (noteName: string, octave: number) => {
    if (!isExerciseMode || exerciseFeedback === 'success' || exerciseFeedback === 'gameover') return;
    
    if (exerciseType === 'chord' && targetChord) {
        if (targetChord.notes.includes(noteName)) {
            if (!foundNotes.includes(noteName)) {
                const newFound = [...foundNotes, noteName];
                setFoundNotes(newFound);
                if (targetChord.notes.every(n => newFound.includes(n))) {
                    setExerciseFeedback('success');
                    setExerciseScore(prev => prev + 10);
                    setTimeout(() => startExercise(harmonicField, 'chord'), 1500);
                }
            }
        } else {
            setExerciseFeedback('wrong');
            setTimeout(() => setExerciseFeedback('idle'), 600);
        }
    } else if (exerciseType === 'ear' && targetNote) {
        if (noteName === targetNote.name) {
            setExerciseFeedback('success');
            setExerciseScore(prev => prev + Math.max(5, 15 - attempts * 5));
            setTimeout(() => startExercise(harmonicField, 'ear'), 1500);
        } else {
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            if (newAttempts >= 3) {
                setExerciseFeedback('gameover');
                setTimeout(() => startExercise(harmonicField, 'ear'), 2000);
            } else {
                setExerciseFeedback('wrong');
                setTimeout(() => setExerciseFeedback('idle'), 600);
            }
        }
    }
  };

  // --- MIDI ---
  const handleMidiNoteOn = useCallback((note: string, octave: number) => {
      setPressedKeys(prev => [...prev, { name: note, octave }]);
      playTone(getFreq(note, octave), 1.5, 0.3);
      if (isExerciseMode) checkNoteInput(note, octave);
  }, [playTone, isExerciseMode, targetChord, targetNote, foundNotes, exerciseType, attempts]); 

  const handleMidiNoteOff = useCallback((note: string, octave: number) => {
      setPressedKeys(prev => prev.filter(k => !(k.name === note && k.octave === octave)));
  }, []);

  const { inputs: midiInputs } = useMidi(handleMidiNoteOn, handleMidiNoteOff);

  // --- REPRODUÇÃO ---
  const playChord = useCallback((chord: Chord, forcedInversion?: number) => {
    const inv = forcedInversion !== undefined ? forcedInversion : inversion;
    const voicingNotes = getPianoVoicing(chord, inv, 3);
    voicingNotes.forEach((note, i) => {
      const delay = playbackMode === 'block' ? i * 15 : i * 250;
      setTimeout(() => playTone(getFreq(note.name, note.octave), 1.5, 0.25), delay);
    });
  }, [playTone, inversion, playbackMode]);

  const playChordSequence = async (chords: Chord[], progName: string = 'seq') => {
    if (isPlaying) {
        shouldStopRef.current = true;
        return;
    }
    setIsPlaying(true);
    setPlayingProgressionName(progName);
    shouldStopRef.current = false;

    const beatDuration = (60 / bpm) * 1000;

    for (const chord of chords) {
        if (shouldStopRef.current) break;
        setActiveChord(chord);
        playChord(chord);
        await new Promise(resolve => setTimeout(resolve, beatDuration * 2)); 
    }

    setIsPlaying(false);
    setPlayingProgressionName(null);
    setActiveChord(null);
    shouldStopRef.current = false;
  };

  const handleChordClick = (chord: Chord) => {
    if (isExerciseMode) return;
    setActiveChord(chord);
    setInversion(0);
    playChord(chord, 0);
  };

  // --- IA E UI ---
  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text };
    setChatMessages(prev => [...prev, userMsg]);
    setIsChatLoading(true);
    const context = `Tom: ${rootNote} ${scaleType}, Ativo: ${activeChord?.symbol || 'Nenhum'}`;
    const responseText = await getChatResponse(text, context);
    setChatMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: responseText }]);
    setIsChatLoading(false);
  };

  const handleAiExplain = (e: React.MouseEvent, chord: Chord) => {
    e.stopPropagation();
    setIsChatOpen(true);
    handleSendMessage(`Me explique a função harmônica do acorde ${chord.symbol} em ${rootNote} ${scaleType}.`);
  };

  const addToCustomSequence = (e: React.MouseEvent, chord: Chord) => {
    e.stopPropagation();
    setCustomSequence(prev => [...prev, chord]);
  };

  const removeFromCustomSequence = (index: number) => {
    setCustomSequence(prev => prev.filter((_, i) => i !== index));
  };

  const progressions = scaleType === ScaleType.MAJOR ? COMMON_PROGRESSIONS.MAJOR : COMMON_PROGRESSIONS.MINOR;

  return (
    <div className="min-h-screen transition-colors duration-300 bg-slate-50 dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col pb-20 md:pb-0">
      <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 p-4 md:p-6 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Music className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Harmonia Pro</h1>
              <p className="text-xs text-gray-500">Prática Direta e Teoria</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-gray-100 dark:bg-gray-900 p-1.5 rounded-xl border border-gray-200 dark:border-gray-800">
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 text-gray-600 dark:text-yellow-400">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="relative">
              <select value={rootNote} onChange={(e) => setRootNote(e.target.value)} className="appearance-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white pl-4 pr-10 py-2 rounded-lg border border-gray-200 dark:border-gray-700 font-bold">
                {NOTES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
               <button onClick={() => setScaleType(ScaleType.MAJOR)} className={`px-4 py-1.5 rounded-md text-sm font-medium ${scaleType === ScaleType.MAJOR ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500'}`}>Maior</button>
               <button onClick={() => setScaleType(ScaleType.NATURAL_MINOR)} className={`px-4 py-1.5 rounded-md text-sm font-medium ${scaleType === ScaleType.NATURAL_MINOR ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500'}`}>Menor</button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 flex flex-col gap-8">
        <section className="w-full space-y-4">
          <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-white dark:bg-gray-800/30 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
            <div className="flex gap-4">
                 <div className="flex bg-gray-100 dark:bg-gray-900 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                    <button onClick={() => { setInstrument('piano'); setIsExerciseMode(false); }} className={`px-3 py-1.5 rounded text-xs font-bold ${instrument === 'piano' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-white shadow-sm' : 'text-gray-500'}`}>Teclado</button>
                    <button onClick={() => { setInstrument('guitar'); setIsExerciseMode(false); }} className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold ${instrument === 'guitar' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-white shadow-sm' : 'text-gray-500'}`}><GuitarIcon size={14} /> Violão</button>
                </div>
                <button onClick={() => setShowPianoScale(!showPianoScale)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${showPianoScale ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-200'}`}>{showPianoScale ? 'Ocultar Escala' : 'Ver Escala'}</button>
            </div>
            
            <button onClick={() => { setIsExerciseMode(!isExerciseMode); if(!isExerciseMode) startExercise(); }} className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold border transition-all ${isExerciseMode ? 'bg-yellow-500 text-black border-yellow-400 animate-pulse' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200'}`}><Trophy size={18} /> {isExerciseMode ? 'Sair do Treino' : 'Treinar Ouvido'}</button>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white dark:bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                <Settings2 size={14} className="text-gray-400" />
                <span className="text-xs font-mono">{bpm} BPM</span>
                <input type="range" min="60" max="180" value={bpm} onChange={(e) => setBpm(Number(e.target.value))} className="w-20 h-1 appearance-none bg-gray-200 rounded-full accent-blue-600" />
              </div>
            </div>
          </div>

          {isExerciseMode && (
             <div className="w-full bg-white dark:bg-gradient-to-r dark:from-yellow-900/40 dark:to-gray-900 border border-yellow-200 dark:border-yellow-700/50 rounded-xl p-6 animate-fade-in-up shadow-lg">
                <div className="flex flex-col gap-4">
                   <div className="flex gap-2">
                       <button onClick={() => { setExerciseType('chord'); startExercise(harmonicField, 'chord'); }} className={`px-4 py-1.5 rounded-lg text-xs font-bold border ${exerciseType === 'chord' ? 'bg-yellow-500 text-black' : 'bg-gray-100 dark:bg-gray-800'}`}>Achar Acordes</button>
                       <button onClick={() => { setExerciseType('ear'); startExercise(harmonicField, 'ear'); }} className={`px-4 py-1.5 rounded-lg text-xs font-bold border ${exerciseType === 'ear' ? 'bg-yellow-500 text-black' : 'bg-gray-100 dark:bg-gray-800'}`}>Adivinhar Notas</button>
                   </div>
                   
                   <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                      <div>
                          <h2 className="text-3xl font-bold">
                            {exerciseType === 'chord' ? (
                                <>Ache o acorde: <span className="text-blue-600 dark:text-yellow-300">{targetChord?.symbol}</span></>
                            ) : (
                                <>Que nota é essa?</>
                            )}
                          </h2>
                          {exerciseType === 'ear' && <div className="flex gap-1 mt-2">
                            {[0,1,2].map(i => <Heart key={i} size={16} className={i < (3-attempts) ? 'fill-red-500 text-red-500' : 'text-gray-300'} />)}
                          </div>}
                      </div>

                      <div className="flex gap-3 items-center">
                          {exerciseType === 'ear' && (
                              <button onClick={() => playTone(getFreq(targetNote!.name, targetNote!.octave), 1.5, 0.4)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-lg"><Volume2 size={18} /> Ouvir Nota</button>
                          )}
                          <div className="bg-gray-100 dark:bg-black/40 rounded-lg px-4 py-2 border border-gray-200">
                            <span className="block text-[10px] text-gray-500 uppercase font-bold">Pontos</span>
                            <span className="text-xl font-mono font-bold text-blue-600 dark:text-green-400">{exerciseScore}</span>
                          </div>
                          <button onClick={() => startExercise()} className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200"><RefreshCw size={20} /></button>
                      </div>
                   </div>
                   
                   {exerciseFeedback !== 'idle' && (
                     <div className={`text-center py-2 px-4 rounded-lg font-bold ${exerciseFeedback === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {exerciseFeedback === 'success' ? 'Boa! Continue assim.' : exerciseFeedback === 'wrong' ? 'Opa, essa não...' : `Fim! A nota era ${targetNote?.name}`}
                     </div>
                   )}
                </div>
             </div>
          )}

          <div className="transition-all duration-300">
              {instrument === 'piano' ? (
                  <Piano 
                    activeChord={activeChord} 
                    harmonicField={harmonicField} 
                    onNoteClick={(n, o) => { playTone(getFreq(n, o)); if(isExerciseMode) checkNoteInput(n, o); }} 
                    voicing={activeChord ? getPianoVoicing(activeChord, inversion, 3) : undefined}
                    pressedKeys={pressedKeys}
                    exerciseMode={isExerciseMode}
                    foundNotes={foundNotes}
                    showScale={showPianoScale} 
                  />
              ) : (
                  <Guitar 
                    activeChord={activeChord} 
                    harmonicField={harmonicField}
                    onNoteClick={(n, o) => playTone(getFreq(n, o))} 
                    showScale={showPianoScale}
                  />
              )}
          </div>
        </section>

        {/* SEQUÊNCIA PERSONALIZADA */}
        {!isExerciseMode && (
          <section className="w-full bg-white dark:bg-gray-800/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-1.5 rounded-lg">
                  <ListMusic size={20} className="text-white" />
                </div>
                <h2 className="text-lg font-bold">Minha Sequência</h2>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => playChordSequence(customSequence, 'custom')} 
                  disabled={customSequence.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 disabled:bg-gray-400 text-white rounded-lg font-bold transition-colors"
                >
                  {isPlaying && playingProgressionName === 'custom' ? <Square size={16} fill="white" /> : <Play size={16} fill="white" />}
                  Tocar Sequência
                </button>
                <button 
                  onClick={() => setCustomSequence([])}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="Limpar tudo"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 min-h-[80px] p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 overflow-x-auto">
              {customSequence.length === 0 ? (
                <div className="flex items-center justify-center w-full text-gray-400 text-sm italic">
                  Clique no "+" nos acordes abaixo para montar sua música!
                </div>
              ) : (
                customSequence.map((chord, idx) => (
                  <div key={idx} className="relative group animate-fade-in-up">
                    <div 
                      className={`px-6 py-4 bg-white dark:bg-gray-800 border rounded-xl shadow-sm text-center min-w-[100px] cursor-pointer hover:border-blue-500 transition-all ${activeChord === chord && isPlaying ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200 dark:border-gray-700'}`}
                      onClick={() => handleChordClick(chord)}
                    >
                      <span className="block text-2xl font-black">{chord.symbol}</span>
                      <span className="block text-[10px] uppercase text-gray-400">{chord.roman}</span>
                    </div>
                    <button 
                      onClick={() => removeFromCustomSequence(idx)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        <section className={`w-full space-y-12 ${isExerciseMode ? 'opacity-30 pointer-events-none' : ''}`}>
           {/* Campo Diatônico */}
           <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-black flex items-center gap-3"><span className="w-2 h-8 bg-blue-500 rounded-full"></span> Campo Diatônico</h2>
                <button onClick={() => playChordSequence(harmonicField.chords, 'field')} className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg font-bold">
                    {isPlaying && playingProgressionName === 'field' ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                    Ouvir Escala
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {harmonicField.chords.map((chord, idx) => (
                  <ChordCard 
                    key={idx} 
                    chord={chord} 
                    isActive={activeChord?.symbol === chord.symbol} 
                    onClick={() => handleChordClick(chord)} 
                    onExplain={(e) => handleAiExplain(e, chord)}
                    onAdd={(e) => addToCustomSequence(e, chord)}
                  />
                ))}
              </div>
           </div>

           {/* Dominantes Secundárias */}
           {harmonicField.secondaryDominants.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-black flex items-center gap-3"><span className="w-2 h-8 bg-amber-500 rounded-full"></span> Dominantes Secundárias</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {harmonicField.secondaryDominants.map((chord, idx) => (
                    <ChordCard 
                      key={idx} 
                      chord={chord} 
                      isActive={activeChord?.symbol === chord.symbol} 
                      onClick={() => handleChordClick(chord)} 
                      onExplain={(e) => handleAiExplain(e, chord)}
                      onAdd={(e) => addToCustomSequence(e, chord)}
                    />
                  ))}
                </div>
              </div>
           )}

           {/* Progressões Comuns */}
           <div className="space-y-4 pt-8 border-t border-gray-200 dark:border-gray-800">
                <h2 className="text-xl font-black flex items-center gap-3"><span className="w-2 h-8 bg-purple-500 rounded-full"></span> Progressões de Estudo</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {progressions.map((prog, idx) => {
                        const progChords = mapProgressionToChords(harmonicField, prog.degrees);
                        const isThisPlaying = isPlaying && playingProgressionName === prog.name;
                        return (
                            <div key={idx} className="bg-white dark:bg-gray-800/40 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-lg">{prog.name}</h3>
                                        <p className="text-xs text-gray-500 leading-tight">{prog.description}</p>
                                    </div>
                                    <button onClick={() => playChordSequence(progChords, prog.name)} className={`p-3 rounded-full ${isThisPlaying ? 'bg-red-500 text-white' : 'bg-blue-600 text-white'}`}>
                                        {isThisPlaying ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    {prog.degrees.map((d, i) => (
                                        <div key={i} className={`flex-1 px-2 py-2 rounded-lg border text-center text-[10px] font-bold ${activeChord?.symbol === progChords[i]?.symbol && isThisPlaying ? 'bg-blue-600 text-white border-blue-500 scale-105' : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800'}`}>
                                            <span className="block opacity-60">{d}</span>
                                            <span className="block text-sm">{progChords[i]?.symbol}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
           </div>
        </section>
      </main>

      <MusicTeacherChat isOpen={isChatOpen} onToggle={() => setIsChatOpen(!isChatOpen)} messages={chatMessages} onSendMessage={handleSendMessage} isLoading={isChatLoading} onClearHistory={() => setChatMessages([])} />
    </div>
  );
};

export default App;
