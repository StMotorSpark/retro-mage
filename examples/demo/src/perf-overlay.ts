/**
 * Minimal DOM-based performance overlay showing FPS and frame time (ms).
 * Updates a few times per second using a rolling window.
 */
export class PerfOverlay {
  private element: HTMLElement;
  private visible = true;
  private frameTimes: number[] = [];
  private lastUpdate = 0;

  constructor() {
    this.element = document.createElement('div');
    this.element.id = 'perf-overlay';
    this.element.style.position = 'fixed';
    this.element.style.top = '12px';
    this.element.style.left = '12px';
    this.element.style.padding = '6px 10px';
    this.element.style.background = 'rgba(0, 0, 0, 0.75)';
    this.element.style.color = '#00ffcc';
    this.element.style.fontFamily = 'monospace';
    this.element.style.fontSize = '12px';
    this.element.style.borderRadius = '4px';
    this.element.style.zIndex = '1000';
    this.element.style.pointerEvents = 'none';
    this.element.style.userSelect = 'none';
    this.element.textContent = 'FPS: -- (0.0 ms)';
    document.body.appendChild(this.element);
  }

  public update(dtMs: number, now: number): void {
    this.frameTimes.push(dtMs);
    if (this.frameTimes.length > 60) {
      this.frameTimes.shift();
    }

    if (now - this.lastUpdate > 250) {
      this.lastUpdate = now;
      const avgMs = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
      const fps = avgMs > 0 ? 1000 / avgMs : 0;
      this.element.textContent = `FPS: ${fps.toFixed(1)} (${avgMs.toFixed(2)} ms)`;
    }
  }

  public toggle(): void {
    this.visible = !this.visible;
    this.element.style.display = this.visible ? 'block' : 'none';
  }

  public isVisible(): boolean {
    return this.visible;
  }
}
