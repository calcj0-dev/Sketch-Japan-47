// シェアのボタン（「Xでシェア」、スマホなら「画像を付けてシェア」、「画像を保存」）

import { t } from '../i18n';
import { canShareImage, canvasToBlob, openXIntent, saveImage, shareWithImage } from '../share/share';
import { button, el } from './dom';

export function shareButtons(text: string, image: HTMLCanvasElement, fileName: string): HTMLElement {
  const blobP = canvasToBlob(image);
  const withImage = button(t('result.shareImage'), () => {
    void blobP.then((b) => b && shareWithImage(text, b, fileName));
  }, 'btn');
  withImage.classList.add('hidden');
  void blobP.then((b) => {
    if (canShareImage(b)) withImage.classList.remove('hidden');
  });
  return el('div', { class: 'share-row' }, [
    button(t('result.share'), () => openXIntent(text), 'btn x'),
    withImage,
    button(t('result.saveImage'), () => {
      void blobP.then((b) => b && saveImage(b, fileName));
    }, 'btn'),
  ]);
}

/** 画像を画面に出す（長押しでも保存できるよう、data: のURLの img にする） */
export function imagePreview(image: HTMLCanvasElement, alt: string): HTMLImageElement {
  const img = el('img', { class: 'image-preview' });
  img.src = image.toDataURL('image/png');
  img.alt = alt;
  return img;
}
