import { getWsUrl } from './api';

const SAMPLE_RATE = 16000;

type PublisherHandlers = {
  onLevel?: (level: number) => void;
  onListening?: (listening: boolean) => void;
};

let publisherSocket: WebSocket | null = null;
let publisherStream: MediaStream | null = null;
let publisherContext: AudioContext | null = null;
let publisherAnalyser: AnalyserNode | null = null;
let publisherSource: MediaStreamAudioSourceNode | null = null;
let publisherProcessor: ScriptProcessorNode | null = null;
let publisherWorklet: AudioWorkletNode | null = null;
let publisherSending = false;
let levelFrame: number | null = null;

let listenerSocket: WebSocket | null = null;
let listenerContext: AudioContext | null = null;
let nextPlayTime = 0;

function floatTo16BitPCM(input: Float32Array) {
  const pcm = new Int16Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return pcm;
}

function startLevelMeter(onLevel?: (level: number) => void) {
  if (!publisherAnalyser || !onLevel) {
    return;
  }

  const data = new Uint8Array(publisherAnalyser.frequencyBinCount);
  const tick = () => {
    if (!publisherAnalyser) {
      return;
    }
    publisherAnalyser.getByteFrequencyData(data);
    onLevel(data.reduce((sum, value) => sum + value, 0) / data.length);
    levelFrame = requestAnimationFrame(tick);
  };
  tick();
}

function sendPcm(samples: Float32Array) {
  if (!publisherSending || publisherSocket?.readyState !== WebSocket.OPEN) {
    return;
  }
  publisherSocket.send(floatTo16BitPCM(samples).buffer);
}

export function isLiveMicActive() {
  return Boolean(publisherStream);
}

export async function startLiveMic(sessionId: string, handlers: PublisherHandlers = {}) {
  if (publisherStream) {
    startLevelMeter(handlers.onLevel);
    return;
  }

  publisherStream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
  });

  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  publisherContext = new AudioContextClass({ sampleRate: SAMPLE_RATE });
  publisherSource = publisherContext.createMediaStreamSource(publisherStream);
  publisherAnalyser = publisherContext.createAnalyser();
  publisherSource.connect(publisherAnalyser);
  startLevelMeter(handlers.onLevel);

  try {
    const workletSource = `
      class PcmCaptureProcessor extends AudioWorkletProcessor {
        process(inputs) {
          const channel = inputs[0] && inputs[0][0];
          if (channel) {
            this.port.postMessage(channel);
          }
          return true;
        }
      }
      registerProcessor('pcm-capture', PcmCaptureProcessor);
    `;
    const workletUrl = URL.createObjectURL(new Blob([workletSource], { type: 'application/javascript' }));
    await publisherContext.audioWorklet.addModule(workletUrl);
    URL.revokeObjectURL(workletUrl);
    publisherWorklet = new AudioWorkletNode(publisherContext, 'pcm-capture');
    publisherWorklet.port.onmessage = (event) => {
      sendPcm(event.data);
    };
    const mute = publisherContext.createGain();
    mute.gain.value = 0;
    publisherSource.connect(publisherWorklet);
    publisherWorklet.connect(mute);
    mute.connect(publisherContext.destination);
  } catch {
    publisherProcessor = publisherContext.createScriptProcessor(4096, 1, 1);
    publisherProcessor.onaudioprocess = (event) => {
      sendPcm(event.inputBuffer.getChannelData(0));
    };
    const mute = publisherContext.createGain();
    mute.gain.value = 0;
    publisherSource.connect(publisherProcessor);
    publisherProcessor.connect(mute);
    mute.connect(publisherContext.destination);
  }

  const socket = new WebSocket(getWsUrl(`/ws/audio/${encodeURIComponent(sessionId)}?role=publisher`));
  socket.binaryType = 'arraybuffer';
  socket.onmessage = (event) => {
    if (typeof event.data !== 'string') {
      return;
    }
    try {
      const payload = JSON.parse(event.data);
      if (payload.type === 'listen') {
        publisherSending = Boolean(payload.listening);
        handlers.onListening?.(publisherSending);
      }
    } catch {
      // ignore malformed control messages
    }
  };
  socket.onclose = () => {
    publisherSending = false;
    handlers.onListening?.(false);
  };
  publisherSocket = socket;
}

export function stopLiveMic() {
  publisherSending = false;
  if (levelFrame) {
    cancelAnimationFrame(levelFrame);
    levelFrame = null;
  }
  publisherSocket?.close();
  publisherSocket = null;
  publisherWorklet?.disconnect();
  publisherProcessor?.disconnect();
  publisherSource?.disconnect();
  publisherAnalyser?.disconnect();
  publisherStream?.getTracks().forEach((track) => track.stop());
  void publisherContext?.close();
  publisherWorklet = null;
  publisherProcessor = null;
  publisherSource = null;
  publisherAnalyser = null;
  publisherStream = null;
  publisherContext = null;
}

export function startAdminListen(
  sessionId: string,
  token: string,
  handlers: { onError?: (message: string) => void } = {}
) {
  stopAdminListen();

  const socket = new WebSocket(
    getWsUrl(`/ws/audio/${encodeURIComponent(sessionId)}?role=listener&token=${encodeURIComponent(token)}`)
  );
  socket.binaryType = 'arraybuffer';

  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  const context = new AudioContextClass({ sampleRate: SAMPLE_RATE });
  nextPlayTime = 0;

  socket.onmessage = (event) => {
    if (typeof event.data === 'string') {
      return;
    }

    const pcm = new Int16Array(event.data);
    const samples = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i += 1) {
      samples[i] = pcm[i] / 32768;
    }

    const buffer = context.createBuffer(1, samples.length, SAMPLE_RATE);
    buffer.copyToChannel(samples, 0);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);

    const now = context.currentTime;
    if (nextPlayTime < now + 0.02) {
      nextPlayTime = now + 0.02;
    }
    source.start(nextPlayTime);
    nextPlayTime += buffer.duration;
  };

  socket.onerror = () => {
    handlers.onError?.('Failed to start live listening');
  };

  listenerSocket = socket;
  listenerContext = context;
  void context.resume();
}

export function stopAdminListen() {
  listenerSocket?.close();
  listenerSocket = null;
  void listenerContext?.close();
  listenerContext = null;
  nextPlayTime = 0;
}
