import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as joint from 'jointjs';
import { LabSessionApiService } from '../../../core/services/lab-session-api';

interface HuffmanLeaf {
  symbol: string;
  frequency: number;
}

interface HuffmanNode {
  id: string;
  label: string | null;
  value: number;
  x: number;
  y: number;
  parentId: string | null;
  leftId: string | null;
  rightId: string | null;
  edgeWeight?: '0' | '1' | null;
  isGenerated: boolean;
}

interface HuffmanSnapshot {
  nodes: HuffmanNode[];
  selectedNodeIds: string[];
  letterCodes: Record<string, string>;
  userBits: UserBitAnswers;
  hints: HintState;
}

interface UserBitAnswers {
  huffmanBits: string;
  fixedBits: string;
  savings: string;
}

interface HintState {
  codes: boolean;
  bits: boolean;
}

interface HuffmanExercise {
  totalCharacters: number;
  letters: HuffmanLeaf[];
}

interface HuffmanSessionScenario {
  exercise: HuffmanExercise;
}

interface HuffmanValidationResponse {
  message: string;
  awardedCodes: boolean;
  awardedBits: boolean;
  treeReady: boolean;
  optimal: boolean;
}

function buildReferenceCodes(exercise: HuffmanExercise): Record<string, string> {
  type HuffmanAlgoNode = {
    symbol: string | null;
    frequency: number;
    left?: HuffmanAlgoNode;
    right?: HuffmanAlgoNode;
    order: number;
  };
  const queue: HuffmanAlgoNode[] = exercise.letters.map((leaf, idx) => ({
    symbol: leaf.symbol,
    frequency: leaf.frequency,
    order: idx,
  }));
  let order = queue.length;
  while (queue.length > 1) {
    queue.sort((a, b) => a.frequency - b.frequency || a.order - b.order);
    const left = queue.shift()!;
    const right = queue.shift()!;
    queue.push({
      symbol: null,
      frequency: left.frequency + right.frequency,
      left,
      right,
      order: order++,
    });
  }
  const root = queue[0];
  const codes: Record<string, string> = {};
  const dfs = (node: HuffmanAlgoNode | null, prefix: string) => {
    if (!node) return;
    if (node.symbol) {
      codes[node.symbol] = prefix || '0';
      return;
    }
    if (node.left) dfs(node.left, `${prefix}0`);
    if (node.right) dfs(node.right, `${prefix}1`);
  };
  dfs(root, '');
  return codes;
}

function computeReferenceBits(exercise: HuffmanExercise, codes: Record<string, string>): number {
  let total = 0;
  for (const letter of exercise.letters) {
    const code = codes[letter.symbol];
    if (!code) {
      throw new Error(`Codice mancante per ${letter.symbol}`);
    }
    total += code.length * letter.frequency;
  }
  return total;
}

@Component({
  selector: 'app-huffman-builder',
  standalone: true,
  templateUrl: './huffman-builder.html',
  styleUrl: './huffman-builder.scss',
  imports: [NgFor, NgIf, FormsModule,CommonModule],
})
export class HuffmanBuilderComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLDivElement>;
  graph!: joint.dia.Graph;
  paper!: joint.dia.Paper;
  private exercise!: HuffmanExercise;
  private referenceBits = 0;
  nodes: HuffmanNode[] = [];
  selectedNodeIds: string[] = [];
  private stickyParentId: string | null = null;
  message = '';
  letterCodes: Record<string, string> = {};
  userBits: UserBitAnswers = { huffmanBits: '', fixedBits: '', savings: '' };
  hintState: HintState = { codes: false, bits: false };
  undoStack: HuffmanSnapshot[] = [];
  redoStack: HuffmanSnapshot[] = [];
  private initialized = false;
  private autoFitPending = true;
  private isPanning = false;
  private panStart = { x: 0, y: 0 };
  private panOrigin = { x: 0, y: 0 };
  private paperScale = 1;
  private readonly wheelListener = (event: WheelEvent) => this.handleWheel(event);
  private readonly pointerMoveListener = (event: PointerEvent) => this.handlePointerMove(event);
  private readonly pointerUpListener = () => this.stopPanning();
  private sessionId: string | null = null;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private themeObserver?: MutationObserver;

  constructor(private labSessionApi: LabSessionApiService) {}

  ngAfterViewInit(): void {
    this.initCanvas();
    this.initialized = true;
    this.resetExercise(true);
    this.observeTheme();
  }

  ngOnDestroy(): void {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
    (this.paper as any)?.remove?.();
    this.graph?.clear();
    this.canvasRef.nativeElement.removeEventListener('wheel', this.wheelListener);
    window.removeEventListener('pointermove', this.pointerMoveListener);
    window.removeEventListener('pointerup', this.pointerUpListener);
    this.themeObserver?.disconnect();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {
    if (event.key.toLowerCase() === 'z' && event.ctrlKey && !event.shiftKey) {
      event.preventDefault();
      this.undo();
    }
    if (event.key.toLowerCase() === 'z' && event.ctrlKey && event.shiftKey) {
      event.preventDefault();
      this.redo();
    }
  }

  get leaves(): HuffmanLeaf[] {
    return this.exercise?.letters ?? [];
  }

  get totalCharacters(): number {
    return this.exercise?.totalCharacters ?? 0;
  }

  get selectedNodes(): HuffmanNode[] {
    return this.selectedNodeIds.map((id) => this.nodes.find((node) => node.id === id)).filter(Boolean) as HuffmanNode[];
  }

  get canMerge(): boolean {
    return this.selectedNodes.length === 2 && this.selectedNodes.every((node) => node.parentId === null);
  }

  get selectedGeneratedParent(): HuffmanNode | null {
    const explicit = this.selectedNodes.find((node) => node.isGenerated) ?? null;
    if (explicit) {
      return explicit;
    }
    if (this.stickyParentId) {
      return this.nodes.find((n) => n.id === this.stickyParentId && n.isGenerated) ?? null;
    }
    return null;
  }

  get childrenOfSelectedParent(): HuffmanNode[] {
    const parent = this.selectedGeneratedParent ?? (this.stickyParentId ? this.nodes.find((n) => n.id === this.stickyParentId) ?? null : null);
    if (!parent) return [];
    return this.nodes.filter((node) => node.parentId === parent.id);
  }

  toggleHint(type: keyof HintState): void {
    this.hintState = { ...this.hintState, [type]: !this.hintState[type] };
  }

  resetExercise(randomize = false): void {
    void randomize;
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
    this.labSessionApi
      .startSession<HuffmanSessionScenario, HuffmanValidationResponse>({
        labType: 'huffman',
        variant: 'huffman-builder',
      })
      .subscribe((response) => {
        this.sessionId = response.sessionId;
        this.exercise = response.scenario.exercise;
        const codes = buildReferenceCodes(this.exercise);
        this.referenceBits = computeReferenceBits(this.exercise, codes);
        this.pushSnapshot(true);
        this.nodes = this.exercise.letters.map((leaf, index) => ({
          id: crypto.randomUUID(),
          label: leaf.symbol,
          value: leaf.frequency,
          x: 60 + index * 120,
          y: 420,
          parentId: null,
          leftId: null,
          rightId: null,
          isGenerated: false,
          edgeWeight: null,
        }));
        this.selectedNodeIds = [];
        this.letterCodes = Object.fromEntries(this.exercise.letters.map((leaf) => [leaf.symbol, '']));
        this.userBits = { huffmanBits: '', fixedBits: '', savings: '' };
        this.hintState = { codes: false, bits: false };
        this.undoStack = [];
        this.redoStack = [];
        this.message = response.result?.message ?? 'Collega i nodi per costruire il tuo albero di Huffman.';
        this.autoFitPending = true;
        this.renderGraph();
      });
  }

  toggleSelection(id: string): void {
    const node = this.nodes.find((n) => n.id === id);
    if (!node) return;
    const alreadySelected = this.selectedNodeIds.includes(id);
    if (alreadySelected) {
      this.selectedNodeIds = this.selectedNodeIds.filter((nid) => nid !== id);
    } else {
      if (this.selectedNodeIds.length >= 2) {
        const removedId = this.selectedNodeIds.shift()!;
        if (removedId === this.stickyParentId) {
          this.stickyParentId = null;
        }
      }
      this.selectedNodeIds = [...this.selectedNodeIds, id];
    }
    const lastGenerated = [...this.selectedNodeIds]
      .reverse()
      .map((nid) => this.nodes.find((n) => n.id === nid))
      .find((n) => n?.isGenerated);
    this.stickyParentId = lastGenerated ? lastGenerated.id : null;

    this.renderGraph();
  }

  mergeSelection(): void {
    if (!this.canMerge) {
      this.message = 'Seleziona due nodi liberi (senza collegamenti in ingresso).';
      return;
    }
    const [first, second] = this.selectedNodes;
    this.pushSnapshot();
    const parent: HuffmanNode = {
      id: crypto.randomUUID(),
      label: null,
      value: first.value + second.value,
      x: (first.x + second.x) / 2,
      y: Math.min(first.y, second.y) - 120,
      parentId: null,
      leftId: first.id,
      rightId: second.id,
      isGenerated: true,
    };
    first.parentId = parent.id;
    first.edgeWeight = null;
    second.parentId = parent.id;
    second.edgeWeight = null;
    this.nodes = [...this.nodes, parent];
    this.selectedNodeIds = [];
    this.message = 'Padre creato. Assegna i pesi agli archi e continua.';
    this.stickyParentId = parent.id;
    this.renderGraph();
    this.queueDraftSync();
  }

  exportHuffmanSummary(): void {
    const optimalCodes = this.getOptimalCodes();
    if (!optimalCodes) {
      this.message = 'Completa l\'albero collegando sempre i pesi minori prima di esportare.';
      return;
    }
    const huffmanBits = this.computeHuffmanBits(optimalCodes);
    if (huffmanBits === null) {
      this.message = 'Impossibile calcolare i bit per l\'albero corrente.';
      return;
    }
    const fixedBits = this.computeFixedBits();
    const NODE_WIDTH = 110;
    const NODE_HEIGHT = 70;
    const TREE_PADDING = 60;
    const SUMMARY_GAP = 40;
    const SUMMARY_WIDTH = 420;
    const ROW_SPACING = 26;
    const minX = Math.min(...this.nodes.map((node) => node.x));
    const minY = Math.min(...this.nodes.map((node) => node.y));
    const maxX = Math.max(...this.nodes.map((node) => node.x + NODE_WIDTH));
    const maxY = Math.max(...this.nodes.map((node) => node.y + NODE_HEIGHT));
    const treeWidth = maxX - minX + TREE_PADDING * 2;
    const treeHeight = maxY - minY + TREE_PADDING * 2;
    const summaryX = treeWidth + SUMMARY_GAP;
    const tableStartY = TREE_PADDING + 60;
    const tableHeight = ROW_SPACING * this.leaves.length;
    const summaryHeight = tableStartY + tableHeight + 180;
    const svgWidth = treeWidth + SUMMARY_GAP + SUMMARY_WIDTH;
    const svgHeight = Math.max(treeHeight, summaryHeight + TREE_PADDING);
    const offsetX = TREE_PADDING - minX;
    const offsetY = TREE_PADDING - minY;
    const linkStroke = this.isLightTheme() ? '#0f172a' : '#ffffff';
    const linkLabelColor = this.isLightTheme() ? '#0f172a' : '#c084fc';
    const linkElements = this.nodes
      .filter((node) => node.parentId)
      .map((child) => {
        const parent = this.nodes.find((n) => n.id === child.parentId);
        if (!parent) return '';
        const x1 = parent.x + offsetX + NODE_WIDTH / 2;
        const y1 = parent.y + offsetY + NODE_HEIGHT;
        const x2 = child.x + offsetX + NODE_WIDTH / 2;
        const y2 = child.y + offsetY;
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2 - 6;
        const weightLabel = child.edgeWeight
          ? `<text x="${midX}" y="${midY}" fill="${linkLabelColor}" font-size="16" font-weight="700" text-anchor="middle" font-family="JetBrains Mono">${child.edgeWeight}</text>`
          : '';
        return `
          <g>
            <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${linkStroke}" stroke-width="4" stroke-linecap="round"/>
            ${weightLabel}
          </g>`;
      })
      .join('');
    const nodeElements = this.nodes
      .map((node) => {
        const x = node.x + offsetX;
        const y = node.y + offsetY;
        const fill = node.label ? 'rgba(37,99,235,0.25)' : 'rgba(15,23,42,0.85)';
        const stroke = node.isGenerated ? '#c084fc' : '#334155';
        const text = node.label ? `${node.label} · ${node.value}` : `${node.value}`;
        return `
          <g>
            <rect x="${x}" y="${y}" width="${NODE_WIDTH}" height="${NODE_HEIGHT}" rx="16" ry="16" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
            <text x="${x + NODE_WIDTH / 2}" y="${y + NODE_HEIGHT / 2 + 6}" fill="#f8fafc" text-anchor="middle" font-size="14" font-family="Poppins">${text}</text>
          </g>`;
      })
      .join('');
    const summaryRows = this.exercise.letters
      .map((letter, idx) => {
        const rowY = tableStartY + idx * ROW_SPACING;
        return `
          <g>
            <text x="${summaryX}" y="${rowY}" fill="#e2e8f0" font-size="14" font-family="JetBrains Mono">${letter.symbol.toUpperCase()}</text>
            <text x="${summaryX + 80}" y="${rowY}" fill="#94a3b8" font-size="14" font-family="JetBrains Mono">${letter.frequency}</text>
            <text x="${summaryX + 220}" y="${rowY}" fill="#c084fc" font-size="14" font-weight="700" font-family="JetBrains Mono">${optimalCodes[letter.symbol]}</text>
          </g>`;
      })
      .join('');
    const bitsStartY = tableStartY + tableHeight + 40;
    const bitsSummary = `
      <g>
        <text x="${summaryX}" y="${bitsStartY}" fill="#fbbf24" font-size="16" font-family="Poppins">Calcolo dei bit</text>
        <text x="${summaryX}" y="${bitsStartY + 28}" fill="#94a3b8" font-size="14" font-family="JetBrains Mono">Bit Huffman: ${huffmanBits}</text>
        <text x="${summaryX}" y="${bitsStartY + 52}" fill="#94a3b8" font-size="14" font-family="JetBrains Mono">Bit lunghezza fissa: ${fixedBits}</text>
        <text x="${summaryX}" y="${bitsStartY + 76}" fill="#94a3b8" font-size="14" font-family="JetBrains Mono">Risparmio: ${fixedBits - huffmanBits}</text>
      </g>`;
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
        <rect width="100%" height="100%" fill="#0f172a"/>
        ${linkElements}
        ${nodeElements}
        <text x="${summaryX}" y="${TREE_PADDING}" fill="#fbbf24" font-size="18" font-family="Poppins">Lettere · Frequenze · Codici</text>
        ${summaryRows}
        ${bitsSummary}
      </svg>`;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'huffman-summary.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  detachGeneratedNode(): void {
    const target = this.selectedGeneratedParent;
    if (!target) {
      this.message = 'Seleziona un nodo padre da rimuovere.';
      return;
    }
    if (!this.canRemoveGeneratedNode(target)) {
      this.message = 'Non puoi eliminare questo nodo: il suo padre è generato.';
      return;
    }
    this.pushSnapshot();
    const children = this.nodes.filter((node) => node.parentId === target.id);
    children.forEach((child) => this.detachFromParent(child, false));
    this.nodes = this.nodes.filter((node) => node.id !== target.id);
    this.cleanupOrphanParents();
    this.selectedNodeIds = [];
    if (this.stickyParentId === target.id) {
      this.stickyParentId = null;
    }
    this.message = 'Nodo padre rimosso.';
    this.renderGraph();
    this.queueDraftSync();
  }

  autoLayoutTree(): void {
    if (!this.nodes.length) {
      return;
    }
    this.pushSnapshot();
    const nodeMap = new Map(this.nodes.map((node) => [node.id, node]));
    const childrenMap = new Map<string, HuffmanNode[]>();
    this.nodes.forEach((node) => {
      if (!node.parentId) return;
      const list = childrenMap.get(node.parentId) ?? [];
      list.push(node);
      childrenMap.set(node.parentId, list);
    });
    const roots = this.nodes.filter((node) => node.parentId === null);
    const levels = new Map<number, HuffmanNode[]>();
    const xPosition = new Map<string, number>();
    let nextX = 0;
    const traverse = (node: HuffmanNode | undefined, depth: number) => {
      if (!node) return;
      const bucket = levels.get(depth) ?? [];
      bucket.push(node);
      levels.set(depth, bucket);
      const children = childrenMap.get(node.id) ?? [];
      if (children.length === 0) {
        xPosition.set(node.id, nextX++);
      } else {
        children.forEach((child) => traverse(child, depth + 1));
        const childPositions = children.map((child) => xPosition.get(child.id) ?? 0);
        const avg = childPositions.reduce((sum, pos) => sum + pos, 0) / childPositions.length;
        xPosition.set(node.id, avg);
      }
    };
    roots.forEach((root) => traverse(root, 0));
    const stageWidth = this.canvasRef.nativeElement.clientWidth || 960;
    const totalLeaves = Math.max(1, nextX - 1);
    const spacing = stageWidth / (totalLeaves + 1);
    levels.forEach((nodes, depth) => {
      nodes.forEach((node) => {
        const x = xPosition.has(node.id) ? xPosition.get(node.id)! : nextX++;
        node.x = spacing * (x + 1) - 55;
        node.y = 80 + depth * 120;
      });
    });
    this.message = 'Albero formattato automaticamente.';
    this.autoFitPending = true;
    this.renderGraph();
    this.queueDraftSync();
  }

  setEdgeWeight(childId: string, weight: '0' | '1'): void {
    const child = this.nodes.find((node) => node.id === childId);
    if (!child) return;
    this.pushSnapshot();
    child.edgeWeight = weight;
    this.selectedNodeIds = [];
    this.renderGraph();
    this.queueDraftSync();
  }

  submitCodes(): void {
    this.syncWithServer('codes');
  }

  submitBitAnswers(): void {
    this.syncWithServer('bits');
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

  private syncWithServer(eventType: 'draft' | 'codes' | 'bits'): void {
    if (!this.sessionId) {
      return;
    }
    this.labSessionApi
      .submitStep<HuffmanValidationResponse>(this.sessionId, {
        eventType,
        payload: {
          nodes: this.nodes.map((node) => ({ ...node })),
          letterCodes: { ...this.letterCodes },
          userBits: { ...this.userBits },
        },
      })
      .subscribe((response) => {
        this.message = response.result?.message ?? this.message;
      });
  }

  undo(): void {
    if (!this.undoStack.length) return;
    const snapshot = this.undoStack.pop()!;
    this.redoStack.push(this.serializeSnapshot());
    this.restoreSnapshot(snapshot);
    this.renderGraph();
  }

  redo(): void {
    if (!this.redoStack.length) return;
    const snapshot = this.redoStack.pop()!;
    this.undoStack.push(this.serializeSnapshot());
    this.restoreSnapshot(snapshot);
    this.renderGraph();
  }

  private initCanvas(): void {
    this.graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });
    const { clientWidth, clientHeight } = this.canvasRef.nativeElement;
    const width = clientWidth || 960;
    const height = clientHeight || 520;
    this.paper = new joint.dia.Paper({
      el: this.canvasRef.nativeElement,
      model: this.graph,
      width,
      height,
      drawGrid: false,
      background: { color: 'transparent' },
      async: true,
      cellViewNamespace: joint.shapes,
      interactive: (cellView) => {
        const model = (cellView as any)?.model as joint.dia.Cell | undefined;
        return Boolean((model as joint.dia.Element)?.isElement?.() ?? false);
      },
    });
    this.paper.on('element:pointerclick', (view: joint.dia.ElementView) => {
      const nodeId = (view as any)?.model?.id?.toString();
      if (nodeId) {
        this.toggleSelection(nodeId);
      }
    });
    this.paper.on('element:pointerup', (view: joint.dia.ElementView) => {
      const model = (view as any)?.model as joint.dia.Element | undefined;
      const nodeId = model?.id?.toString();
      if (!nodeId || !model) return;
      const position = model.position();
      const node = this.nodes.find((n) => n.id === nodeId);
      if (node) {
        node.x = position.x;
        node.y = position.y;
      }
    });
    this.paper.on('blank:pointerdown', (evt: joint.dia.Event) => this.startPanning(evt as PointerEvent));
    this.canvasRef.nativeElement.addEventListener('wheel', this.wheelListener, { passive: false });
    window.addEventListener('pointermove', this.pointerMoveListener);
    window.addEventListener('pointerup', this.pointerUpListener);
  }

  private renderGraph(): void {
    if (!this.initialized) return;
    const linkStroke = this.isLightTheme() ? '#0f172a' : '#ffffff';
    const linkLabelColor = this.isLightTheme() ? '#0f172a' : '#c084fc';
    const linkLabelBg = this.isLightTheme() ? '#ffffff' : 'rgba(15,23,42,0.9)';
    const activeNodeIds = new Set<string>();
    this.nodes.forEach((node) => {
      let rect = this.graph.getCell(node.id) as joint.dia.Element | joint.dia.Link | null;
      let created = false;
      if (!rect) {
        rect = new joint.shapes.standard.Rectangle({ id: node.id });
        rect.resize(110, 70);
        rect.addTo(this.graph);
        created = true;
      }
      rect.position(node.x, node.y);
      rect.attr({
        body: {
          fill: node.label ? 'rgba(37, 99, 235, 0.25)' : 'rgba(15, 23, 42, 0.8)',
          stroke: this.selectedNodeIds.includes(node.id) ? '#fbbf24' : '#64748b',
          strokeWidth: this.selectedNodeIds.includes(node.id) ? 3 : 1.5,
          rx: 16,
          ry: 16,
        },
        label: {
          text: node.label ? `${node.label} · ${node.value}` : `${node.value}`,
          fill: '#f8fafc',
          fontSize: 14,
          fontFamily: 'Poppins, sans-serif',
        },
      });
      if (node.isGenerated) {
        const view = this.paper.findViewByModel(rect);
        if (view) {
          const removeTool = new joint.elementTools.Remove({
            rotate: false,
            action: () => this.removeGeneratedNode(node.id),
            offset: { x: 5, y: 5 },
          });
          const toolsView = new joint.dia.ToolsView({ tools: [removeTool] });
          if (created || !(view as any)._hasRemoveTool) {
            (view as any).addTools?.(toolsView);
            (view as any).hideTools?.();
            (view as any).on?.('element:pointerenter', () => (view as any).showTools?.());
            (view as any).on?.('element:pointerleave', () => (view as any).hideTools?.());
            (view as any)._hasRemoveTool = true;
          }
        }
      }
      activeNodeIds.add(node.id);
    });
    this.graph
      .getCells()
      .filter((cell) => cell.isElement() && !activeNodeIds.has(cell.id.toString()))
      .forEach((cell) => cell.remove());

    const activeLinkIds = new Set<string>();
    this.nodes.forEach((node) => {
      if (!node.parentId) return;
      const linkId = `link-${node.parentId}-${node.id}`;
      let link = this.graph.getCell(linkId) as joint.shapes.standard.Link | null;
      if (!link) {
        link = new joint.shapes.standard.Link({
          id: linkId,
          source: { id: node.parentId },
          target: { id: node.id },
        });
        link.attr({
          line: {
            stroke: linkStroke,
            strokeWidth: 4,
          },
        });
        link.addTo(this.graph);
      } else {
        link.source({ id: node.parentId });
        link.target({ id: node.id });
        link.attr({
          line: {
            stroke: linkStroke,
            strokeWidth: 4,
          },
        });
      }
      link.labels([]);
      if (node.edgeWeight) {
        link.appendLabel({
          attrs: {
              text: {
              text: node.edgeWeight,
              fill: linkLabelColor,
              fontSize: 16,
              fontWeight: '700',
            },
            rect: {
              fill: linkLabelBg,
            },
          },
          position: { distance: 0.5 },
        });
      }
      activeLinkIds.add(linkId);
    });
    this.graph
      .getCells()
      .filter((cell) => cell.isLink() && !activeLinkIds.has(cell.id.toString()))
      .forEach((cell) => cell.remove());

    if (this.autoFitPending) {
      setTimeout(() => {
        if (!this.paper) return;
        this.paper.scaleContentToFit({ padding: 60 });
        this.paperScale = this.paper.scale().sx;
        this.alignGraphBottom();
        this.autoFitPending = false;
      });
    }
  }

  private alignGraphBottom(): void {
    if (!this.paper || !this.graph) return;
    const bbox = this.graph.getBBox();
    if (!bbox) return;
    const scale = this.paper.scale().sx;
    const { clientWidth, clientHeight } = this.canvasRef.nativeElement;
    const padding = 24;
    const centerX = clientWidth / 2;
    const targetBottom = clientHeight - padding;
    const tx = centerX - (bbox.x + bbox.width / 2) * scale;
    const ty = targetBottom - (bbox.y + bbox.height) * scale;
    this.paper.translate(tx, ty);
    this.panOrigin = { x: tx, y: ty };
  }

  private computeActualCodes(): Record<string, string> | null {
    const root = this.nodes.find((node) => node.parentId === null && node.isGenerated);
    if (!root) {
      return null;
    }
    const codes: Record<string, string> = {};
    const dfs = (node: HuffmanNode, prefix: string) => {
      if (node.label) {
        codes[node.label] = prefix || '0';
        return;
      }
      const children = this.nodes.filter((child) => child.parentId === node.id);
      children.forEach((child) => {
        if (!child.edgeWeight) return;
        dfs(child, `${prefix}${child.edgeWeight}`);
      });
    };
    dfs(root, '');
    if (Object.keys(codes).length !== this.leaves.length) {
      return null;
    }
    return codes;
  }

  private computeHuffmanBits(codes: Record<string, string>): number | null {
    let total = 0;
    for (const letter of this.exercise.letters) {
      const code = codes[letter.symbol];
      if (!code) return null;
      total += code.length * letter.frequency;
    }
    return total;
  }

  private computeFixedBits(): number {
    const symbols = this.exercise.letters.length;
    const bitsPerSymbol = Math.ceil(Math.log2(symbols));
    return bitsPerSymbol * this.exercise.totalCharacters;
  }

  private detachFromParent(node: HuffmanNode, cleanup = true): void {
    if (!node.parentId) return;
    const parent = this.nodes.find((n) => n.id === node.parentId);
    if (parent) {
      if (parent.leftId === node.id) parent.leftId = null;
      if (parent.rightId === node.id) parent.rightId = null;
    }
    node.parentId = null;
    node.edgeWeight = null;
    if (cleanup) {
      this.removeParentIfOrphan(parent);
    }
  }

  private cleanupOrphanParents(): void {
    this.nodes
      .filter((node) => node.isGenerated)
      .forEach((node) => this.removeParentIfOrphan(node));
  }

  private removeParentIfOrphan(node: HuffmanNode | undefined | null): void {
    if (!node || !node.isGenerated) {
      return;
    }
    const hasChildren = this.nodes.some((child) => child.parentId === node.id);
    if (!hasChildren) {
      this.nodes = this.nodes.filter((n) => n.id !== node.id);
    }
  }

  private startPanning(evt: PointerEvent): void {
    this.isPanning = true;
    this.panStart = { x: evt.clientX, y: evt.clientY };
    this.canvasRef.nativeElement.classList.add('panning');
  }

  private isLightTheme(): boolean {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('theme-light');
  }

  private observeTheme(): void {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
    this.themeObserver = new MutationObserver(() => this.renderGraph());
    this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }

  private handlePointerMove(event: PointerEvent): void {
    if (!this.isPanning) return;
    const dx = event.clientX - this.panStart.x;
    const dy = event.clientY - this.panStart.y;
    this.paper.translate(this.panOrigin.x + dx, this.panOrigin.y + dy);
  }

  private stopPanning(): void {
    if (!this.isPanning) return;
    const current = this.paper.translate();
    this.panOrigin = { x: current.tx, y: current.ty };
    this.isPanning = false;
    this.canvasRef.nativeElement.classList.remove('panning');
  }

  private handleWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.05 : 0.05;
    const nextScale = Math.min(2, Math.max(0.6, this.paperScale + delta));
    this.paperScale = nextScale;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const ox = event.clientX - rect.left;
    const oy = event.clientY - rect.top;
    const currentTranslate = this.paper.translate();
    const scaleFactor = nextScale / this.paperScale;
    const tx = ox - scaleFactor * (ox - currentTranslate.tx);
    const ty = oy - scaleFactor * (oy - currentTranslate.ty);
    this.paper.scale(nextScale, nextScale);
    this.paper.translate(tx, ty);
    this.panOrigin = { x: tx, y: ty };
  }

  private removeGeneratedNode(nodeId: string): void {
    const target = this.nodes.find((node) => node.id === nodeId && node.isGenerated);
    if (!target) {
      return;
    }
    if (!this.canRemoveGeneratedNode(target)) {
      this.message = 'Non puoi eliminare questo nodo: il suo padre è generato.';
      return;
    }
    this.pushSnapshot();
    const children = this.nodes.filter((node) => node.parentId === target.id);
    children.forEach((child) => this.detachFromParent(child, false));
    this.nodes = this.nodes.filter((node) => node.id !== target.id);
    this.cleanupOrphanParents();
    this.selectedNodeIds = this.selectedNodeIds.filter((id) => id !== nodeId);
    this.message = 'Nodo padre rimosso.';
    this.renderGraph();
    this.queueDraftSync();
  }

  private pushSnapshot(skip = false): void {
    if (skip) return;
    this.undoStack.push(this.serializeSnapshot());
    if (this.undoStack.length > 200) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  private serializeSnapshot(): HuffmanSnapshot {
    return {
      nodes: this.nodes.map((node) => ({ ...node })),
      selectedNodeIds: [...this.selectedNodeIds],
      letterCodes: { ...this.letterCodes },
      userBits: { ...this.userBits },
      hints: { ...this.hintState },
    };
  }

  private restoreSnapshot(snapshot: HuffmanSnapshot): void {
    this.nodes = snapshot.nodes.map((node) => ({ ...node }));
    this.selectedNodeIds = [...snapshot.selectedNodeIds];
    this.letterCodes = { ...snapshot.letterCodes };
    this.userBits = { ...snapshot.userBits };
    this.hintState = { ...snapshot.hints };
  }

  codeInputClass(symbol: string): string {
    const value = (this.letterCodes[symbol] ?? '').trim();
    if (!value) return 'input-invalid';
    const optimalCodes = this.getOptimalCodes();
    if (!optimalCodes) return 'input-invalid';
    return optimalCodes[symbol] === value ? 'input-valid' : 'input-invalid';
  }

  bitInputClass(field: keyof UserBitAnswers): string {
    const value = (this.userBits[field] ?? '').toString().trim();
    if (!value) return 'input-invalid';
    if (!this.getOptimalCodes()) return 'input-invalid';
    const fixedBits = this.computeFixedBits();
    const expected: Record<keyof UserBitAnswers, number> = {
      huffmanBits: this.referenceBits,
      fixedBits,
      savings: fixedBits - this.referenceBits,
    };
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return 'input-invalid';
    return numericValue === expected[field] ? 'input-valid' : 'input-invalid';
  }

  getChildren(id: string): HuffmanNode[] {
    return this.nodes.filter((node) => node.parentId === id);
  }

  isLeaf(node: HuffmanNode): boolean {
    return Boolean(node.label);
  }

  get canExportSnapshot(): boolean {
    return Boolean(this.getOptimalCodes());
  }

  private getOptimalCodes(): Record<string, string> | null {
    const codes = this.computeActualCodes();
    if (!codes) return null;
    return this.isTreeOptimal(codes) ? codes : null;
  }

  private isTreeOptimal(codes: Record<string, string>): boolean {
    const bits = this.computeHuffmanBits(codes);
    if (bits === null) return false;
    return bits === this.referenceBits;
  }

  private canRemoveGeneratedNode(node: HuffmanNode): boolean {
    if (!node.isGenerated) return true;
    const parent = this.nodes.find((n) => n.id === node.parentId);
    return !(parent?.isGenerated);
  }

}
