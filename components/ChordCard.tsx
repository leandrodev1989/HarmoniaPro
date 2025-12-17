import React from 'react';
import { Chord } from '../types';
import { Info, Plus } from 'lucide-react';

interface ChordCardProps {
  chord: Chord;
  isActive: boolean;
  onClick: () => void;
  onExplain: (e: React.MouseEvent) => void;
  onAdd?: (e: React.MouseEvent) => void;
}

const ChordCard: React.FC<ChordCardProps> = ({ chord, isActive, onClick, onExplain, onAdd }) => {
  const getBorderColor = () => {
    if (isActive) return 'border-blue-500 ring-2 ring-blue-500/20 dark:ring-blue-500/50';
    switch (chord.type) {
      case 'Major': return 'border-green-200 dark:border-green-500/30 hover:border-green-500/60';
      case 'Minor': return 'border-red-200 dark:border-red-500/30 hover:border-red-500/60';
      case 'Diminished': return 'border-purple-200 dark:border-purple-500/30 hover:border-purple-500/60';
      default: return 'border-gray-200 dark:border-gray-700';
    }
  };

  const getBgColor = () => {
    if (isActive) return 'bg-blue-50 dark:bg-gray-800';
    return 'bg-white dark:bg-gray-800/50 shadow-sm';
  };

  return (
    <div 
      onClick={onClick}
      className={`
        cursor-pointer rounded-xl p-4 border transition-all duration-200 relative group
        ${getBorderColor()} ${getBgColor()} hover:shadow-md dark:hover:bg-gray-800
      `}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-mono text-gray-400 dark:text-gray-500 uppercase tracking-widest">{chord.roman}</span>
        
        <div className="flex gap-2">
          {onAdd && (
            <button
              onClick={onAdd}
              className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-green-600 text-gray-400 hover:text-white transition-colors"
              title="Adicionar à minha progressão"
            >
              <Plus size={12} strokeWidth={3} />
            </button>
          )}
          <div className={`w-2 h-2 rounded-full self-center ${
              chord.type === 'Major' ? 'bg-green-500' :
              chord.type === 'Minor' ? 'bg-red-500' : 'bg-purple-500'
          }`} />
        </div>
      </div>
      
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{chord.symbol}</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{chord.name}</p>
      
      <div className="flex gap-1 mb-3">
        {chord.notes.map((n, i) => (
          <span key={i} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] text-gray-600 dark:text-gray-300 font-mono">
            {n}
          </span>
        ))}
      </div>

      <div className="flex justify-between items-center mt-auto">
         <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate max-w-[60%] italic">
            {chord.function}
         </span>
         <button 
           onClick={onExplain}
           className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
           title="Explicar função (IA)"
         >
           <Info size={14} />
         </button>
      </div>
    </div>
  );
};

export default ChordCard;