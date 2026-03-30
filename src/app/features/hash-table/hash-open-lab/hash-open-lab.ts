import { Component, OnInit } from '@angular/core';
import { CommonModule, NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LabSessionApiService } from '../../../core/services/lab-session-api';

interface SlotContribution {
  id: string;
  from: number | null;
  numerator: number | null;
  denominator: number | null;
}

interface SlotState {
  index: number;
  locked: boolean;
  contributions: SlotContribution[];
}

interface ExpectedSlot {
  probability: number;
  sources: number[];
  paths: ExpectedPath[];
}

interface ExpectedPath {
  src: number;
  visited: number[];
}

interface HashSessionScenario {
  tableSize: number;
  hasHashFunction: boolean;
  step: number;
  slots: SlotState[];
}

interface HashValidationResponse {
  correct: boolean;
  hasErrors: boolean;
  feedback: string;
  slotErrors: Record<number, string[]>;
}

@Component({
  selector: 'app-hash-open-lab',
  standalone: true,
  templateUrl: './hash-open-lab.html',
  styleUrl: './hash-open-lab.scss',
  imports: [CommonModule, FormsModule, NgFor, NgIf, NgClass],
})
export class HashOpenLabComponent implements OnInit {
  tableSize = 10;
  maxSize = 14;
  minSize = 6;
  hasHashFunction = false;
  step = 1;
  slots: SlotState[] = [];
  expected: ExpectedSlot[] = [];
  feedback = '';
  hasErrors = false;
  slotErrors: Record<number, string[]> = {};
  showExpected: Record<number, boolean> = {};
  canDownloadSvg = false;
  palette = [
    '#a855f7',
    '#38bdf8',
    '#f97316',
    '#22c55e',
    '#e11d48',
    '#facc15',
    '#06b6d4',
    '#c084fc',
    '#f9a8d4',
    '#93c5fd',
    '#f59e0b',
    '#4ade80',
    '#2dd4bf',
    '#f472b6',
  ];
  private sessionId: string | null = null;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private labSessionApi: LabSessionApiService) {}

  get freeSlotCount(): number {
    return this.slots.filter((s) => !s.locked).length;
  }

  get lockedSlotCount(): number {
    return this.slots.filter((s) => s.locked).length;
  }

  indexChipStyle(index: number): Record<string, string> {
    const base = this.colorFor(index);
    return {
      background: base,
      border: `1px solid ${this.withAlpha('#ffffff', 0.12)}`,
      color: '#0f172a',
      boxShadow: `0 0 0 1px ${this.withAlpha(base, 0.35)}, 0 10px 30px ${this.withAlpha(base, 0.35)}`,
    };
  }

  toggleExpected(index: number): void {
    this.showExpected[index] = !this.showExpected[index];
  }

  isExpectedVisible(index: number): boolean {
    return !!this.showExpected[index];
  }

  ngOnInit(): void {
    this.generateScenario();
  }

  generateScenario(): void {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
    this.labSessionApi
      .startSession<HashSessionScenario, HashValidationResponse>({
        labType: 'hashTable',
        variant: 'hash-open',
      })
      .subscribe((response) => {
        this.sessionId = response.sessionId;
        this.tableSize = response.scenario.tableSize;
        this.hasHashFunction = response.scenario.hasHashFunction;
        this.step = response.scenario.step;
        this.slots = response.scenario.slots.map((slot) => ({
          index: slot.index,
          locked: slot.locked,
          contributions: slot.contributions.map((contribution) => ({ ...contribution })),
        }));
        this.showExpected = {};
        this.recomputeExpected();
        this.applyServerValidation(response.result);
      });
  }

  addSlot(): void {
    if (this.tableSize >= this.maxSize) return;
    this.tableSize += 1;
    this.slots.push({ index: this.tableSize - 1, locked: false, contributions: [] });
    this.recomputeExpected();
    this.resetFeedback();
    this.queueDraftSync();
  }

  removeSlot(): void {
    if (this.tableSize <= this.minSize) return;
    this.tableSize -= 1;
    this.slots.pop();
    this.recomputeExpected();
    this.resetFeedback();
    this.queueDraftSync();
  }

  toggleLock(slot: SlotState): void {
    slot.locked = !slot.locked;
    if (this.slots.every((s) => s.locked)) {
      slot.locked = false;
    }
    this.recomputeExpected();
    this.resetFeedback();
    this.queueDraftSync();
  }

  addContribution(slot: SlotState): void {
    slot.contributions.push({
      id: this.nextId(),
      from: null,
      numerator: 1,
      denominator: this.tableSize,
    });
    this.clearLocalError(slot.index);
    this.queueDraftSync();
  }

  removeContribution(slot: SlotState, contributionId: string): void {
    slot.contributions = slot.contributions.filter((c) => c.id !== contributionId);
    this.clearLocalError(slot.index);
    this.queueDraftSync();
  }

  trackContrib(_: number, contrib: SlotContribution): string {
    return contrib.id;
  }

  colorFor(sourceIndex: number): string {
    return this.palette[sourceIndex % this.palette.length];
  }

  recomputeExpected(): void {
    const m = this.tableSize;
    const expected: ExpectedSlot[] = Array.from({ length: m }, () => ({
      probability: 0,
      sources: [],
      paths: [],
    }));
    if (this.slots.every((s) => s.locked)) {
      this.expected = expected;
      return;
    }
    const step = this.hasHashFunction ? this.step : 1;
    for (let start = 0; start < m; start++) {
      const trace = this.hasHashFunction ? this.tracePath(start, step) : { dest: this.walkToDestination(start, step), visited: [] };
      const dest = trace.dest;
      if (dest === null) continue;
      expected[dest].probability += 1 / m;
      expected[dest].sources.push(start);
      if (this.hasHashFunction) {
        expected[dest].paths.push({ src: start, visited: trace.visited });
      }
    }
    this.expected = expected;
  }

  private walkToDestination(start: number, step: number): number | null {
    const m = this.tableSize;
    for (let i = 0; i < m; i++) {
      const pos = (start + step * i) % m;
      if (!this.slots[pos].locked) {
        return pos;
      }
    }
    return null;
  }

  private tracePath(start: number, step: number): { dest: number | null; visited: number[] } {
    const m = this.tableSize;
    const visited: number[] = [];
    for (let i = 0; i < m; i++) {
      const pos = (start + step * i) % m;
      visited.push(pos);
      if (!this.slots[pos].locked) {
        return { dest: pos, visited };
      }
    }
    return { dest: null, visited };
  }

  onChangeStep(): void {
    if (this.step < 1) this.step = 1;
    this.recomputeExpected();
    this.resetFeedback();
    this.queueDraftSync();
  }

  onChangeSize(): void {
    if (this.tableSize < this.minSize) this.tableSize = this.minSize;
    if (this.tableSize > this.maxSize) this.tableSize = this.maxSize;
    this.slots = Array.from({ length: this.tableSize }, (_, idx) => {
      const existing = this.slots[idx];
      return (
        existing ?? {
          index: idx,
          locked: false,
          contributions: [],
        }
      );
    });
    this.reindexSlots();
    this.normalizeContributions();
    this.recomputeExpected();
    this.resetFeedback();
    this.queueDraftSync();
  }

  private reindexSlots(): void {
    this.slots = this.slots.slice(0, this.tableSize).map((slot, idx) => ({
      ...slot,
      index: idx,
    }));
  }

  private normalizeContributions(): void {
    for (const slot of this.slots) {
      slot.contributions = slot.contributions.map((c) => ({
        ...c,
        from: c.from !== null && c.from >= this.tableSize ? null : c.from,
      }));
    }
  }

  onModeChange(): void {
    if (!this.hasHashFunction) {
      this.step = 1;
    }
    this.recomputeExpected();
    this.resetFeedback();
    this.queueDraftSync();
  }

  onAnswerChange(slotIndex?: number): void {
    this.resetFeedback();
    if (slotIndex !== undefined) {
      this.clearLocalError(slotIndex);
    }
    this.queueDraftSync();
  }

  validate(): void {
    this.syncWithServer('check');
  }

  private queueDraftSync(): void {
    if (!this.sessionId) {
      return;
    }
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }
    this.syncTimer = setTimeout(() => {
      this.syncTimer = null;
      this.syncWithServer('draft');
    }, 250);
  }

  private syncWithServer(eventType: 'draft' | 'check'): void {
    if (!this.sessionId) {
      return;
    }
    this.labSessionApi
      .submitStep<HashValidationResponse>(this.sessionId, {
        eventType,
        payload: {
          tableSize: this.tableSize,
          hasHashFunction: this.hasHashFunction,
          step: this.step,
          slots: this.slots.map((slot) => ({
            index: slot.index,
            locked: slot.locked,
            contributions: slot.contributions.map((contribution) => ({ ...contribution })),
          })),
        },
      })
      .subscribe((response) => this.applyServerValidation(response.result));
  }

  private applyServerValidation(result: HashValidationResponse): void {
    this.slotErrors = { ...(result?.slotErrors ?? {}) };
    this.hasErrors = Boolean(result?.hasErrors);
    this.feedback = result?.feedback ?? '';
    this.canDownloadSvg = !this.hasErrors;
  }

  expectedFractions(slotIndex: number): { src: number; count: number }[] {
    const slot = this.expected[slotIndex];
    if (!slot || !slot.sources.length) return [];
    const counts = new Map<number, number>();
    for (const src of slot.sources) {
      counts.set(src, (counts.get(src) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([src, count]) => ({ src, count }));
  }

  downloadSvg(): void {
    if (!this.canDownloadSvg) return;
    const width = 1200;
    const baseSlotHeight = this.hasHashFunction ? 130 : 105;
    const padding = 24;
    const height = padding * 2 + this.slots.length * baseSlotHeight + 200;
    const lines: string[] = [];
    const textLine = (x: number, y: number, text: string, size = 16, weight = '500', color = '#e2e8f0') =>
      `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${color}" font-family="Poppins, Arial, sans-serif">${text}</text>`;

    lines.push(`<rect x="0" y="0" width="${width}" height="${height}" rx="18" fill="#0f172a" stroke="#475569" stroke-width="1"/>`);
    const stateString = this.slots.map((s) => (s.locked ? 'X' : '-')).join('');
    lines.push(textLine(padding, padding + 18, `Hash Open Lab — Snapshot   Stato celle [${stateString}]`, 20, '700'));
    lines.push(textLine(padding, padding + 44, `m = ${this.tableSize}  |  hash ${this.hasHashFunction ? 'h(k) = (h’(k) + i·' + this.step + ') mod m' : 'OFF (primo libero)'}`, 14));

    let currentY = padding + 80;
    const startProb = `1/${this.tableSize}`;
    for (const slot of this.slots) {
      const y = currentY;
      const header = `P(${slot.index}) — ${slot.locked ? 'X Occupato' : 'Libero'}`;
      lines.push(textLine(padding, y, header, 16, '700', this.colorFor(slot.index)));
      const expectedItems = this.expectedFractions(slot.index);
      lines.push(textLine(padding + 12, y + 18, 'Peso:', 14, '600'));
      if (expectedItems.length) {
        const innerWidth = width - padding * 2 - 12;
        const barWidth = 150;
        const barHeight = 24;
        const gap = 8;
        let rowY = y + 28;
        let xCursor = padding + 12;
        for (const f of expectedItems) {
          if (xCursor + barWidth > padding + 12 + innerWidth) {
            rowY += barHeight + gap;
            xCursor = padding + 12;
          }
          lines.push(
            `<rect x="${xCursor}" y="${rowY}" width="${barWidth}" height="${barHeight}" rx="6" fill="${this.withAlpha(
              this.colorFor(f.src),
              0.22
            )}" stroke="${this.colorFor(f.src)}" stroke-width="1.5"/>`
          );
          lines.push(textLine(xCursor + 10, rowY + 17, `${f.count}/${this.tableSize} da P(${f.src})`, 12, '700'));
          xCursor += barWidth + gap;
        }
      } else {
        lines.push(textLine(padding + 12, y + 42, '0', 14, '600'));
      }

      let maxY = expectedItems.length ? y + 42 : y + 42;
  
      maxY = maxY + 18;

      if (this.hasHashFunction) {
        const paths = this.expected[slot.index]?.paths ?? [];
        if (paths.length) {
          let pathY = maxY + 16;
          for (const path of paths) {
            const lineText = this.formatPathLine(path.visited,path.src);
            const wrapped = this.wrapSvgText(lineText, 110);
            lines.push(textLine(padding + 12, pathY, `P(${path.src}):`, 12, '700', this.colorFor(path.src)));
            for (let i = 0; i < wrapped.length; i++) {
              lines.push(textLine(padding + 70, pathY + i * 14, wrapped[i], 12, '500'));
            }
            pathY += wrapped.length * 14 + 6;
          }
          maxY = pathY;
        }
      }

      const slotHeight = Math.max(baseSlotHeight, maxY - y + 24);
      currentY += slotHeight;
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${lines.join(
      ''
    )}</svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hash-open-lab.svg';
    link.click();
    URL.revokeObjectURL(url);
  }

  private clearLocalError(slotIndex: number): void {
    delete this.slotErrors[slotIndex];
    this.hasErrors = false;
    this.feedback = '';
    this.canDownloadSvg = false;
  }

  private resetFeedback(): void {
    this.feedback = '';
    this.hasErrors = false;
    this.canDownloadSvg = false;
  }

  private nextId(): string {
    return `c-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
  }

  private withAlpha(hex: string, alpha: number): string {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private formatPathLine(visited: number[],src:number): string {
    return visited
      .map((pos, idx) => {
        const status = this.slots[pos]?.locked ? 'X' : 'L';
        // return `i = ${idx} => P(${pos}) (${status})`;
        return `(${src} + ${idx * this.step} ) mod ${this.tableSize} => P(${pos}) (${status})`
      })
      .join(' | ');
  }

  private wrapSvgText(text: string, maxChars: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      if ((current + ' ' + word).trim().length > maxChars) {
        lines.push(current.trim());
        current = word;
      } else {
        current += ' ' + word;
      }
    }
    if (current.trim()) lines.push(current.trim());
    return lines;
  }
}
