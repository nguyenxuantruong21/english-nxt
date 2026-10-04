import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeUtter {
  text: string;
  lang: string;
  rate: number;
  volume: number;
  handlers: Record<string, (() => void)[]>;
  addEventListener(ev: string, cb: () => void): void;
}

function stubUtterance(): void {
  class U {
    text = "";
    lang = "";
    rate = 1;
    volume = 1;
    handlers: Record<string, (() => void)[]> = {};
    addEventListener(ev: string, cb: () => void) {
      (this.handlers[ev] ??= []).push(cb);
    }
  }
  vi.stubGlobal("SpeechSynthesisUtterance", U);
}

describe("speech", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    const speak = vi.fn();
    const cancel = vi.fn();
    stubUtterance();
    vi.stubGlobal("window", { speechSynthesis: { speak, cancel } });
  });

  it("isSpeechSupported true khi có speechSynthesis", async () => {
    const { isSpeechSupported } = await import("./speech");
    expect(isSpeechSupported()).toBe(true);
  });

  it("isSpeechSupported false khi thiếu API", async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal("window", {});
    const { isSpeechSupported } = await import("./speech");
    expect(isSpeechSupported()).toBe(false);
  });

  it("speak gọi synthesis.speak với lang/rate đúng", async () => {
    const { speak } = await import("./speech");
    speak("hello");
    const w = window as unknown as {
      speechSynthesis: { speak: ReturnType<typeof vi.fn> };
    };
    const u = w.speechSynthesis.speak.mock.calls[0][0] as FakeUtter;
    expect(u.text).toBe("hello");
    expect(u.lang).toBe("en-US");
    expect(u.rate).toBe(0.9);
  });

  it("gắn onEnd vào utterance", async () => {
    const { speak } = await import("./speech");
    const onEnd = vi.fn();
    speak("hi", { onEnd });
    const w = window as unknown as {
      speechSynthesis: { speak: ReturnType<typeof vi.fn> };
    };
    const u = w.speechSynthesis.speak.mock.calls[0][0] as FakeUtter;
    u.handlers.end?.forEach((cb) => cb());
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it("stopSpeaking hủy phiên hiện tại", async () => {
    const mod = await import("./speech");
    const w = window as unknown as {
      speechSynthesis: { cancel: ReturnType<typeof vi.fn> };
    };
    mod.stopSpeaking();
    expect(w.speechSynthesis.cancel).toHaveBeenCalled();
  });
});

describe("speech volume", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    });
    stubUtterance();
    vi.stubGlobal("window", { speechSynthesis: { speak: vi.fn(), cancel: vi.fn() } });
  });

  async function speakWithVolume(volume?: number) {
    const { useProgress } = await import("../store/progress");
    const { speak } = await import("./speech");
    if (volume !== undefined) {
      const data = useProgress.getState().data;
      useProgress.setState({
        data: { ...data, settings: { ...data.settings, volume } },
      });
    }
    speak("hello");
    const w = window as unknown as {
      speechSynthesis: { speak: ReturnType<typeof vi.fn> };
    };
    return w.speechSynthesis.speak.mock.calls[0][0] as FakeUtter;
  }

  it("áp dụng settings.volume/100 vào utter.volume", async () => {
    const u = await speakWithVolume(75);
    expect(u.volume).toBe(0.75);
  });

  it("mặc định volume = 100% → utter.volume 1", async () => {
    const u = await speakWithVolume();
    expect(u.volume).toBe(1);
  });

  it("volume 0 → im lặng tuyệt đối", async () => {
    const u = await speakWithVolume(0);
    expect(u.volume).toBe(0);
  });
});
