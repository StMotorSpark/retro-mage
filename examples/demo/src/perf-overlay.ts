export interface VisibilityStats {
  sightRadius: number;
  maxSightDistance: number;
  cullPrecisionDistance: number;
  ambientLight: number;
  tilesCount: number;
  actorsCount: number;
  activeWorldStructure?: string;
  currentRoomId?: number;
  residentRoomsCount?: number;
  residentChunksCount?: number;
  seamTriggerDistance?: number;
  outdoorLoadRadius?: number;
  indoorHopDepth?: number;
}

export interface VisibilityOverlayCallbacks {
  onAdjustMaxSight: (delta: number) => void;
  onAdjustCullPrecision: (delta: number) => void;
  onAdjustAmbientLight: (delta: number) => void;
  onAdjustSeamTrigger?: (delta: number) => void;
  onAdjustOutdoorLoadRadius?: (delta: number) => void;
  onAdjustIndoorHopDepth?: (delta: number) => void;
}

/**
 * Minimal DOM-based performance and visibility overlay showing FPS, sight radius,
 * rendered buffer counts, streaming state, and interactive controls to adjust visibility & streaming tuning knobs live.
 */
export class PerfOverlay {
  private element: HTMLElement;
  private statsTextElement: HTMLElement;
  private visible = true;
  private frameTimes: number[] = [];
  private lastUpdate = 0;

  constructor(callbacks?: VisibilityOverlayCallbacks) {
    this.element = document.createElement('div');
    this.element.id = 'perf-overlay';
    this.element.style.position = 'fixed';
    this.element.style.top = '12px';
    this.element.style.left = '12px';
    this.element.style.padding = '10px 14px';
    this.element.style.background = 'rgba(0, 0, 0, 0.85)';
    this.element.style.color = '#00ffcc';
    this.element.style.fontFamily = 'monospace';
    this.element.style.fontSize = '12px';
    this.element.style.borderRadius = '6px';
    this.element.style.zIndex = '1000';
    this.element.style.userSelect = 'none';
    this.element.style.pointerEvents = 'auto';
    this.element.style.lineHeight = '1.5';
    this.element.style.boxShadow = '0 2px 10px rgba(0,0,0,0.5)';

    this.statsTextElement = document.createElement('div');
    this.statsTextElement.style.whiteSpace = 'pre';
    this.statsTextElement.textContent = 'FPS: -- (0.0 ms)';
    this.element.appendChild(this.statsTextElement);

    if (callbacks) {
      const controlsContainer = document.createElement('div');
      controlsContainer.style.marginTop = '8px';
      controlsContainer.style.borderTop = '1px solid rgba(0, 255, 204, 0.3)';
      controlsContainer.style.paddingTop = '6px';

      const createControlRow = (
        label: string,
        onMinus: () => void,
        onPlus: () => void,
      ): HTMLElement => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';
        row.style.marginTop = '4px';
        row.style.gap = '8px';

        const labelSpan = document.createElement('span');
        labelSpan.textContent = label;

        const btnGroup = document.createElement('div');
        btnGroup.style.display = 'flex';
        btnGroup.style.gap = '4px';

        const minusBtn = document.createElement('button');
        minusBtn.textContent = '-';
        minusBtn.style.background = '#222';
        minusBtn.style.color = '#00ffcc';
        minusBtn.style.border = '1px solid #00ffcc';
        minusBtn.style.borderRadius = '3px';
        minusBtn.style.padding = '1px 6px';
        minusBtn.style.cursor = 'pointer';
        minusBtn.onclick = (e) => {
          e.stopPropagation();
          onMinus();
        };

        const plusBtn = document.createElement('button');
        plusBtn.textContent = '+';
        plusBtn.style.background = '#222';
        plusBtn.style.color = '#00ffcc';
        plusBtn.style.border = '1px solid #00ffcc';
        plusBtn.style.borderRadius = '3px';
        plusBtn.style.padding = '1px 6px';
        plusBtn.style.cursor = 'pointer';
        plusBtn.onclick = (e) => {
          e.stopPropagation();
          onPlus();
        };

        btnGroup.appendChild(minusBtn);
        btnGroup.appendChild(plusBtn);

        row.appendChild(labelSpan);
        row.appendChild(btnGroup);
        return row;
      };

      controlsContainer.appendChild(
        createControlRow(
          'Max Sight',
          () => callbacks.onAdjustMaxSight(-4),
          () => callbacks.onAdjustMaxSight(4),
        ),
      );

      controlsContainer.appendChild(
        createControlRow(
          'Cull Prec',
          () => callbacks.onAdjustCullPrecision(-4),
          () => callbacks.onAdjustCullPrecision(4),
        ),
      );

      controlsContainer.appendChild(
        createControlRow(
          'Ambient Light',
          () => callbacks.onAdjustAmbientLight(-0.25),
          () => callbacks.onAdjustAmbientLight(0.25),
        ),
      );

      if (callbacks.onAdjustSeamTrigger) {
        controlsContainer.appendChild(
          createControlRow(
            'Seam Trigger',
            () => callbacks.onAdjustSeamTrigger!(-1),
            () => callbacks.onAdjustSeamTrigger!(1),
          ),
        );
      }

      if (callbacks.onAdjustOutdoorLoadRadius) {
        controlsContainer.appendChild(
          createControlRow(
            'Load Radius',
            () => callbacks.onAdjustOutdoorLoadRadius!(-1),
            () => callbacks.onAdjustOutdoorLoadRadius!(1),
          ),
        );
      }

      if (callbacks.onAdjustIndoorHopDepth) {
        controlsContainer.appendChild(
          createControlRow(
            'Hop Depth',
            () => callbacks.onAdjustIndoorHopDepth!(-1),
            () => callbacks.onAdjustIndoorHopDepth!(1),
          ),
        );
      }

      this.element.appendChild(controlsContainer);
    }

    document.body.appendChild(this.element);
  }

  public update(dtMs: number, now: number, stats?: VisibilityStats): void {
    this.frameTimes.push(dtMs);
    if (this.frameTimes.length > 60) {
      this.frameTimes.shift();
    }

    if (now - this.lastUpdate > 100) {
      this.lastUpdate = now;
      const avgMs = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
      const fps = avgMs > 0 ? 1000 / avgMs : 0;

      let text = `FPS: ${fps.toFixed(1)} (${avgMs.toFixed(2)} ms)`;

      if (stats) {
        text += `\nSight Radius: ${stats.sightRadius.toFixed(2)}`;
        text += `\nMax Sight: ${stats.maxSightDistance.toFixed(1)} | Cull Prec: ${stats.cullPrecisionDistance.toFixed(1)}`;
        text += `\nAmbient Light: ${stats.ambientLight.toFixed(2)}`;
        text += `\nRendered Tiles: ${stats.tilesCount} | Actors: ${stats.actorsCount}`;
        if (stats.activeWorldStructure !== undefined) {
          text += `\nWorld Structure: ${stats.activeWorldStructure}`;
        }
        if (stats.currentRoomId !== undefined) {
          text += ` | Room ID: ${stats.currentRoomId}`;
        }
        if (stats.residentRoomsCount !== undefined && stats.residentChunksCount !== undefined) {
          text += `\nResident Rooms: ${stats.residentRoomsCount} | Chunks: ${stats.residentChunksCount}`;
        }
        if (stats.seamTriggerDistance !== undefined) {
          text += `\nSeam Trigger: ${stats.seamTriggerDistance.toFixed(1)} | Load Rad: ${stats.outdoorLoadRadius ?? '--'} | Hop Depth: ${stats.indoorHopDepth ?? '--'}`;
        }
      }

      this.statsTextElement.textContent = text;
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


