import { beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeUtter {
  text: string;
  lang: string;
  rate: number;
  handlers: Record<string, (() => void)[]>;
  addEventListener(ev: string, cb: () => void): void;
}

function stubUtterance(): void {
  class U {
    text = '';
    lang = '';
    rate = 1;
    handlers: Record<string, (() => void)[]> = {};
    addEventListener(ev: string, cb: () => void) {
      (this.handlers[ev] ??= []).push(cb);
    }
  }
  vi.stubGlobal('SpeechSynthesisUtterance', U);
}

describe('speech', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    const speak = vi.fn();
    const cancel = vi.fn();
    stubUtterance();
    vi.stubGlobal('window', { speechSynthesis: { speak, cancel } });
  });

  it('isSpeechSupported true khi có speechSynthesis', async () => {
    const { isSpeechSupported } = await import('./speech');
    expect(isSpeechSupported()).toBe(true);
  });

  it('isSpeechSupported false khi thiếu API', async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal('window', {});
    const { isSpeechSupported } = await import('./speech');
    expect(isSpeechSupported()).toBe(false);
  });

  it('speak gọi synthesis.speak với lang/rate đúng', async () => {
    const { speak } = await import('./speech');
    speak('hello');
    const w = window as unknown as { speechSynthesis: { speak: ReturnType<typeof vi.fn> } };
    const u = w.speechSynthesis.speak.mock.calls[0][0] as FakeUtter;
    expect(u.text).toBe('hello');
    expect(u.lang).toBe('en-US');
    expect(u.rate).toBe(0.9);
  });

  it('gắn onEnd vào utterance', async () => {
    const { speak } = await import('./speech');
    const onEnd = vi.fn();
    speak('hi', { onEnd });
    const w = window as unknown as { speechSynthesis: { speak: ReturnType<typeof vi.fn> } };
    const u = w.speechSynthesis.speak.mock.calls[0][0] as FakeUtter;
    u.handlers.end?.forEach((cb) => cb());
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it('stopSpeaking hủy phiên hiện tại', async () => {
    const mod = await import('./speech');
    const w = window as unknown as { speechSynthesis: { cancel: ReturnType<typeof vi.fn> } };
    mod.stopSpeaking();
    expect(w.speechSynthesis.cancel).toHaveBeenCalled();
  });
});