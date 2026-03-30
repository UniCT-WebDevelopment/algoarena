import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as joint from 'jointjs';
import { LabSessionApiService } from '../../../core/services/lab-session-api';

type GraphAlgorithm = 'dijkstra' | 'bellman' | 'floyd';

interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
}

interface GraphEdge {
  from: string;
  to: string;
  weight: number;
}

interface ShortestPathResult {
  dist: Record<string, number>;
  pred: Record<string, string | null>;
}

interface GraphSessionScenario {
  algorithm: GraphAlgorithm;
  nodes: GraphNode[];
  edges: GraphEdge[];
  sourceId: string;
}

interface GraphValidationResponse {
  correct: boolean;
  hasErrors: boolean;
  errors: Record<string, string>;
  feedback: string;
}

@Component({
  selector: 'app-shortest-path-lab',
  standalone: true,
  imports: [CommonModule, FormsModule, NgFor, NgIf],
  templateUrl: './shortest-path-lab.html',
  styleUrl: './shortest-path-lab.scss',
})
export class ShortestPathLabComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('graphCanvas', { static: true }) canvasRef!: ElementRef<HTMLDivElement>;
  private graph!: joint.dia.Graph;
  private paper!: joint.dia.Paper;

  algorithms: GraphAlgorithm[] = ['dijkstra', 'bellman', 'floyd'];
  algorithm: GraphAlgorithm = 'dijkstra';
  nodes: GraphNode[] = [];
  edges: GraphEdge[] = [];
  matrix: number[][] = [];
  floydStages: number[][][] = [];
  floydParentStages: (string | null)[][][] = [];
  userFloydStages: number[][][] = [];
  userFloydParentStages: string[][][] = [];
  userDist: Record<string, string> = {};
  userPred: Record<string, string> = {};
  bellmanLeft: Record<string, string> = {};
  bellmanRight: Record<string, string> = {};
  sourceId = '';
  feedback = '';
  hasErrors = false;
  errors: Record<string, string> = {};
  showHints = false;
  readonly INF = Infinity;
  private jointIdToNode: Record<string, string> = {};
  private panStart: { x: number; y: number } | null = null;
  private panOrigin = { x: 0, y: 0 };
  private zoom = 1;
  private currentTranslate = { x: 0, y: 0 };
  private canvasSize = { width: 620, height: 360 };
  private sessionId: string | null = null;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;

  private mounted = false;

  readonly maxNodes = 6;
  readonly minNodes = 4;

  constructor(private labSessionApi: LabSessionApiService) {}

  ngOnInit(): void {
    this.generateGraph();
  }

  ngAfterViewInit(): void {
    this.updateCanvasSize();
    this.initCanvas();
    this.paper.on('element:pointerclick', (view: joint.dia.ElementView) =>
      this.handleNodeClick((view as any).model as joint.dia.Element)
    );
    this.paper.on('blank:pointerdown', (evt: joint.dia.Event) => this.startPan(evt as PointerEvent));
    this.renderGraph();
    this.mounted = true;
    this.attachWheel();
  }

  ngOnDestroy(): void {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
    (this.paper as any)?.remove?.();
    this.graph?.clear();
    document.removeEventListener('pointermove', this.handlePanMove);
    document.removeEventListener('pointerup', this.handlePanEnd);
    this.canvasRef.nativeElement.removeEventListener('wheel', this.handleWheel as any);
  }

  generateGraph(): void {
    this.updateCanvasSize();
    this.labSessionApi
      .startSession<GraphSessionScenario, GraphValidationResponse>({
        labType: 'graphs',
        variant: this.algorithm,
      })
      .subscribe((response) => {
        this.sessionId = response.sessionId;
        this.algorithm = response.scenario.algorithm;
        this.nodes = response.scenario.nodes;
        this.edges = response.scenario.edges;
        this.sourceId = response.scenario.sourceId;
        this.matrix = this.buildMatrix(this.nodes, this.edges);
        const floyd = this.computeFloydArtifacts();
        this.floydStages = floyd.distStages;
        this.floydParentStages = floyd.parentStages;
        this.resetUserInputs();
        this.applyServerValidation(response.result);
        if (this.mounted) {
          this.renderGraph();
        }
        this.initBellmanNotes();
      });
  }

  setAlgorithm(algo: GraphAlgorithm): void {
    if (this.algorithm === algo) return;
    this.algorithm = algo;
    this.generateGraph();
  }

  onSourceChange(): void {
    this.resetUserInputs();
    this.initBellmanNotes();
    this.queueDraftSync();
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
      .submitStep<GraphValidationResponse>(this.sessionId, {
        eventType,
        payload: {
          sourceId: this.sourceId,
          userDist: { ...this.userDist },
          userPred: { ...this.userPred },
          userFloydStages: this.serializeFloydStages(),
          userFloydParentStages: this.userFloydParentStages.map((stage) =>
            stage.map((row) => [...row])
          ),
        },
      })
      .subscribe((response) => this.applyServerValidation(response.result));
  }

  private applyServerValidation(result: GraphValidationResponse): void {
    this.errors = { ...(result?.errors ?? {}) };
    this.hasErrors = Boolean(result?.hasErrors);
    this.feedback = result?.feedback ?? '';
  }

  private serializeFloydStages(): Array<Array<Array<number | string>>> {
    return this.userFloydStages.map((stage) =>
      stage.map((row) =>
        row.map((value) => {
          if (Number.isNaN(value)) {
            return '';
          }
          if (value === Infinity) {
            return 'INF';
          }
          return value;
        })
      )
    );
  }

  private validateFloyd(): number {
    const expected = this.floydStages;
    const expectedParents = this.floydParentStages;
    const userErrors: string[] = [];
    for (let k = 1; k < expected.length; k++) {
      const expMat = expected[k];
      const userMat = this.userFloydStages[k];
      for (let i = 0; i < expMat.length; i++) {
        for (let j = 0; j < expMat.length; j++) {
          const expectedVal = expMat[i][j];
          const userVal = userMat?.[i]?.[j];
          if (Number.isNaN(userVal)) {
            userErrors.push(`Completa A${k}[${this.nodes[i].label},${this.nodes[j].label}].`);
            continue;
          }
          if (expectedVal === Infinity && userVal !== Infinity) {
            userErrors.push(`Atteso ∞ in A${k}[${this.nodes[i].label},${this.nodes[j].label}].`);
          } else if (expectedVal !== Infinity && Math.abs(userVal - expectedVal) > 1e-6) {
            userErrors.push(`A${k}[${this.nodes[i].label},${this.nodes[j].label}] atteso ${expectedVal}.`);
          }
        }
      }
      if (userErrors.length) break;
      const expParent = expectedParents[k];
      const userParent = this.userFloydParentStages[k];
      for (let i = 0; i < expParent.length; i++) {
        for (let j = 0; j < expParent.length; j++) {
          const expectedParent = expParent[i][j];
          const userRaw = (userParent?.[i]?.[j] ?? '').trim();
          const userId = this.labelToId(userRaw);
          if (expectedParent) {
            if (!userRaw) {
              userErrors.push(`Completa P${k}[${this.nodes[i].label},${this.nodes[j].label}].`);
            } else if (!userId || userId !== expectedParent) {
              userErrors.push(
                `P${k}[${this.nodes[i].label},${this.nodes[j].label}] atteso ${this.labelFor(expectedParent)}.`
              );
            }
          } else if (userRaw) {
            userErrors.push(`P${k}[${this.nodes[i].label},${this.nodes[j].label}] deve essere vuoto.`);
          }
        }
      }
      if (userErrors.length) break;
    }
    this.hasErrors = userErrors.length > 0;
    this.feedback = this.hasErrors ? userErrors[0] : 'Ottimo! Tutte le matrici A_k e P_k sono corrette.';
    return userErrors.length;
  }

  hintList(): string[] {
    if (this.algorithm === 'dijkstra') {
      return [
        'Nessun arco negativo: scegli il nodo non visitato a distanza minima e rilassa i suoi archi.',
        'Aggiorna predecessori solo se trovi un costo minore.',
      ];
    }
    if (this.algorithm === 'bellman') {
      return [
        'Esegui |V|-1 passate di rilassamento su tutti gli archi.',
        'Pesi negativi ammessi (niente cicli negativi nel grafo generato).',
      ];
    }
    return [
      'A0: pesi originali (∞ se assente, 0 diagonale).',
      'A_k[i][j] = min(A_{k-1}[i][j], A_{k-1}[i][k] + A_{k-1}[k][j]).',
      'Calcola per k=1..n (usa la matrice precedente ogni volta).',
      'P0[i][j] = i se esiste arco diretto i→j, altrimenti vuoto.',
      'Se A_k migliora passando per k, allora P_k[i][j] = P_{k-1}[k][j].',
    ];
  }

  toggleHints(): void {
    this.showHints = !this.showHints;
  }

  onMatrixInput(i: number, j: number, value: string): void {
    const parsed = this.parseUserNumber(value);
    this.userFloydStages[1][i][j] = parsed;
  }

  onFloydStageInput(k: number, i: number, j: number, value: string): void {
    const parsed = this.parseUserNumber(value);
    if (!this.userFloydStages[k]) return;
    this.userFloydStages[k][i][j] = parsed;
    this.queueDraftSync();
  }

  setFloydInfinity(k: number, i: number, j: number): void {
    if (!this.userFloydStages[k]) return;
    this.userFloydStages[k][i][j] = Infinity;
    this.queueDraftSync();
  }

  onFloydParentInput(k: number, i: number, j: number, value: string): void {
    const cleaned = value.trim().toUpperCase();
    if (!this.userFloydParentStages[k]) return;
    this.userFloydParentStages[k][i][j] = cleaned;
    this.queueDraftSync();
  }

  private resetUserInputs(): void {
    this.userDist = {};
    this.userPred = {};
    this.bellmanLeft = {};
    this.bellmanRight = {};
    this.errors = {};
    this.hasErrors = false;
    this.feedback = '';
    for (const node of this.nodes) {
      this.userDist[node.id] = node.id === this.sourceId ? '0' : '';
      this.userPred[node.id] = '';
      this.bellmanLeft[node.id] = '';
      this.bellmanRight[node.id] = '';
    }
    this.userFloydStages = this.initUserFloydStages();
    this.userFloydParentStages = this.initUserFloydParentStages();
  }

  private buildNodes(count: number): GraphNode[] {
    const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const radius = 70 + count * 16;
    const cx = this.canvasSize.width / 2;
    const cy = this.canvasSize.height / 2;
    return Array.from({ length: count }, (_, idx) => {
      const angle = (2 * Math.PI * idx) / count;
      return {
        id: `N${idx}`,
        label: labels[idx] ?? `N${idx + 1}`,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      };
    });
  }

  private buildEdges(nodes: GraphNode[], algo: GraphAlgorithm): GraphEdge[] {
    const edges: GraphEdge[] = [];
    const allowNegative = algo === 'bellman';
    const n = nodes.length;
    for (let i = 0; i < n - 1; i++) {
      edges.push({ from: nodes[i].id, to: nodes[i + 1].id, weight: this.randomWeight(allowNegative) });
    }
    for (let i = 0; i < n; i++) {
      for (let j = i + 2; j < n; j++) {
        if (Math.random() < 0.4) {
          edges.push({ from: nodes[i].id, to: nodes[j].id, weight: this.randomWeight(allowNegative) });
        }
      }
    }
    return edges;
  }

  private randomWeight(allowNegative: boolean): number {
    const min = allowNegative ? -3 : 1;
    const max = 9;
    let w = Math.floor(Math.random() * (max - min + 1)) + min;
    if (w === 0) w = 1;
    if (!allowNegative && w < 0) w = Math.abs(w);
    return w;
  }

  private buildMatrix(nodes: GraphNode[], edges: GraphEdge[]): number[][] {
    const n = nodes.length;
    const matrix = Array.from({ length: n }, () => Array.from({ length: n }, () => Infinity));
    for (let i = 0; i < n; i++) matrix[i][i] = 0;
    const idToIndex = new Map(nodes.map((n, idx) => [n.id, idx]));
    for (const edge of edges) {
      const r = idToIndex.get(edge.from);
      const c = idToIndex.get(edge.to);
      if (r === undefined || c === undefined) continue;
      matrix[r][c] = edge.weight;
    }
    return matrix;
  }

  private computeShortestPaths(algo: GraphAlgorithm, sourceId: string): ShortestPathResult {
    if (algo === 'bellman') return this.computeBellmanFord(sourceId);
    return this.computeDijkstra(sourceId);
  }

  private adjacencyList(): Record<string, { to: string; weight: number }[]> {
    const adj: Record<string, { to: string; weight: number }[]> = {};
    for (const node of this.nodes) {
      adj[node.id] = [];
    }
    for (const edge of this.edges) {
      adj[edge.from].push({ to: edge.to, weight: edge.weight });
    }
    return adj;
  }

  private computeDijkstra(sourceId: string): ShortestPathResult {
    const adj = this.adjacencyList();
    const dist: Record<string, number> = {};
    const pred: Record<string, string | null> = {};
    const visited: Record<string, boolean> = {};
    for (const node of this.nodes) {
      dist[node.id] = Infinity;
      pred[node.id] = null;
      visited[node.id] = false;
    }
    dist[sourceId] = 0;
    for (let i = 0; i < this.nodes.length; i++) {
      let u: string | null = null;
      let best = Infinity;
      for (const node of this.nodes) {
        if (!visited[node.id] && dist[node.id] < best) {
          best = dist[node.id];
          u = node.id;
        }
      }
      if (!u) break;
      visited[u] = true;
      for (const edge of adj[u]) {
        if (dist[u] + edge.weight < dist[edge.to]) {
          dist[edge.to] = dist[u] + edge.weight;
          pred[edge.to] = u;
        }
      }
    }
    return { dist, pred };
  }

  private computeBellmanFord(sourceId: string): ShortestPathResult {
    const dist: Record<string, number> = {};
    const pred: Record<string, string | null> = {};
    for (const node of this.nodes) {
      dist[node.id] = Infinity;
      pred[node.id] = null;
    }
    dist[sourceId] = 0;
    const edges = this.edges;
    const V = this.nodes.length;
    for (let i = 0; i < V - 1; i++) {
      let updated = false;
      for (const edge of edges) {
        if (dist[edge.from] !== Infinity && dist[edge.from] + edge.weight < dist[edge.to]) {
          dist[edge.to] = dist[edge.from] + edge.weight;
          pred[edge.to] = edge.from;
          updated = true;
        }
      }
      if (!updated) break;
    }
    return { dist, pred };
  }

  private computeFloydArtifacts(): { distStages: number[][][]; parentStages: (string | null)[][][] } {
    const n = this.nodes.length;
    const distStages: number[][][] = [];
    const parentStages: (string | null)[][][] = [];
    distStages.push(this.matrix.map((row) => row.slice()));
    const initialParents = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => {
        if (i === j) return null;
        return this.matrix[i][j] !== Infinity ? this.nodes[i].id : null;
      })
    );
    parentStages.push(initialParents);
    let current = this.matrix.map((row) => row.slice());
    let currentParents = initialParents.map((row) => row.slice());
    for (let k = 0; k < n; k++) {
      const next = current.map((row) => row.slice());
      const nextParents = currentParents.map((row) => row.slice());
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          const throughK = current[i][k] + current[k][j];
          if (current[i][k] !== Infinity && current[k][j] !== Infinity && throughK < current[i][j]) {
            next[i][j] = throughK;
            nextParents[i][j] = currentParents[k][j];
          }
        }
      }
      distStages.push(next);
      parentStages.push(nextParents);
      current = next;
      currentParents = nextParents;
    }
    return { distStages, parentStages };
  }

  private initUserFloydStages(): number[][][] {
    const stages: number[][][] = [];
    for (let k = 0; k < this.floydStages.length; k++) {
      const base = this.floydStages[k];
      stages.push(base.map((row) => row.map((val) => (k === 0 ? val : NaN))));
    }
    return stages;
  }

  private initUserFloydParentStages(): string[][][] {
    const stages: string[][][] = [];
    for (let k = 0; k < this.floydParentStages.length; k++) {
      const base = this.floydParentStages[k];
      stages.push(
        base.map((row) =>
          row.map((val) => {
            if (k === 0 && val) return this.labelFor(val);
            return '';
          })
        )
      );
    }
    return stages;
  }

  private parseUserNumber(raw: string | number | null | undefined): number {
    if (raw === Infinity) return Infinity;
    if (raw === null || raw === undefined) return NaN;
    const value = typeof raw === 'number' ? raw : raw.toString().trim().toLowerCase();
    if (value === 'inf' || value === '∞') return Infinity;
    const num = Number(value);
    if (Number.isNaN(num)) return NaN;
    return num;
  }

  displayFloydValue(value: number): string {
    if (Number.isNaN(value)) return '';
    if (value === Infinity) return '∞';
    return `${value}`;
  }

  displayParentValue(value: string | null | undefined): string {
    if (!value) return '';
    return this.labelFor(value);
  }

  trackByIndex(index: number): number {
    return index;
  }

  labelFor(id: string): string {
    return this.nodes.find((n) => n.id === id)?.label ?? id;
  }

  edgeLabel(edge: GraphEdge): string {
    return `${this.labelFor(edge.from)} → ${this.labelFor(edge.to)} (${edge.weight})`;
  }

  private labelToId(label: string): string | null {
    if (!label) return null;
    const upper = label.trim().toUpperCase();
    const found = this.nodes.find((n) => n.label.toUpperCase() === upper);
    return found?.id ?? null;
  }

  private initBellmanNotes(): void {
    if (this.algorithm !== 'bellman') return;
    for (const node of this.nodes) {
      this.bellmanLeft[node.id] = this.bellmanLeft[node.id] ?? '';
      this.bellmanRight[node.id] = this.bellmanRight[node.id] ?? '';
    }
  }

  private initCanvas(): void {
    this.graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });
    const el = this.canvasRef.nativeElement;
    const width = this.canvasSize.width;
    const height = this.canvasSize.height;
    this.paper = new joint.dia.Paper({
      el,
      model: this.graph,
      width,
      height,
      async: true,
      sorting: joint.dia.Paper.sorting.APPROX,
      cellViewNamespace: joint.shapes,
      background: { color: 'transparent' },
      gridSize: 1,
      interactive: {
        elementMove: false,
        linkMove: false,
        vertexAdd: false,
        vertexMove: false,
        arrowheadMove: false,
      },
    });
  }

  private renderGraph(): void {
    if (!this.graph) return;
    this.graph.clear();
    this.centerGraph();
    this.jointIdToNode = {};
    const reverseSet = new Set(this.edges.map((e) => `${e.to}-${e.from}`));
    const ns: Record<string, joint.dia.Element> = {};
    for (const node of this.nodes) {
      const shape = new joint.shapes.standard.Circle({
        position: { x: node.x, y: node.y },
        size: { width: 40, height: 40 },
        attrs: {
          body: {
            fill: 'rgba(79, 70, 229, 0.35)',
            stroke: 'rgba(129, 140, 248, 0.8)',
            strokeWidth: 2,
          },
          label: {
            text: node.label,
            fill: '#f8fafc',
            fontSize: 13,
            fontWeight: '800',
          },
        },
      });
      shape.addTo(this.graph);
      this.jointIdToNode[shape.id.toString()] = node.id;
      ns[node.id] = shape;
    }
    if (this.algorithm === 'bellman') {
      for (const node of this.nodes) {
        const leftVal = this.bellmanLeft[node.id];
        const rightVal = this.bellmanRight[node.id];
        if (leftVal) {
          const leftLabel = new joint.shapes.standard.Rectangle({
            position: { x: node.x - 30, y: node.y - 10 },
            size: { width: 22, height: 18 },
            attrs: {
              body: { fill: 'rgba(15,23,42,0.7)', stroke: '#f59e0b', strokeWidth: 1, rx: 5, ry: 5 },
              label: { text: leftVal, fill: '#f8fafc', fontSize: 11, fontWeight: '800' },
              root: { pointerEvents: 'none' },
            },
          });
          leftLabel.addTo(this.graph);
        }
        if (rightVal) {
          const rightLabel = new joint.shapes.standard.Rectangle({
            position: { x: node.x + 14, y: node.y - 10 },
            size: { width: 22, height: 18 },
            attrs: {
              body: { fill: 'rgba(15,23,42,0.7)', stroke: '#38bdf8', strokeWidth: 1, rx: 5, ry: 5 },
              label: { text: rightVal, fill: '#f8fafc', fontSize: 11, fontWeight: '800' },
              root: { pointerEvents: 'none' },
            },
          });
          rightLabel.addTo(this.graph);
        }
      }
    }
    for (const edge of this.edges) {
      const reverse = reverseSet.has(`${edge.from}-${edge.to}`) && reverseSet.has(`${edge.to}-${edge.from}`);
      const verts = reverse ? this.curvedVertices(edge.from, edge.to) : undefined;
      const link = new joint.shapes.standard.Link({
        source: { id: ns[edge.from].id },
        target: { id: ns[edge.to].id },
        vertices: verts,
        connectionPoint: { name: 'boundary' },
        attrs: {
          line: {
            stroke: '#cbd5e1',
            strokeWidth: 2,
            strokeLinejoin: 'round',
            targetMarker: {
              type: 'path',
              d: 'M 10 -5 L 0 0 L 10 5 z',
              fill: '#cbd5e1',
              stroke: '#cbd5e1',
              strokeWidth: 1,
              refX: 12,
            },
            connector: { name: 'rounded' },
          },
          wrapper: { cursor: 'default' },
        },
        labels: [
          {
            position: 0.5,
            attrs: {
              text: { text: `${edge.weight}`, fill: '#0f172a', fontWeight: '800', fontSize: 11 },
              body: {
                fill: '#fde68a',
                stroke: '#f59e0b',
                strokeWidth: 1,
                rx: 8,
                ry: 8,
                padding: 4,
              },
            },
          },
        ],
      });
      link.addTo(this.graph);
    }
    this.centerGraph();
  }

  private updateCanvasSize(): void {
    if (!this.canvasRef?.nativeElement) return;
    const el = this.canvasRef.nativeElement;
    const width = el.clientWidth || 620;
    const height = el.clientHeight || 360;
    this.canvasSize = { width, height };
    if (this.paper) {
      this.paper.setDimensions(width, height);
    }
  }

  private centerGraph(): void {
    if (!this.paper || !this.graph) return;
    const cells = this.graph.getCells();
    if (!cells.length) return;
    const bbox = this.graph.getBBox();
    if (!bbox) return;
    const tx = (this.canvasSize.width - bbox.width) / 2 - bbox.x;
    const ty = (this.canvasSize.height - bbox.height) / 2 - bbox.y;
    this.currentTranslate = { x: tx, y: ty };
    this.paper.translate(tx, ty);
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateCanvasSize();
    if (this.mounted) {
      this.nodes = this.buildNodes(this.nodes.length || this.minNodes);
      this.renderGraph();
    }
  }

  private curvedVertices(from: string, to: string): { x: number; y: number }[] {
    const a = this.nodes.find((n) => n.id === from);
    const b = this.nodes.find((n) => n.id === to);
    if (!a || !b) return [];
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const norm = Math.sqrt(dx * dx + dy * dy) || 1;
    const offset = 20;
    return [{ x: mx - (dy / norm) * offset, y: my + (dx / norm) * offset }];
  }

  private handleNodeClick(model: joint.dia.Element): void {
    if (this.algorithm !== 'bellman') return;
    const nodeId = this.jointIdToNode[model.id.toString()];
    if (!nodeId) return;
    const current = `${this.bellmanLeft[nodeId] ?? ''},${this.bellmanRight[nodeId] ?? ''}`.replace(/^,/, '');
    const input = window.prompt('Inserisci "numero,lettera" (es. 3,B)', current);
    if (input === null) return;
    const [numRaw, letterRaw] = input.split(',').map((p) => p.trim());
    this.bellmanLeft[nodeId] = numRaw ?? '';
    this.bellmanRight[nodeId] = (letterRaw ?? '').toUpperCase();
    this.renderGraph();
  }

  private attachWheel(): void {
    this.canvasRef.nativeElement.addEventListener('wheel', this.handleWheel, { passive: false });
    document.addEventListener('pointermove', this.handlePanMove);
    document.addEventListener('pointerup', this.handlePanEnd);
  }

  private handleWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    this.zoom = Math.min(2.2, Math.max(0.4, this.zoom + delta));
    this.paper.scale(this.zoom, this.zoom);
  };

  private startPan(evt: PointerEvent): void {
    this.panStart = { x: evt.clientX, y: evt.clientY };
    this.panOrigin = { ...this.currentTranslate };
  }

  private handlePanMove = (evt: PointerEvent): void => {
    if (!this.panStart) return;
    const dx = (evt.clientX - this.panStart.x) / this.zoom;
    const dy = (evt.clientY - this.panStart.y) / this.zoom;
    const tx = this.panOrigin.x + dx;
    const ty = this.panOrigin.y + dy;
    this.currentTranslate = { x: tx, y: ty };
    this.paper.translate(tx, ty);
  };

  private handlePanEnd = (): void => {
    this.panStart = null;
  };
}
