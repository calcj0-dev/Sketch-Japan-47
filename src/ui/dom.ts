// 画面づくりの小さな道具

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: { class?: string; text?: string; type?: string; ariaLabel?: string } = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (attrs.class) e.className = attrs.class;
  if (attrs.text !== undefined) e.textContent = attrs.text;
  if (attrs.type) e.setAttribute('type', attrs.type);
  if (attrs.ariaLabel) e.setAttribute('aria-label', attrs.ariaLabel);
  e.append(...children);
  return e;
}

export function button(text: string, onClick: () => void, cls = 'btn'): HTMLButtonElement {
  const b = el('button', { class: cls, text, type: 'button' });
  b.addEventListener('click', onClick);
  return b;
}

/** 描く場所の大きさ：画面の幅いっぱい（左右の余白を除く）、最大480px */
export function padSizeFor(root: HTMLElement): number {
  const w = root.clientWidth || window.innerWidth;
  return Math.floor(Math.min(480, w - 32));
}
