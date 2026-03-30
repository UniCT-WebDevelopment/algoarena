import { Injectable } from '@angular/core';
import { ExerciseDescriptor, ExerciseCategory } from '../models/exercise.model';
import { GraphScenario } from '../models/graph.model';

const EXERCISES: ExerciseDescriptor[] = [
  {
    id: 'heap-build-max',
    title: 'Build Max-Heap',
    description: 'Riordina l\'array per rispettare la proprietà di max-heap con drag & drop.',
    difficulty: 'easy',
    category: 'heap',
    estimatedTime: 6,
    icon: 'stacked_bar_chart',
    route: '/heap',
  },
  {
    id: 'huffman-builder',
    title: 'Huffman Builder',
    description: 'Collega i nodi e calcola i codici binari a partire dalle frequenze.',
    difficulty: 'hard',
    category: 'greedy',
    estimatedTime: 9,
    icon: 'schema',
    route: '/huffman',
  },
  {
    id: 'rb-insert',
    title: 'RB-Tree Insert Fixup',
    description: 'Inserisci le chiavi e applica le rotazioni e i recolor necessari.',
    difficulty: 'medium',
    category: 'rbTree',
    estimatedTime: 8,
    icon: 'account_tree',
    route: '/rb-tree',
  },
  {
    id: 'dijkstra',
    title: 'Dijkstra Simulator',
    description: 'Scegli il nodo corretto e rilassa gli archi passo dopo passo.',
    difficulty: 'hard',
    category: 'graphs',
    estimatedTime: 10,
    icon: 'timeline',
    route: '/graphs/dijkstra',
  },
  {
    id: 'graph-shortest-path',
    title: 'Graph Shortest Path Lab',
    description: 'Allenati con Dijkstra, Bellman-Ford e Floyd.',
    difficulty: 'medium',
    category: 'graphs',
    estimatedTime: 9,
    icon: 'route',
    route: '/graphs/lab',
  },
  {
    id: 'master-theorem',
    title: 'Master Theorem Lab',
    description: 'Risolvi ricorrenze e calcola la complessità.',
    difficulty: 'medium',
    category: 'master',
    estimatedTime: 7,
    icon: 'functions',
    route: '/master-theorem',
  },
  {
    id: 'hash-open',
    title: 'Hash Open Lab',
    description: 'Calcola le probabilità di destinazione con probing lineare o step variabile.',
    difficulty: 'medium',
    category: 'hashTable',
    estimatedTime: 7,
    icon: 'grid_on',
    route: '/hash/open',
  },
];

const GRAPH_SCENARIOS: GraphScenario[] = [
  {
    id: 'triad',
    title: 'Rete cittadina',
    description: 'Risolvi il percorso minimo partendo da S.',
    source: 's',
    nodes: [
      { id: 's', label: 'S', x: 80, y: 120 },
      { id: 't', label: 'T', x: 260, y: 80 },
      { id: 'u', label: 'U', x: 260, y: 200 },
      { id: 'v', label: 'V', x: 420, y: 120 },
    ],
    edges: [
      { id: 'st', from: 's', to: 't', weight: 2 },
      { id: 'su', from: 's', to: 'u', weight: 4 },
      { id: 'tu', from: 't', to: 'u', weight: 1 },
      { id: 'tv', from: 't', to: 'v', weight: 5 },
      { id: 'uv', from: 'u', to: 'v', weight: 1 },
    ],
  },
];

@Injectable({
  providedIn: 'root',
})
export class ExerciseService {
  getCategories(): ExerciseCategory[] {
    return ['heap', 'rbTree', 'graphs', 'hashTable', 'dp', 'greedy', 'master'];
  }

  getExercises(category?: ExerciseCategory): ExerciseDescriptor[] {
    if (!category) {
      return EXERCISES;
    }
    return EXERCISES.filter((exercise) => exercise.category === category);
  }

  getExerciseById(id: string): ExerciseDescriptor | undefined {
    return EXERCISES.find((exercise) => exercise.id === id);
  }

  createHeapChallenge(size: number, maxValue = 30): number[] {
    const arr = Array.from({ length: size }, () => Math.floor(Math.random() * maxValue) + 1);
    return arr;
  }

  getGraphScenario(): GraphScenario {
    return GRAPH_SCENARIOS[Math.floor(Math.random() * GRAPH_SCENARIOS.length)];
  }
}
