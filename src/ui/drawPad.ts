// 指で1筆描く場所（設計書 3.1）。画面の文言・採点に依存しないので、ほかの作品でも使える
// - Pointer Events。setPointerCapture で枠の外に出ても追い、点は枠の端で止める
// - 前の点から minDist 以上動いたときだけ点を足す。getCoalescedEvents が使えれば使う
// - touch-action: none（CSS）で、描いている間にスクロール・拡大させない

export type PadPoint = [number, number];

export interface DrawPadOptions {
  /** 前の点からこの距離（CSS px）以上動いたら点を足す */
  minDist: number;
  lineColor: string;
  lineWidth: number;
  /** 指を離した・キャンセルされた（1筆が終わった） */
  onEnd: (points: PadPoint[]) => void;
}

export class DrawPad {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private points: PadPoint[] = [];
  private pointerId: number | null = null;
  private enabled = false;
  private size = 0;
  private rect: DOMRect | null = null;

  constructor(private opts: DrawPadOptions) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'draw-pad';
    this.ctx = this.canvas.getContext('2d')!;
    this.canvas.addEventListener('pointerdown', this.onDown);
    this.canvas.addEventListener('pointermove', this.onMove);
    this.canvas.addEventListener('pointerup', this.onUp);
    this.canvas.addEventListener('pointercancel', this.onUp);
    // iOS の長押しメニュー・選択を出さない
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** 表示の大きさ（CSS px の正方形）に合わせる。画面の大きさが変わったら呼ぶ */
  resize(size: number): void {
    this.size = size;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    this.canvas.width = Math.round(size * dpr);
    this.canvas.height = Math.round(size * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.redraw();
  }

  get padSize(): number {
    return this.size;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
  }

  /** 描いている途中か */
  get drawing(): boolean {
    return this.pointerId !== null;
  }

  /** 今の線（時間切れのときに使う） */
  current(): PadPoint[] {
    return this.points.slice();
  }

  /** 描いている途中の1筆を打ち切る（時間切れ）。onEnd は呼ばない */
  cancel(): PadPoint[] {
    if (this.pointerId !== null) {
      try {
        this.canvas.releasePointerCapture(this.pointerId);
      } catch {
        // すでに離れている
      }
    }
    this.pointerId = null;
    return this.current();
  }

  clear(): void {
    this.points = [];
    this.redraw();
  }

  private local(e: PointerEvent): PadPoint {
    const r = this.rect ?? this.canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(this.size, e.clientX - r.left));
    const y = Math.max(0, Math.min(this.size, e.clientY - r.top));
    return [x, y];
  }

  private add(p: PadPoint): void {
    const last = this.points[this.points.length - 1];
    if (last && Math.hypot(p[0] - last[0], p[1] - last[1]) < this.opts.minDist) return;
    this.points.push(p);
    if (last) this.segment(last, p);
  }

  private onDown = (e: PointerEvent): void => {
    if (!this.enabled || this.pointerId !== null) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    this.pointerId = e.pointerId;
    this.rect = this.canvas.getBoundingClientRect();
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      // 追えなくても、枠の中では描ける
    }
    this.points = [];
    this.redraw();
    this.add(this.local(e));
  };

  private onMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    e.preventDefault();
    const list = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
    if (list.length) for (const ce of list) this.add(this.local(ce));
    else this.add(this.local(e));
  };

  private onUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    this.add(this.local(e));
    this.pointerId = null;
    this.rect = null;
    this.opts.onEnd(this.current());
  };

  private segment(a: PadPoint, b: PadPoint): void {
    const c = this.ctx;
    c.strokeStyle = this.opts.lineColor;
    c.lineWidth = this.opts.lineWidth;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(a[0], a[1]);
    c.lineTo(b[0], b[1]);
    c.stroke();
  }

  private redraw(): void {
    this.ctx.clearRect(0, 0, this.size, this.size);
    for (let i = 1; i < this.points.length; i++) this.segment(this.points[i - 1]!, this.points[i]!);
  }
}
