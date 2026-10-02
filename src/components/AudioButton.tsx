import { useState } from 'react';
import { useSpeechSupport } from '../hooks/useSpeechSupport';
import type { Word } from '../types';

export interface AudioButtonProps {
  word?: Word;
  onPlay?: () => void;
}

export default function AudioButton({ word, onPlay }: AudioButtonProps) {
  const supported = useSpeechSupport();
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    if (!supported) return;
    setIsPlaying(true);
    if (onPlay) onPlay();
    setTimeout(() => setIsPlaying(false), 1000);
  };

  return (
    <button
      onClick={handlePlay}
      disabled={!supported}
      className={`inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium ${isPlaying ? 'bg-slate-100' : 'bg-transparent'} text-slate-600 hover:text-slate-900 ${!supported ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      aria-label={word ? `Nghe phát âm: ${word.word}` : 'Phát âm'}
    >
      {word?.word ? (
        <span>
          {word.pos ? <span title={word.pos}>{word.pos[0]}</span> : ''}
          {word.ipa && <span title={word.ipa}>{word.ipa}</span>}
        </span>
      ) : (
        '🔊'
      )}
    </button>
  );
}