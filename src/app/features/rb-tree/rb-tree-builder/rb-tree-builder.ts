import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { DatePipe, DecimalPipe, NgFor, NgIf, NgSwitch, NgSwitchCase } from '@angular/common';
import { ValidationService, RbTreeNode, RbTreeValidationResult } from '../../../core/services/validation';
import { LabSessionApiService } from '../../../core/services/lab-session-api';
import * as joint from 'jointjs';

type TaskType = 'insert' | 'delete' | 'build';

interface ExerciseTask {
  type: TaskType;
  value?: number;
  description: string;
  completed?: boolean;
  sequence?: number[];
}

interface Scenario {
  id?: string;
  title: string;
  description: string;
  baseValues: number[];
  tasks: ExerciseTask[];
}

interface RbValidationResponse {
  validation: RbTreeValidationResult;
  bstValid: boolean;
  activeTaskIndex: number;
  tasksCompleted: boolean[];
  scenarioCompleted: boolean;
  taskJustCompletedIndex: number | null;
  message: string;
}

interface NodeView extends RbTreeNode {
  parent?: NodeView | null;
  left?: NodeView | null;
  right?: NodeView | null;
}

interface SerializedNode {
  id: string;
  value: number;
  color: 'red' | 'black';
  left: SerializedNode | null;
  right: SerializedNode | null;
}

type DoubleBlackMarker =
  | {
      type: 'node';
      nodeId: string;
      parentId: string | null;
      parentDirection: 'left' | 'right' | null;
      siblingId: string | null;
      siblingDirection: 'left' | 'right' | null;
    }
  | {
      type: 'nil';
      parentId: string;
      direction: 'left' | 'right';
      siblingId: string | null;
      siblingDirection: 'left' | 'right' | null;
    }
  | null;

interface BuilderSnapshot {
  tree: SerializedNode | null;
  tasks: ExerciseTask[];
  activeTaskIndex: number;
  message: string;
  selectedValue: number | null;
  doubleBlack: DoubleBlackMarker;
  history: HistoryStep[];
  buildPlacedValues: number[];
  selectedBuildValue: number | null;
  currentBuildSequence: number[];
  activeBuildTaskIndex: number | null;
}

interface OverlayNodeView {
  id: string;
  value: number;
  color: 'red' | 'black';
  left: number;
  top: number;
}

interface NilOverlay {
  parentId: string;
  direction: 'left' | 'right';
  left: number;
  top: number;
}

interface HistoryStep {
  id: string;
  label: string;
  timestamp: number;
  previewDataUrl: string | null;
  previewSvg?: string | null;
  previewWidth?: number;
  previewHeight?: number;
  taskIndex?: number;
  stateHash?: string;
}

interface LayoutResult {
  overlays: OverlayNodeView[];
  nils: NilOverlay[];
  width: number;
  height: number;
}

interface ConnectionLine {
  source: { left: number; top: number };
  target: { left: number; top: number };
  dashed: boolean;
}

interface HistoryPreview {
  dataUrl: string;
  rawSvg: string;
  width: number;
  height: number;
}

interface StructureSnapshot {
  value: number;
  color: 'red' | 'black';
  left: StructureSnapshot | null;
  right: StructureSnapshot | null;
  parent?: StructureSnapshot | null;
}

interface StructureMetrics {
  inserts: number;
  deletes: number;
  rotations: number;
  recolors: number;
}

const RB_SCENARIO_TEMPLATES = [
  {
    title: 'Sprint d\'esame',
    description: 'Replica una prova cronometrata con inserimenti e cancellazioni casuali.',
  },
  {
    title: 'Arena casuale',
    description: 'Base tree random e sequenza imprevedibile di fix-up.',
  },
  {
    title: 'Challenge laboratorio',
    description: 'Focus su rotazioni e recolor manuali in situazioni generate casualmente.',
  },
];

@Component({
  selector: 'app-rb-tree-builder',
  standalone: true,
  imports: [NgIf, NgFor, NgSwitch, NgSwitchCase, DatePipe, DecimalPipe],
  templateUrl: './rb-tree-builder.html',
  styleUrl: './rb-tree-builder.scss',
})
export class RbTreeBuilderComponent implements AfterViewInit, OnDestroy {
  root: NodeView | null = null;
  selected: NodeView | null = null;
  validation: RbTreeValidationResult | null = null;
  bstValid = true;
  tasks: ExerciseTask[] = [];
  activeTaskIndex = 0;
  message = '';
  currentScenario!: Scenario;
  nodeOverlays: OverlayNodeView[] = [];
  nilOverlays: NilOverlay[] = [];
  doubleBlackMarker: DoubleBlackMarker = null;
  private readonly miniPreviewBaseZoom = 1.35;
  historySteps: HistoryStep[] = [];
  historyCollapsed = true;
  previewModalStep: HistoryStep | null = null;
  miniPreviewExpanded = false;
  miniPreviewPosition: { x: number; y: number } | null = null;
  miniPreviewZoom = this.miniPreviewBaseZoom;
  previewModalZoom = 1;
  miniPreviewPan = { x: 0, y: 0 };
  previewModalPan = { x: 0, y: 0 };
  miniPreviewFloating = false;
  selectedBuildValue: number | null = null;
  private buildPlacedValues = new Set<number>();
  private currentBuildSequence: number[] = [];
  private preparedTaskIndices = new Set<number>();
  private activeBuildTaskIndex: number | null = null;
  private buildTaskLocked = false;
  private expectedTaskStructures: Array<StructureSnapshot | null> = [];
  private expectedTaskOps: number[] = [];
  private miniPreviewDragging = false;
  private miniPreviewPointerId: number | null = null;
  private miniPreviewDragStart = { x: 0, y: 0 };
  private miniPreviewOffsetStart = { x: 0, y: 0 };
  private miniPreviewElement: HTMLElement | null = null;
  private miniPreviewImageDragging = false;
  private miniPreviewImagePointerId: number | null = null;
  private miniPreviewImageDragStart = { x: 0, y: 0 };
  private miniPreviewImageOffsetStart = { x: 0, y: 0 };
  private miniPreviewImageElement: HTMLElement | null = null;
  private modalImageDragging = false;
  private modalImagePointerId: number | null = null;
  private modalImageDragStart = { x: 0, y: 0 };
  private modalImageOffsetStart = { x: 0, y: 0 };
  private modalImageElement: HTMLElement | null = null;
  private sessionId: string | null = null;
  private scenarioRequestVersion = 0;
  private validationRequestVersion = 0;
  private validationRequestInFlight = false;
  private pendingValidationTree: SerializedNode | null | undefined = undefined;
  private counter = 0;
  private scenarioCompleted = false;
  private scenarioId = this.newScenarioId();
  private awardedTaskIds = new Set<string>();
  private awardedScenario = false;
  private scenarioStartedAt = performance.now();
  private scenarioErrors = 0;
  private taskStartedAt = performance.now();
  private actionCounter = 0;
  undoStack: BuilderSnapshot[] = [];
  redoStack: BuilderSnapshot[] = [];
  panX = 0;
  panY = 0;
  scale = 1;
  private isPanning = false;
  private panStart = { x: 0, y: 0 };
  private pointerStart = { x: 0, y: 0 };
  private panElement: HTMLElement | null = null;
  @ViewChild('treeCanvas', { static: true }) treeCanvasRef!: ElementRef<HTMLDivElement>;
  @ViewChild('treeStage', { static: true }) treeStageRef!: ElementRef<HTMLDivElement>;
  private graph = new joint.dia.Graph();
  private paper?: joint.dia.Paper;
  private nodeIndex = new Map<string, NodeView>();
  private readonly horizontalSpacing = 120;
  private readonly verticalSpacing = 120;
  private readonly margin = 80;
  private paperInitialized = false;

  constructor(private validator: ValidationService, private labSessionApi: LabSessionApiService) {
    this.startServerScenario();
    this.miniPreviewZoom = this.miniPreviewBaseZoom;
  }

  ngAfterViewInit(): void {
    // Inizializza il paper con un piccolo ritardo per assicurarsi che il DOM sia pronto
    setTimeout(() => {
      this.initializePaper();
      this.selected = null;
    }, 0);
  }

  private initializePaper(): void {
    if (this.paperInitialized || !this.treeCanvasRef?.nativeElement) {
      return;
    }

    try {
      this.paper = new joint.dia.Paper({
        el: this.treeCanvasRef.nativeElement,
        model: this.graph,
        width: 600,
        height: 400,
        interactive: false,
        async: true,
        background: { color: 'transparent' },
      });
      this.paperInitialized = true;
      this.renderTree();
    } catch (error) {
      console.error('Error initializing JointJS paper:', error);
    }
  }

  ngOnDestroy(): void {
    this.paperInitialized = false;
    if (this.graph) {
      this.graph.clear();
    }
    this.paper = undefined;
  }

  get currentTask(): ExerciseTask | null {
    return this.tasks[this.activeTaskIndex] ?? null;
  }

  get previousHistoryStep(): HistoryStep | null {
    const steps = this.timelineSteps;
    return steps.length >= 2 ? steps[steps.length - 2] : null;
  }

  get timelineSteps(): HistoryStep[] {
    const currentIndex = this.activeTaskIndex ?? -1;
    return this.filterStepsForTask(currentIndex);
  }

  private startServerScenario(): void {
    const scenarioRequestVersion = ++this.scenarioRequestVersion;
    this.validationRequestVersion = 0;
    this.validationRequestInFlight = false;
    this.pendingValidationTree = undefined;
    this.labSessionApi
      .startSession<Scenario, RbValidationResponse>({
        labType: 'rbTree',
        variant: 'rb-tree',
      })
      .subscribe((response) => {
        if (scenarioRequestVersion !== this.scenarioRequestVersion) {
          return;
        }
        this.sessionId = response.sessionId;
        this.loadScenario(response.scenario);
        this.applyServerValidation(response.result);
      });
  }

  loadScenario(scenario: Scenario): void {
    this.currentScenario = scenario;
    this.resetInternalState();
    this.tasks = scenario.tasks.map((task) => ({ ...task }));
    this.buildBaseTree(scenario.baseValues);
    this.runValidation();
    this.prepareTaskEnvironment(this.activeTaskIndex);
    this.recordTaskBaseline('Setup iniziale');
  }

  resetScenario(): void {
    this.startServerScenario();
  }

  newScenario(): void {
    this.startServerScenario();
  }

  private get isTaskLocked(): boolean {
    return this.buildTaskLocked;
  }

  private ensureNotLocked(): boolean {
    if (!this.isTaskLocked) {
      return true;
    }
    this.message = 'Task build completato: operazioni bloccate finché non inizi un nuovo scenario.';
    return false;
  }

  placeRoot(): void {
    if (!this.ensureNotLocked()) {
      return;
    }
    const task = this.currentTask;
    const taskIndexSnapshot = this.activeTaskIndex;
    if (!task || task.type !== 'insert') {
      this.message = 'Il task corrente non richiede un inserimento.';
      return;
    }
    if (this.root) {
      this.message = 'La radice è già presente. Seleziona un nodo dove agganciare il nuovo valore.';
      return;
    }
    if (typeof task.value !== 'number') {
      this.message = 'Valore della radice non disponibile.';
      return;
    }
    this.saveSnapshot();
    this.root = this.createNode(task.value, 'black');
    this.selected = this.root;
    this.runValidation();
    this.tryCompleteTask();
    this.recordHistory(`Posizionata radice ${task.value}`, taskIndexSnapshot);
  }

  addNodeAtSelection(direction: 'left' | 'right'): void {
    if (!this.ensureNotLocked()) {
      return;
    }
    const task = this.currentTask;
    const taskIndexSnapshot = this.activeTaskIndex;
    if (!task) {
      this.message = 'Nessun task selezionato.';
      return;
    }
    if (task.type === 'insert') {
      if (!this.root) {
        this.message = 'Non c\'è radice. Posiziona prima il valore come radice.';
        return;
      }
      if (!this.selected) {
        this.message = 'Seleziona il nodo padre prima di inserire.';
        return;
      }
      const parent = this.selected;
      if (parent[direction]) {
        this.message = 'La posizione scelta è già occupata.';
        return;
      }
      if (typeof task.value !== 'number') {
        this.message = 'Valore di inserimento non valido.';
        return;
      }
      this.saveSnapshot();
      const node = this.createNode(task.value);
      node.parent = parent;
      parent[direction] = node;
      this.selected = node;
      this.runValidation();
      this.tryCompleteTask();
      this.recordHistory(
        `Inserito ${task.value} come ${direction === 'left' ? 'figlio sinistro' : 'figlio destro'}`,
        taskIndexSnapshot
      );
      return;
    }
    if (task.type === 'build') {
      if (!task.sequence?.length) {
        this.message = 'Sequenza non valida.';
        return;
      }
      if (!this.root) {
        this.message = 'Posiziona prima la radice.';
        return;
      }
      if (!this.selected) {
        this.message = 'Seleziona il nodo padre prima di inserire.';
        return;
      }
      const parent = this.selected;
      if (parent[direction]) {
        this.message = 'La posizione scelta è già occupata.';
        return;
      }
      if (this.selectedBuildValue === null) {
        this.message = 'Seleziona un valore dall\'array per inserirlo.';
        return;
      }
      if (!task.sequence.includes(this.selectedBuildValue)) {
        this.message = 'Valore non presente nell\'array dell\'esercizio.';
        return;
      }
      this.saveSnapshot();
      const node = this.createNode(this.selectedBuildValue);
      node.parent = parent;
      parent[direction] = node;
      this.markBuildValueUsage(node.value, true);
      this.selected = node;
      this.runValidation();
      this.tryCompleteTask();
      this.recordHistory(
        `Inserito ${node.value} (build) come ${direction === 'left' ? 'figlio sinistro' : 'figlio destro'}`,
        taskIndexSnapshot
      );
      return;
    }
    this.message = 'Il task corrente non richiede un inserimento.';
  }

  deleteSelectedNode(): void {
    if (!this.ensureNotLocked()) {
      return;
    }
    const task = this.currentTask;
    const taskIndexSnapshot = this.activeTaskIndex;
    if (!task || task.type !== 'delete') {
      this.message = 'Il task corrente non richiede una cancellazione.';
      return;
    }
    if (!this.selected || this.selected.value !== task.value) {
      this.message = `Seleziona il nodo ${task.value} da rimuovere.`;
      return;
    }
    this.saveSnapshot();
    const node = this.selected;
    this.performDeletion(node);
    this.runValidation();
    this.tryCompleteTask();
    this.recordHistory(`Eliminato ${node.value}`, taskIndexSnapshot);
  }

  manualDeleteSelected(): void {
    if (!this.ensureNotLocked()) {
      return;
    }
    if (!this.selected) {
      this.message = 'Seleziona un nodo da rimuovere.';
      return;
    }
    const taskIndexSnapshot = this.activeTaskIndex;
    const value = this.selected.value;
    this.saveSnapshot();
    this.performDeletion(this.selected);
    this.runValidation();
    this.message = `Nodo ${value} rimosso manualmente.`;
    this.recordHistory(`Eliminato manualmente ${value}`, taskIndexSnapshot);
  }

  toggleColor(): void {
    if (!this.ensureNotLocked()) {
      return;
    }
    if (!this.selected) {
      this.message = 'Seleziona un nodo per cambiarne il colore.';
      return;
    }
    const taskIndexSnapshot = this.activeTaskIndex;
    const node = this.selected;
    const previousColor = node.color;
    const nextColor = node.color === 'red' ? 'black' : 'red';
    this.saveSnapshot();
    node.color = nextColor;
    this.runValidation();
    this.tryCompleteTask();
    this.recordHistory(
      `Colore nodo ${node.value}: ${this.describeColor(previousColor)} -> ${this.describeColor(nextColor)}`,
      taskIndexSnapshot
    );
    this.selected = null;
  }

  rotateLeft(): void {
    if (!this.ensureNotLocked()) {
      return;
    }
    if (!this.selected) {
      this.message = 'Seleziona il nodo da ruotare.';
      return;
    }
    const taskIndexSnapshot = this.activeTaskIndex;
    const nodeValue = this.selected.value;
    this.saveSnapshot();
    this.selected = this.rotate(this.selected, 'left');
    this.runValidation();
    this.tryCompleteTask();
    this.recordHistory(`Rotazione sinistra su nodo ${nodeValue}`, taskIndexSnapshot);
  }

  rotateRight(): void {
    if (!this.ensureNotLocked()) {
      return;
    }
    if (!this.selected) {
      this.message = 'Seleziona il nodo da ruotare.';
      return;
    }
    const taskIndexSnapshot = this.activeTaskIndex;
    const nodeValue = this.selected.value;
    this.saveSnapshot();
    this.selected = this.rotate(this.selected, 'right');
    this.runValidation();
    this.tryCompleteTask();
    this.recordHistory(`Rotazione destra su nodo ${nodeValue}`, taskIndexSnapshot);
  }

  private describeColor(color: 'red' | 'black'): string {
    return color === 'red' ? 'rosso' : 'nero';
  }

  private recordTaskBaseline(label?: string): void {
    if (this.activeTaskIndex < 0 || this.activeTaskIndex >= this.tasks.length) {
      return;
    }
    const task = this.tasks[this.activeTaskIndex];
    if (task?.type === 'build') {
      return;
    }
    this.recordHistory(label ?? `Setup task ${this.activeTaskIndex + 1}`, this.activeTaskIndex);
  }

  select(node: NodeView): void {
    this.selected = node;
  }

  nodeInsert(node: NodeView, direction: 'left' | 'right'): void {
    if (!this.ensureNotLocked()) {
      return;
    }
    this.select(node);
    this.addNodeAtSelection(direction);
  }

  nodeToggle(node: NodeView): void {
    if (!this.ensureNotLocked()) {
      return;
    }
    this.select(node);
    this.toggleColor();
  }

  nodeRotate(node: NodeView, direction: 'left' | 'right'): void {
    if (!this.ensureNotLocked()) {
      return;
    }
    this.select(node);
    direction === 'left' ? this.rotateLeft() : this.rotateRight();
  }

  nodeDelete(node: NodeView): void {
    if (!this.ensureNotLocked()) {
      return;
    }
    this.select(node);
    if (this.currentTask?.type === 'delete' && this.currentTask.value === node.value) {
      this.deleteSelectedNode();
    } else {
      this.manualDeleteSelected();
    }
  }

  selectById(id: string): void {
    const node = this.nodeIndex.get(id);
    if (node) {
      this.selected = node;
    }
  }

  insertById(id: string, direction: 'left' | 'right'): void {
    if (!this.ensureNotLocked()) {
      return;
    }
    const node = this.nodeIndex.get(id);
    if (node) {
      this.nodeInsert(node, direction);
    }

    this.selected = null;
  }

  toggleById(id: string): void {
    if (!this.ensureNotLocked()) {
      return;
    }
    const node = this.nodeIndex.get(id);
    if (node) {
      this.nodeToggle(node);
    }
  }

  rotateById(id: string, direction: 'left' | 'right'): void {
    if (!this.ensureNotLocked()) {
      return;
    }
    const node = this.nodeIndex.get(id);
    if (node) {
      this.nodeRotate(node, direction);
    }
    this.selected = null;
  }

  deleteById(id: string): void {
    const node = this.nodeIndex.get(id);
    if (node) {
      this.nodeDelete(node);
    }
    this.selected = null;
  }

  get isBuildTask(): boolean {
    return this.currentTask?.type === 'build';
  }

  get buildSequence(): number[] {
    return this.currentTask?.type === 'build' ? this.currentTask.sequence ?? [] : [];
  }

  selectBuildValue(value: number): void {
    const task = this.currentTask;
    if (!task || task.type !== 'build') {
      return;
    }
    if (!task.sequence?.includes(value)) {
      return;
    }
    if (this.buildPlacedValues.has(value)) {
      this.message = 'Valore già posizionato. Rimuovilo prima di riutilizzarlo.';
      return;
    }
    this.selectedBuildValue = value;
  }

  isBuildValueUsed(value: number): boolean {
    return this.buildPlacedValues.has(value);
  }

  isBuildValueSelected(value: number): boolean {
    return this.selectedBuildValue === value;
  }

  placeBuildRoot(): void {
    if (!this.ensureNotLocked()) {
      return;
    }
    const task = this.currentTask;
    if (!task || task.type !== 'build') {
      return;
    }
    const sequence = task.sequence ?? [];
    if (!sequence.length) {
      this.message = 'Sequenza non valida.';
      return;
    }
    if (this.root) {
      this.message = 'La radice è già presente.';
      return;
    }
    const rootValue = sequence[0];
    if (this.selectedBuildValue !== rootValue) {
      this.message = `Seleziona ${rootValue} dall'array per posizionarlo come radice.`;
      return;
    }
    this.saveSnapshot();
    const node = this.createNode(rootValue, 'red');
    this.root = node;
    this.selected = node;
    this.markBuildValueUsage(rootValue, true);
    this.runValidation();
    this.recordHistory(`Posizionata radice ${rootValue} (build)`, this.activeTaskIndex);
    this.tryCompleteTask();
  }

  private tryCompleteTask(): void {
    if (!this.sessionId) {
      return;
    }
    const serializedTree = this.serializeNode(this.root);
    if (this.validationRequestInFlight) {
      this.pendingValidationTree = serializedTree;
      return;
    }
    this.sendValidationStep(serializedTree);
  }

  private sendValidationStep(tree: SerializedNode | null): void {
    if (!this.sessionId) {
      return;
    }
    const sessionId = this.sessionId;
    const validationRequestVersion = ++this.validationRequestVersion;
    this.validationRequestInFlight = true;
    this.labSessionApi
      .submitStep<RbValidationResponse>(sessionId, {
        eventType: 'step',
        payload: {
          tree,
        },
      })
      .subscribe((response) => {
        if (sessionId !== this.sessionId) {
          return;
        }
        if (validationRequestVersion !== this.validationRequestVersion) {
          return;
        }
        this.applyServerValidation(response.result);
      })
      .add(() => {
        this.validationRequestInFlight = false;
        if (sessionId !== this.sessionId) {
          this.pendingValidationTree = undefined;
          return;
        }
        const pendingTree = this.pendingValidationTree;
        this.pendingValidationTree = undefined;
        if (pendingTree !== undefined) {
          this.sendValidationStep(pendingTree);
        }
      });
  }

  private applyServerValidation(result: RbValidationResponse): void {
    const previousTaskIndex = this.activeTaskIndex;
    this.validation = result.validation;
    this.bstValid = result.bstValid;
    this.message = result.message;
    this.scenarioCompleted = result.scenarioCompleted;
    this.tasks.forEach((task, index) => {
      task.completed = Boolean(result.tasksCompleted[index]);
    });
    if (result.scenarioCompleted) {
      this.clearBuildContext(false);
      return;
    }
    if (result.activeTaskIndex !== previousTaskIndex) {
      this.resetUndoRedoStacks();
      this.activeTaskIndex = result.activeTaskIndex;
      this.prepareTaskEnvironment(this.activeTaskIndex);
      this.recordTaskBaseline(`Setup task ${this.activeTaskIndex + 1}`);
    }
  }

  private collectValues(node: NodeView | null, acc: number[] = []): number[] {
    if (!node) {
      return acc;
    }
    acc.push(node.value);
    this.collectValues(node.left ?? null, acc);
    this.collectValues(node.right ?? null, acc);
    return acc;
  }

  private resetUndoRedoStacks(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  private buildBaseTree(values: number[]): void {
    this.root = null;
    this.counter = 0;
    values.forEach((value) => this.autoInsertForSetup(value));
   // this.selected = this.root;
  }

  private autoInsertForSetup(value: number): void {
    const node = this.createNode(value);
    if (!this.root) {
      node.color = 'black';
      this.root = node;
      return;
    }
    this.insertNode(this.root, node);
    this.fixInsertion(node);
  }

  private resetInternalState(): void {
    this.root = null;
    this.selected = null;
    this.validation = null;
    this.bstValid = true;
    this.doubleBlackMarker = null;
    this.counter = 0;
    this.scenarioCompleted = false;
    this.message = '';
    this.activeTaskIndex = 0;
    this.undoStack = [];
    this.redoStack = [];
    this.nodeIndex.clear();
    this.historySteps = [];
    this.historyCollapsed = true;
    this.previewModalStep = null;
    this.miniPreviewExpanded = false;
    this.miniPreviewPosition = null;
    this.miniPreviewFloating = false;
    this.miniPreviewZoom = this.miniPreviewBaseZoom;
    this.previewModalZoom = 1;
    this.miniPreviewPan = { x: 0, y: 0 };
    this.previewModalPan = { x: 0, y: 0 };
    this.buildTaskLocked = false;
    this.buildPlacedValues.clear();
    this.currentBuildSequence = [];
    this.selectedBuildValue = null;
    this.validationRequestInFlight = false;
    this.pendingValidationTree = undefined;
    this.preparedTaskIndices.clear();
    this.activeBuildTaskIndex = null;
    this.expectedTaskStructures = [];
    this.expectedTaskOps = [];
    this.resetScenarioScoring();
  }

  private newScenarioId(): string {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private createNode(value: number, color: 'red' | 'black' = 'red'): NodeView {
    const node: NodeView = {
      id: `${++this.counter}`,
      value,
      color,
      left: null,
      right: null,
      parent: null,
    };
    this.nodeIndex.set(node.id, node);
    return node;
  }

  private insertNode(current: NodeView, node: NodeView): void {
    if (node.value < current.value) {
      if (current.left) {
        this.insertNode(current.left, node);
      } else {
        current.left = node;
        node.parent = current;
      }
    } else {
      if (current.right) {
        this.insertNode(current.right, node);
      } else {
        current.right = node;
        node.parent = current;
      }
    }
  }

  private rotate(node: NodeView, direction: 'left' | 'right'): NodeView | null {
    if (direction === 'left' && node.right) {
      const pivot = node.right;
      node.right = pivot.left ?? null;
      if (pivot.left) {
        pivot.left.parent = node;
      }
      pivot.parent = node.parent ?? null;
      if (!node.parent) {
        this.root = pivot;
      } else if (node.parent.left === node) {
        node.parent.left = pivot;
      } else {
        node.parent.right = pivot;
      }
      pivot.left = node;
      node.parent = pivot;
      return pivot;
    }
    if (direction === 'right' && node.left) {
      const pivot = node.left;
      node.left = pivot.right ?? null;
      if (pivot.right) {
        pivot.right.parent = node;
      }
      pivot.parent = node.parent ?? null;
      if (!node.parent) {
        this.root = pivot;
      } else if (node.parent.right === node) {
        node.parent.right = pivot;
      } else {
        node.parent.left = pivot;
      }
      pivot.right = node;
      node.parent = pivot;
      return pivot;
    }
    return node;
  }

  private fixInsertion(node: NodeView): void {
    let current: NodeView | null = node;
    while (current?.parent && current.parent.color === 'red') {
      const grandparent: NodeView | null = current.parent.parent ?? null;
      if (!grandparent) {
        break;
      }
      if (current.parent === grandparent.left) {
        const uncle = grandparent.right;
        if (uncle?.color === 'red') {
          current.parent.color = 'black';
          uncle.color = 'black';
          grandparent.color = 'red';
          current = grandparent;
        } else {
          if (current === current.parent.right) {
            current = current.parent;
            this.rotate(current, 'left');
          }
          current.parent!.color = 'black';
          grandparent.color = 'red';
          this.rotate(grandparent, 'right');
        }
      } else {
        const uncle = grandparent.left;
        if (uncle?.color === 'red') {
          current.parent.color = 'black';
          uncle.color = 'black';
          grandparent.color = 'red';
          current = grandparent;
        } else {
          if (current === current.parent.left) {
            current = current.parent;
            this.rotate(current, 'right');
          }
          current.parent!.color = 'black';
          grandparent.color = 'red';
          this.rotate(grandparent, 'left');
        }
      }
    }
    if (this.root) {
      this.root.color = 'black';
    }
  }

  private findNodeByValue(value: number, node: NodeView | null = this.root): NodeView | null {
    if (!node) {
      return null;
    }
    if (node.value === value) {
      return node;
    }
    if (value < node.value) {
      return this.findNodeByValue(value, node.left ?? null);
    }
    return this.findNodeByValue(value, node.right ?? null);
  }

  runValidation(): void {
    this.validation = this.validator.validateRbTree(this.root);
    let bstIssues: string[] = [];
    if (this.validation) {
      bstIssues = this.collectBstViolations(this.root);
      if (bstIssues.length) {
        this.validation.issues = [...this.validation.issues, ...bstIssues];
      }
    }
    this.bstValid = bstIssues.length === 0;
    this.renderTree();
    if (
      this.validation &&
      this.validation.property1 &&
      this.validation.property2 &&
      this.validation.property3 &&
      this.validation.property4 &&
      this.validation.property5 &&
      this.bstValid
    ) {
      this.doubleBlackMarker = null;
    }
  }

  undo(): void {
    if (!this.undoStack.length) {
      return;
    }
    const snapshot = this.undoStack.pop()!;
    this.redoStack.push(this.createSnapshot());
    this.restoreSnapshot(snapshot);
    this.recordHistory('Undo manuale', this.activeTaskIndex);
  }

  redo(): void {
    if (!this.redoStack.length) {
      return;
    }
    const snapshot = this.redoStack.pop()!;
    this.undoStack.push(this.createSnapshot());
    this.restoreSnapshot(snapshot);
    this.recordHistory('Redo manuale', this.activeTaskIndex);
  }

  @HostListener('window:keydown', ['$event'])
  handleShortcuts(event: KeyboardEvent): void {
    if (event.ctrlKey && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        this.redo();
      } else {
        this.undo();
      }
    }
  }

  private saveSnapshot(): void {
    this.registerAction();
    this.undoStack.push(this.createSnapshot());
    if (this.undoStack.length > 50) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  private resetScenarioScoring(): void {
    this.scenarioStartedAt = performance.now();
    this.scenarioErrors = 0;
    this.resetTaskScoring();
  }

  private resetTaskScoring(): void {
    this.taskStartedAt = performance.now();
    this.actionCounter = 0;
  }

  private registerAction(): void {
    this.actionCounter += 1;
  }

  private createSnapshot(): BuilderSnapshot {
    return {
      tree: this.serializeNode(this.root),
      tasks: this.tasks.map((task) => ({ ...task })),
      activeTaskIndex: this.activeTaskIndex,
      message: this.message,
      selectedValue: this.selected?.value ?? null,
      doubleBlack: this.cloneDoubleBlack(this.doubleBlackMarker),
      history: this.historySteps.map((step) => ({ ...step })),
      buildPlacedValues: Array.from(this.buildPlacedValues),
      selectedBuildValue: this.selectedBuildValue,
      currentBuildSequence: [...this.currentBuildSequence],
      activeBuildTaskIndex: this.activeBuildTaskIndex,
    };
  }

  private restoreSnapshot(snapshot: BuilderSnapshot): void {
    this.nodeIndex.clear();
    this.root = this.deserializeNode(snapshot.tree, null);
    this.tasks = snapshot.tasks.map((task) => ({ ...task }));
    this.activeTaskIndex = snapshot.activeTaskIndex;
    this.message = snapshot.message;
    this.selected = null // snapshot.selectedValue !== null ? this.findNodeByValue(snapshot.selectedValue) : null;
    this.counter = this.findMaxId(this.root);
    this.doubleBlackMarker = this.cloneDoubleBlack(snapshot.doubleBlack);
    this.historySteps = snapshot.history.map((step) => ({ ...step }));
    this.buildPlacedValues = new Set(snapshot.buildPlacedValues ?? []);
    this.selectedBuildValue = snapshot.selectedBuildValue ?? null;
    this.currentBuildSequence = [...(snapshot.currentBuildSequence ?? [])];
    this.activeBuildTaskIndex = snapshot.activeBuildTaskIndex ?? null;
    this.runValidation();
  }

  private serializeNode(node: NodeView | null): SerializedNode | null {
    if (!node) {
      return null;
    }
    return {
      id: node.id,
      value: node.value,
      color: node.color,
      left: this.serializeNode(node.left ?? null),
      right: this.serializeNode(node.right ?? null),
    };
  }

  private deserializeNode(data: SerializedNode | null, parent: NodeView | null): NodeView | null {
    if (!data) {
      return null;
    }
    const node: NodeView = {
      id: data.id,
      value: data.value,
      color: data.color,
      left: null,
      right: null,
      parent,
    };
    this.nodeIndex.set(node.id, node);
    node.left = this.deserializeNode(data.left, node);
    node.right = this.deserializeNode(data.right, node);
    return node;
  }

  private findMaxId(node: NodeView | null): number {
    if (!node) {
      return 0;
    }
    const current = Number(node.id) || 0;
    const leftMax = this.findMaxId(node.left ?? null);
    const rightMax = this.findMaxId(node.right ?? null);
    return Math.max(current, leftMax, rightMax);
  }

  private performDeletion(node: NodeView): void {
    let target = node;
    if (target.left && target.right) {
      const successor = this.findMinNode(target.right);
      const tempValue = target.value;
      target.value = successor.value;
      successor.value = tempValue;
      target = successor;
    }
    const removedValue = target.value;
    const child = target.left ?? target.right ?? null;
    const parent = target.parent ?? null;
    const direction: 'left' | 'right' | null = parent ? (parent.left === target ? 'left' : 'right') : null;
    if (!parent) {
      this.root = child;
      if (child) {
        child.parent = null;
      }
    } else if (parent.left === target) {
      parent.left = child;
    } else {
      parent.right = child;
    }
    if (child) {
      child.parent = parent;
    }
    this.markBuildValueUsage(removedValue, false);
    const nodeWasBlack = target.color === 'black';
    const childColor = child?.color ?? 'black';
    if (nodeWasBlack && childColor === 'black') {
      const siblingInfo = this.resolveSiblingInfo(parent, direction);
      if (child) {
        this.doubleBlackMarker = {
          type: 'node',
          nodeId: child.id,
          parentId: parent?.id ?? null,
          parentDirection: direction,
          siblingId: siblingInfo?.id ?? null,
          siblingDirection: siblingInfo?.direction ?? null,
        };
      } else if (parent && direction) {
        this.doubleBlackMarker = {
          type: 'nil',
          parentId: parent.id,
          direction,
          siblingId: siblingInfo?.id ?? null,
          siblingDirection: siblingInfo?.direction ?? null,
        };
      } else {
        this.doubleBlackMarker = null;
      }
    } else {
      this.doubleBlackMarker = null;
    }
    if (this.selected === target) {
      this.selected = null //child ?? parent ?? null;
    }
    this.nodeIndex.delete(target.id);
  }

  private findMinNode(node: NodeView): NodeView {
    let current = node;
    while (current.left) {
      current = current.left;
    }
    return current;
  }

  private resolveSiblingInfo(
    parent: NodeView | null,
    direction: 'left' | 'right' | null
  ): { id: string; direction: 'left' | 'right' } | null {
    if (!parent || !direction) {
      return null;
    }
    const sibling = direction === 'left' ? parent.right : parent.left;
    if (!sibling) {
      return null;
    }
    return {
      id: sibling.id,
      direction: direction === 'left' ? 'right' : 'left',
    };
  }

  private cloneDoubleBlack(marker: DoubleBlackMarker): DoubleBlackMarker {
    if (!marker) {
      return null;
    }
    if (marker.type === 'node') {
      return {
        type: 'node',
        nodeId: marker.nodeId,
        parentId: marker.parentId,
        parentDirection: marker.parentDirection,
        siblingId: marker.siblingId,
        siblingDirection: marker.siblingDirection,
      };
    }
    return {
      type: 'nil',
      parentId: marker.parentId,
      direction: marker.direction,
      siblingId: marker.siblingId,
      siblingDirection: marker.siblingDirection,
    };
  }

  private cloneTreeForHistory(node: NodeView | null, parent: NodeView | null = null): NodeView | null {
    if (!node) {
      return null;
    }
    const clone: NodeView = {
      id: node.id,
      value: node.value,
      color: node.color,
      left: null,
      right: null,
      parent,
    };
    clone.left = this.cloneTreeForHistory(node.left ?? null, clone);
    clone.right = this.cloneTreeForHistory(node.right ?? null, clone);
    return clone;
  }

  private generateScenario(): Scenario {
    const template = RB_SCENARIO_TEMPLATES[Math.floor(Math.random() * RB_SCENARIO_TEMPLATES.length)];
    const baseCount = this.randomBetween(5, 7);
    const baseValues = this.generateUniqueValues(baseCount, 3, 60).sort((a, b) => a - b);
    const tasks = this.generateRandomTasks(baseValues);
    return {
      id: `rb-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: template.title,
      description: template.description,
      baseValues,
      tasks,
    };
  }

  private generateUniqueValues(count: number, min: number, max: number): number[] {
    const set = new Set<number>();
    while (set.size < count) {
      set.add(this.randomBetween(min, max));
    }
    return Array.from(set);
  }

  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private generateRandomTasks(baseValues: number[]): ExerciseTask[] {
    const tasks: ExerciseTask[] = [];
    const usedValues = new Set<number>(baseValues);
    const insertCount = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < insertCount; i++) {
      const value = this.pickUniqueValue(usedValues, 5, 70);
      usedValues.add(value);
      tasks.push({
        type: 'insert',
        value,
        description: `Inserisci ${value} e sistema i conflitti.`,
      });
    }
    const deleteCount = 1 + Math.floor(Math.random() * 2);
    const deletePool = [...baseValues, ...tasks.filter((task) => task.type === 'insert').map((task) => task.value)];
    for (let i = 0; i < deleteCount && deletePool.length; i++) {
      const idx = Math.floor(Math.random() * deletePool.length);
      const value = deletePool.splice(idx, 1)[0];
      tasks.push({
        type: 'delete',
        value: value ?? undefined,
        description: `Elimina ${value} mantenendo il bilanciamento.`,
      });
    }
    const buildSequenceLength = this.randomBetween(4, 6);
    const buildSequence = this.generateBuildSequence(buildSequenceLength, 5, 80);
    tasks.push({
      type: 'build',
      sequence: buildSequence,
      description: `Costruisci l'albero partendo da ${buildSequence[0]} e usa tutti i valori dell'array.`,
    });
    return tasks;
  }

  private pickUniqueValue(used: Set<number>, min: number, max: number): number {
    let value = this.randomBetween(min, max);
    while (used.has(value)) {
      value = this.randomBetween(min, max);
    }
    return value;
  }

  private generateBuildSequence(length: number, min: number, max: number): number[] {
    const seq = this.generateUniqueValues(length, min, max);
    for (let i = seq.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [seq[i], seq[j]] = [seq[j], seq[i]];
    }
    return seq;
  }

  private computeExpectedStructures(): void {
    let simulated = this.captureStructure(this.root);
    this.expectedTaskStructures = [];
    this.expectedTaskOps = [];
    this.tasks.forEach((task) => {
      const result = this.applyTaskToStructureWithMetrics(simulated, task);
      simulated = result.root;
      this.expectedTaskStructures.push(this.cloneStructureSnapshot(simulated));
      this.expectedTaskOps.push(result.ops);
    });
  }

  private captureStructure(node: NodeView | null): StructureSnapshot | null {
    if (!node) {
      return null;
    }
    const snapshot: StructureSnapshot = {
      value: node.value,
      color: node.color,
      left: null,
      right: null,
      parent: null,
    };
    snapshot.left = this.captureStructure(node.left ?? null);
    if (snapshot.left) {
      snapshot.left.parent = snapshot;
    }
    snapshot.right = this.captureStructure(node.right ?? null);
    if (snapshot.right) {
      snapshot.right.parent = snapshot;
    }
    return snapshot;
  }

  private cloneStructureSnapshot(node: StructureSnapshot | null): StructureSnapshot | null {
    if (!node) {
      return null;
    }
    const copy: StructureSnapshot = {
      value: node.value,
      color: node.color,
      left: null,
      right: null,
      parent: null,
    };
    copy.left = this.cloneStructureSnapshot(node.left);
    if (copy.left) {
      copy.left.parent = copy;
    }
    copy.right = this.cloneStructureSnapshot(node.right);
    if (copy.right) {
      copy.right.parent = copy;
    }
    return copy;
  }

  private applyTaskToStructure(root: StructureSnapshot | null, task: ExerciseTask): StructureSnapshot | null {
    let working = this.cloneStructureSnapshot(root);
    if (!task) {
      return working;
    }
    switch (task.type) {
      case 'insert':
        if (typeof task.value === 'number') {
          working = this.insertStructureNode(working, task.value);
        }
        break;
      case 'delete':
        if (typeof task.value === 'number') {
          working = this.deleteStructureNode(working, task.value);
        }
        break;
      case 'build':
        working = this.buildStructureFromSequence(task.sequence ?? []);
        break;
    }
    return working;
  }

  private applyTaskToStructureWithMetrics(
    root: StructureSnapshot | null,
    task: ExerciseTask
  ): { root: StructureSnapshot | null; ops: number } {
    let working = this.cloneStructureSnapshot(root);
    const metrics = this.createStructureMetrics();
    if (!task) {
      return { root: working, ops: 0 };
    }
    switch (task.type) {
      case 'insert':
        if (typeof task.value === 'number') {
          working = this.insertStructureNode(working, task.value, metrics);
        }
        break;
      case 'delete':
        if (typeof task.value === 'number') {
          working = this.deleteStructureNode(working, task.value, metrics);
        }
        break;
      case 'build':
        working = this.buildStructureFromSequence(task.sequence ?? [], metrics);
        break;
    }
    const ops = metrics.inserts + metrics.deletes + metrics.rotations + metrics.recolors;
    return { root: working, ops };
  }

  private createStructureMetrics(): StructureMetrics {
    return {
      inserts: 0,
      deletes: 0,
      rotations: 0,
      recolors: 0,
    };
  }

  private insertStructureNode(
    root: StructureSnapshot | null,
    value: number,
    metrics?: StructureMetrics
  ): StructureSnapshot {
    const newNode: StructureSnapshot = { value, color: 'red', left: null, right: null, parent: null };
    let y: StructureSnapshot | null = null;
    let x = root;
    while (x) {
      y = x;
      if (value < x.value) {
        x = x.left;
      } else {
        x = x.right;
      }
    }
    newNode.parent = y;
    if (!y) {
      root = newNode;
    } else if (value < y.value) {
      y.left = newNode;
    } else {
      y.right = newNode;
    }
    if (metrics) {
      metrics.inserts += 1;
    }
    return this.fixInsertStructure(root ?? newNode, newNode, metrics);
  }

  private deleteStructureNode(
    root: StructureSnapshot | null,
    value: number,
    metrics?: StructureMetrics
  ): StructureSnapshot | null {
    let z = this.findStructureNode(root, value);
    if (!z) {
      return root;
    }
    if (metrics) {
      metrics.deletes += 1;
    }
    let y = z;
    let yOriginalColor = y.color;
    let x: StructureSnapshot | null = null;
    if (!z.left) {
      x = z.right;
      root = this.transplantStructure(root, z, z.right);
    } else if (!z.right) {
      x = z.left;
      root = this.transplantStructure(root, z, z.left);
    } else {
      y = this.minimumStructureNode(z.right);
      yOriginalColor = y.color;
      x = y.right;
      if (y.parent === z) {
        if (x) {
          x.parent = y;
        }
      } else {
        root = this.transplantStructure(root, y, y.right);
        y.right = z.right;
        if (y.right) {
          y.right.parent = y;
        }
      }
      root = this.transplantStructure(root, z, y);
      y.left = z.left;
      if (y.left) {
        y.left.parent = y;
      }
      this.applyStructureColor(y, z.color, metrics);
    }
    if (yOriginalColor === 'black') {
      root = this.fixDeleteStructure(root, x, z.parent ?? null, metrics);
    }
    return root;
  }

  private findMinStructureValue(node: StructureSnapshot): number {
    let current: StructureSnapshot | null = node;
    while (current?.left) {
      current = current.left;
    }
    return current?.value ?? node.value;
  }

  private findStructureNode(root: StructureSnapshot | null, value: number): StructureSnapshot | null {
    let current = root;
    while (current) {
      if (value === current.value) {
        return current;
      }
      current = value < current.value ? current.left : current.right;
    }
    return null;
  }

  private fixInsertStructure(
    root: StructureSnapshot,
    node: StructureSnapshot,
    metrics?: StructureMetrics
  ): StructureSnapshot {
    let z = node;
    while (z.parent && z.parent.color === 'red') {
      const parent = z.parent;
      const grand = parent.parent!;
      if (parent === grand.left) {
        let y = grand.right;
        if (this.structureColorOf(y) === 'red') {
          this.applyStructureColor(parent, 'black', metrics);
          if (y) {
            this.applyStructureColor(y, 'black', metrics);
          }
          this.applyStructureColor(grand, 'red', metrics);
          z = grand;
        } else {
          if (z === parent.right) {
            z = parent;
            root = this.rotateStructureLeft(root, z, metrics);
          }
          if (z.parent) {
            this.applyStructureColor(z.parent, 'black', metrics);
          }
          this.applyStructureColor(grand, 'red', metrics);
          root = this.rotateStructureRight(root, grand, metrics);
        }
      } else {
        let y = grand.left;
        if (this.structureColorOf(y) === 'red') {
          this.applyStructureColor(parent, 'black', metrics);
          if (y) {
            this.applyStructureColor(y, 'black', metrics);
          }
          this.applyStructureColor(grand, 'red', metrics);
          z = grand;
        } else {
          if (z === parent.left) {
            z = parent;
            root = this.rotateStructureRight(root, z, metrics);
          }
          if (z.parent) {
            this.applyStructureColor(z.parent, 'black', metrics);
          }
          this.applyStructureColor(grand, 'red', metrics);
          root = this.rotateStructureLeft(root, grand, metrics);
        }
      }
    }
    this.applyStructureColor(root, 'black', metrics);
    root.parent = null;
    return root;
  }

  private rotateStructureLeft(
    root: StructureSnapshot,
    x: StructureSnapshot,
    metrics?: StructureMetrics
  ): StructureSnapshot {
    const y = x.right;
    if (!y) {
      return root;
    }
    if (metrics) {
      metrics.rotations += 1;
    }
    x.right = y.left;
    if (y.left) {
      y.left.parent = x;
    }
    y.parent = x.parent ?? null;
    if (!x.parent) {
      root = y;
    } else if (x === x.parent.left) {
      x.parent.left = y;
    } else {
      x.parent.right = y;
    }
    y.left = x;
    x.parent = y;
    return root;
  }

  private rotateStructureRight(
    root: StructureSnapshot,
    x: StructureSnapshot,
    metrics?: StructureMetrics
  ): StructureSnapshot {
    const y = x.left;
    if (!y) {
      return root;
    }
    if (metrics) {
      metrics.rotations += 1;
    }
    x.left = y.right;
    if (y.right) {
      y.right.parent = x;
    }
    y.parent = x.parent ?? null;
    if (!x.parent) {
      root = y;
    } else if (x === x.parent.right) {
      x.parent.right = y;
    } else {
      x.parent.left = y;
    }
    y.right = x;
    x.parent = y;
    return root;
  }

  private transplantStructure(
    root: StructureSnapshot | null,
    u: StructureSnapshot,
    v: StructureSnapshot | null
  ): StructureSnapshot | null {
    if (!u.parent) {
      root = v;
    } else if (u === u.parent.left) {
      u.parent.left = v;
    } else {
      u.parent.right = v;
    }
    if (v) {
      v.parent = u.parent;
    }
    return root;
  }

  private minimumStructureNode(node: StructureSnapshot): StructureSnapshot {
    let current: StructureSnapshot = node;
    while (current.left) {
      current = current.left;
    }
    return current;
  }

  private fixDeleteStructure(
    root: StructureSnapshot | null,
    node: StructureSnapshot | null,
    parent: StructureSnapshot | null,
    metrics?: StructureMetrics
  ): StructureSnapshot | null {
    let x = node;
    let currentParent = parent;
    while (x !== root && this.structureColorOf(x) === 'black') {
      if (x === (currentParent?.left ?? null)) {
        let w = currentParent?.right ?? null;
        if (this.structureColorOf(w) === 'red') {
          if (w) {
            this.applyStructureColor(w, 'black', metrics);
          }
          if (currentParent) {
            this.applyStructureColor(currentParent, 'red', metrics);
            root = this.rotateStructureLeft(root!, currentParent, metrics);
          }
          w = currentParent?.right ?? null;
        }
        if (this.structureColorOf(w?.left ?? null) === 'black' && this.structureColorOf(w?.right ?? null) === 'black') {
          if (w) {
            this.applyStructureColor(w, 'red', metrics);
          }
          x = currentParent;
          currentParent = x?.parent ?? null;
        } else {
          if (this.structureColorOf(w?.right ?? null) === 'black') {
            if (w?.left) {
              this.applyStructureColor(w.left, 'black', metrics);
            }
            if (w) {
              this.applyStructureColor(w, 'red', metrics);
              root = this.rotateStructureRight(root!, w, metrics);
              w = currentParent?.right ?? null;
            }
          }
          if (w) {
            this.applyStructureColor(w, currentParent?.color ?? 'black', metrics);
          }
          if (currentParent) {
            this.applyStructureColor(currentParent, 'black', metrics);
            if (w?.right) {
              this.applyStructureColor(w.right, 'black', metrics);
            }
            root = this.rotateStructureLeft(root!, currentParent, metrics);
          }
          x = root;
          currentParent = null;
        }
      } else {
        let w = currentParent?.left ?? null;
        if (this.structureColorOf(w) === 'red') {
          if (w) {
            this.applyStructureColor(w, 'black', metrics);
          }
          if (currentParent) {
            this.applyStructureColor(currentParent, 'red', metrics);
            root = this.rotateStructureRight(root!, currentParent, metrics);
          }
          w = currentParent?.left ?? null;
        }
        if (this.structureColorOf(w?.right ?? null) === 'black' && this.structureColorOf(w?.left ?? null) === 'black') {
          if (w) {
            this.applyStructureColor(w, 'red', metrics);
          }
          x = currentParent;
          currentParent = x?.parent ?? null;
        } else {
          if (this.structureColorOf(w?.left ?? null) === 'black') {
            if (w?.right) {
              this.applyStructureColor(w.right, 'black', metrics);
            }
            if (w) {
              this.applyStructureColor(w, 'red', metrics);
              root = this.rotateStructureLeft(root!, w, metrics);
              w = currentParent?.left ?? null;
            }
          }
          if (w) {
            this.applyStructureColor(w, currentParent?.color ?? 'black', metrics);
          }
          if (currentParent) {
            this.applyStructureColor(currentParent, 'black', metrics);
            if (w?.left) {
              this.applyStructureColor(w.left, 'black', metrics);
            }
            root = this.rotateStructureRight(root!, currentParent, metrics);
          }
          x = root;
          currentParent = null;
        }
      }
    }
    if (x) {
      this.applyStructureColor(x, 'black', metrics);
    }
    if (root) {
      this.applyStructureColor(root, 'black', metrics);
      root.parent = null;
    }
    return root;
  }

  private structureColorOf(node: StructureSnapshot | null): 'red' | 'black' {
    return node?.color ?? 'black';
  }

  private applyStructureColor(
    node: StructureSnapshot | null,
    color: 'red' | 'black',
    metrics?: StructureMetrics
  ): void {
    if (!node) return;
    if (node.color !== color) {
      node.color = color;
      if (metrics) {
        metrics.recolors += 1;
      }
    }
  }

  private buildStructureFromSequence(sequence: number[], metrics?: StructureMetrics): StructureSnapshot | null {
    let root: StructureSnapshot | null = null;
    sequence.forEach((value) => {
      root = this.insertStructureNode(root, value, metrics);
    });
    return root;
  }

  private compareStructureSnapshots(a: StructureSnapshot | null, b: StructureSnapshot | null): boolean {
    if (!a && !b) {
      return true;
    }
    if (!a || !b) {
      return false;
    }
    if (a.value !== b.value || a.color !== b.color) {
      return false;
    }
    return this.compareStructureSnapshots(a.left, b.left) && this.compareStructureSnapshots(a.right, b.right);
  }

  private logStructureMismatch(expected: StructureSnapshot | null, current: StructureSnapshot | null, task: ExerciseTask): void {
    if (typeof console === 'undefined') {
      return;
    }
    const serialize = (node: StructureSnapshot | null): any =>
      node
        ? {
            value: node.value,
            color: node.color,
            left: serialize(node.left),
            right: serialize(node.right),
          }
        : null;
    console.groupCollapsed('RB tree structure mismatch');
    console.info('Task:', task);
    console.info('Expected structure:', serialize(expected));
    console.info('Current structure:', serialize(current));
    console.groupEnd();
  }

  private logStructureComparison(
    expected: StructureSnapshot | null,
    current: StructureSnapshot | null,
    task: ExerciseTask,
    matches: boolean
  ): void {
    if (typeof console === 'undefined') {
      return;
    }
    const serialize = (node: StructureSnapshot | null): any =>
      node
        ? {
            value: node.value,
            color: node.color,
            left: serialize(node.left),
            right: serialize(node.right),
          }
        : null;
    console.groupCollapsed(`RB tree structure comparison - task: ${task.description}`);
    console.info('Expected structure:', serialize(expected));
    console.info('Current structure:', serialize(current));
    console.info('Structures congruent:', matches ? 'YES ✅' : 'NO ❌');
    console.groupEnd();
  }

  private logExpectedStructure(task: ExerciseTask, structure: StructureSnapshot | null): void {
    if (typeof console === 'undefined') {
      return;
    }
    const serialize = (node: StructureSnapshot | null): any =>
      node
        ? {
            value: node.value,
            color: node.color,
            left: serialize(node.left),
            right: serialize(node.right),
          }
        : null;
    console.groupCollapsed(`RB task expected structure - ${task.description}`);
    console.info('Expected structure at completion:', serialize(structure));
    console.groupEnd();
  }

  private prepareTaskEnvironment(taskIndex: number): void {
    if (taskIndex < 0) {
      this.clearBuildContext();
      this.buildTaskLocked = false;
      return;
    }
    const task = this.tasks[taskIndex];
    if (!task) {
      this.clearBuildContext();
      this.buildTaskLocked = false;
      return;
    }
    if (task.type === 'build') {
      this.buildTaskLocked = false;
      this.currentBuildSequence = [...(task.sequence ?? [])];
      this.activeBuildTaskIndex = taskIndex;
      if (!this.preparedTaskIndices.has(taskIndex)) {
        if (this.root) {
          this.recordHistory(`Setup task ${taskIndex + 1}`, taskIndex);
        }
        this.resetTreeForBuildTask(task);
        this.preparedTaskIndices.add(taskIndex);
      }
    } else {
      this.clearBuildContext();
      this.buildTaskLocked = false;
    }
    const expectation = this.expectedTaskStructures[taskIndex] ?? null;
    this.logExpectedStructure(task, expectation);
    this.resetTaskScoring();
  }

  private resetTreeForBuildTask(task: ExerciseTask): void {
    this.root = null;
    this.selected = null;
    this.nodeIndex.clear();
    this.counter = 0;
    this.doubleBlackMarker = null;
    this.undoStack = [];
    this.redoStack = [];
    this.buildPlacedValues.clear();
    this.selectedBuildValue = task.sequence?.[0] ?? null;
    this.currentBuildSequence = [...(task.sequence ?? [])];
    this.activeBuildTaskIndex = this.activeTaskIndex;
    this.runValidation();
    const sequenceLabel = task.sequence ? task.sequence.join(', ') : '';
    this.message = sequenceLabel
      ? `Ricostruisci l'albero usando l'array: [${sequenceLabel}] (radice: ${task.sequence![0]}).`
      : 'Ricostruisci l\'albero usando l\'array fornito.';
  }

  private clearBuildContext(unlock = true): void {
    this.currentBuildSequence = [];
    this.buildPlacedValues.clear();
    this.selectedBuildValue = null;
    this.activeBuildTaskIndex = null;
    if (unlock) {
      this.buildTaskLocked = false;
    }
  }

  private markBuildValueUsage(value: number, used: boolean): void {
    if (!this.currentBuildSequence.includes(value)) {
      return;
    }
    if (used) {
      this.buildPlacedValues.add(value);
      if (this.selectedBuildValue === value) {
        this.selectedBuildValue = this.findNextBuildValue();
      }
    } else {
      this.buildPlacedValues.delete(value);
      this.selectedBuildValue = value;
    }
  }

  private findNextBuildValue(): number | null {
    for (const candidate of this.currentBuildSequence) {
      if (!this.buildPlacedValues.has(candidate)) {
        return candidate;
      }
    }
    return null;
  }

  private renderTree(): void {
    if (!this.paper || !this.paperInitialized) {
      return;
    }

    try {
      this.graph.clear();
    } catch (error) {
      console.error('Error clearing graph:', error);
      return;
    }

    const layout = this.computeLayout(this.root);
    this.nodeOverlays = layout.overlays;
    this.nilOverlays = layout.nils;

    try {
      this.paper.setDimensions(Math.max(layout.width, 400), Math.max(layout.height, 200));
    } catch (error) {
      console.error('Error setting paper dimensions:', error);
      return;
    }

    if (!this.root || !layout.overlays.length) {
      return;
    }

    const overlayMap = new Map<string, OverlayNodeView>(layout.overlays.map((node) => [node.id, node]));
    const nilMap = new Map<string, NilOverlay>(
      layout.nils.map((nil) => [`${nil.parentId}-${nil.direction}`, nil] as const)
    );
    const connections = this.buildConnections(this.root, overlayMap, nilMap);

    const links = connections.map(({ source, target, dashed }) => {
      const link = new joint.shapes.standard.Link();
      link.source({ x: source.left, y: source.top });
      link.target({ x: target.left, y: target.top });
      link.attr({
        line: {
          stroke: 'rgba(148,163,184,0.35)',
          strokeWidth: 2,
          strokeDasharray: dashed ? '4 3' : undefined,
        },
      });
      return link;
    });

    try {
      if (links.length) {
        this.graph.addCells(links);
      }
    } catch (error) {
    }
  }

  private computeTreeDepth(node: NodeView | null): number {
    if (!node) {
      return -1;
    }
    return Math.max(this.computeTreeDepth(node.left ?? null), this.computeTreeDepth(node.right ?? null)) + 1;
  }

  private computeLayout(root: NodeView | null): LayoutResult {
    if (!root) {
      return {
        overlays: [],
        nils: [],
        width: 400,
        height: 200,
      };
    }
    const widthMap = new Map<string, { left: number; right: number }>();
    const computeWidth = (node: NodeView | null): number => {
      if (!node) {
        return 1;
      }
      const leftWidth = node.left ? computeWidth(node.left) : 1;
      const rightWidth = node.right ? computeWidth(node.right) : 1;
      widthMap.set(node.id, { left: leftWidth, right: rightWidth });
      return leftWidth + rightWidth;
    };
    const totalUnits = computeWidth(root);
    const overlays: OverlayNodeView[] = [];
    const nils: NilOverlay[] = [];
    const assignPositions = (node: NodeView | null, depth: number, startUnit: number): void => {
      if (!node) {
        return;
      }
      const metrics = widthMap.get(node.id)!;
      const unitX = startUnit + metrics.left;
      const left = this.margin + unitX * this.horizontalSpacing;
      const top = this.margin + depth * this.verticalSpacing;
      overlays.push({
        id: node.id,
        value: node.value,
        color: node.color,
        left,
        top,
      });
      if (node.left) {
        assignPositions(node.left, depth + 1, startUnit);
      } else {
        const nilUnitX = startUnit + metrics.left / 2;
        nils.push({
          parentId: node.id,
          direction: 'left',
          left: this.margin + nilUnitX * this.horizontalSpacing,
          top: top + this.verticalSpacing,
        });
      }
      if (node.right) {
        assignPositions(node.right, depth + 1, startUnit + metrics.left);
      } else {
        const nilUnitX = startUnit + metrics.left + metrics.right / 2;
        nils.push({
          parentId: node.id,
          direction: 'right',
          left: this.margin + nilUnitX * this.horizontalSpacing,
          top: top + this.verticalSpacing,
        });
      }
    };
    assignPositions(root, 0, 0);
    const depth = this.computeTreeDepth(root);
    const width = totalUnits * this.horizontalSpacing + this.margin * 2;
    const height = (depth + 1) * this.verticalSpacing + this.margin * 2;
    return {
      overlays,
      nils,
      width,
      height,
    };
  }

  private buildConnections(
    root: NodeView | null,
    overlayMap: Map<string, OverlayNodeView>,
    nilMap: Map<string, NilOverlay>
  ): ConnectionLine[] {
    const lines: ConnectionLine[] = [];
    const traverse = (node: NodeView | null): void => {
      if (!node) {
        return;
      }
      const parentOverlay = overlayMap.get(node.id);
      if (!parentOverlay) {
        return;
      }
      if (node.left) {
        const childOverlay = overlayMap.get(node.left.id);
        if (childOverlay) {
          lines.push({ source: parentOverlay, target: childOverlay, dashed: false });
        }
      } else {
        const leftNil = nilMap.get(`${node.id}-left`);
        if (leftNil) {
          lines.push({ source: parentOverlay, target: leftNil, dashed: true });
        }
      }
      if (node.right) {
        const childOverlay = overlayMap.get(node.right.id);
        if (childOverlay) {
          lines.push({ source: parentOverlay, target: childOverlay, dashed: false });
        }
      } else {
        const rightNil = nilMap.get(`${node.id}-right`);
        if (rightNil) {
          lines.push({ source: parentOverlay, target: rightNil, dashed: true });
        }
      }
      traverse(node.left ?? null);
      traverse(node.right ?? null);
    };
    traverse(root);
    return lines;
  }

  private computeOverlayBounds(nodes: Array<{ left: number; top: number }>): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } {
    if (!nodes.length) {
      return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
    }
    return nodes.reduce(
      (acc, node) => ({
        minX: Math.min(acc.minX, node.left),
        maxX: Math.max(acc.maxX, node.left),
        minY: Math.min(acc.minY, node.top),
        maxY: Math.max(acc.maxY, node.top),
      }),
      { minX: nodes[0].left, maxX: nodes[0].left, minY: nodes[0].top, maxY: nodes[0].top }
    );
  }

  private encodeSvg(svg: string): string {
    try {
      if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
        return window.btoa(unescape(encodeURIComponent(svg)));
      }
    } catch {
      // ignore
    }
    if (typeof btoa === 'function') {
      return btoa(unescape(encodeURIComponent(svg)));
    }
    return '';
  }

  private stripOuterSvg(svg: string): string {
    const match = svg.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
    return match ? match[1] : svg;
  }

  private downloadSvg(svgContent: string, filename: string, scale = 1): void {
    if (typeof document === 'undefined') {
      return;
    }
    const sizedSvg =
      scale === 1
        ? svgContent
        : svgContent.replace(/(<svg[^>]*width=\")(\d+)(\"[^>]*height=\")(\d+)/, (_match, preW, w, preH, h) => {
            return `${preW}${Number(w) * scale}${preH}${Number(h) * scale}`;
          });
    const blob = new Blob([sizedSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private downloadSnapshots(
    steps: HistoryStep[],
    filename: string,
    svgScale = 0.65,
    headerTitle?: string,
    headerSubtitle?: string
  ): void {
    const validSteps = steps.filter((step) => step.previewSvg && step.previewWidth && step.previewHeight);
    if (!validSteps.length) {
      return;
    }
    const labelHeight = 64;
    const horizontalGap = 64;
    const verticalGap = 80;
    const paddingX = 48;
    const paddingY = 48;
    const minCellWidth = 760;
    const maxCellWidth = 1160;
    const columns = Math.min(3, validSteps.length);
    const rawSteps = validSteps.map((step, index) => ({
      step,
      index,
      contentWidth: step.previewWidth ?? 800,
      contentHeight: step.previewHeight ?? 600,
      column: index % columns,
      row: Math.floor(index / columns),
    }));
    const columnWidths = new Array(columns).fill(minCellWidth);
    rawSteps.forEach((item) => {
      const desired = Math.min(maxCellWidth, Math.max(minCellWidth, item.contentWidth + paddingX * 2));
      columnWidths[item.column] = Math.max(columnWidths[item.column], desired);
    });
    const columnOffsets: number[] = [];
    let currentX = horizontalGap;
    columnWidths.forEach((width, idx) => {
      columnOffsets[idx] = currentX;
      currentX += width + horizontalGap;
    });
    const rowHeights: number[] = [];
    const preparedSteps = rawSteps.map((item) => {
      const cellWidth = columnWidths[item.column];
      const availableWidth = Math.max(1, cellWidth - paddingX * 2);
      const scale = Math.min(3.5, availableWidth / item.contentWidth);
      const scaledHeight = item.contentHeight * scale;
      const cellHeight = labelHeight + paddingY + scaledHeight + paddingY;
      rowHeights[item.row] = Math.max(rowHeights[item.row] ?? 0, cellHeight);
      return { ...item, cellWidth, scale, scaledHeight, cellHeight };
    });
    const rowOffsets: number[] = [];
    let currentY = verticalGap;
    rowHeights.forEach((rowHeight, idx) => {
      rowOffsets[idx] = currentY;
      currentY += rowHeight + verticalGap;
    });
    const titleText = headerTitle ?? this.currentScenario?.title ?? 'RB Tree Exercise';
    const subtitleText =
      typeof headerSubtitle === 'string' ? headerSubtitle : this.currentScenario?.description ?? '';
    const hasSubtitle = Boolean(subtitleText?.trim());
    const headerHeight = titleText ? (hasSubtitle ? 150 : 110) : 40;
    const totalHeight = currentY + headerHeight;
    const totalWidth =
      columns > 0 ? columnOffsets[columns - 1] + columnWidths[columns - 1] + horizontalGap : 0;
    const clipDefs: string[] = [];
    const svgParts: string[] = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" fill="none">`,
      '__CLIP_DEFS__',
      `<rect width="100%" height="100%" fill="#020617"/>`,
    ];
    if (titleText) {
      svgParts.push(
        `<text x="${totalWidth / 2}" y="70" text-anchor="middle" fill="#f8fafc" font-family="JetBrains Mono, monospace" font-size="36" font-weight="700">${titleText}</text>`
      );
      if (hasSubtitle) {
        svgParts.push(
          `<text x="${totalWidth / 2}" y="118" text-anchor="middle" fill="#94a3b8" font-family="JetBrains Mono, monospace" font-size="20">${subtitleText}</text>`
        );
      }
    }
    preparedSteps.forEach((item) => {
      const cellX = columnOffsets[item.column];
      const cellY = rowOffsets[item.row] + headerHeight;
      const innerOffsetX = (item.cellWidth - item.contentWidth * item.scale) / 2;
      const contentY = labelHeight + paddingY;
      const rowHeight = rowHeights[item.row];
      const clipId = `clip-${filename.replace(/[^a-z0-9]/gi, '')}-${item.index}-${item.row}`;
      clipDefs.push(
        `<clipPath id="${clipId}"><rect width="${item.cellWidth}" height="${rowHeight}" rx="26" ry="26"/></clipPath>`
      );
      svgParts.push(
        `<g transform="translate(${cellX},${cellY})" clip-path="url(#${clipId})">`,
        `<rect width="${item.cellWidth}" height="${rowHeight}" fill="rgba(15,23,42,0.35)" stroke="rgba(148,163,184,0.15)" stroke-width="2" rx="26"/>`,
        `<text x="32" y="44" fill="#f8fafc" font-family="JetBrains Mono, monospace" font-size="26" font-weight="600">Step ${item.index + 1} · ${
          item.step.label
        }</text>`,
        `<g transform="translate(${innerOffsetX},${contentY}) scale(${item.scale})">${this.stripOuterSvg(item.step.previewSvg!)} </g>`,
        `</g>`
      );
    });
    const defsPayload = clipDefs.length ? `<defs>${clipDefs.join('')}</defs>` : '';
    svgParts[1] = defsPayload;
    svgParts.push('</svg>');
    this.downloadSvg(svgParts.join(''), filename, svgScale);
  }

  private filterStepsForTask(taskIndex: number): HistoryStep[] {
    if (taskIndex < 0 || taskIndex >= this.tasks.length) {
      return [];
    }
    const hideSetup = this.tasks[taskIndex]?.type === 'build';
    return this.historySteps.filter((step) => {
      const stepIndex = typeof step.taskIndex === 'number' ? step.taskIndex : -1;
      if (stepIndex !== taskIndex) {
        return false;
      }
      if (hideSetup && this.isSetupLabel(step.label)) {
        return false;
      }
      return true;
    });
  }

  private isSetupLabel(label?: string): boolean {
    if (!label) {
      return false;
    }
    return label.toLowerCase().startsWith('setup');
  }

  private findMatchingHistoryIndex(taskIndex: number, stateHash: string): number {
    for (let i = this.historySteps.length - 1; i >= 0; i--) {
      const step = this.historySteps[i];
      if (step.taskIndex === taskIndex && step.stateHash === stateHash) {
        return i;
      }
    }
    return -1;
  }

  private buildStateSignature(node: NodeView | null): string {
    const serialize = (current: NodeView | null): any => {
      if (!current) {
        return null;
      }
      return {
        v: current.value,
        c: current.color,
        l: serialize(current.left ?? null),
        r: serialize(current.right ?? null),
      };
    };
    return JSON.stringify(serialize(node));
  }

  private resetMiniPreviewAfterHistoryChange(): void {
    if (!this.miniPreviewExpanded) {
      this.miniPreviewPan = { x: 0, y: 0 };
      this.miniPreviewZoom = this.miniPreviewBaseZoom;
      this.miniPreviewFloating = false;
      this.miniPreviewPosition = null;
    }
  }

  private generateHistoryPreview(layout: LayoutResult, connections: ConnectionLine[]): HistoryPreview | null {
    const baseWidth = Math.max(layout.width, 600);
    const baseHeight = Math.max(layout.height, 420);
    const targetWidth = Math.max(1800, baseWidth * 1.5);
    const targetHeight = Math.max(1500, baseHeight * 1.5);
    const bounds = this.computeOverlayBounds(layout.overlays.length ? layout.overlays : layout.nils);
    const boundsPadding = 90;
    bounds.minX -= boundsPadding;
    bounds.maxX += boundsPadding;
    bounds.minY -= boundsPadding;
    bounds.maxY += boundsPadding;
    const padding = 120;
    const availableWidth = Math.max(200, targetWidth - padding * 2);
    const availableHeight = Math.max(200, targetHeight - padding * 2);
    const contentWidth = Math.max(1, bounds.maxX - bounds.minX);
    const contentHeight = Math.max(1, bounds.maxY - bounds.minY);
    const scale = Math.min(5, availableWidth / contentWidth, availableHeight / contentHeight);
    const offsetX = (targetWidth - contentWidth * scale) / 2 - bounds.minX * scale;
    const offsetY = (targetHeight - contentHeight * scale) / 2 - bounds.minY * scale;
    const project = (point: { left: number; top: number }): { x: number; y: number } => ({
      x: point.left * scale + offsetX,
      y: point.top * scale + offsetY,
    });
    const nodeRadius = Math.max(18, Math.min(56, 18 * scale));
    const nilRadius = Math.max(12, nodeRadius * 0.65);
    const linkWidth = Math.max(2.4, Math.min(8, 2.2 * scale));
    const fontSize = Math.max(12, Math.min(30, 10.5 * scale));
    const svgParts: string[] = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${targetWidth}" height="${targetHeight}" viewBox="0 0 ${targetWidth} ${targetHeight}" fill="none">`,
      `<rect width="100%" height="100%" fill="#020617"/>`,
    ];
    connections.forEach((connection) => {
      const start = project(connection.source);
      const end = project(connection.target);
      svgParts.push(
        `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="${
          connection.dashed ? 'rgba(148,163,184,0.35)' : 'rgba(148,163,184,0.6)'
        }" stroke-width="${linkWidth}" stroke-dasharray="${connection.dashed ? '12 10' : '0'}" stroke-linecap="round"/>`
      );
    });
    layout.nils.forEach((nil) => {
      const pos = project(nil);
      svgParts.push(
        `<circle cx="${pos.x}" cy="${pos.y}" r="${nilRadius}" stroke="rgba(148,163,184,0.4)" stroke-width="${Math.max(
          1.6,
          linkWidth * 0.6
        )}" fill="none" stroke-dasharray="10 8"/>`,
        `<text x="${pos.x}" y="${pos.y + 2}" fill="rgba(148,163,184,0.65)" font-family="JetBrains Mono, monospace" font-size="${Math.max(
          11,
          fontSize * 0.7
        )}" text-anchor="middle" dominant-baseline="middle">NIL</text>`
      );
    });
    layout.overlays.forEach((node) => {
      const pos = project(node);
      const fill = node.color === 'red' ? '#b91c1c' : '#0f172a';
      const stroke = node.color === 'red' ? 'rgba(248,113,113,0.85)' : 'rgba(226,232,240,0.85)';
      svgParts.push(
        `<circle cx="${pos.x}" cy="${pos.y}" r="${nodeRadius}" fill="${fill}" stroke="${stroke}" stroke-width="${Math.max(
          2,
          linkWidth * 0.9
        )}"/>`,
        `<text x="${pos.x}" y="${pos.y + 2}" fill="${node.color === 'red' ? '#fff7ed' : '#f8fafc'}" font-family="JetBrains Mono, monospace" font-weight="700" font-size="${fontSize}" text-anchor="middle" dominant-baseline="middle">${node.value}</text>`
      );
    });
    if (!layout.overlays.length) {
      svgParts.push(
        `<text x="${targetWidth / 2}" y="${targetHeight / 2}" fill="rgba(148,163,184,0.8)" font-size="22" font-family="JetBrains Mono, monospace" text-anchor="middle">Albero vuoto</text>`
      );
    }
    svgParts.push('</svg>');
    const rawSvg = svgParts.join('');
    const encoded = this.encodeSvg(rawSvg);
    return {
      dataUrl: `data:image/svg+xml;base64,${encoded}`,
      rawSvg,
      width: targetWidth,
      height: targetHeight,
    };
  }

  private recordHistory(label: string, taskIndexOverride?: number): void {
    const snapshotRoot = this.cloneTreeForHistory(this.root);
    const stateHash = this.buildStateSignature(snapshotRoot);
    const taskIndex = typeof taskIndexOverride === 'number' ? taskIndexOverride : this.activeTaskIndex ?? -1;
    const existingIndex = this.findMatchingHistoryIndex(taskIndex, stateHash);
    if (existingIndex !== -1) {
      this.historySteps = this.historySteps.slice(0, existingIndex + 1);
      this.resetMiniPreviewAfterHistoryChange();
      return;
    }
    const layout = this.computeLayout(snapshotRoot);
    const overlayMap = new Map<string, OverlayNodeView>(layout.overlays.map((node) => [node.id, node]));
    const nilMap = new Map<string, NilOverlay>(
      layout.nils.map((nil) => [`${nil.parentId}-${nil.direction}`, nil] as const)
    );
    const connections = this.buildConnections(snapshotRoot, overlayMap, nilMap);
    const preview = this.generateHistoryPreview(layout, connections);
    const step: HistoryStep = {
      id: `hist-${Date.now()}`,
      label,
      timestamp: Date.now(),
      previewDataUrl: preview?.dataUrl ?? null,
      previewSvg: preview?.rawSvg ?? null,
      previewWidth: preview?.width ?? undefined,
      previewHeight: preview?.height ?? undefined,
      taskIndex,
      stateHash,
    };
    this.historySteps = [...this.historySteps, step].slice(-24);
    this.resetMiniPreviewAfterHistoryChange();
  }

  toggleHistoryPanel(): void {
    this.historyCollapsed = !this.historyCollapsed;
  }

  downloadHistoryStep(step: HistoryStep, index: number): void {
    const filename = `${this.currentScenario?.id ?? 'rb-tree'}-step-${index + 1}.svg`;
    if (step.previewSvg) {
      this.downloadSvg(step.previewSvg, filename);
      return;
    }
    if (!step.previewDataUrl || typeof document === 'undefined') {
      return;
    }
    this.triggerDownload(step.previewDataUrl, filename);
  }

  async downloadAllHistory(): Promise<void> {
    const visibleSteps = this.timelineSteps.filter(
      (step) => step.previewSvg && step.previewWidth && step.previewHeight
    );
    if (!visibleSteps.length) {
      return;
    }
    this.downloadSnapshots(
      visibleSteps,
      `${this.currentScenario?.id ?? 'rb-tree'}-timeline.svg`,
      0.65,
      this.currentScenario?.title ?? 'RB Tree Timeline',
      'Timeline step registrati'
    );
  }

  downloadTaskHistory(taskIndex: number): void {
    const taskSteps = this.filterStepsForTask(taskIndex).filter(
      (step) => step.previewSvg && step.previewWidth && step.previewHeight
    );
    if (!taskSteps.length) {
      return;
    }
    const task = this.tasks[taskIndex];
    const header = task ? `Passo ${taskIndex + 1}: ${task.description}` : `Passo ${taskIndex + 1}`;
    let subtitle: string | undefined;
    if (task) {
      if (task.type === 'build') {
        const arr = task.sequence?.join(', ') ?? '';
        subtitle = arr ? `Array: [${arr}] · Radice: ${task.sequence?.[0] ?? '-'}` : 'Esercizio build';
      } else {
        subtitle = `Tipo: ${task.type === 'insert' ? 'Inserimento' : 'Cancellazione'} ${
          task.value !== undefined ? `· Valore: ${task.value}` : ''
        }`;
      }
    }
    this.downloadSnapshots(
      taskSteps,
      `${this.currentScenario?.id ?? 'rb-tree'}-task-${taskIndex + 1}.svg`,
      0.8,
      header,
      subtitle
    );
  }

  private triggerDownload(dataUrl: string, filename: string): void {
    if (typeof document === 'undefined') {
      return;
    }
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  hasHistoryForTask(index: number): boolean {
    return this.filterStepsForTask(index).some((step) => step.previewSvg);
  }

  openPreviewModal(step: HistoryStep): void {
    if (!step?.previewDataUrl) {
      return;
    }
    this.previewModalStep = step;
    this.previewModalZoom = 1;
    this.previewModalPan = { x: 0, y: 0 };
  }

  closePreviewModal(): void {
    this.previewModalStep = null;
    this.previewModalPan = { x: 0, y: 0 };
    this.previewModalZoom = 1;
  }

  startMiniPreviewDrag(event: PointerEvent): void {
    if (this.miniPreviewExpanded || !this.previousHistoryStep) {
      return;
    }
    const target = event.target as HTMLElement;
    if (
      target.closest('.mini-preview-controls') ||
      target.closest('button') ||
      target.closest('.mini-preview-image')
    ) {
      return;
    }
    this.miniPreviewDragging = true;
    this.miniPreviewPointerId = event.pointerId;
    this.miniPreviewElement = event.currentTarget as HTMLElement;
    this.miniPreviewDragStart = { x: event.clientX, y: event.clientY };
    const defaults = this.getMiniPreviewDefaultPosition();
    const startX = this.miniPreviewPosition?.x ?? defaults.x;
    const startY = this.miniPreviewPosition?.y ?? defaults.y;
    this.miniPreviewOffsetStart = { x: startX, y: startY };
    this.miniPreviewPosition = { x: startX, y: startY };
    this.miniPreviewFloating = true;
    this.miniPreviewElement?.setPointerCapture?.(event.pointerId);
    event.stopPropagation();
    event.preventDefault();
  }

  toggleMiniPreviewExpand(): void {
    this.miniPreviewExpanded = !this.miniPreviewExpanded;
    if (this.miniPreviewExpanded) {
      this.miniPreviewFloating = false;
      this.miniPreviewPosition = null;
      this.miniPreviewPan = { x: 0, y: 0 };
      this.miniPreviewZoom = this.miniPreviewBaseZoom;
    } else {
      this.miniPreviewFloating = false;
      this.miniPreviewPosition = null;
      this.miniPreviewPan = { x: 0, y: 0 };
      this.miniPreviewZoom = this.miniPreviewBaseZoom;
    }
  }

  private updateMiniPreviewDrag(event: PointerEvent): void {
    if (!this.miniPreviewDragging || this.miniPreviewPointerId !== event.pointerId) {
      return;
    }
    const stageRect = this.treeStageRef?.nativeElement.getBoundingClientRect();
    const stageWidth = stageRect?.width ?? 600;
    const stageHeight = stageRect?.height ?? 400;
    const panelWidth = 320;
    const panelHeight = 220;
    const deltaX = event.clientX - this.miniPreviewDragStart.x;
    const deltaY = event.clientY - this.miniPreviewDragStart.y;
    const newX = this.miniPreviewOffsetStart.x + deltaX;
    const newY = this.miniPreviewOffsetStart.y + deltaY;
    this.miniPreviewPosition = {
      x: Math.min(Math.max(8, newX), Math.max(8, stageWidth - panelWidth - 8)),
      y: Math.min(Math.max(8, newY), Math.max(8, stageHeight - panelHeight - 8)),
    };
  }

  private endMiniPreviewDrag(): void {
    if (!this.miniPreviewDragging) {
      return;
    }
    if (this.miniPreviewPointerId !== null) {
      this.miniPreviewElement?.releasePointerCapture?.(this.miniPreviewPointerId);
    }
    this.miniPreviewDragging = false;
    this.miniPreviewPointerId = null;
    this.miniPreviewElement = null;
  }

  private getMiniPreviewDefaultPosition(): { x: number; y: number } {
    const stage = this.treeStageRef?.nativeElement;
    const stageWidth = stage?.clientWidth ?? 600;
    const panelWidth = this.miniPreviewExpanded ? Math.max(200, stageWidth - 32) : 320;
    return {
      x: Math.max(16, stageWidth - panelWidth - 16),
      y: 16,
    };
  }

  handleMiniPreviewWheel(event: WheelEvent): void {
    if (!this.previousHistoryStep?.previewDataUrl) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    this.miniPreviewZoom = this.clampZoom(this.miniPreviewZoom + delta);
  }

  resetMiniPreviewZoom(): void {
    this.miniPreviewZoom = this.miniPreviewBaseZoom;
    this.miniPreviewPan = { x: 0, y: 0 };
  }

  resetModalView(): void {
    this.previewModalZoom = 1;
    this.previewModalPan = { x: 0, y: 0 };
  }

  handleModalWheel(event: WheelEvent): void {
    if (!this.previewModalStep?.previewDataUrl) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    this.previewModalZoom = this.clampZoom(this.previewModalZoom + delta);
  }

  private clampZoom(value: number): number {
    return Math.min(6, Math.max(0.35, value));
  }

  startMiniPreviewImageDrag(event: PointerEvent): void {
    if (!this.previousHistoryStep?.previewDataUrl) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.miniPreviewImageDragging = true;
    this.miniPreviewImagePointerId = event.pointerId;
    this.miniPreviewImageElement = event.currentTarget as HTMLElement;
    this.miniPreviewImageDragStart = { x: event.clientX, y: event.clientY };
    this.miniPreviewImageOffsetStart = { ...this.miniPreviewPan };
    this.miniPreviewImageElement?.setPointerCapture?.(event.pointerId);
  }

  private updateMiniPreviewImageDrag(event: PointerEvent): void {
    if (!this.miniPreviewImageDragging || event.pointerId !== this.miniPreviewImagePointerId) {
      return;
    }
    this.miniPreviewPan = {
      x: this.miniPreviewImageOffsetStart.x + (event.clientX - this.miniPreviewImageDragStart.x),
      y: this.miniPreviewImageOffsetStart.y + (event.clientY - this.miniPreviewImageDragStart.y),
    };
  }

  private endMiniPreviewImageDrag(): void {
    if (this.miniPreviewImagePointerId !== null) {
      this.miniPreviewImageElement?.releasePointerCapture?.(this.miniPreviewImagePointerId);
    }
    this.miniPreviewImageDragging = false;
    this.miniPreviewImagePointerId = null;
    this.miniPreviewImageElement = null;
  }

  startModalImageDrag(event: PointerEvent): void {
    if (!this.previewModalStep?.previewDataUrl) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.modalImageDragging = true;
    this.modalImagePointerId = event.pointerId;
    this.modalImageElement = event.currentTarget as HTMLElement;
    this.modalImageDragStart = { x: event.clientX, y: event.clientY };
    this.modalImageOffsetStart = { ...this.previewModalPan };
    this.modalImageElement?.setPointerCapture?.(event.pointerId);
  }

  private updateModalImageDrag(event: PointerEvent): void {
    if (!this.modalImageDragging || event.pointerId !== this.modalImagePointerId) {
      return;
    }
    this.previewModalPan = {
      x: this.modalImageOffsetStart.x + (event.clientX - this.modalImageDragStart.x),
      y: this.modalImageOffsetStart.y + (event.clientY - this.modalImageDragStart.y),
    };
  }

  private endModalImageDrag(): void {
    if (this.modalImagePointerId !== null) {
      this.modalImageElement?.releasePointerCapture?.(this.modalImagePointerId);
    }
    this.modalImageDragging = false;
    this.modalImagePointerId = null;
    this.modalImageElement = null;
  }

  private collectBstViolations(
    node: NodeView | null,
    min: number = -Infinity,
    max: number = Infinity,
    acc: string[] = []
  ): string[] {
    if (!node) {
      return acc;
    }
    if (node.value <= min || node.value >= max) {
      acc.push(`Nodo ${node.value} viola la proprietà BST rispetto all'intervallo (${min}, ${max}).`);
    }
    this.collectBstViolations(node.left ?? null, min, node.value, acc);
    this.collectBstViolations(node.right ?? null, node.value, max, acc);
    return acc;
  }

  isDoubleBlackNode(id: string): boolean {
    return this.doubleBlackMarker?.type === 'node' && this.doubleBlackMarker.nodeId === id;
  }

  isXNode(id: string): boolean {
    return this.isDoubleBlackNode(id);
  }

  isWNode(id: string): boolean {
    if (!this.doubleBlackMarker) {
      return false;
    }
    if (this.doubleBlackMarker.type === 'node' || this.doubleBlackMarker.type === 'nil') {
      return this.doubleBlackMarker.siblingId === id;
    }
    return false;
  }

  isParentNode(id: string): boolean {
    if (!this.doubleBlackMarker) {
      return false;
    }
    if (this.doubleBlackMarker.type === 'node') {
      return this.doubleBlackMarker.parentId === id;
    }
    if (this.doubleBlackMarker.type === 'nil') {
      return this.doubleBlackMarker.parentId === id;
    }
    return false;
  }

  isDoubleBlackNil(nil: NilOverlay): boolean {
    return (
      this.doubleBlackMarker?.type === 'nil' &&
      this.doubleBlackMarker.parentId === nil.parentId &&
      this.doubleBlackMarker.direction === nil.direction
    );
  }

  isXNil(nil: NilOverlay): boolean {
    return this.isDoubleBlackNil(nil);
  }

  startPan(event: PointerEvent): void {
    const target = event.target as HTMLElement;
    if (
      target.closest('.node-actions') ||
      target.closest('.rb-button') ||
      target.closest('.mini-preview') ||
      target.closest('.history-drawer') ||
      target.closest('.preview-modal')
    ) {
      return;
    }
    this.isPanning = true;
    this.pointerStart = { x: event.clientX, y: event.clientY };
    this.panStart = { x: this.panX, y: this.panY };
    this.panElement = event.currentTarget as HTMLElement;
    this.panElement?.setPointerCapture(event.pointerId);
  }

  @HostListener('window:pointermove', ['$event'])
  handlePointerMove(event: PointerEvent): void {
    if (this.isPanning) {
      this.panX = this.panStart.x + event.clientX - this.pointerStart.x;
      this.panY = this.panStart.y + event.clientY - this.pointerStart.y;
    }
    if (this.miniPreviewDragging) {
      this.updateMiniPreviewDrag(event);
    }
    if (this.miniPreviewImageDragging) {
      this.updateMiniPreviewImageDrag(event);
    }
    if (this.modalImageDragging) {
      this.updateModalImageDrag(event);
    }
  }

  @HostListener('window:pointerup', ['$event'])
  endPan(event: PointerEvent): void {
    if (this.isPanning) {
      this.isPanning = false;
      this.panElement?.releasePointerCapture?.(event.pointerId);
      this.panElement = null;
    }
    if (this.miniPreviewDragging && event.pointerId === this.miniPreviewPointerId) {
      this.endMiniPreviewDrag();
    }
    if (this.miniPreviewImageDragging && event.pointerId === this.miniPreviewImagePointerId) {
      this.endMiniPreviewImageDrag();
    }
    if (this.modalImageDragging && event.pointerId === this.modalImagePointerId) {
      this.endModalImageDrag();
    }
  }

  handleWheel(event: WheelEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('.mini-preview') || target.closest('.history-drawer') || target.closest('.preview-modal')) {
      return;
    }
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.05 : 0.05;
    this.scale = this.clampScale(this.scale + delta);
  }

  handleCanvasClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('.overlay-node') || target.closest('.node-actions') || target.closest('.rb-button')) {
      return;
    }
    this.selected = null;
  }

  private clampScale(value: number): number {
    return Math.min(2, Math.max(0.6, value));
  }

  get treeTransform(): string {
    return `translate(-50%, -50%) translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
  }
}
