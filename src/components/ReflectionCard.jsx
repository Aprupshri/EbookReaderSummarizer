import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Lightbulb } from 'lucide-react';

/**
 * ReflectionCard — intercepts the back-button exit when there's an open prediction.
 * Surfaces the earlier prediction and asks how it went.
 *
 * Props:
 *  isOpen          {bool}
 *  prediction      {{ text, genre, timestamp }}
 *  onOutcome       {fn(outcome)}  — called with 'yes' | 'partly' | 'no' | 'noyet'
 *  onSkip          {fn}
 */
const ReflectionCard = ({ isOpen, prediction, onOutcome, onSkip }) => {
    if (!prediction) return null;

    const isFiction = prediction.genre === 'fiction';

    const outcomes = isFiction
        ? [
            { key: 'yes', emoji: '✅', label: 'Yes!', sub: 'Nailed it' },
            { key: 'partly', emoji: '〰️', label: 'Partly', sub: 'Close enough' },
            { key: 'no', emoji: '❌', label: 'Nope', sub: 'Surprised me' },
        ]
        : [
            { key: 'yes', emoji: '✅', label: 'Yes!', sub: 'Learned it' },
            { key: 'partly', emoji: '〰️', label: 'Partly', sub: 'Still processing' },
            { key: 'noyet', emoji: '📖', label: 'Not yet', sub: 'Still reading' },
        ];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="reflection-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[95] flex items-center justify-center p-6"
                    style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
                >
                    <motion.div
                        key="reflection-card"
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full max-w-sm rounded-3xl bg-gray-900 border border-gray-700 shadow-2xl p-6"
                    >
                        {/* Header icon */}
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isFiction ? 'bg-indigo-900/50' : 'bg-emerald-900/50'}`}>
                            {isFiction
                                ? <BookOpen size={22} className="text-indigo-400" />
                                : <Lightbulb size={22} className="text-emerald-400" />
                            }
                        </div>

                        <p className="text-center text-white font-bold text-lg mb-1">
                            {isFiction ? 'Were you right?' : 'Did you find it?'}
                        </p>

                        {/* Earlier prediction */}
                        <div className="my-4 px-4 py-3 rounded-xl bg-gray-800 border border-gray-700">
                            <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">
                                {isFiction ? 'Your prediction' : 'Your intention'}
                            </p>
                            <p className="text-gray-200 text-sm leading-relaxed italic">"{prediction.text}"</p>
                        </div>

                        {/* Outcome buttons */}
                        <div className="flex gap-2 mb-4">
                            {outcomes.map(o => (
                                <button
                                    key={o.key}
                                    onClick={() => onOutcome(o.key)}
                                    className="flex-1 py-3 rounded-2xl bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-all flex flex-col items-center gap-1"
                                >
                                    <span className="text-xl">{o.emoji}</span>
                                    <span className="text-white text-xs font-semibold">{o.label}</span>
                                    <span className="text-gray-500 text-[10px]">{o.sub}</span>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={onSkip}
                            className="w-full py-2 text-sm text-gray-600 hover:text-gray-400 transition-colors"
                        >
                            Skip reflection
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ReflectionCard;
