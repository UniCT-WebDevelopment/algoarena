import { Component, OnInit } from '@angular/core';
import { CommonModule, NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LabSessionApiService } from '../../../core/services/lab-session-api';

type ArrowDirection = 'diag' | 'up' | 'left';
type AlgorithmType = 'lcs' | 'edit';

interface DpCell {
  value: number | null;
  arrow: ArrowDirection | null;
  locked?: boolean;
  valueError?: boolean;
  arrowError?: boolean;
}

interface PathPoint {
  row: number;
  col: number;
}

interface DpSessionScenario {
  algorithm: AlgorithmType;
  wordX: string;
  wordY: string;
}

interface DpValidationResponse {
  correct: boolean;
  hasErrors: boolean;
  feedback: string;
  valueErrorKeys: string[];
  arrowErrorKeys: string[];
}

@Component({
  selector: 'app-string-dp-lab',
  standalone: true,
  templateUrl: './string-dp-lab.html',
  styleUrl: './string-dp-lab.scss',
  imports: [CommonModule, NgFor, NgIf, NgClass, FormsModule],
})
export class StringDpLabComponent implements OnInit {
  readonly wordBank: string[] = [
    'casa',
    'cane',
    'gatto',
    'lupo',
    'lago',
    'sole',
    'luna',
    'mare',
    'vento',
    'neve',
    'fuoco',
    'verde',
    'rosso',
    'nave',
    'treno',
    'ruota',
    'porta',
    'corsa',
    'salto',
    'fiore',
    'fiume',
    'cielo',
    'terra',
    'notte',
    'luce',
    'ombra',
    'seme',
    'piano',
    'carta',
    'penna',
    'campo',
    'sasso',
  ];
  readonly maxWordLength = 5;

  algorithm: AlgorithmType = 'lcs';
  wordX = '';
  wordY = '';
  xChars: string[] = [];
  yChars: string[] = [];
  matrix: DpCell[][] = [];
  pathMode = false;
  pathSelection: PathPoint[] = [];
  feedback = '';
  editDistanceAnswer = '';
  highlightedRow = -1;
  highlightedCol = -1;
  showHints = false;
  hasErrors = false;
  private sessionId: string | null = null;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private labSessionApi: LabSessionApiService) {}

  ngOnInit(): void {
    this.generateExercise();
  }

  generateExercise(): void {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
    this.labSessionApi
      .startSession<DpSessionScenario, DpValidationResponse>({
        labType: 'dp',
        variant: this.algorithm,
      })
      .subscribe((response) => {
        this.sessionId = response.sessionId;
        this.algorithm = response.scenario.algorithm;
        this.wordX = response.scenario.wordX;
        this.wordY = response.scenario.wordY;
        this.editDistanceAnswer = '';
        this.rebuildMatrix();
        this.applyServerValidation(response.result);
      });
  }

  setAlgorithm(algo: AlgorithmType): void {
    if (this.algorithm === algo) return;
    this.algorithm = algo;
    this.generateExercise();
  }

  rebuildMatrix(): void {
    this.feedback = '';
    this.pathSelection = [];
    this.pathMode = false;
    this.hasErrors = false;
    this.xChars = this.wordX.split('');
    this.yChars = this.wordY.split('');
    const rows = this.yChars.length + 1;
    const cols = this.xChars.length + 1;
    this.matrix = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => ({
        value: null,
        arrow: null,
        locked: r === 0 || c === 0,
        valueError: false,
        arrowError: false,
      }))
    );
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (this.matrix[r][c].locked) {
          if (this.algorithm === 'edit') {
            this.matrix[r][c].value = r === 0 ? c : r;
          } else {
            this.matrix[r][c].value = 0;
          }
        }
      }
    }
  }

  handleCellClick(event: MouseEvent, row: number, col: number): void {
    if (!this.pathMode) return;
    this.togglePathCell(row, col);
  }

  onEditorClick(event: MouseEvent, row: number, col: number): void {
    if (!this.pathMode) return;
    event.preventDefault();
    event.stopPropagation();
    this.togglePathCell(row, col);
  }

  onCellChange(row: number, col: number): void {
    const cell = this.matrix[row][col];
    cell.valueError = false;
    cell.arrowError = false;
    this.feedback = '';
    this.queueDraftSync();
  }

  togglePathCell(row: number, col: number): void {
    const key = this.pathKey(row, col);
    const index = this.pathSelection.findIndex((p) => this.pathKey(p.row, p.col) === key);
    if (index >= 0) {
      this.pathSelection.splice(index, 1);
    } else {
      this.pathSelection.push({ row, col });
    }
    this.queueDraftSync();
  }

  isCellInPath(row: number, col: number): boolean {
    return this.pathSelection.some((p) => p.row === row && p.col === col);
  }

  togglePathMode(): void {
    if (this.hasErrors) return;
    this.pathMode = !this.pathMode;
    if (!this.pathMode) {
      this.pathSelection = [];
    }
    this.queueDraftSync();
  }

  clearPath(): void {
    this.pathSelection = [];
    this.queueDraftSync();
  }

  setHighlight(row: number, col: number): void {
    this.highlightedRow = row;
    this.highlightedCol = col;
  }

  clearHighlight(): void {
    this.highlightedRow = -1;
    this.highlightedCol = -1;
  }

  toggleHints(): void {
    this.showHints = !this.showHints;
  }

  get hintList(): string[] {
    if (this.algorithm === 'lcs') {
      return [
        'Prima riga e colonna sono 0',
        'Se le lettere coincidono usa diagonale +1 e freccia ↖.',
        'Se non coincidono prendi il massimo tra sopra e sinistra; punta la freccia verso quel valore.',
        'Risali dal fondo: scegli le diagonali dove le lettere combaciano per costruire la LCS.',
      ];
    }
    return [
      'Compila prima riga e colonna con 0,1,2,3...n',
      'Se le lettere sono uguali prendi la diagonale ↖',
      'Se le lettere sono diverse prendi il minimo fra diagonale,sopra e sinistra e aggiungi +1',
      'In modalita percorso seleziona ogni cella dal fondo a (0,0) seguendo le frecce e inserisci il costo finale.',
    ];
  }

  validate(): void {
    this.syncWithServer('check');
  }

  queueDraftSync(): void {
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
      .submitStep<DpValidationResponse>(this.sessionId, {
        eventType,
        payload: {
          matrix: this.matrix.map((row) =>
            row.map((cell) => ({
              value: cell.value,
              arrow: cell.arrow,
              locked: cell.locked,
            }))
          ),
          pathSelection: this.pathSelection.map((point) => ({ ...point })),
          editDistanceAnswer: this.editDistanceAnswer,
        },
      })
      .subscribe((response) => this.applyServerValidation(response.result));
  }

  private applyServerValidation(result: DpValidationResponse): void {
    this.clearErrors();
    const valueErrors = new Set(result?.valueErrorKeys ?? []);
    const arrowErrors = new Set(result?.arrowErrorKeys ?? []);
    for (let row = 0; row < this.matrix.length; row += 1) {
      for (let col = 0; col < this.matrix[row].length; col += 1) {
        const key = this.pathKey(row, col);
        this.matrix[row][col].valueError = valueErrors.has(key);
        this.matrix[row][col].arrowError = arrowErrors.has(key);
      }
    }
    this.hasErrors = Boolean(result?.hasErrors);
    this.feedback = result?.feedback ?? '';
  }

  private validateMatrix(solutionValues: number[][]): string | null {
    let errorMessage: string | null = null;
    for (let r = 0; r < this.matrix.length; r++) {
      for (let c = 0; c < this.matrix[0].length; c++) {
        const cell = this.matrix[r][c];
        if (cell.locked) continue;
        cell.valueError = false;
        if (cell.value === null || Number.isNaN(cell.value)) {
          cell.valueError = true;
          errorMessage = errorMessage ?? 'Completa tutti i valori della tabella.';
          continue;
        }
        if (cell.value !== solutionValues[r][c]) {
          cell.valueError = true;
          errorMessage = errorMessage ?? 'Alcuni valori non coincidono con la soluzione corretta.';
        }
      }
    }
    return errorMessage;
  }

  private validateArrows(): string | null {
    let errorMessage: string | null = null;
    for (let r = 1; r < this.matrix.length; r++) {
      for (let c = 1; c < this.matrix[0].length; c++) {
        const cell = this.matrix[r][c];
        if (cell.locked) continue;
        cell.arrowError = false;
        if (!cell.arrow) {
          cell.arrowError = true;
          errorMessage = errorMessage ?? 'Ogni cella deve avere una freccia.';
          continue;
        }
        if (!this.isArrowConsistent(r, c, cell.arrow)) {
          cell.arrowError = true;
          errorMessage = errorMessage ?? 'Una o più frecce non seguono la logica dell\'algoritmo.';
        }
      }
    }
    return errorMessage;
  }

  private validatePath(solutionArrows: (ArrowDirection | null)[][]): string | null {
    if (!this.pathSelection.length) {
      return 'Seleziona il percorso ottimale cliccando le celle finali.';
    }
    const rows = this.matrix.length;
    const cols = this.matrix[0].length;
    const expectedPath: PathPoint[] = [];
    let r = rows - 1;
    let c = cols - 1;
    expectedPath.push({ row: r, col: c });
    while (r > 0 || c > 0) {
      const arrow = solutionArrows[r][c];
      if (!arrow) break;
      if (arrow === 'diag') {
        r -= 1;
        c -= 1;
      } else if (arrow === 'up') {
        r -= 1;
      } else {
        c -= 1;
      }
      expectedPath.push({ row: r, col: c });
    }
    console.log('[StringDP] Celle attese per il percorso:', expectedPath);
    const rawSelectedKeys = new Set(this.pathSelection.map((p) => this.pathKey(p.row, p.col)));
    const filteredSelection = new Set(
      Array.from(rawSelectedKeys).filter((key) => {
        const [row, col] = key.split('-').map(Number);
        return row > 0 && col > 0;
      })
    );
    const traced = this.tracePathFromArrows(rawSelectedKeys);
    if (traced.error) {
      return traced.error;
    }
    const visitedKeys = new Set(
      traced.visited
        .filter((p) => p.row > 0 && p.col > 0)
        .map((p) => this.pathKey(p.row, p.col))
    );
    console.log('[StringDP] Celle selezionate dall\'utente (filtrate):', Array.from(filteredSelection));
    console.log('[StringDP] Celle percorse tramite frecce (filtrate):', Array.from(visitedKeys));
    for (const key of filteredSelection) {
      if (!visitedKeys.has(key)) {
        return 'Il percorso colorato non segue le frecce del cammino.';
      }
    }
    if (this.algorithm === 'edit') {
      const rowsCount = this.matrix.length;
      const colsCount = this.matrix[0].length;
      const finalKey = this.pathKey(rowsCount - 1, colsCount - 1);
      if (!rawSelectedKeys.has(finalKey)) {
        return 'Devi includere la cella finale.';
      }
      return null;
    }
    const pathToBase: PathPoint[] = [];
    for (const point of traced.visited) {
      pathToBase.push(point);
      if (point.row === 0 || point.col === 0) break;
    }
    const missingPathCell = pathToBase.some((p) => !rawSelectedKeys.has(this.pathKey(p.row, p.col)));
    if (missingPathCell) {
      return 'Seleziona tutte le celle del percorso dal fondo fino a toccare la riga 0 o la colonna 0.';
    }
    const touchesBase = pathToBase[pathToBase.length - 1]?.row === 0 || pathToBase[pathToBase.length - 1]?.col === 0;
    if (!touchesBase) {
      return 'Il percorso deve arrivare almeno alla riga 0 o alla colonna 0.';
    }
    return this.validateLcsDiagonals(traced.diagonal, filteredSelection);
  }

  private tracePathFromArrows(
    selectedSet: Set<string>
  ): { visited: PathPoint[]; diagonal: PathPoint[]; error?: string } {
    const rows = this.matrix.length;
    const cols = this.matrix[0].length;
    const visited: PathPoint[] = [];
    const diagonal: PathPoint[] = [];
    let row = rows - 1;
    let col = cols - 1;
    while (true) {
      visited.push({ row, col });
      if (row === 0 && col === 0) {
        break;
      }
      const arrow = this.matrix[row][col].arrow;
      if (!arrow) {
        if (row === 0 && col > 0) {
          col -= 1;
          continue;
        }
        if (col === 0 && row > 0) {
          row -= 1;
          continue;
        }
        return { visited, diagonal, error: 'Ogni cella lungo il percorso deve avere una freccia.' };
      }
      if (arrow === 'diag') {
        if (row === 0 || col === 0) {
          return { visited, diagonal, error: 'Freccia diagonale fuori dai bordi.' };
        }
        diagonal.push({ row, col });
        row -= 1;
        col -= 1;
      } else if (arrow === 'up') {
        row -= 1;
      } else {
        col -= 1;
      }
      const key = this.pathKey(row, col);
      if (!selectedSet.has(key) && this.algorithm === 'edit') {
        return { visited, diagonal, error: 'Segui la sequenza delle frecce selezionando ogni cella del percorso.' };
      }
    }
    return { visited, diagonal };
  }

  private validateLcsDiagonals(diagonal: PathPoint[], selectedKeys: Set<string>): string | null {
    const rows = this.matrix.length;
    const cols = this.matrix[0].length;
    const lcsLength = this.matrix[rows - 1][cols - 1].value ?? 0;
    const selectedDiagonalCount = diagonal.filter((p) => selectedKeys.has(this.pathKey(p.row, p.col))).length;
    if (lcsLength === 0) {
      if (diagonal.length > 0 || selectedDiagonalCount > 0) {
        return 'Qui la LCS è vuota: non dovresti selezionare diagonali.';
      }
      return null;
    }
    if (!diagonal.length) {
      return 'Per LCS devi selezionare almeno una cella diagonale.';
    }
    if (diagonal.length !== lcsLength) {
      return `Hai selezionato ${diagonal.length} diagonali, ma la LCS richiede ${lcsLength} match.`;
    }
    if (selectedDiagonalCount !== lcsLength) {
      return `Devi cliccare tutte le ${lcsLength} diagonali del percorso (match).`;
    }
    for (const point of diagonal) {
      const match = this.xChars[point.col - 1] === this.yChars[point.row - 1];
      if (!match) {
        return 'Solo le celle con lettere coincidenti possono far parte della LCS.';
      }
    }
    console.log('[StringDP] Diagonali valide dell\'utente:', diagonal);
    return null;
  }

  private isArrowConsistent(row: number, col: number, arrow: ArrowDirection): boolean {
    const current = this.matrix[row][col].value;
    if (current === null) return false;
    if (arrow === 'diag') {
      const diag = this.matrix[row - 1][col - 1].value ?? 0;
      if (this.algorithm === 'lcs') {
        const match = this.xChars[col - 1] === this.yChars[row - 1];
        return match && current === diag + 1;
      }
      const cost = this.xChars[col - 1] === this.yChars[row - 1] ? 0 : 1;
      return current === diag + cost;
    }
    if (arrow === 'up') {
      const up = this.matrix[row - 1][col].value ?? 0;
      if (this.algorithm === 'lcs') {
        const match = this.xChars[col - 1] === this.yChars[row - 1];
        // In LCS, se le lettere coincidono l'unica freccia valida è la diagonale.
        if (match) return false;
        return current === up;
      }
      return current === (up + 1);
    }
    const left = this.matrix[row][col - 1].value ?? 0;
    if (this.algorithm === 'lcs') {
      const match = this.xChars[col - 1] === this.yChars[row - 1];
      if (match) return false;
      return current === left;
    }
    return current === (left + 1);
  }

  private computeSolution(): { values: number[][]; arrows: (ArrowDirection | null)[][] } {
    const rows = this.yChars.length + 1;
    const cols = this.xChars.length + 1;
    const values = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => {
        if (this.algorithm === 'edit') {
          if (r === 0) return c;
          if (c === 0) return r;
        }
        return 0;
      })
    );
    const arrows = Array.from({ length: rows }, () => Array.from({ length: cols }, () => null as ArrowDirection | null));
    for (let r = 1; r < rows; r++) {
      for (let c = 1; c < cols; c++) {
        if (this.algorithm === 'lcs') {
          if (this.yChars[r - 1] === this.xChars[c - 1]) {
            values[r][c] = values[r - 1][c - 1] + 1;
            arrows[r][c] = 'diag';
          } else if (values[r - 1][c] >= values[r][c - 1]) {
            values[r][c] = values[r - 1][c];
            arrows[r][c] = 'up';
          } else {
            values[r][c] = values[r][c - 1];
            arrows[r][c] = 'left';
          }
        } else {
          const cost = this.yChars[r - 1] === this.xChars[c - 1] ? 0 : 1;
          const diag = values[r - 1][c - 1] + cost;
          const up = values[r - 1][c] + 1;
          const left = values[r][c - 1] + 1;
          const min = Math.min(diag, up, left);
          values[r][c] = min;
          if (min === diag) {
            arrows[r][c] = 'diag';
          } else if (min === up) {
            arrows[r][c] = 'up';
          } else {
            arrows[r][c] = 'left';
          }
        }
      }
    }
    return { values, arrows };
  }

  private pickRandomWords(): [string, string] {
    const trimmedBank = this.wordBank
      .map((word) => this.trimWord(word))
      .filter((word) => word.length > 0);
    if (trimmedBank.length < 2) {
      return [trimmedBank[0] ?? '', trimmedBank[0] ?? ''];
    }
    const firstIndex = Math.floor(Math.random() * trimmedBank.length);
    let secondIndex = Math.floor(Math.random() * trimmedBank.length);
    let guard = 0;
    while ((secondIndex === firstIndex || trimmedBank[firstIndex] === trimmedBank[secondIndex]) && guard < 20) {
      secondIndex = Math.floor(Math.random() * trimmedBank.length);
      guard += 1;
    }
    return [trimmedBank[firstIndex], trimmedBank[secondIndex]];
  }

  private pathKey(row: number, col: number): string {
    return `${row}-${col}`;
  }

  private trimWord(word: string): string {
    return word.slice(0, this.maxWordLength);
  }

  private clearErrors(): void {
    this.hasErrors = false;
    for (const row of this.matrix) {
      for (const cell of row) {
        cell.valueError = false;
        cell.arrowError = false;
      }
    }
  }

}
