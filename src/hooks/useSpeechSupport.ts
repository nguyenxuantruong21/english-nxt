import { useEffect, useState } from 'react';
import { isSpeechSupported } from '../lib/speech';

export function useSpeechSupport(): boolean {
  const [supported, setSupported] = useState(isSpeechSupported);
  useEffect(() => setSupported(isSpeechSupported), []);
  return supported;
}