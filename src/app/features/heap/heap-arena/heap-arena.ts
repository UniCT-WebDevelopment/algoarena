import { Component, ElementRef, HostListener, QueryList, ViewChildren } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { LabSessionApiService } from '../../../core/services/lab-session-api';
import { HeapType } from '../../../core/services/validation';

type ChallengeMode = 'build' | 'extract' | 'sort';
type HeapExerciseType = 'buildMax' | 'buildMin' | 'extractMax' | 'extractMin' | 'heapSort';

interface HeapChallengeConfig {
  id: string;
  title: string;
  description: string;
  type: HeapExerciseType;
  mode: ChallengeMode;
  heapType: HeapType;
  size: number;
  points: number;
}

interface HeapChallengeState extends HeapChallengeConfig {
  valid: boolean;
  completed: boolean;
  attempts: number;
  sessionId?: string | null;
  requiredExtractions?: number;
  timelineSnapshot?: TimelineStep[];
  runId?: string;
  awarded?: boolean;
  expectedOps?: number;
}

interface HeapState {
  array: number[];
  locked: boolean[];
}

interface StepEvaluation {
  heapValid: boolean;
  suffixValid: boolean;
  completed: boolean;
  violations: number[];
}

interface HeapStep extends HeapState, StepEvaluation {
  id: string;
  label: string;
  operation?: string;
  timestamp: number;
}

interface TimelineStep {
  label: string;
  operation?: string;
  array: number[];
  locked: boolean[];
  violations: number[];
}

interface ArenaSnapshot {
  steps: HeapStep[];
  activeStepIndex: number;
  selectedIndices: number[];
  challenges: HeapChallengeState[];
  activeChallengeId: string | null;
  operations: number;
  errors: number;
  challengeStartedAt: number;
  statusMessage: string;
}

interface HeapSessionScenario {
  challenge: HeapChallengeConfig & {
    baseArray: number[];
    requiredExtractions?: number;
  };
}

interface HeapEvaluationResponse {
  heapValid: boolean;
  suffixValid: boolean;
  completed: boolean;
  violations: number[];
  lockedCount: number;
  requiredExtractions?: number;
  expectedOps: number;
  errors: number;
}

const HEAP_CHALLENGE_TEMPLATES: HeapChallengeConfig[] = [
  {
    id: 'build-max',
    title: 'Build Max-Heap',
    description: 'Sistema l\'array in max-heap partendo dal basso (heapify bottom-up).',
    type: 'buildMax',
    mode: 'build',
    heapType: 'max',
    size: 9,
    points: 80,
  },
  {
    id: 'build-min',
    title: 'Build Min-Heap',
    description: 'Correggi l\'array per ottenere una min-heap perfetta.',
    type: 'buildMin',
    mode: 'build',
    heapType: 'min',
    size: 9,
    points: 80,
  },
  {
    id: 'extract-max',
    title: 'Extract Max',
    description: 'Simula estrazioni successive dalla max-heap bloccando i massimi in coda.',
    type: 'extractMax',
    mode: 'extract',
    heapType: 'max',
    size: 8,
    points: 100,
  },
  {
    id: 'extract-min',
    title: 'Extract Min',
    description: 'Esegui estrazioni min da una min-heap e blocca i minimi alla fine.',
    type: 'extractMin',
    mode: 'extract',
    heapType: 'min',
    size: 8,
    points: 100,
  },
  {
    id: 'heapsort',
    title: 'Heapsort',
    description: 'Costruisci una max-heap e completa tutte le estrazioni per ordinare l\'array.',
    type: 'heapSort',
    mode: 'sort',
    heapType: 'max',
    size: 10,
    points: 120,
  },
];

function computeRandomExtractionGoal(challenge: HeapChallengeConfig): number {
  const maxTarget = Math.max(1, challenge.size - 2);
  return Math.floor(Math.random() * maxTarget) + 1;
}

@Component({
  selector: 'app-heap-arena',
  standalone: true,
  imports: [NgFor, NgIf, NgClass],
  templateUrl: './heap-arena.html',
  styleUrl: './heap-arena.scss',
})
export class HeapArenaComponent {
  @ViewChildren('timelineCard') timelineCards?: QueryList<ElementRef<HTMLElement>>;

  challenges: HeapChallengeState[] = HEAP_CHALLENGE_TEMPLATES.map((challenge) => ({
    ...challenge,
    valid: false,
    completed: false,
    attempts: 0,
    requiredExtractions: challenge.mode === 'extract' ? computeRandomExtractionGoal(challenge) : undefined,
  }));

  steps: HeapStep[] = [];
  activeStepIndex = 0;
  selectedIndices: number[] = [];
  activeChallengeId: string | null = this.challenges[0]?.id ?? null;
  operations = 0;
  errors = 0;
  statusMessage = '';

  undoStack: ArenaSnapshot[] = [];
  redoStack: ArenaSnapshot[] = [];
  private challengeStartedAt = performance.now();
  private timelineCanvas?: HTMLCanvasElement;
  private readonly newRunId = () =>
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  constructor(
    private labSessionApi: LabSessionApiService
  ) {
    if (this.activeChallengeId) {
      this.startChallenge(this.activeChallengeId);
    }
  }

  get currentChallenge(): HeapChallengeState | undefined {
    return this.challenges.find((challenge) => challenge.id === this.activeChallengeId);
  }

  get currentStep(): HeapStep | undefined {
    return this.steps[this.activeStepIndex];
  }

  get timelineCount(): number {
    return Math.max(0, this.steps.length - 1);
  }

  get isChallengeLocked(): boolean {
    return Boolean(this.currentChallenge?.completed);
  }

  get lockedCellsCount(): number {
    const step = this.currentStep;
    if (!step) {
      return 0;
    }
    return this.countLocked(step.locked);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {
    if (event.key.toLowerCase() === 'z' && event.ctrlKey && !event.shiftKey) {
      event.preventDefault();
      if (this.isChallengeLocked) {
        return;
      }
      this.undo();
      return;
    }
    if (event.key.toLowerCase() === 'z' && event.ctrlKey && event.shiftKey) {
      event.preventDefault();
      if (this.isChallengeLocked) {
        return;
      }
      this.redo();
    }
  }

  startChallenge(challengeId: string): void {
    const challenge = this.challenges.find((c) => c.id === challengeId);
    if (!challenge) {
      return;
    }
    this.labSessionApi
      .startSession<HeapSessionScenario, HeapEvaluationResponse>({
        labType: 'heap',
        variant: challengeId,
      })
      .subscribe((response) => {
        this.activeChallengeId = challengeId;
        challenge.sessionId = response.sessionId;
        challenge.runId = this.newRunId();
        challenge.awarded = false;
        challenge.valid = false;
        challenge.completed = false;
        challenge.timelineSnapshot = undefined;
        challenge.expectedOps = response.result.expectedOps;
        challenge.requiredExtractions = response.scenario.challenge.requiredExtractions;
        challenge.attempts += 1;
        const baseArray = response.scenario.challenge.baseArray;
        const locked = Array(baseArray.length).fill(false);
        this.steps = [this.createStep(baseArray, locked, 'Setup iniziale')];
        this.activeStepIndex = 0;
        this.operations = 0;
        this.errors = 0;
        this.statusMessage = '';
        this.selectedIndices = [];
        this.undoStack = [];
        this.redoStack = [];
        this.challengeStartedAt = performance.now();
        this.applyServerEvaluation(challenge, this.steps[0], response.result, true);
        this.scheduleScrollToStep(0);
      });
  }

  selectStep(index: number): void {
    if (index < 0 || index >= this.steps.length) {
      return;
    }
    this.activeStepIndex = index;
    this.selectedIndices = [];
    this.statusMessage = `Ripreso il passo ${index}.`;
    this.scheduleScrollToStep(index);
  }

  toggleSelection(index: number): void {
    const step = this.currentStep;
    if (!step) {
      return;
    }
    if (step.locked[index]) {
      this.bumpError('Non puoi modificare una cella già bloccata.');
      return;
    }
    if (this.selectedIndices.includes(index)) {
      this.selectedIndices = this.selectedIndices.filter((idx) => idx !== index);
      return;
    }
    if (this.selectedIndices.length === 2) {
      this.selectedIndices = [index];
      return;
    }
    this.selectedIndices = [...this.selectedIndices, index];
  }

  swapSelected(): void {
    if (this.isChallengeLocked) {
      return;
    }
    if (this.selectedIndices.length !== 2) {
      this.bumpError('Seleziona due celle da scambiare.');
      return;
    }
    const [a, b] = this.selectedIndices;
    this.executeOperation(`Swap ${a + 1} ↔ ${b + 1}`, (state) => {
      [state.array[a], state.array[b]] = [state.array[b], state.array[a]];
    });
  }

  swapRootWithTail(): void {
    if (this.isChallengeLocked) {
      return;
    }
    const step = this.currentStep;
    if (!step) return;
    const heapBound = this.getWorkingLength(step.locked);
    if (heapBound <= 1) {
      this.bumpError('Non ci sono elementi sufficienti per effettuare uno swap radice/coda.');
      return;
    }
    const lastIndex = heapBound - 1;
    this.executeOperation('Swap radice ↔ ultima attiva', (state) => {
      const bound = this.getWorkingLength(state.locked);
      const tailIndex = bound - 1;
      [state.array[0], state.array[tailIndex]] = [state.array[tailIndex], state.array[0]];
    });
  }

  lockLastActive(): void {
    if (this.isChallengeLocked) {
      return;
    }
    const step = this.currentStep;
    if (!step) return;
    const challenge = this.currentChallenge;
    if (!challenge || challenge.mode === 'build') {
      this.bumpError('Il blocco viene utilizzato solo per extract/heapsort.');
      return;
    }
    const bound = this.getWorkingLength(step.locked);
    if (bound <= 0) {
      this.bumpError('Tutti gli elementi risultano già bloccati.');
      return;
    }
    this.executeOperation('Blocca ultima cella attiva', (state) => {
      const limit = this.getWorkingLength(state.locked);
      if (limit > 0) {
        state.locked[limit - 1] = true;
      }
    });
  }

  heapifyRoot(): void {
    if (this.isChallengeLocked) {
      return;
    }
    const challenge = this.currentChallenge;
    const step = this.currentStep;
    if (!challenge || !step) return;
    const heapBound = this.getWorkingLength(step.locked);
    if (heapBound <= 1) {
      this.bumpError('Nulla da heapify: la sezione attiva è troppo piccola.');
      return;
    }
    this.executeOperation('Heapify sulla radice', (state) => {
      const limit = this.getWorkingLength(state.locked);
      this.heapify(state.array, limit, 0, challenge.heapType);
    });
  }

  undo(): void {
    if (this.isChallengeLocked) {
      return;
    }
    if (!this.undoStack.length) {
      return;
    }
    const snapshot = this.undoStack.pop()!;
    this.redoStack.push(this.serializeState());
    this.restoreSnapshot(snapshot);
    this.statusMessage = 'Ripristinato lo stato precedente.';
  }

  redo(): void {
    if (this.isChallengeLocked) {
      return;
    }
    if (!this.redoStack.length) {
      return;
    }
    const snapshot = this.redoStack.pop()!;
    this.undoStack.push(this.serializeState());
    this.restoreSnapshot(snapshot);
    this.statusMessage = 'Ripristinato lo stato successivo.';
  }

  private executeOperation(label: string, modify: (state: HeapState) => void): void {
    if (this.isChallengeLocked) {
      return;
    }
    const base = this.steps[this.activeStepIndex];
    if (!base) {
      return;
    }
    this.pushSnapshot();
    const draft = this.cloneState(base);
    modify(draft);
    const trimmed = this.steps.slice(0, this.activeStepIndex + 1);
    const newStep = this.createStep(draft.array, draft.locked, label);
    this.steps = [...trimmed, newStep];
    this.activeStepIndex = this.steps.length - 1;
    this.selectedIndices = [];
    this.statusMessage = label;
    this.syncStepWithServer(newStep);
    this.scheduleScrollToStep(this.activeStepIndex);
  }

  private createStep(array: number[], locked: boolean[], operation?: string): HeapStep {
    return {
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      array: [...array],
      locked: [...locked],
      label: operation ?? 'Stato',
      operation,
      timestamp: Date.now(),
      heapValid: false,
      suffixValid: false,
      completed: false,
      violations: [],
    };
  }

  private syncStepWithServer(step: HeapStep): void {
    const challenge = this.currentChallenge;
    if (!challenge?.sessionId) {
      return;
    }
    this.labSessionApi
      .submitStep<HeapEvaluationResponse>(challenge.sessionId, {
        eventType: 'step',
        payload: {
          array: [...step.array],
          locked: [...step.locked],
        },
      })
      .subscribe((response) => this.applyServerEvaluation(challenge, step, response.result));
  }

  private applyServerEvaluation(
    challenge: HeapChallengeState,
    step: HeapStep,
    result: HeapEvaluationResponse,
    silent = false
  ): void {
    step.heapValid = result.heapValid;
    step.suffixValid = result.suffixValid;
    step.completed = result.completed;
    step.violations = [...result.violations];
    challenge.valid = result.heapValid && result.suffixValid;
    challenge.requiredExtractions = result.requiredExtractions ?? challenge.requiredExtractions;
    challenge.expectedOps = result.expectedOps;
    this.operations = this.steps.length > 0 ? this.steps.length - 1 : 0;
    this.errors = result.errors;
    if (result.completed && !challenge.completed) {
      challenge.completed = true;
      challenge.timelineSnapshot = this.steps.map((item) => this.serializeTimelineStep(item));
      if (!silent) {
        this.statusMessage = `Challenge "${challenge.title}" completata!`;
      }
    }
  }

  downloadTimelineSvg(challengeId?: string): void {
    if (typeof document === 'undefined') {
      return;
    }
    const targetChallenge = challengeId
      ? this.challenges.find((c) => c.id === challengeId)
      : this.currentChallenge;
    if (!targetChallenge || !targetChallenge.completed) {
      return;
    }
    const stepsSource =
      challengeId && targetChallenge.id !== this.activeChallengeId
        ? targetChallenge.timelineSnapshot
        : this.steps;
    if (!stepsSource || !stepsSource.length) {
      return;
    }
    const svg = this.buildTimelineSvg(stepsSource);
    if (!svg) {
      return;
    }
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `heap-timeline-${targetChallenge.id}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private buildTimelineSvg(steps: ReadonlyArray<TimelineStep>): string | null {
    if (!steps.length) {
      return null;
    }
    const columns = 2;
    const horizontalGap = 60;
    const verticalGap = 80;
    const cellWidth = 560;
    const cellHeight = 240;
    const padding = 24;
    const columnOffsets: number[] = [];
    for (let i = 0; i < columns; i++) {
      columnOffsets[i] = horizontalGap + i * (cellWidth + horizontalGap);
    }
    const rows = Math.ceil(steps.length / columns);
    const rowOffsets: number[] = [];
    for (let r = 0; r < rows; r++) {
      rowOffsets[r] = verticalGap + r * (cellHeight + verticalGap);
    }
    const width = columnOffsets[columns - 1] + cellWidth + horizontalGap;
    const height = rowOffsets[rows - 1] + cellHeight + verticalGap;
    const svgParts: string[] = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">`,
      `<rect width="100%" height="100%" fill="#020617"/>`,
    ];
    steps.forEach((step, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const originX = columnOffsets[column];
      const originY = rowOffsets[row];
      svgParts.push(
        `<g transform="translate(${originX},${originY})">`,
        `<rect width="${cellWidth}" height="${cellHeight}" rx="32" ry="32" fill="rgba(15,23,42,0.7)" stroke="rgba(148,163,184,0.4)" />`,
        `<text x="${padding}" y="${padding + 12}" fill="#f8fafc" font-size="20" font-weight="600" font-family="Poppins, sans-serif">Passo ${index}</text>`,
        `<text x="${padding}" y="${padding + 36}" fill="#94a3b8" font-size="12" font-family="JetBrains Mono, monospace">${step.operation ?? 'Stato'}</text>`,
        this.buildArraySvg(step, padding, padding + 60, cellWidth - padding * 2),
        `</g>`
      );
    });
    svgParts.push('</svg>');
    return svgParts.join('');
  }

  private buildArraySvg(step: TimelineStep, originX: number, originY: number, maxWidth: number): string {
    const cellSpacing = 8;
    const cellWidth = 46;
    const totalWidth = step.array.length * cellWidth + (step.array.length - 1) * cellSpacing;
    const scale = Math.min(1, maxWidth / totalWidth);
    const scaledCellWidth = cellWidth * scale;
    const scaledSpacing = cellSpacing * scale;
    const cellHeight = 72 * scale;
    const elements: string[] = [];
    step.array.forEach((value, idx) => {
      const x = originX + idx * (scaledCellWidth + scaledSpacing);
      const locked = step.locked[idx];
      const violation = !locked && step.violations.includes(idx);
      const fill = locked ? 'rgba(15,23,42,0.6)' : violation ? 'rgba(248,113,113,0.5)' : 'rgba(59,130,246,0.3)';
      const stroke = violation ? 'rgba(248,113,113,0.9)' : 'rgba(226,232,240,0.6)';
      elements.push(
        `<g transform="translate(${x},${originY})">`,
        `<rect width="${scaledCellWidth}" height="${cellHeight}" rx="${14 * scale}" ry="${14 * scale}" fill="${fill}" stroke="${stroke}" />`,
        `<text x="${scaledCellWidth / 2}" y="${cellHeight / 2}" fill="#f8fafc" font-size="${15 * scale}" font-weight="600" text-anchor="middle" dominant-baseline="middle" font-family="Poppins, sans-serif">${value}</text>`,
        `<text x="${scaledCellWidth / 2}" y="${cellHeight + 12 * scale}" fill="#94a3b8" font-size="${8 * scale}" text-anchor="middle" font-family="JetBrains Mono, monospace">#${idx + 1}</text>`,
        `</g>`
      );
    });
    return elements.join('');
  }

  private getWorkingLength(locked: boolean[]): number {
    let idx = locked.length;
    while (idx > 0 && locked[idx - 1]) {
      idx--;
    }
    return idx;
  }

  private heapify(array: number[], heapSize: number, index: number, type: HeapType): void {
    let largest = index;
    while (true) {
      const left = 2 * largest + 1;
      const right = 2 * largest + 2;
      let best = largest;
      if (left < heapSize && this.prefers(array[left], array[best], type)) {
        best = left;
      }
      if (right < heapSize && this.prefers(array[right], array[best], type)) {
        best = right;
      }
      if (best === largest) {
        break;
      }
      [array[largest], array[best]] = [array[best], array[largest]];
      largest = best;
    }
  }

  private prefers(candidate: number, current: number, type: HeapType): boolean {
    return type === 'max' ? candidate > current : candidate < current;
  }

  private cloneState(step: HeapStep): HeapState {
    return {
      array: [...step.array],
      locked: [...step.locked],
    };
  }

  private countLocked(locked: boolean[]): number {
    return locked.reduce((count, flag) => (flag ? count + 1 : count), 0);
  }

  private isNonDecreasing(values: number[]): boolean {
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] > values[i]) {
        return false;
      }
    }
    return true;
  }

  private isNonIncreasing(values: number[]): boolean {
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] < values[i]) {
        return false;
      }
    }
    return true;
  }

  private bumpError(message: string): void {
    this.statusMessage = message;
  }

  private pushSnapshot(): void {
    this.undoStack.push(this.serializeState());
    if (this.undoStack.length > 200) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  private scheduleScrollToStep(index: number): void {
    setTimeout(() => this.scrollToStep(index), 0);
  }

  private scrollToStep(index: number): void {
    const card = this.timelineCards?.get(index);
    card?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  private randomExtractionGoal(challenge: HeapChallengeConfig): number {
    return computeRandomExtractionGoal(challenge);
  }

  private serializeTimelineStep(step: HeapStep): TimelineStep {
    return {
      label: step.label,
      operation: step.operation,
      array: [...step.array],
      locked: [...step.locked],
      violations: [...step.violations],
    };
  }

  private computeExpectedOperations(
    challenge: HeapChallengeState,
    baseArray: number[],
    requiredExtractions: number
  ): number {
    const array = [...baseArray];
    const heapSize = array.length;
    let ops = 0;
    ops += this.buildHeapWithSwapCount(array, heapSize, challenge.heapType);

    if (challenge.mode === 'build') {
      return ops;
    }

    const extractions = challenge.mode === 'extract'
      ? Math.min(requiredExtractions, heapSize)
      : heapSize;

    let currentSize = heapSize;
    for (let i = 0; i < extractions && currentSize > 0; i += 1) {
      if (currentSize > 1) {
        [array[0], array[currentSize - 1]] = [array[currentSize - 1], array[0]];
        ops += 1;
      }
      currentSize -= 1;
      if (currentSize > 0) {
        ops += this.heapifyWithSwapCount(array, currentSize, 0, challenge.heapType);
      }
      ops += 1; // lock last active
    }
    return ops;
  }

  private buildHeapWithSwapCount(array: number[], heapSize: number, type: HeapType): number {
    let swaps = 0;
    for (let i = Math.floor(heapSize / 2) - 1; i >= 0; i -= 1) {
      swaps += this.heapifyWithSwapCount(array, heapSize, i, type);
    }
    return swaps;
  }

  private heapifyWithSwapCount(array: number[], heapSize: number, index: number, type: HeapType): number {
    let swaps = 0;
    let current = index;
    while (true) {
      const left = 2 * current + 1;
      const right = 2 * current + 2;
      let best = current;
      if (left < heapSize && this.prefers(array[left], array[best], type)) {
        best = left;
      }
      if (right < heapSize && this.prefers(array[right], array[best], type)) {
        best = right;
      }
      if (best === current) {
        break;
      }
      [array[current], array[best]] = [array[best], array[current]];
      swaps += 1;
      current = best;
    }
    return swaps;
  }

  private updateExcessErrors(): void {
    const challenge = this.currentChallenge;
    if (!challenge) {
      this.errors = 0;
      return;
    }
    const expectedOps = challenge.expectedOps ?? 0;
    this.errors = Math.max(0, this.operations - expectedOps);
  }

  private serializeState(): ArenaSnapshot {
    return {
      steps: this.steps.map((step) => ({
        ...step,
        array: [...step.array],
        locked: [...step.locked],
        violations: [...step.violations],
      })),
      activeStepIndex: this.activeStepIndex,
      selectedIndices: [...this.selectedIndices],
      challenges: this.challenges.map((challenge) => ({
        ...challenge,
        timelineSnapshot: challenge.timelineSnapshot?.map((frame) => ({
          label: frame.label,
          operation: frame.operation,
          array: [...frame.array],
          locked: [...frame.locked],
          violations: [...frame.violations],
        })),
      })),
      activeChallengeId: this.activeChallengeId,
      operations: this.operations,
      errors: this.errors,
      challengeStartedAt: this.challengeStartedAt,
      statusMessage: this.statusMessage,
    };
  }

  private restoreSnapshot(snapshot: ArenaSnapshot): void {
    this.steps = snapshot.steps.map((step) => ({
      ...step,
      array: [...step.array],
      locked: [...step.locked],
      violations: [...step.violations],
    }));
    this.activeStepIndex = snapshot.activeStepIndex;
    this.selectedIndices = [...snapshot.selectedIndices];
    this.challenges = snapshot.challenges.map((challenge) => ({
      ...challenge,
      timelineSnapshot: challenge.timelineSnapshot?.map((frame) => ({
        label: frame.label,
        operation: frame.operation,
        array: [...frame.array],
        locked: [...frame.locked],
        violations: [...frame.violations],
      })),
    }));
    this.activeChallengeId = snapshot.activeChallengeId;
    this.operations = snapshot.operations;
    this.errors = snapshot.errors;
    this.challengeStartedAt = snapshot.challengeStartedAt;
    this.statusMessage = snapshot.statusMessage;
  }
}
