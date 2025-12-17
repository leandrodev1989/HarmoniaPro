import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { AiExplanationState } from '../types';

interface AiTutorProps {
  state: AiExplanationState;
  onClose: () => void;
}

const AiTutor: React.FC<AiTutorProps> = ({ state, onClose }) => {
  if (!state.loading && !state.text && !state.error) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-fade-in-up">
      <div className="bg-gradient-to-br from-indigo-900 to-gray-900 rounded-xl shadow-2xl border border-indigo-500/50 overflow-hidden">
        <div className="p-4 bg-indigo-950/50 flex items-center justify-between border-b border-indigo-500/30">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <h3 className="font-bold text-indigo-100">Professor Virtual</h3>
          </div>
          <button onClick={onClose} className="text-indigo-300 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <div className="p-5">
          {state.loading ? (
            <div className="flex flex-col items-center justify-center py-4 gap-3">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-indigo-200 animate-pulse">Analisando harmonia...</p>
            </div>
          ) : state.error ? (
             <p className="text-red-300 text-sm bg-red-900/20 p-3 rounded">{state.error}</p>
          ) : (
            <div className="prose prose-invert prose-sm">
              <p className="text-gray-200 leading-relaxed text-sm whitespace-pre-wrap">
                {state.text}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AiTutor;