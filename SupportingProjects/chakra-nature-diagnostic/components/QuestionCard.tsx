
import React, { useState, useEffect, useMemo } from 'react';
import { Question, Option } from '../types';
import { Check, ArrowRight, Star, X } from 'lucide-react';

interface QuestionCardProps {
  question: Question;
  onAnswer: (answer: any) => void;
  savedAnswer?: any;
}

// Fisher-Yates Shuffle
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, onAnswer, savedAnswer }) => {
  const [localAnswer, setLocalAnswer] = useState<any>(savedAnswer || null);

  // Shuffle options whenever the question ID changes to ensure positions are unique every time
  const shuffledOptions = useMemo(() => shuffleArray(question.options), [question.id]);
  const shuffledDislikeOptions = useMemo(() => 
    question.dislikeOptions ? shuffleArray(question.dislikeOptions) : [], 
    [question.id, question.dislikeOptions]
  );

  useEffect(() => {
    setLocalAnswer(savedAnswer || null);
  }, [question, savedAnswer]);

  const handleSingle = (id: string) => {
    setLocalAnswer(id);
    onAnswer(id);
  };

  const handleMulti = (id: string) => {
    const current = Array.isArray(localAnswer) ? localAnswer : [];
    let next;
    if (current.includes(id)) {
      next = current.filter(x => x !== id);
    } else {
      if (current.length < (question.maxSelections || 1)) {
        next = [...current, id];
      } else {
        return;
      }
    }
    setLocalAnswer(next);
    if (next.length === question.maxSelections) {
      onAnswer(next);
    }
  };

  const handleRank = (id: string) => {
    const current = Array.isArray(localAnswer) ? localAnswer : [];
    if (current.includes(id)) return;
    const next = [...current, id];
    setLocalAnswer(next);
    if (next.length === question.options.length) {
      onAnswer(next);
    }
  };

  const resetRank = () => setLocalAnswer([]);

  const handleLikeDislike = (id: string, type: 'like' | 'dislike') => {
    const current = (localAnswer && typeof localAnswer === 'object' && !Array.isArray(localAnswer)) 
      ? localAnswer 
      : { like: null, dislike: null };
    const next = { ...current, [type]: id };
    setLocalAnswer(next);
    if (next.like && next.dislike) {
      onAnswer(next);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl shadow-2xl">
      <h2 className="text-xl md:text-2xl font-ninja mb-8 text-white tracking-wide">
        {question.text}
      </h2>

      <div className="space-y-3">
        {question.type === 'single' && shuffledOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => handleSingle(opt.id)}
            className={`w-full text-left p-4 rounded-xl border transition-all duration-200 group flex items-center justify-between ${
              localAnswer === opt.id 
              ? 'bg-orange-500/20 border-orange-500 text-orange-200' 
              : 'bg-slate-800/40 border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800'
            }`}
          >
            <span className="flex-1">{opt.text}</span>
            {localAnswer === opt.id && <Check className="w-5 h-5 ml-2" />}
          </button>
        ))}

        {question.type === 'multi' && shuffledOptions.map((opt) => {
          const isSelected = Array.isArray(localAnswer) && localAnswer.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => handleMulti(opt.id)}
              className={`w-full text-left p-4 rounded-xl border transition-all duration-200 group flex items-center justify-between ${
                isSelected
                ? 'bg-blue-500/20 border-blue-500 text-blue-200' 
                : 'bg-slate-800/40 border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800'
              }`}
            >
              <span className="flex-1">{opt.text}</span>
              <div className={`w-6 h-6 rounded-md border flex items-center justify-center ${
                 isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-600'
              }`}>
                {isSelected && <Check className="w-4 h-4 text-white" />}
              </div>
            </button>
          );
        })}

        {question.type === 'rank' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 mb-4">
              {shuffledOptions.map((opt) => {
                const rankIndex = Array.isArray(localAnswer) ? localAnswer.indexOf(opt.id) : -1;
                return (
                  <button
                    key={opt.id}
                    disabled={rankIndex !== -1}
                    onClick={() => handleRank(opt.id)}
                    className={`flex-1 min-w-[140px] text-sm p-3 rounded-lg border transition-all ${
                      rankIndex !== -1
                      ? 'bg-slate-800 border-slate-700 text-slate-500 opacity-50 cursor-not-allowed'
                      : 'bg-slate-800/40 border-slate-700 text-slate-300 hover:border-orange-500'
                    }`}
                  >
                    {opt.text}
                  </button>
                );
              })}
            </div>
            <div className="bg-slate-950/50 p-4 rounded-xl border border-dashed border-slate-700 min-h-[160px]">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-bold uppercase text-slate-500 tracking-widest">Your Priority Order</p>
                <button onClick={resetRank} className="text-[10px] text-red-400 hover:underline">Reset</button>
              </div>
              <div className="space-y-2">
                {Array.isArray(localAnswer) && localAnswer.map((id, idx) => (
                  <div key={id} className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                    <span className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                    <span className="text-sm text-slate-200">{question.options.find(o => o.id === id)?.text}</span>
                  </div>
                ))}
                {(!localAnswer || !Array.isArray(localAnswer) || localAnswer.length === 0) && (
                  <p className="text-sm text-slate-600 text-center py-8">Click items above to rank them</p>
                )}
              </div>
            </div>
          </div>
        )}

        {question.type === 'like-dislike' && (
          <div className="space-y-8">
            <div>
              <p className="text-xs font-bold text-green-500 mb-3 uppercase tracking-widest flex items-center gap-2">
                <Star className="w-3 h-3" /> Select what you LIKE
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {shuffledOptions.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => handleLikeDislike(opt.id, 'like')}
                    className={`p-3 text-left text-sm rounded-lg border transition-all ${
                      localAnswer?.like === opt.id
                      ? 'bg-green-500/20 border-green-500 text-green-200'
                      : 'bg-slate-800/40 border-slate-700 text-slate-300 hover:border-green-500'
                    }`}
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-red-500 mb-3 uppercase tracking-widest flex items-center gap-2">
                <X className="w-3 h-3" /> Select what you DISLIKE
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {shuffledDislikeOptions.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => handleLikeDislike(opt.id, 'dislike')}
                    className={`p-3 text-left text-sm rounded-lg border transition-all ${
                      localAnswer?.dislike === opt.id
                      ? 'bg-red-500/20 border-red-500 text-red-200'
                      : 'bg-slate-800/40 border-slate-700 text-slate-300 hover:border-red-500'
                    }`}
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-end">
        {(question.type === 'multi' || question.type === 'rank' || question.type === 'like-dislike') && (
           <div className="text-[10px] text-slate-500 flex items-center italic">
             Complete all selections to proceed
           </div>
        )}
      </div>
    </div>
  );
};

export default QuestionCard;
