// シェア（設計書 5.5。前作の share.ts を流用）。スマホは Web Share（画像つき）、それ以外は X の投稿画面

const X_INTENT = 'https://x.com/intent/post';

/** 作品のURL（VITE_SITE_URL。なければ今のページ） */
export function siteUrl(): string {
  const v = ((import.meta.env.VITE_SITE_URL as string | undefined) ?? '').trim();
  if (v) return v;
  return typeof location !== 'undefined' ? `${location.origin}${location.pathname}` : '';
}

/** 表示用のURL（https:// と最後の / を外す） */
export function displayUrl(): string {
  return siteUrl().replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function imageFile(blob: Blob, name: string): File {
  return new File([blob], name, { type: 'image/png' });
}

const isTouch = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

/** 画像つきで Web Share できる端末か（スマホだけ） */
export function canShareImage(blob: Blob | null): boolean {
  if (!blob || !isTouch() || typeof navigator.canShare !== 'function' || typeof navigator.share !== 'function') return false;
  try {
    return navigator.canShare({ files: [imageFile(blob, 'x.png')] });
  } catch {
    return false;
  }
}

/** X の投稿画面を新しいタブで開く（画像は付かない） */
export function openXIntent(text: string): void {
  const q = `text=${encodeURIComponent(text)}&url=${encodeURIComponent(siteUrl())}`;
  window.open(`${X_INTENT}?${q}`, '_blank', 'noopener');
}

/** Web Share（画像＋投稿文＋URL）。中止したときは false */
export async function shareWithImage(text: string, blob: Blob, fileName: string): Promise<boolean> {
  try {
    await navigator.share({ files: [imageFile(blob, fileName)], text: `${text} ${siteUrl()}` });
    return true;
  } catch {
    return false;
  }
}

/**
 * 画像を保存する。スマホは共有シート（「画像を保存」がある）を開き、使えなければダウンロード。
 * iPhone は blob: のURLから保存できないため、新しいタブには出さない
 */
export async function saveImage(blob: Blob, fileName: string): Promise<void> {
  if (canShareImage(blob)) {
    try {
      await navigator.share({ files: [imageFile(blob, fileName)] });
      return;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function canvasToBlob(c: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => c.toBlob((b) => resolve(b), 'image/png'));
}
