import type { AppState } from '../motifs/types';

// 공유 URL (?s=…): seed와 모티프·Create 설정을 base64url JSON으로 담는다.
// 생성된 화면(shot)은 펼침 모션을 건너뛴 완성 상태로 복원한다.

type Shared = Pick<AppState, 'baseSeed' | 'mode' | 'motif' | 'create'>;

const VERSION = 1;
/** 복원한 shot은 이미 다 펼쳐진 상태로 보이도록 아주 오래 전에 태어난 것으로 둔다 */
const LONG_AGO = -1e6;

const toBase64Url = (s: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const fromBase64Url = (s: string) =>
  new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)));

export function encodeShareState(s: AppState): string {
  const shared: Shared = { baseSeed: s.baseSeed, mode: s.mode, motif: s.motif, create: s.create };
  return toBase64Url(JSON.stringify({ v: VERSION, ...shared }));
}

/** 잘못된 값이면 null (앱은 기본 상태로 시작) */
export function decodeShareState(param: string | null): Shared | null {
  if (!param) return null;
  try {
    const d = JSON.parse(fromBase64Url(param));
    if (d?.v !== VERSION || typeof d.baseSeed !== 'number' || !d.motif?.type || !d.create?.single?.type || !Array.isArray(d.create?.mix?.layers)) {
      return null;
    }
    const create = { ...d.create, shot: d.create.shot ? { ...d.create.shot, bornAt: LONG_AGO } : null };
    return { baseSeed: d.baseSeed >>> 0, mode: d.mode === 'sequence' ? 'sequence' : 'normal', motif: d.motif, create };
  } catch {
    return null;
  }
}

/** 페이지 주소의 ?s=… 를 읽는다 (브라우저가 아니면 null) */
export function sharedFromLocation(): Shared | null {
  if (typeof location === 'undefined') return null;
  return decodeShareState(new URLSearchParams(location.search).get('s'));
}
