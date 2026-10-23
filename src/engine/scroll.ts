// 가상 스크롤 (명세 7.3). 휠·터치 입력을 target에 누적하고 current가 lerp로 따라간다(관성).
export class VirtualScroll {
  target = 0;
  current = 0;

  add(delta: number): void {
    this.target += delta;
  }

  /** dt(초)와 무관하게 같은 감쇠가 되도록 60fps 기준 계수를 보정한다 */
  update(dt: number): void {
    const k = 1 - Math.pow(1 - 0.12, dt * 60);
    this.current += (this.target - this.current) * k;
    if (Math.abs(this.target - this.current) < 0.01) this.current = this.target;
  }
}
