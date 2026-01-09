
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QuizState, FinalResult, Element, UserPreferences } from './types';
import { QUESTIONS } from './constants';
import { calculateResults } from './logic/scoring';
import ProgressBar from './components/ProgressBar';
import QuestionCard from './components/QuestionCard';
import ResultView from './components/ResultView';
import DevSidebar from './components/DevSidebar';
import AllAbilityTreesModal from './components/AllAbilityTreesModal';
import { Shield, Zap, Wind, Waves, Flame, ArrowRight, Sword, Sparkles, User, Palette, Glasses, Check } from 'lucide-react';

const HAIR_COLORS = ['Black', 'Blond', 'Brown', 'White', 'Silver', 'Red', 'Blue', 'Pink', 'Green'];
const SKIN_TONES = ['Fair', 'Pale', 'Tan', 'Warm', 'Dark', 'Deep'];

const INITIAL_PREFERENCES: UserPreferences = {
  name: '',
  gender: 'Male',
  hairColor: 'Black',
  skinColor: 'Fair',
  hasGlasses: false
};

const App: React.FC = () => {
  const [state, setState] = useState<QuizState>({
    currentQuestionIndex: -2, // -2: Intro, -1: Personalization
    answers: {},
    isFinished: false,
    preferences: INITIAL_PREFERENCES
  });

  const [result, setResult] = useState<FinalResult | null>(null);
  const [isAllTreesModalOpen, setIsAllTreesModalOpen] = useState(false);

  const startPersonalization = () => {
    setState(prev => ({ ...prev, currentQuestionIndex: -1 }));
  };

  const startQuiz = () => {
    if (!state.preferences.name.trim()) return;
    setState(prev => ({ ...prev, currentQuestionIndex: 0 }));
  };

  const handlePreferenceChange = (key: keyof UserPreferences, value: any) => {
    setState(prev => ({
      ...prev,
      preferences: { ...prev.preferences, [key]: value }
    }));
  };

  const handleAnswer = useCallback((answer: any) => {
    setState(prev => {
      const newAnswers = { ...prev.answers, [QUESTIONS[prev.currentQuestionIndex].id]: answer };
      const isLast = prev.currentQuestionIndex === QUESTIONS.length - 1;
      
      if (isLast) {
        const finalResult = calculateResults(newAnswers);
        finalResult.preferences = prev.preferences;
        setResult(finalResult);
        return {
          ...prev,
          answers: newAnswers,
          isFinished: true
        };
      }

      return {
        ...prev,
        answers: newAnswers,
        currentQuestionIndex: prev.currentQuestionIndex + 1
      };
    });
  }, []);

  const handleForceResult = (forcedElement: Element | 'random') => {
    const targetElement = forcedElement === 'random' 
      ? [Element.FIRE, Element.WIND, Element.LIGHTNING, Element.WATER, Element.EARTH][Math.floor(Math.random() * 5)]
      : forcedElement;

    const finalResult = calculateResults({}); 
    finalResult.primary = targetElement;
    finalResult.explanation = `[DEV OVERRIDE] This result was manually generated for the ${targetElement} affinity.`;
    finalResult.confidence = 'High';
    finalResult.preferences = state.preferences;
    
    setResult(finalResult);
    setState(prev => ({ ...prev, isFinished: true }));
  };

  const resetQuiz = () => {
    setState({
      currentQuestionIndex: -2,
      answers: {},
      isFinished: false,
      preferences: INITIAL_PREFERENCES
    });
    setResult(null);
  };

  const goBack = () => {
    setState(prev => ({
      ...prev,
      currentQuestionIndex: prev.currentQuestionIndex === 0 ? -1 : Math.max(-2, prev.currentQuestionIndex - 1)
    }));
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 md:p-6 selection:bg-orange-500 selection:text-white relative">
      <DevSidebar onForceResult={handleForceResult} onShowAllTrees={() => setIsAllTreesModalOpen(true)} />
      <AllAbilityTreesModal isOpen={isAllTreesModalOpen} onClose={() => setIsAllTreesModalOpen(false)} />
      
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(15,23,42,1),rgba(2,6,23,1))]" />
        <AnimatePresence>
          {state.currentQuestionIndex <= -1 && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.15 }} exit={{ opacity: 0 }} className="absolute top-10 left-1/4 animate-float"><Flame className="w-12 h-12 text-red-500/40" /></motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.15 }} exit={{ opacity: 0 }} className="absolute bottom-20 right-1/4 animate-float delay-1000"><Zap className="w-12 h-12 text-blue-400/40" /></motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.15 }} exit={{ opacity: 0 }} className="absolute top-1/3 left-10 animate-float delay-500"><Wind className="w-12 h-12 text-emerald-400/40" /></motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.15 }} exit={{ opacity: 0 }} className="absolute bottom-1/3 right-10 animate-float delay-700"><Waves className="w-12 h-12 text-blue-600/40" /></motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        {state.currentQuestionIndex === -2 && (
          <motion.div 
            key="intro"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
            className="max-w-3xl w-full text-center space-y-10 z-10 flex flex-col items-center py-8"
          >
            <div className="relative inline-block">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 25, repeat: Infinity, ease: 'linear' }} className="absolute -inset-6 border border-orange-500/20 rounded-full border-dashed" />
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-[2rem] shadow-2xl relative">
                <Sword className="w-12 h-12 text-orange-500 mx-auto" />
              </div>
            </div>
            <div className="space-y-4">
              <h1 className="text-5xl md:text-8xl font-ninja text-white tracking-tighter leading-[0.9]">CHAKRA<br/><span className="text-orange-500">NATURE</span></h1>
              <p className="text-xs font-black text-slate-500 tracking-[0.4em] uppercase">Advanced Aptitude Screening</p>
            </div>
            <p className="text-slate-400 text-xl max-w-lg mx-auto font-light leading-relaxed px-4">Unveil the fundamental element hiding within your chakra coils.</p>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={startPersonalization} className="px-10 py-5 bg-orange-600 hover:bg-orange-500 text-white rounded-3xl font-black text-2xl tracking-widest shadow-2xl flex items-center justify-center gap-3 group">
              BEGIN IDENTIFICATION <ArrowRight className="w-8 h-8 group-hover:translate-x-1.5 transition-transform" />
            </motion.button>
          </motion.div>
        )}

        {state.currentQuestionIndex === -1 && (
          <motion.div 
            key="personalization"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="max-w-xl w-full bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-[3rem] shadow-2xl space-y-6"
          >
            <div className="text-center">
              <h2 className="text-3xl font-ninja text-white uppercase tracking-widest">Shinobi ID</h2>
              <p className="text-[10px] text-orange-500 font-black uppercase tracking-[0.3em] mt-1">Personnel Documentation Phase</p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <User className="w-3 h-3" /> Given Name
                </label>
                <input 
                  type="text" 
                  placeholder="Enter Name..." 
                  value={state.preferences.name}
                  onChange={(e) => handlePreferenceChange('name', e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 p-4 rounded-xl text-white focus:border-orange-500 outline-none transition-all placeholder:text-slate-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gender</label>
                  <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700">
                    {(['Male', 'Female'] as const).map(g => (
                      <button 
                        key={g} 
                        onClick={() => handlePreferenceChange('gender', g)}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${state.preferences.gender === g ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Glasses className="w-3 h-3" /> Vision Gear
                  </label>
                  <button 
                    onClick={() => handlePreferenceChange('hasGlasses', !state.preferences.hasGlasses)}
                    className={`w-full py-2.5 text-xs font-bold rounded-xl border transition-all ${state.preferences.hasGlasses ? 'bg-blue-600/20 border-blue-500 text-blue-200' : 'bg-slate-800/50 border-slate-700 text-slate-500'}`}
                  >
                    {state.preferences.hasGlasses ? 'Equipped' : 'None'}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Palette className="w-3 h-3" /> Hair Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {HAIR_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => handlePreferenceChange('hairColor', color)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${state.preferences.hairColor === color ? 'bg-white text-black border-white' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Palette className="w-3 h-3" /> Skin Tone
                </label>
                <div className="flex flex-wrap gap-2">
                  {SKIN_TONES.map(tone => (
                    <button
                      key={tone}
                      onClick={() => handlePreferenceChange('skinColor', tone)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${state.preferences.skinColor === tone ? 'bg-orange-600 text-white border-orange-600' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button 
                onClick={startQuiz}
                disabled={!state.preferences.name.trim()}
                className="w-full py-5 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-2xl font-black text-lg tracking-widest transition-all shadow-xl shadow-orange-900/20 flex items-center justify-center gap-3 uppercase"
              >
                Confirm Identity <Zap className="w-5 h-5" />
              </button>
              <button onClick={goBack} className="w-full mt-4 text-[10px] font-bold text-slate-600 hover:text-slate-400 uppercase tracking-widest">Cancel Registration</button>
            </div>
          </motion.div>
        )}

        {state.currentQuestionIndex >= 0 && !state.isFinished && (
          <motion.div key="quiz" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} className="w-full max-w-2xl">
            <div className="flex justify-between items-center mb-6">
               <button onClick={goBack} className="text-xs font-bold text-slate-500 hover:text-white transition-colors flex items-center gap-2">&larr; Return</button>
               <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-full flex items-center gap-2">
                 <User className="w-3 h-3 text-orange-500" />
                 <span className="text-[10px] font-bold text-white uppercase tracking-widest">{state.preferences.name}</span>
               </div>
            </div>
            <ProgressBar current={state.currentQuestionIndex} total={QUESTIONS.length} />
            <QuestionCard 
              key={QUESTIONS[state.currentQuestionIndex].id}
              question={QUESTIONS[state.currentQuestionIndex]} 
              onAnswer={handleAnswer}
              savedAnswer={state.answers[QUESTIONS[state.currentQuestionIndex].id]}
            />
          </motion.div>
        )}

        {state.isFinished && result && (
          <ResultView key="result" result={result} onReset={resetQuiz} />
        )}
      </AnimatePresence>

      <footer className="mt-8 mb-4 text-[9px] text-slate-700 uppercase tracking-[0.3em] font-black text-center w-full">
        KONOHAGAKURE &copy; DIGITAL DEFENSE SECTOR
      </footer>
    </div>
  );
};

export default App;
