import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LabSessionApiService } from '../../../core/services/lab-session-api';

type FnKey =
  | '1'
  | 'logn'
  | 'sqrt'
  | 'n'
  | 'nlogn'
  | 'nlog2n'
  | 'n2'
  | 'n2logn'
  | 'n3';

interface FnOption {
  key: FnKey;
  label: string;
  k: number;
  log: number;
}

interface MasterExercise {
  id: string;
  title: string;
  description: string;
  pseudocode: string[];
  helpers: { name: string; cost: string }[];
  complexityOptions: string[];
  recurrence?: { a: number; b: number; fnKey: FnKey };
  points?: number;
  expectedCase?: 1 | 2 | 3;
  expectedComplexity?: string;
  runId?: string;
  awarded?: boolean;
  attempts?: number;
  errors?: number;
  startedAt?: number;
}

interface MasterSessionScenario {
  exercises: MasterExercise[];
}

interface MasterValidationResponse {
  correct: boolean;
  hasErrors: boolean;
  feedback: string;
  exerciseId: string;
  completedExerciseIds: string[];
}

const FN_OPTIONS: FnOption[] = [
  { key: '1', label: '1', k: 0, log: 0 },
  { key: 'logn', label: 'log n', k: 0, log: 1 },
  { key: 'sqrt', label: '√n', k: 0.5, log: 0 },
  { key: 'n', label: 'n', k: 1, log: 0 },
  { key: 'nlogn', label: 'n log n', k: 1, log: 1 },
  { key: 'nlog2n', label: 'n log² n', k: 1, log: 2 },
  { key: 'n2', label: 'n²', k: 2, log: 0 },
  { key: 'n2logn', label: 'n² log n', k: 2, log: 1 },
  { key: 'n3', label: 'n³', k: 3, log: 0 },
];

@Component({
  selector: 'app-master-theorem-lab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './master-theorem-lab.html',
  styleUrl: './master-theorem-lab.scss',
})
export class MasterTheoremLabComponent implements OnInit {
  exercises: MasterExercise[] = [];
  selectedExercise: MasterExercise | null = null;
  showHints = false;
  feedback = '';
  hasErrors = false;
  completedExerciseIds = new Set<string>();

  inputA = '';
  inputB = '';
  selectedFnKey: FnKey | '' = '';
  selectedCase: 1 | 2 | 3 | null = null;
  selectedComplexity = '';
  inputAlpha = '';
  inputFn = '';
  private sessionId: string | null = null;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private labSessionApi: LabSessionApiService) {}

  ngOnInit(): void {
    this.generateExercises();
  }

  get fnOptions(): FnOption[] {
    return FN_OPTIONS;
  }

  selectExercise(exercise: MasterExercise): void {
    this.selectedExercise = exercise;
    this.resetInputs();
    this.queueDraftSync();
  }

  toggleHints(): void {
    this.showHints = !this.showHints;
  }

  regenerate(): void {
    this.generateExercises();
  }

  validate(): void {
    this.syncWithServer('check');
  }

  private resetInputs(): void {
    this.inputA = '';
    this.inputB = '';
    this.selectedFnKey = '';
    this.selectedCase = null;
    this.selectedComplexity = '';
    this.inputAlpha = '';
    this.inputFn = '';
    this.feedback = '';
    this.hasErrors = false;
  }

  private generateExercises(): void {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
    this.labSessionApi
      .startSession<MasterSessionScenario, MasterValidationResponse>({
        labType: 'master',
        variant: 'master-theorem',
      })
      .subscribe((response) => {
        this.sessionId = response.sessionId;
        this.exercises = response.scenario.exercises;
        this.selectedExercise = this.exercises[0] ?? null;
        this.completedExerciseIds = new Set(response.result?.completedExerciseIds ?? []);
        this.resetInputs();
        this.applyServerValidation(response.result);
      });
  }

  queueDraftSync(): void {
    if (!this.sessionId || !this.selectedExercise) {
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
    if (!this.sessionId || !this.selectedExercise) {
      return;
    }
    this.labSessionApi
      .submitStep<MasterValidationResponse>(this.sessionId, {
        eventType,
        payload: {
          exerciseId: this.selectedExercise.id,
          inputA: this.inputA,
          inputB: this.inputB,
          selectedFnKey: this.selectedFnKey,
          selectedCase: this.selectedCase,
          selectedComplexity: this.selectedComplexity,
          inputAlpha: this.inputAlpha,
          inputFn: this.inputFn,
        },
      })
      .subscribe((response) => this.applyServerValidation(response.result));
  }

  private applyServerValidation(result: MasterValidationResponse): void {
    this.hasErrors = Boolean(result?.hasErrors);
    this.feedback = result?.feedback ?? '';
    this.completedExerciseIds = new Set(result?.completedExerciseIds ?? []);
  }

  private buildTemplates(): Array<{
    title: string;
    description: string;
    pseudocode: string[];
    helpers: { name: string; cost: string }[];
    recurrence: { a: number; b: number; fnKey: FnKey };
  }> {
    return [
      {
        title: 'Divide & Merge',
        description: 'Divide l’input in 2 parti e combina in tempo lineare.',
        pseudocode: [
          'Procedure Solve(A, n) {',
          '  if (n <= 1) return;',
          '  split(A) -> A1, A2;',
          '  Solve(A1, n/2);',
          '  Solve(A2, n/2);',
          '  Merge(A1, A2, A);   // O(n)',
          '}',
        ],
        helpers: [{ name: 'Merge(A1, A2)', cost: 'O(n)' }],
        recurrence: { a: 2, b: 2, fnKey: 'n' },
      },
      {
        title: 'Strassen-like',
        description: '7 sottoproblemi e combinazione quadratica.',
        pseudocode: [
          'Procedure FastMultiply(A, n) {',
          '  if (n <= 1) return;',
          '  divide A in 4 blocchi;',
          '  for (i = 1; i <= 7; i++) {',
          '    FastMultiply(block_i, n/2);',
          '  }',
          '  CombineBlocks(A);  // O(n^2)',
          '}',
        ],
        helpers: [{ name: 'CombineBlocks', cost: 'O(n^2)' }],
        recurrence: { a: 7, b: 2, fnKey: 'n2' },
      },
      {
        title: 'Triple Split',
        description: '3 chiamate ricorsive e lavoro lineare.',
        pseudocode: [
          'Procedure TripleSolve(A, n) {',
          '  if (n <= 1) return;',
          '  split(A) -> A1, A2, A3;',
          '  TripleSolve(A1, n/2);',
          '  TripleSolve(A2, n/2);',
          '  TripleSolve(A3, n/2);',
          '  Process(A);  // O(n)',
          '}',
        ],
        helpers: [{ name: 'Process', cost: 'O(n)' }],
        recurrence: { a: 3, b: 2, fnKey: 'n' },
      },
      {
        title: 'Quadratic Combine',
        description: '2 sottoproblemi e combinazione n^2.',
        pseudocode: [
          'Procedure HeavyCombine(A, n) {',
          '  if (n <= 1) return;',
          '  split(A) -> A1, A2;',
          '  HeavyCombine(A1, n/2);',
          '  HeavyCombine(A2, n/2);',
          '  BuildTable(A);  // O(n^2)',
          '}',
        ],
        helpers: [{ name: 'BuildTable', cost: 'O(n^2)' }],
        recurrence: { a: 2, b: 2, fnKey: 'n2' },
      },
      {
        title: 'Single Recurse',
        description: '1 chiamata ricorsiva e lavoro lineare.',
        pseudocode: [
          'Procedure TailSolve(A, n) {',
          '  if (n <= 1) return;',
          '  TailSolve(A, n/2);',
          '  Scan(A);  // O(n)',
          '}',
        ],
        helpers: [{ name: 'Scan', cost: 'O(n)' }],
        recurrence: { a: 1, b: 2, fnKey: 'n' },
      },
      {
        title: 'Two Quarter Recursions',
        description: '2 chiamate su n/4 con lavoro lineare.',
        pseudocode: [
          'Procedure QuarterSolve(A, n) {',
          '  if (n <= 1) return;',
          '  QuarterSolve(A, n/4);',
          '  QuarterSolve(A, n/4);',
          '  Compress(A);  // O(n)',
          '}',
        ],
        helpers: [{ name: 'Compress', cost: 'O(n)' }],
        recurrence: { a: 2, b: 4, fnKey: 'n' },
      },
      {
        title: 'Floyd-style',
        description: '8 sottoproblemi e lavoro cubico.',
        pseudocode: [
          'Procedure CubeSolve(A, n) {',
          '  if (n <= 1) return;',
          '  for (i = 1; i <= 8; i++) {',
          '    CubeSolve(A_i, n/2);',
          '  }',
          '  Combine(A);  // O(n^3)',
          '}',
        ],
        helpers: [{ name: 'Combine', cost: 'O(n^3)' }],
        recurrence: { a: 8, b: 2, fnKey: 'n3' },
      },
      {
        title: 'Balanced Blocks',
        description: '4 sottoproblemi e n^2 log n di combinazione.',
        pseudocode: [
          'Procedure BalancedSolve(A, n) {',
          '  if (n <= 1) return;',
          '  split(A) -> B1, B2, B3, B4;',
          '  for (i = 1; i <= 4; i++) {',
          '    BalancedSolve(B_i, n/2);',
          '  }',
          '  RebuildIndex(A);  // O(n^2 log n)',
          '}',
        ],
        helpers: [{ name: 'RebuildIndex', cost: 'O(n^2 log n)' }],
        recurrence: { a: 4, b: 2, fnKey: 'n2logn' },
      },
    ];
  }

  private buildExercise(
    template: {
      title: string;
      description: string;
      pseudocode: string[];
      helpers: { name: string; cost: string }[];
      recurrence: { a: number; b: number; fnKey: FnKey };
    },
    index: number
  ): MasterExercise {
    const { a, b, fnKey } = template.recurrence;
    const fn = FN_OPTIONS.find((opt) => opt.key === fnKey)!;
    const alpha = Math.log(a) / Math.log(b);
    const caseType = this.decideCase(alpha, fn.k);
    const expectedComplexity = this.formatComplexity(alpha, fn, caseType);
    const options = this.buildComplexityOptions(alpha, fn, expectedComplexity);
    return {
      id: `${template.title.toLowerCase().replace(/\s+/g, '-')}-${index}`,
      title: template.title,
      description: template.description,
      pseudocode: template.pseudocode,
      helpers: template.helpers,
      recurrence: { a, b, fnKey },
      points: 120,
      expectedCase: caseType,
      expectedComplexity,
      complexityOptions: options,
      runId: this.newSessionId(),
      awarded: false,
      attempts: 0,
      errors: 0,
      startedAt: performance.now(),
    };
  }

  private decideCase(alpha: number, k: number): 1 | 2 | 3 {
    const eps = 0.05;
    if (k < alpha - eps) return 1;
    if (k > alpha + eps) return 3;
    return 2;
  }

  private formatComplexity(alpha: number, fn: FnOption, caseType: 1 | 2 | 3): string {
    const base = this.formatPower(alpha);
    if (caseType === 1) return `Θ(${base})`;
    if (caseType === 3) return `Θ(${fn.label})`;
    const logPow = fn.log + 1;
    if (logPow === 1) return `Θ(${base} log n)`;
    return `Θ(${base} log^${logPow} n)`;
  }

  private buildComplexityOptions(alpha: number, fn: FnOption, expected: string): string[] {
    const base = this.formatPower(alpha);
    const options = new Map<string, string>();
    const add = (value: string) => {
      const key = this.normalizeExpr(value);
      if (!options.has(key)) {
        options.set(key, value);
      }
    };
    add(expected);
    add(`Θ(${base})`);
    add(`Θ(${base} log n)`);
    add(`Θ(${fn.label})`);
    add(`Θ(${fn.label} log n)`);
    return Array.from(options.values()).slice(0, 5);
  }

  private formatPower(alpha: number): string {
    const rounded = Math.round(alpha * 100) / 100;
    if (rounded === 0) return '1';
    if (rounded === 1) return 'n';
    if (Number.isInteger(rounded)) return `n^${rounded}`;
    return `n^${rounded}`;
  }

  private newSessionId(): string {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private matchesAlpha(input: string, a: number, b: number): boolean {
    const raw = input.trim().toLowerCase();
    if (!raw) return false;
    const alpha = Math.log(a) / Math.log(b);
    const expected = this.normalizeExpr(this.formatPower(alpha));
    const normalized = this.normalizeExpr(raw);
    if (normalized === expected) return true;
    if (normalized === 'n') return Math.abs(alpha - 1) < 0.1;
    if (normalized === '1') return Math.abs(alpha - 0) < 0.1;
    const match = normalized.match(/^n\^(-?\d+(\.\d+)?)$/);
    if (match) {
      const exponent = Number(match[1]);
      return Number.isFinite(exponent) && Math.abs(exponent - alpha) < 0.1;
    }
    const asNum = Number(normalized);
    if (Number.isFinite(asNum)) {
      return Math.abs(asNum - alpha) < 0.1;
    }
    return false;
  }

  private matchesFn(input: string, fnKey: FnKey): boolean {
    const raw = input.trim();
    if (!raw) return false;
    const expectedLabel = FN_OPTIONS.find((opt) => opt.key === fnKey)?.label ?? '';
    return this.normalizeExpr(raw) === this.normalizeExpr(expectedLabel);
  }

  private normalizeExpr(value: string): string {
    return value
      .toLowerCase()
      .replace(/²/g, '^2')
      .replace(/³/g, '^3')
      .replace(/√/g, 'sqrt')
      .replace(/\s+/g, '')
      .replace(/\*/g, '')
      .replace(/·/g, '')
      .replace(/\+/g, '+');
  }
}
