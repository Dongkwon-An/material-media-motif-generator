import type { Layer } from '../render/Renderer';
import { renderSvg } from '../render/svg';
import { useStore } from '../store';
import { encodeShareState } from './share';

// Export (명세 P5): PNG · SVG · Video · URL.
// 캔버스 컴포넌트가 지금 그리는 캔버스와 마지막 프레임의 레이어를 등록해 두고, 사이드바가 그걸 내보낸다.

interface Stage {
  canvas: HTMLCanvasElement;
  /** 마지막으로 그린 프레임 (CSS 픽셀 크기 + 레이어) */
  frame(): { w: number; h: number; layers: readonly Layer[] };
}

let stage: Stage | null = null;

export function registerStage(s: Stage): () => void {
  stage = s;
  return () => {
    if (stage === s) stage = null;
  };
}

function requireStage(): Stage {
  if (!stage) throw new Error('내보낼 캔버스가 없습니다.');
  return stage;
}

const stamp = () => {
  const s = useStore.getState();
  return `material-media-${s.baseSeed}-${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')}`;
};

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 화면 그대로(devicePixelRatio 반영) PNG로 저장 */
export async function exportPng(): Promise<void> {
  const { canvas } = requireStage();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('PNG를 만들 수 없습니다.');
  download(blob, `${stamp()}.png`);
}

/** 현재 프레임을 벡터 SVG로 저장 */
export function exportSvg(): void {
  const { w, h, layers } = requireStage().frame();
  download(new Blob([renderSvg(layers, w, h)], { type: 'image/svg+xml' }), `${stamp()}.svg`);
}

const VIDEO_TYPES = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];

export const canRecordVideo = () =>
  typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function';

/** 캔버스를 seconds초 동안 녹화해 저장. onProgress(0~1)로 진행 상황을 알린다. */
export async function recordVideo(seconds: number, onProgress?: (p: number) => void): Promise<void> {
  if (!canRecordVideo()) throw new Error('이 브라우저는 영상 녹화를 지원하지 않습니다.');
  const { canvas } = requireStage();
  const mimeType = VIDEO_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
  const stream = canvas.captureStream(60);
  const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 12_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
  const done = new Promise<void>((resolve) => (rec.onstop = () => resolve()));

  rec.start(250);
  const start = performance.now();
  await new Promise<void>((resolve) => {
    const timer = setInterval(() => {
      const p = Math.min(1, (performance.now() - start) / (seconds * 1000));
      onProgress?.(p);
      if (p >= 1 || !stage || stage.canvas !== canvas) {
        clearInterval(timer);
        resolve();
      }
    }, 100);
  });
  rec.stop();
  await done;
  stream.getTracks().forEach((t) => t.stop());

  const type = rec.mimeType || mimeType || 'video/webm';
  download(new Blob(chunks, { type }), `${stamp()}.${type.startsWith('video/mp4') ? 'mp4' : 'webm'}`);
}

/** 현재 설정을 담은 공유 URL을 만들어 클립보드에 복사. 복사할 수 없으면 URL만 돌려준다. */
export async function copyShareUrl(): Promise<{ url: string; copied: boolean }> {
  const url = new URL(location.href);
  url.searchParams.set('s', encodeShareState(useStore.getState()));
  history.replaceState(null, '', url);
  try {
    await navigator.clipboard.writeText(url.href);
    return { url: url.href, copied: true };
  } catch {
    return { url: url.href, copied: false };
  }
}
