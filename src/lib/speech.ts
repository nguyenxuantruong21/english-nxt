export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export interface SpeakOptions {
  onEnd?: () => void;
}

export function speak(text: string, opts?: SpeakOptions): void {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance();
  utter.text = text;
  utter.lang = 'en-US';
  utter.rate = 0.9;
  if (opts?.onEnd) utter.addEventListener('end', opts.onEnd);
  window.speechSynthesis.speak(utter);
}

export function stopSpeaking(): void {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
}