const HEAP_CHALLENGE_TEMPLATES = [
  {
    id: 'build-max',
    title: 'Build Max-Heap',
    description: "Sistema l'array in max-heap partendo dal basso (heapify bottom-up).",
    type: 'buildMax',
    mode: 'build',
    heapType: 'max',
    size: 9,
    points: 80,
  },
  {
    id: 'build-min',
    title: 'Build Min-Heap',
    description: "Correggi l'array per ottenere una min-heap perfetta.",
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
    description: "Costruisci una max-heap e completa tutte le estrazioni per ordinare l'array.",
    type: 'heapSort',
    mode: 'sort',
    heapType: 'max',
    size: 10,
    points: 120,
  },
];

const STRING_DP_WORD_BANK = [
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

const MASTER_FN_OPTIONS = [
  { key: '1', label: '1', k: 0, log: 0 },
  { key: 'logn', label: 'log n', k: 0, log: 1 },
  { key: 'sqrt', label: 'sqrt n', k: 0.5, log: 0 },
  { key: 'n', label: 'n', k: 1, log: 0 },
  { key: 'nlogn', label: 'n log n', k: 1, log: 1 },
  { key: 'nlog2n', label: 'n log^2 n', k: 1, log: 2 },
  { key: 'n2', label: 'n^2', k: 2, log: 0 },
  { key: 'n2logn', label: 'n^2 log n', k: 2, log: 1 },
  { key: 'n3', label: 'n^3', k: 3, log: 0 },
];

const MASTER_TEMPLATES = [
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

const LETTER_POOL = Array.from('abcdefghijklmnopqrstuvwxyz');

const RB_SCENARIO_TEMPLATES = [
  {
    title: "Sprint d'esame",
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

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(values) {
  return values[Math.floor(Math.random() * values.length)];
}

function durationMsFromSession(session) {
  const createdAt = session?.createdAt ? new Date(session.createdAt).getTime() : Date.now();
  return Math.max(0, Date.now() - createdAt);
}

function countErrors(map) {
  return Object.values(map).reduce((sum, value) => {
    if (Array.isArray(value)) {
      return sum + value.length;
    }
    return sum + 1;
  }, 0);
}

function normalizeExpr(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/√/g, 'sqrt')
    .replace(/\s+/g, '')
    .replace(/\*/g, '')
    .replace(/·/g, '')
    .replace(/\+/g, '+');
}

function buildAward(session, exerciseId, category, points, errors, attempts) {
  return {
    exerciseId,
    category,
    points,
    errors: Math.max(0, Math.round(errors || 0)),
    attempts: Math.max(1, Math.round(attempts || 1)),
    durationMs: Math.max(0, Math.round(durationMsFromSession(session))),
  };
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function ensureRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function findHeapChallenge(variant) {
  return HEAP_CHALLENGE_TEMPLATES.find((challenge) => challenge.id === variant) ?? HEAP_CHALLENGE_TEMPLATES[0];
}

function compareHeap(parent, child, type) {
  return type === 'max' ? parent >= child : parent <= child;
}

function validateHeapArray(values, type) {
  const violations = [];
  for (let i = 0; i < values.length; i += 1) {
    const left = 2 * i + 1;
    const right = 2 * i + 2;
    if (left < values.length && !compareHeap(values[i], values[left], type)) {
      violations.push(left);
    }
    if (right < values.length && !compareHeap(values[i], values[right], type)) {
      violations.push(right);
    }
  }
  return violations;
}

function prefers(candidate, current, type) {
  return type === 'max' ? candidate > current : candidate < current;
}

function heapifyWithSwapCount(array, heapSize, index, type) {
  let swaps = 0;
  let current = index;
  while (true) {
    const left = 2 * current + 1;
    const right = 2 * current + 2;
    let best = current;
    if (left < heapSize && prefers(array[left], array[best], type)) {
      best = left;
    }
    if (right < heapSize && prefers(array[right], array[best], type)) {
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

function buildHeapWithSwapCount(array, heapSize, type) {
  let swaps = 0;
  for (let i = Math.floor(heapSize / 2) - 1; i >= 0; i -= 1) {
    swaps += heapifyWithSwapCount(array, heapSize, i, type);
  }
  return swaps;
}

function computeHeapExpectedOperations(challenge, baseArray, requiredExtractions) {
  const array = [...baseArray];
  let ops = buildHeapWithSwapCount(array, array.length, challenge.heapType);

  if (challenge.mode === 'build') {
    return ops;
  }

  const extractions = challenge.mode === 'extract'
    ? Math.min(requiredExtractions, array.length)
    : array.length;

  let currentSize = array.length;
  for (let i = 0; i < extractions && currentSize > 0; i += 1) {
    if (currentSize > 1) {
      [array[0], array[currentSize - 1]] = [array[currentSize - 1], array[0]];
      ops += 1;
    }
    currentSize -= 1;
    if (currentSize > 0) {
      ops += heapifyWithSwapCount(array, currentSize, 0, challenge.heapType);
    }
    ops += 1;
  }

  return ops;
}

function getWorkingLength(locked) {
  let index = locked.length;
  while (index > 0 && locked[index - 1]) {
    index -= 1;
  }
  return index;
}

function isNonDecreasing(values) {
  for (let i = 1; i < values.length; i += 1) {
    if (values[i - 1] > values[i]) {
      return false;
    }
  }
  return true;
}

function isNonIncreasing(values) {
  for (let i = 1; i < values.length; i += 1) {
    if (values[i - 1] < values[i]) {
      return false;
    }
  }
  return true;
}

function evaluateHeapState(challenge, array, locked) {
  const heapBound = getWorkingLength(locked);
  const workingSlice = array.slice(0, heapBound);
  const violations = validateHeapArray(workingSlice, challenge.heapType);
  const heapValid = violations.length === 0;
  let suffixValid = true;

  if (challenge.mode !== 'build') {
    for (let i = heapBound; i < locked.length; i += 1) {
      if (!locked[i]) {
        suffixValid = false;
        break;
      }
    }
    if (suffixValid) {
      const suffixValues = array.slice(heapBound);
      if (suffixValues.length) {
        if (challenge.type === 'extractMin') {
          suffixValid = isNonIncreasing(suffixValues);
        } else if (challenge.type === 'heapSort') {
          suffixValid = isNonDecreasing(suffixValues);
          if (suffixValid && suffixValues.length === array.length) {
            suffixValid = isNonDecreasing(array);
          }
        } else {
          suffixValid = isNonDecreasing(suffixValues);
        }
      }
    }
  }

  let completed = false;
  if (challenge.mode === 'build') {
    completed = heapValid && suffixValid && !locked.some(Boolean);
  } else if (challenge.mode === 'sort') {
    completed = heapValid && suffixValid && locked.every(Boolean);
  } else {
    const required = challenge.requiredExtractions ?? 0;
    const lockedCount = locked.filter(Boolean).length;
    completed = heapValid && suffixValid && required > 0 && lockedCount >= required;
  }

  return {
    heapValid,
    suffixValid,
    completed,
    violations,
    lockedCount: locked.filter(Boolean).length,
  };
}

function createHeapSessionDescriptor(sessionId, variant) {
  const template = findHeapChallenge(variant);
  const baseArray = Array.from({ length: template.size }, () => randomBetween(1, 80));
  const requiredExtractions = template.mode === 'extract'
    ? randomBetween(1, Math.max(1, template.size - 2))
    : undefined;
  const challenge = {
    ...template,
    requiredExtractions,
  };
  const expectedOps = computeHeapExpectedOperations(challenge, baseArray, requiredExtractions ?? 0);
  const initialLocked = Array(baseArray.length).fill(false);
  const initialResult = evaluateHeapState(challenge, baseArray, initialLocked);

  return {
    category: 'heap',
    variant: template.id,
    scenario: {
      challenge: {
        ...challenge,
        baseArray,
      },
    },
    clientScenario: {
      challenge: {
        ...challenge,
        baseArray,
      },
    },
    state: {
      expectedOps,
      stepCount: 0,
      completed: false,
      awardId: `heap-${template.id}-${sessionId}`,
    },
    progress: {
      completed: false,
      expectedOps,
      errors: 0,
    },
    initialResult: {
      ...initialResult,
      expectedOps,
      errors: 0,
      requiredExtractions,
    },
  };
}

function applyHeapSubmission(session, eventType, payload) {
  const scenario = session.scenario?.challenge;
  if (!scenario) {
    throw new Error('Heap session non valida');
  }

  const array = ensureArray(payload?.array).map((value) => Number(value));
  const locked = ensureArray(payload?.locked).map(Boolean);
  if (array.length !== scenario.baseArray.length || locked.length !== scenario.baseArray.length) {
    throw new Error('Stato heap non valido');
  }
  if (array.some((value) => !Number.isFinite(value))) {
    throw new Error('Array heap non valido');
  }

  const state = ensureRecord(session.state);
  const progress = ensureRecord(session.progress);
  if (eventType !== 'init') {
    state.stepCount = Math.max(0, Number(state.stepCount || 0)) + 1;
  }

  const evaluation = evaluateHeapState(scenario, array, locked);
  const errors = Math.max(0, Number(state.stepCount || 0) - Number(state.expectedOps || 0));
  const wasCompleted = Boolean(state.completed);
  progress.completed = evaluation.completed;
  progress.expectedOps = Number(state.expectedOps || 0);
  progress.errors = errors;
  state.completed = wasCompleted || evaluation.completed;

  const awards = [];
  if (evaluation.completed && !wasCompleted) {
    awards.push(
      buildAward(session, state.awardId, 'heap', scenario.points, errors, 1)
    );
  }
  session.status = state.completed ? 'completed' : 'active';

  return {
    state,
    progress,
    lastClientState: { array, locked },
    status: session.status,
    awards,
    result: {
      ...evaluation,
      requiredExtractions: scenario.requiredExtractions,
      expectedOps: Number(state.expectedOps || 0),
      errors,
    },
  };
}

function buildGraphNodes(count, width = 620, height = 360) {
  const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const radius = 70 + count * 16;
  const cx = width / 2;
  const cy = height / 2;
  return Array.from({ length: count }, (_, index) => {
    const angle = (2 * Math.PI * index) / count;
    return {
      id: `N${index}`,
      label: labels[index] ?? `N${index + 1}`,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  });
}

function randomGraphWeight(allowNegative) {
  const min = allowNegative ? -3 : 1;
  const max = 9;
  let weight = randomBetween(min, max);
  if (weight === 0) {
    weight = 1;
  }
  if (!allowNegative && weight < 0) {
    weight = Math.abs(weight);
  }
  return weight;
}

function buildGraphEdges(nodes, algorithm) {
  const edges = [];
  const allowNegative = algorithm === 'bellman';
  for (let i = 0; i < nodes.length - 1; i += 1) {
    edges.push({
      from: nodes[i].id,
      to: nodes[i + 1].id,
      weight: randomGraphWeight(allowNegative),
    });
  }
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 2; j < nodes.length; j += 1) {
      if (Math.random() < 0.4) {
        edges.push({
          from: nodes[i].id,
          to: nodes[j].id,
          weight: randomGraphWeight(allowNegative),
        });
      }
    }
  }
  return edges;
}

function buildGraphMatrix(nodes, edges) {
  const size = nodes.length;
  const matrix = Array.from({ length: size }, () => Array.from({ length: size }, () => null));
  for (let i = 0; i < size; i += 1) {
    matrix[i][i] = 0;
  }
  const indexes = new Map(nodes.map((node, index) => [node.id, index]));
  for (const edge of edges) {
    const row = indexes.get(edge.from);
    const col = indexes.get(edge.to);
    if (row === undefined || col === undefined) {
      continue;
    }
    matrix[row][col] = edge.weight;
  }
  return matrix;
}

function graphAdjacency(nodes, edges) {
  const adjacency = {};
  for (const node of nodes) {
    adjacency[node.id] = [];
  }
  for (const edge of edges) {
    adjacency[edge.from].push({ to: edge.to, weight: edge.weight });
  }
  return adjacency;
}

function computeDijkstra(nodes, edges, sourceId) {
  const adjacency = graphAdjacency(nodes, edges);
  const dist = {};
  const pred = {};
  const visited = {};
  for (const node of nodes) {
    dist[node.id] = Infinity;
    pred[node.id] = null;
    visited[node.id] = false;
  }
  dist[sourceId] = 0;
  for (let i = 0; i < nodes.length; i += 1) {
    let current = null;
    let best = Infinity;
    for (const node of nodes) {
      if (!visited[node.id] && dist[node.id] < best) {
        best = dist[node.id];
        current = node.id;
      }
    }
    if (!current) {
      break;
    }
    visited[current] = true;
    for (const edge of adjacency[current]) {
      if (dist[current] + edge.weight < dist[edge.to]) {
        dist[edge.to] = dist[current] + edge.weight;
        pred[edge.to] = current;
      }
    }
  }
  return { dist, pred };
}

function computeBellmanFord(nodes, edges, sourceId) {
  const dist = {};
  const pred = {};
  for (const node of nodes) {
    dist[node.id] = Infinity;
    pred[node.id] = null;
  }
  dist[sourceId] = 0;
  for (let i = 0; i < nodes.length - 1; i += 1) {
    let updated = false;
    for (const edge of edges) {
      if (dist[edge.from] !== Infinity && dist[edge.from] + edge.weight < dist[edge.to]) {
        dist[edge.to] = dist[edge.from] + edge.weight;
        pred[edge.to] = edge.from;
        updated = true;
      }
    }
    if (!updated) {
      break;
    }
  }
  return { dist, pred };
}

function computeGraphShortestPaths(nodes, edges, algorithm, sourceId) {
  if (algorithm === 'bellman') {
    return computeBellmanFord(nodes, edges, sourceId);
  }
  return computeDijkstra(nodes, edges, sourceId);
}

function computeFloydArtifacts(nodes, edges) {
  const matrix = buildGraphMatrix(nodes, edges).map((row) =>
    row.map((value) => (value === null ? Infinity : value))
  );
  const size = nodes.length;
  const distStages = [matrix.map((row) => [...row])];
  const initialParents = Array.from({ length: size }, (_, i) =>
    Array.from({ length: size }, (_, j) => {
      if (i === j) {
        return null;
      }
      return matrix[i][j] !== Infinity ? nodes[i].id : null;
    })
  );
  const parentStages = [initialParents];
  let current = matrix.map((row) => [...row]);
  let currentParents = initialParents.map((row) => [...row]);

  for (let k = 0; k < size; k += 1) {
    const next = current.map((row) => [...row]);
    const nextParents = currentParents.map((row) => [...row]);
    for (let i = 0; i < size; i += 1) {
      for (let j = 0; j < size; j += 1) {
        if (current[i][k] === Infinity || current[k][j] === Infinity) {
          continue;
        }
        const throughK = current[i][k] + current[k][j];
        if (throughK < current[i][j]) {
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

function parseGraphNumber(raw) {
  if (raw === Infinity) {
    return Infinity;
  }
  if (raw === null || raw === undefined || raw === '') {
    return NaN;
  }
  const normalized = String(raw).trim().toLowerCase();
  if (normalized === 'inf' || normalized === 'infinity' || normalized === '∞') {
    return Infinity;
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : NaN;
}

function labelForNode(nodes, nodeId) {
  return nodes.find((node) => node.id === nodeId)?.label ?? nodeId;
}

function labelToNodeId(nodes, label) {
  if (!label) {
    return null;
  }
  const upper = String(label).trim().toUpperCase();
  return nodes.find((node) => node.label.toUpperCase() === upper)?.id ?? null;
}

function validateGraphSubmission(scenario, payload) {
  const nodes = ensureArray(scenario.nodes);
  const edges = ensureArray(scenario.edges);
  const algorithm = scenario.algorithm;

  if (algorithm === 'floyd') {
    const { distStages, parentStages } = computeFloydArtifacts(nodes, edges);
    const userStages = ensureArray(payload?.userFloydStages);
    const userParents = ensureArray(payload?.userFloydParentStages);
    const userErrors = [];

    for (let k = 1; k < distStages.length; k += 1) {
      const expectedMatrix = distStages[k];
      const submittedMatrix = ensureArray(userStages[k]);
      for (let i = 0; i < expectedMatrix.length; i += 1) {
        const submittedRow = ensureArray(submittedMatrix[i]);
        for (let j = 0; j < expectedMatrix.length; j += 1) {
          const expectedValue = expectedMatrix[i][j];
          const actualValue = parseGraphNumber(submittedRow[j]);
          if (Number.isNaN(actualValue)) {
            userErrors.push(`Completa A${k}[${nodes[i].label},${nodes[j].label}].`);
            break;
          }
          if (expectedValue === Infinity && actualValue !== Infinity) {
            userErrors.push(`Atteso ∞ in A${k}[${nodes[i].label},${nodes[j].label}].`);
            break;
          }
          if (expectedValue !== Infinity && Math.abs(actualValue - expectedValue) > 1e-6) {
            userErrors.push(`A${k}[${nodes[i].label},${nodes[j].label}] atteso ${expectedValue}.`);
            break;
          }
        }
        if (userErrors.length) {
          break;
        }
      }
      if (userErrors.length) {
        break;
      }

      const expectedParentMatrix = parentStages[k];
      const submittedParentMatrix = ensureArray(userParents[k]);
      for (let i = 0; i < expectedParentMatrix.length; i += 1) {
        const submittedRow = ensureArray(submittedParentMatrix[i]);
        for (let j = 0; j < expectedParentMatrix.length; j += 1) {
          const expectedParent = expectedParentMatrix[i][j];
          const actualParent = String(submittedRow[j] ?? '').trim();
          const actualId = labelToNodeId(nodes, actualParent);
          if (expectedParent) {
            if (!actualParent) {
              userErrors.push(`Completa P${k}[${nodes[i].label},${nodes[j].label}].`);
              break;
            }
            if (!actualId || actualId !== expectedParent) {
              userErrors.push(
                `P${k}[${nodes[i].label},${nodes[j].label}] atteso ${labelForNode(nodes, expectedParent)}.`
              );
              break;
            }
          } else if (actualParent) {
            userErrors.push(`P${k}[${nodes[i].label},${nodes[j].label}] deve essere vuoto.`);
            break;
          }
        }
        if (userErrors.length) {
          break;
        }
      }
      if (userErrors.length) {
        break;
      }
    }

    return {
      correct: userErrors.length === 0,
      hasErrors: userErrors.length > 0,
      errors: {},
      errorCount: userErrors.length,
      feedback: userErrors.length
        ? userErrors[0]
        : 'Ottimo! Tutte le matrici A_k e P_k sono corrette.',
    };
  }

  const sourceId = typeof payload?.sourceId === 'string' ? payload.sourceId : nodes[0]?.id;
  if (!sourceId || !nodes.some((node) => node.id === sourceId)) {
    return {
      correct: false,
      hasErrors: true,
      errors: {},
      errorCount: 1,
      feedback: 'Seleziona una sorgente valida.',
    };
  }

  const expected = computeGraphShortestPaths(nodes, edges, algorithm, sourceId);
  const userDist = ensureRecord(payload?.userDist);
  const userPred = ensureRecord(payload?.userPred);
  const errors = {};

  for (const node of nodes) {
    const expectedDist = expected.dist[node.id];
    const actualDist = parseGraphNumber(userDist[node.id]);
    if (expectedDist === Infinity) {
      if (userDist[node.id] && actualDist !== Infinity) {
        errors[node.id] = `Atteso ∞ per ${node.label}`;
      }
    } else if (Number.isNaN(actualDist)) {
      errors[node.id] = `Inserisci un costo per ${node.label}`;
    } else if (Math.abs(actualDist - expectedDist) > 1e-6) {
      errors[node.id] = `Atteso ${expectedDist} per ${node.label}`;
    }

    const expectedPred = expected.pred[node.id] ?? '';
    const rawPred = String(userPred[node.id] ?? '').trim();
    const actualPred = labelToNodeId(nodes, rawPred);
    if (expectedDist !== Infinity) {
      if (expectedPred) {
        if (!actualPred || actualPred !== expectedPred) {
          errors[`${node.id}-pred`] = `Predecessore atteso ${labelForNode(nodes, expectedPred)}`;
        }
      } else if (rawPred) {
        errors[`${node.id}-pred`] = 'Predecessore atteso vuoto';
      }
    } else if (rawPred) {
      errors[`${node.id}-pred`] = 'Nodo non raggiungibile: lascia vuoto';
    }
  }

  return {
    correct: Object.keys(errors).length === 0,
    hasErrors: Object.keys(errors).length > 0,
    errors,
    errorCount: Object.keys(errors).length,
    feedback:
      Object.keys(errors).length > 0
        ? 'Ci sono errori nei valori inseriti.'
        : 'Ottimo! Soluzione corretta.',
  };
}

function createGraphSessionDescriptor(sessionId, variant) {
  const algorithm = ['dijkstra', 'bellman', 'floyd'].includes(variant) ? variant : 'dijkstra';
  const nodeCount = randomBetween(4, 6);
  const nodes = buildGraphNodes(nodeCount);
  const edges = buildGraphEdges(nodes, algorithm);

  return {
    category: 'graphs',
    variant: algorithm,
    scenario: {
      algorithm,
      nodes,
      edges,
      points: algorithm === 'dijkstra' ? 100 : algorithm === 'bellman' ? 120 : 140,
      awardId: `graph-${algorithm}-${sessionId}`,
    },
    clientScenario: {
      algorithm,
      nodes,
      edges,
      sourceId: nodes[0]?.id ?? '',
    },
    state: {
      completed: false,
      attempts: 0,
      errors: 0,
    },
    progress: {
      completed: false,
      attempts: 0,
      errors: 0,
    },
    initialResult: {
      hasErrors: false,
      errors: {},
      feedback: '',
      correct: false,
    },
  };
}

function applyGraphSubmission(session, eventType, payload) {
  const state = ensureRecord(session.state);
  const progress = ensureRecord(session.progress);
  const result = validateGraphSubmission(session.scenario, payload);

  if (eventType === 'check') {
    state.attempts = Math.max(0, Number(state.attempts || 0)) + 1;
    if (result.errorCount > 0) {
      state.errors = Math.max(0, Number(state.errors || 0)) + result.errorCount;
    }
  }

  const awards = [];
  if (result.correct && !state.completed) {
    state.completed = true;
    awards.push(
      buildAward(
        session,
        session.scenario.awardId,
        'graphs',
        session.scenario.points,
        Number(state.errors || 0),
        Math.max(1, Number(state.attempts || 1))
      )
    );
  }

  progress.completed = Boolean(state.completed);
  progress.attempts = Number(state.attempts || 0);
  progress.errors = Number(state.errors || 0);

  return {
    state,
    progress,
    lastClientState: {
      sourceId: payload?.sourceId,
      userDist: ensureRecord(payload?.userDist),
      userPred: ensureRecord(payload?.userPred),
      userFloydStages: ensureArray(payload?.userFloydStages),
      userFloydParentStages: ensureArray(payload?.userFloydParentStages),
    },
    status: state.completed ? 'completed' : 'active',
    awards,
    result,
  };
}

function trimWord(word, maxLength = 5) {
  return String(word ?? '').slice(0, maxLength);
}

function pickRandomWords() {
  const trimmed = STRING_DP_WORD_BANK.map((word) => trimWord(word)).filter(Boolean);
  if (trimmed.length < 2) {
    return [trimmed[0] ?? '', trimmed[0] ?? ''];
  }
  const firstIndex = Math.floor(Math.random() * trimmed.length);
  let secondIndex = Math.floor(Math.random() * trimmed.length);
  let guard = 0;
  while ((secondIndex === firstIndex || trimmed[firstIndex] === trimmed[secondIndex]) && guard < 20) {
    secondIndex = Math.floor(Math.random() * trimmed.length);
    guard += 1;
  }
  return [trimmed[firstIndex], trimmed[secondIndex]];
}

function buildDpSolution(wordX, wordY, algorithm) {
  const xChars = wordX.split('');
  const yChars = wordY.split('');
  const rows = yChars.length + 1;
  const cols = xChars.length + 1;
  const values = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => {
      if (algorithm === 'edit') {
        if (row === 0) {
          return col;
        }
        if (col === 0) {
          return row;
        }
      }
      return 0;
    })
  );
  const arrows = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null)
  );

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      if (algorithm === 'lcs') {
        if (yChars[row - 1] === xChars[col - 1]) {
          values[row][col] = values[row - 1][col - 1] + 1;
          arrows[row][col] = 'diag';
        } else if (values[row - 1][col] >= values[row][col - 1]) {
          values[row][col] = values[row - 1][col];
          arrows[row][col] = 'up';
        } else {
          values[row][col] = values[row][col - 1];
          arrows[row][col] = 'left';
        }
      } else {
        const cost = yChars[row - 1] === xChars[col - 1] ? 0 : 1;
        const diag = values[row - 1][col - 1] + cost;
        const up = values[row - 1][col] + 1;
        const left = values[row][col - 1] + 1;
        const min = Math.min(diag, up, left);
        values[row][col] = min;
        arrows[row][col] = min === diag ? 'diag' : min === up ? 'up' : 'left';
      }
    }
  }

  return { values, arrows, xChars, yChars };
}

function pathKey(row, col) {
  return `${row}-${col}`;
}

function isArrowConsistent(matrix, xChars, yChars, algorithm, row, col, arrow) {
  const current = matrix[row]?.[col]?.value;
  if (current === null || current === undefined) {
    return false;
  }
  if (arrow === 'diag') {
    const diag = Number(matrix[row - 1]?.[col - 1]?.value ?? 0);
    if (algorithm === 'lcs') {
      const match = xChars[col - 1] === yChars[row - 1];
      return match && Number(current) === diag + 1;
    }
    const cost = xChars[col - 1] === yChars[row - 1] ? 0 : 1;
    return Number(current) === diag + cost;
  }
  if (arrow === 'up') {
    const up = Number(matrix[row - 1]?.[col]?.value ?? 0);
    if (algorithm === 'lcs') {
      if (xChars[col - 1] === yChars[row - 1]) {
        return false;
      }
      return Number(current) === up;
    }
    return Number(current) === up + 1;
  }
  const left = Number(matrix[row]?.[col - 1]?.value ?? 0);
  if (algorithm === 'lcs') {
    if (xChars[col - 1] === yChars[row - 1]) {
      return false;
    }
    return Number(current) === left;
  }
  return Number(current) === left + 1;
}

function traceDpPath(matrix, algorithm, selectedKeys) {
  const visited = [];
  const diagonal = [];
  let row = matrix.length - 1;
  let col = matrix[0].length - 1;
  while (true) {
    visited.push({ row, col });
    if (row === 0 && col === 0) {
      break;
    }
    const arrow = matrix[row]?.[col]?.arrow ?? null;
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
    const nextKey = pathKey(row, col);
    if (!selectedKeys.has(nextKey) && algorithm === 'edit') {
      return {
        visited,
        diagonal,
        error: 'Segui la sequenza delle frecce selezionando ogni cella del percorso.',
      };
    }
  }
  return { visited, diagonal };
}

function validateLcsDiagonals(matrix, xChars, yChars, diagonal, selectedKeys) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const lcsLength = Number(matrix[rows - 1][cols - 1]?.value ?? 0);
  const selectedDiagonalCount = diagonal.filter((point) => selectedKeys.has(pathKey(point.row, point.col))).length;
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
    if (xChars[point.col - 1] !== yChars[point.row - 1]) {
      return 'Solo le celle con lettere coincidenti possono far parte della LCS.';
    }
  }
  return null;
}

function validateDpPath(matrix, algorithm, xChars, yChars, solutionArrows, pathSelection) {
  if (!Array.isArray(pathSelection) || !pathSelection.length) {
    return 'Seleziona il percorso ottimale cliccando le celle finali.';
  }

  const rawSelectedKeys = new Set(
    pathSelection
      .filter((point) => point && Number.isInteger(point.row) && Number.isInteger(point.col))
      .map((point) => pathKey(point.row, point.col))
  );
  const filteredSelection = new Set(
    Array.from(rawSelectedKeys).filter((key) => {
      const [row, col] = key.split('-').map(Number);
      return row > 0 && col > 0;
    })
  );

  const traced = traceDpPath(matrix, algorithm, rawSelectedKeys);
  if (traced.error) {
    return traced.error;
  }

  const visitedKeys = new Set(
    traced.visited
      .filter((point) => point.row > 0 && point.col > 0)
      .map((point) => pathKey(point.row, point.col))
  );
  for (const key of filteredSelection) {
    if (!visitedKeys.has(key)) {
      return 'Il percorso colorato non segue le frecce del cammino.';
    }
  }

  if (algorithm === 'edit') {
    const finalKey = pathKey(matrix.length - 1, matrix[0].length - 1);
    if (!rawSelectedKeys.has(finalKey)) {
      return 'Devi includere la cella finale.';
    }
    return null;
  }

  const pathToBase = [];
  for (const point of traced.visited) {
    pathToBase.push(point);
    if (point.row === 0 || point.col === 0) {
      break;
    }
  }
  if (pathToBase.some((point) => !rawSelectedKeys.has(pathKey(point.row, point.col)))) {
    return 'Seleziona tutte le celle del percorso dal fondo fino a toccare la riga 0 o la colonna 0.';
  }
  const lastPoint = pathToBase[pathToBase.length - 1];
  if (!lastPoint || (lastPoint.row !== 0 && lastPoint.col !== 0)) {
    return 'Il percorso deve arrivare almeno alla riga 0 o alla colonna 0.';
  }
  return validateLcsDiagonals(matrix, xChars, yChars, traced.diagonal, filteredSelection);
}

function validateDpSubmission(scenario, payload, eventType = 'check') {
  const algorithm = scenario.algorithm;
  const wordX = String(scenario.wordX ?? '');
  const wordY = String(scenario.wordY ?? '');
  const matrix = ensureArray(payload?.matrix);
  const pathSelection = ensureArray(payload?.pathSelection);
  const editDistanceAnswer = payload?.editDistanceAnswer;
  const solution = buildDpSolution(wordX, wordY, algorithm);
  const valueErrorKeys = [];
  const arrowErrorKeys = [];

  for (let row = 0; row < matrix.length; row += 1) {
    for (let col = 0; col < ensureArray(matrix[row]).length; col += 1) {
      const cell = matrix[row][col] || {};
      if (cell.locked) {
        continue;
      }
      const rawValue = cell.value;
      if (rawValue === null || rawValue === undefined || rawValue === '') {
        valueErrorKeys.push(pathKey(row, col));
        continue;
      }
      if (Number(rawValue) !== solution.values[row][col]) {
        valueErrorKeys.push(pathKey(row, col));
      }
      if (!cell.arrow) {
        arrowErrorKeys.push(pathKey(row, col));
        continue;
      }
      if (!isArrowConsistent(matrix, solution.xChars, solution.yChars, algorithm, row, col, cell.arrow)) {
        arrowErrorKeys.push(pathKey(row, col));
      }
    }
  }

  if (valueErrorKeys.length) {
    return {
      correct: false,
      hasErrors: true,
      feedback: 'Alcuni valori non coincidono con la soluzione corretta.',
      errorCount: valueErrorKeys.length,
      valueErrorKeys,
      arrowErrorKeys: [],
    };
  }

  if (arrowErrorKeys.length) {
    return {
      correct: false,
      hasErrors: true,
      feedback: "Una o più frecce non seguono la logica dell'algoritmo.",
      errorCount: arrowErrorKeys.length,
      valueErrorKeys: [],
      arrowErrorKeys,
    };
  }

  if (eventType !== 'check') {
    return {
      correct: false,
      hasErrors: false,
      feedback: '',
      errorCount: 0,
      valueErrorKeys: [],
      arrowErrorKeys: [],
    };
  }

  const pathError = validateDpPath(matrix, algorithm, solution.xChars, solution.yChars, solution.arrows, pathSelection);
  if (pathError) {
    return {
      correct: false,
      hasErrors: true,
      feedback: pathError,
      errorCount: 1,
      valueErrorKeys: [],
      arrowErrorKeys: [],
    };
  }

  if (algorithm === 'edit') {
    const expected = solution.values[solution.values.length - 1][solution.values[0].length - 1];
    if (Number(editDistanceAnswer) !== expected) {
      return {
        correct: false,
        hasErrors: true,
        feedback: 'Costo atteso errato',
        errorCount: 1,
        valueErrorKeys: [],
        arrowErrorKeys: [],
      };
    }
  }

  return {
    correct: true,
    hasErrors: false,
    feedback: 'Ottimo! Matrice e percorso corretti.',
    errorCount: 0,
    valueErrorKeys: [],
    arrowErrorKeys: [],
  };
}

function createDpSessionDescriptor(sessionId, variant) {
  const algorithm = variant === 'edit' ? 'edit' : 'lcs';
  const [wordX, wordY] = pickRandomWords();
  return {
    category: 'dp',
    variant: algorithm,
    scenario: {
      algorithm,
      wordX,
      wordY,
      points: algorithm === 'lcs' ? 120 : 110,
      awardId: `dp-${algorithm}-${sessionId}`,
    },
    clientScenario: {
      algorithm,
      wordX,
      wordY,
    },
    state: {
      completed: false,
      attempts: 0,
      errors: 0,
    },
    progress: {
      completed: false,
      attempts: 0,
      errors: 0,
    },
    initialResult: {
      correct: false,
      hasErrors: false,
      feedback: '',
      valueErrorKeys: [],
      arrowErrorKeys: [],
    },
  };
}

function applyDpSubmission(session, eventType, payload) {
  const state = ensureRecord(session.state);
  const progress = ensureRecord(session.progress);
  const result = validateDpSubmission(session.scenario, payload, eventType);

  if (eventType === 'check') {
    state.attempts = Math.max(0, Number(state.attempts || 0)) + 1;
    if (result.errorCount > 0) {
      state.errors = Math.max(0, Number(state.errors || 0)) + result.errorCount;
    }
  }

  const awards = [];
  if (eventType === 'check' && result.correct && !state.completed) {
    state.completed = true;
    awards.push(
      buildAward(
        session,
        session.scenario.awardId,
        'dp',
        session.scenario.points,
        Number(state.errors || 0),
        Math.max(1, Number(state.attempts || 1))
      )
    );
  }

  progress.completed = Boolean(state.completed);
  progress.attempts = Number(state.attempts || 0);
  progress.errors = Number(state.errors || 0);

  return {
    state,
    progress,
    lastClientState: {
      matrix: ensureArray(payload?.matrix),
      pathSelection: ensureArray(payload?.pathSelection),
      editDistanceAnswer: payload?.editDistanceAnswer ?? '',
    },
    status: state.completed ? 'completed' : 'active',
    awards,
    result,
  };
}

function normalizeHashSlots(slots, tableSize) {
  const normalized = [];
  for (let index = 0; index < tableSize; index += 1) {
    const slot = ensureRecord(slots[index]);
    normalized.push({
      index,
      locked: Boolean(slot.locked),
      contributions: ensureArray(slot.contributions).map((contribution) => ({
        id: String(contribution?.id ?? `${index}-${Math.random().toString(16).slice(2)}`),
        from:
          contribution?.from === null || contribution?.from === undefined || contribution?.from === ''
            ? null
            : Number(contribution.from),
        numerator:
          contribution?.numerator === null || contribution?.numerator === undefined || contribution?.numerator === ''
            ? null
            : Number(contribution.numerator),
        denominator:
          contribution?.denominator === null || contribution?.denominator === undefined || contribution?.denominator === ''
            ? null
            : Number(contribution.denominator),
      })),
    });
  }
  return normalized;
}

function traceHashPath(slots, start, step) {
  const visited = [];
  for (let index = 0; index < slots.length; index += 1) {
    const position = (start + step * index) % slots.length;
    visited.push(position);
    if (!slots[position].locked) {
      return { dest: position, visited };
    }
  }
  return { dest: null, visited };
}

function computeHashExpected(tableSize, hasHashFunction, step, slots) {
  const expected = Array.from({ length: tableSize }, () => ({
    probability: 0,
    sources: [],
    paths: [],
  }));
  if (slots.every((slot) => slot.locked)) {
    return expected;
  }
  const effectiveStep = hasHashFunction ? Math.max(1, step) : 1;
  for (let start = 0; start < tableSize; start += 1) {
    const trace = traceHashPath(slots, start, effectiveStep);
    if (trace.dest === null) {
      continue;
    }
    expected[trace.dest].probability += 1 / tableSize;
    expected[trace.dest].sources.push(start);
    if (hasHashFunction) {
      expected[trace.dest].paths.push({ src: start, visited: trace.visited });
    }
  }
  return expected;
}

function validateHashSubmission(payload) {
  const tableSize = Math.max(6, Math.min(14, Number(payload?.tableSize || 10)));
  const hasHashFunction = Boolean(payload?.hasHashFunction);
  const step = Math.max(1, Number(payload?.step || 1));
  const slots = normalizeHashSlots(ensureArray(payload?.slots), tableSize);
  const expected = computeHashExpected(tableSize, hasHashFunction, step, slots);
  const slotErrors = {};

  if (slots.every((slot) => slot.locked)) {
    return {
      correct: false,
      hasErrors: true,
      feedback: 'Sblocca almeno uno slot libero.',
      errorCount: 1,
      slotErrors: {},
      expected,
      normalizedState: { tableSize, hasHashFunction, step, slots },
    };
  }

  const tolerance = 1e-3;
  const sourceProbability = 1 / tableSize;

  for (const slot of slots) {
    const errors = [];
    const expectedSlot = expected[slot.index];
    const expectedSources = new Set(expectedSlot.sources);
    const receivedSources = new Map();
    const total = slot.contributions.reduce((sum, contribution) => {
      if (
        contribution.numerator === null ||
        contribution.denominator === null ||
        !Number.isFinite(contribution.numerator) ||
        !Number.isFinite(contribution.denominator) ||
        contribution.denominator === 0
      ) {
        return sum;
      }
      return sum + contribution.numerator / contribution.denominator;
    }, 0);

    if (Math.abs(total - expectedSlot.probability) > tolerance) {
      errors.push(
        `Somma frazioni ${total.toFixed(3)} diversa da probabilità attesa ${expectedSlot.sources.length}/${tableSize}`
      );
    }

    for (const contribution of slot.contributions) {
      if (
        contribution.from === null ||
        contribution.numerator === null ||
        contribution.denominator === null ||
        !Number.isFinite(contribution.from) ||
        !Number.isFinite(contribution.numerator) ||
        !Number.isFinite(contribution.denominator) ||
        contribution.denominator === 0
      ) {
        errors.push('Completa tutte le frazioni e la provenienza.');
        continue;
      }
      const value = contribution.numerator / contribution.denominator;
      receivedSources.set(contribution.from, (receivedSources.get(contribution.from) ?? 0) + value);
      if (!expectedSources.has(contribution.from)) {
        errors.push(`La frazione da P(${contribution.from}) non è prevista per questo slot.`);
      }
    }

    for (const source of expectedSources) {
      const received = receivedSources.get(source) ?? 0;
      if (Math.abs(received - sourceProbability) > tolerance) {
        errors.push(`Da P(${source}) atteso 1/${tableSize}, hai ${received.toFixed(3)}.`);
      }
    }

    if (expectedSlot.probability === 0 && slot.contributions.length) {
      errors.push(`Questo slot non deve ricevere probabilità (atteso 0/${tableSize}).`);
    }

    if (errors.length) {
      slotErrors[slot.index] = errors;
    }
  }

  return {
    correct: Object.keys(slotErrors).length === 0,
    hasErrors: Object.keys(slotErrors).length > 0,
    feedback:
      Object.keys(slotErrors).length > 0
        ? 'Ci sono errori nelle frazioni: controlla gli slot evidenziati.'
        : 'Ottimo! Distribuzione e provenienze corrette.',
    errorCount: Object.keys(slotErrors).length ? countErrors(slotErrors) : 0,
    slotErrors,
    expected,
    normalizedState: { tableSize, hasHashFunction, step, slots },
  };
}

function createHashSessionDescriptor(sessionId) {
  const tableSize = 10;
  const slots = Array.from({ length: tableSize }, (_, index) => ({
    index,
    locked: Math.random() < 0.5,
    contributions: [],
  }));
  if (slots.every((slot) => slot.locked)) {
    slots[randomBetween(0, tableSize - 1)].locked = false;
  }

  return {
    category: 'hashTable',
    variant: 'hash-open',
    scenario: {
      awardId: `hash-open-${sessionId}`,
      points: 100,
    },
    clientScenario: {
      tableSize,
      hasHashFunction: false,
      step: 1,
      slots,
    },
    state: {
      completed: false,
      attempts: 0,
      errors: 0,
    },
    progress: {
      completed: false,
      attempts: 0,
      errors: 0,
    },
    initialResult: {
      correct: false,
      hasErrors: false,
      feedback: '',
      slotErrors: {},
    },
  };
}

function applyHashSubmission(session, eventType, payload) {
  const state = ensureRecord(session.state);
  const progress = ensureRecord(session.progress);
  const result = validateHashSubmission(payload);

  if (eventType === 'check') {
    state.attempts = Math.max(0, Number(state.attempts || 0)) + 1;
    if (result.errorCount > 0) {
      state.errors = Math.max(0, Number(state.errors || 0)) + result.errorCount;
    }
  }

  const awards = [];
  if (result.correct && !state.completed) {
    state.completed = true;
    awards.push(
      buildAward(
        session,
        session.scenario.awardId,
        'hashTable',
        session.scenario.points,
        Number(state.errors || 0),
        Math.max(1, Number(state.attempts || 1))
      )
    );
  }

  progress.completed = Boolean(state.completed);
  progress.attempts = Number(state.attempts || 0);
  progress.errors = Number(state.errors || 0);

  return {
    state,
    progress,
    lastClientState: result.normalizedState,
    status: state.completed ? 'completed' : 'active',
    awards,
    result: {
      correct: result.correct,
      hasErrors: result.hasErrors,
      feedback: result.feedback,
      slotErrors: result.slotErrors,
    },
  };
}

function decideMasterCase(alpha, k) {
  const epsilon = 0.05;
  if (k < alpha - epsilon) {
    return 1;
  }
  if (k > alpha + epsilon) {
    return 3;
  }
  return 2;
}

function formatMasterPower(alpha) {
  const rounded = Math.round(alpha * 100) / 100;
  if (rounded === 0) {
    return '1';
  }
  if (rounded === 1) {
    return 'n';
  }
  return `n^${rounded}`;
}

function formatMasterComplexity(alpha, fn, caseType) {
  const base = formatMasterPower(alpha);
  if (caseType === 1) {
    return `Θ(${base})`;
  }
  if (caseType === 3) {
    return `Θ(${fn.label})`;
  }
  const logPower = fn.log + 1;
  if (logPower === 1) {
    return `Θ(${base} log n)`;
  }
  return `Θ(${base} log^${logPower} n)`;
}

function buildMasterComplexityOptions(alpha, fn, expected) {
  const options = new Map();
  const base = formatMasterPower(alpha);
  const add = (value) => {
    const key = normalizeExpr(value);
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

function buildMasterExercise(template, index) {
  const fn = MASTER_FN_OPTIONS.find((option) => option.key === template.recurrence.fnKey);
  const alpha = Math.log(template.recurrence.a) / Math.log(template.recurrence.b);
  const expectedCase = decideMasterCase(alpha, fn.k);
  const expectedComplexity = formatMasterComplexity(alpha, fn, expectedCase);
  return {
    id: `${template.title.toLowerCase().replace(/\s+/g, '-')}-${index}`,
    title: template.title,
    description: template.description,
    pseudocode: template.pseudocode,
    helpers: template.helpers,
    recurrence: template.recurrence,
    points: 120,
    expectedCase,
    expectedComplexity,
    complexityOptions: buildMasterComplexityOptions(alpha, fn, expectedComplexity),
  };
}

function sanitizeMasterExercise(exercise) {
  return {
    id: exercise.id,
    title: exercise.title,
    description: exercise.description,
    pseudocode: exercise.pseudocode,
    helpers: exercise.helpers,
    complexityOptions: exercise.complexityOptions,
  };
}

function matchesMasterAlpha(input, a, b) {
  const raw = String(input ?? '').trim().toLowerCase();
  if (!raw) {
    return false;
  }
  const alpha = Math.log(a) / Math.log(b);
  const expected = normalizeExpr(formatMasterPower(alpha));
  const normalized = normalizeExpr(raw);
  if (normalized === expected) {
    return true;
  }
  if (normalized === 'n') {
    return Math.abs(alpha - 1) < 0.1;
  }
  if (normalized === '1') {
    return Math.abs(alpha) < 0.1;
  }
  const match = normalized.match(/^n\^(-?\d+(\.\d+)?)$/);
  if (match) {
    return Math.abs(Number(match[1]) - alpha) < 0.1;
  }
  const numeric = Number(normalized);
  return Number.isFinite(numeric) && Math.abs(numeric - alpha) < 0.1;
}

function matchesMasterFn(input, fnKey) {
  const expected = MASTER_FN_OPTIONS.find((option) => option.key === fnKey)?.label ?? '';
  return normalizeExpr(input) === normalizeExpr(expected);
}

function validateMasterSubmission(scenario, payload) {
  const exerciseId = typeof payload?.exerciseId === 'string' ? payload.exerciseId : '';
  const exercise = ensureArray(scenario.exercises).find((item) => item.id === exerciseId);
  if (!exercise) {
    return {
      correct: false,
      hasErrors: true,
      feedback: 'Esercizio selezionato non valido.',
      errorCount: 1,
      exerciseId,
    };
  }

  const aOk = Number(payload?.inputA) === exercise.recurrence.a;
  const bOk = Number(payload?.inputB) === exercise.recurrence.b;
  const fnOk = payload?.selectedFnKey === exercise.recurrence.fnKey;
  const alphaOk = matchesMasterAlpha(payload?.inputAlpha, exercise.recurrence.a, exercise.recurrence.b);
  const manualFnOk = matchesMasterFn(payload?.inputFn, exercise.recurrence.fnKey);
  const caseOk = Number(payload?.selectedCase) === exercise.expectedCase;
  const complexityOk =
    normalizeExpr(payload?.selectedComplexity) === normalizeExpr(exercise.expectedComplexity);
  const errorCount = [aOk, bOk, fnOk, alphaOk, manualFnOk, caseOk, complexityOk].filter((value) => !value).length;

  return {
    correct: errorCount === 0,
    hasErrors: errorCount > 0,
    feedback:
      errorCount > 0
        ? 'Qualcosa non torna. Controlla a, b, n^(log_b a), f(n), il caso e la complessità finale.'
        : `Corretto! +${exercise.points} XP`,
    errorCount,
    exerciseId,
    exercise,
  };
}

function createMasterSessionDescriptor() {
  const exercises = MASTER_TEMPLATES
    .slice()
    .sort(() => Math.random() - 0.5)
    .slice(0, 2)
    .map((template, index) => buildMasterExercise(template, index));

  return {
    category: 'master',
    variant: 'master-theorem',
    scenario: {
      exercises,
    },
    clientScenario: {
      exercises: exercises.map(sanitizeMasterExercise),
    },
    state: {
      awardedExerciseIds: [],
      attemptsByExercise: {},
      errorsByExercise: {},
    },
    progress: {
      completedExerciseIds: [],
    },
    initialResult: {
      correct: false,
      hasErrors: false,
      feedback: '',
      completedExerciseIds: [],
    },
  };
}

function applyMasterSubmission(session, eventType, payload) {
  const state = ensureRecord(session.state);
  const progress = ensureRecord(session.progress);
  const result = validateMasterSubmission(session.scenario, payload);
  const attemptsByExercise = ensureRecord(state.attemptsByExercise);
  const errorsByExercise = ensureRecord(state.errorsByExercise);
  const awardedExerciseIds = ensureArray(state.awardedExerciseIds);

  if (result.exerciseId && eventType === 'check') {
    attemptsByExercise[result.exerciseId] = Math.max(0, Number(attemptsByExercise[result.exerciseId] || 0)) + 1;
    if (result.errorCount > 0) {
      errorsByExercise[result.exerciseId] =
        Math.max(0, Number(errorsByExercise[result.exerciseId] || 0)) + result.errorCount;
    }
  }

  const awards = [];
  if (result.correct && result.exercise && !awardedExerciseIds.includes(result.exerciseId)) {
    awardedExerciseIds.push(result.exerciseId);
    awards.push(
      buildAward(
        session,
        `master-${result.exerciseId}-${session._id.toString()}`,
        'master',
        result.exercise.points,
        Number(errorsByExercise[result.exerciseId] || 0),
        Math.max(1, Number(attemptsByExercise[result.exerciseId] || 1))
      )
    );
  }

  state.awardedExerciseIds = awardedExerciseIds;
  state.attemptsByExercise = attemptsByExercise;
  state.errorsByExercise = errorsByExercise;
  progress.completedExerciseIds = awardedExerciseIds;

  return {
    state,
    progress,
    lastClientState: {
      exerciseId: result.exerciseId,
      inputA: payload?.inputA ?? '',
      inputB: payload?.inputB ?? '',
      selectedFnKey: payload?.selectedFnKey ?? '',
      selectedCase: payload?.selectedCase ?? null,
      selectedComplexity: payload?.selectedComplexity ?? '',
      inputAlpha: payload?.inputAlpha ?? '',
      inputFn: payload?.inputFn ?? '',
    },
    status:
      awardedExerciseIds.length >= ensureArray(session.scenario?.exercises).length ? 'completed' : 'active',
    awards,
    result: {
      correct: result.correct,
      hasErrors: result.hasErrors,
      feedback: result.feedback,
      exerciseId: result.exerciseId,
      completedExerciseIds: awardedExerciseIds,
    },
  };
}

function generateHuffmanExercise() {
  const available = [...LETTER_POOL];
  const count = 6 + Math.floor(Math.random() * 4);
  const letters = [];
  for (let i = 0; i < count && available.length; i += 1) {
    const index = Math.floor(Math.random() * available.length);
    const symbol = available.splice(index, 1)[0];
    const frequency = 100 + Math.floor(Math.random() * 12) * 50;
    letters.push({ symbol, frequency });
  }
  return {
    totalCharacters: letters.reduce((sum, letter) => sum + letter.frequency, 0),
    letters,
  };
}

function buildReferenceHuffmanCodes(exercise) {
  const queue = exercise.letters.map((leaf, index) => ({
    symbol: leaf.symbol,
    frequency: leaf.frequency,
    order: index,
    left: null,
    right: null,
  }));
  let order = queue.length;
  while (queue.length > 1) {
    queue.sort((a, b) => a.frequency - b.frequency || a.order - b.order);
    const left = queue.shift();
    const right = queue.shift();
    queue.push({
      symbol: null,
      frequency: left.frequency + right.frequency,
      left,
      right,
      order: order++,
    });
  }
  const root = queue[0];
  const codes = {};
  const walk = (node, prefix) => {
    if (!node) {
      return;
    }
    if (node.symbol) {
      codes[node.symbol] = prefix || '0';
      return;
    }
    walk(node.left, `${prefix}0`);
    walk(node.right, `${prefix}1`);
  };
  walk(root, '');
  return codes;
}

function computeHuffmanBits(exercise, codes) {
  let total = 0;
  for (const letter of exercise.letters) {
    const code = codes[letter.symbol];
    if (!code) {
      return null;
    }
    total += code.length * letter.frequency;
  }
  return total;
}

function computeFixedBits(exercise) {
  const bitsPerSymbol = Math.ceil(Math.log2(exercise.letters.length));
  return bitsPerSymbol * exercise.totalCharacters;
}

function computeActualHuffmanCodes(exercise, nodes) {
  const root = nodes.find((node) => node.parentId === null && node.isGenerated);
  if (!root) {
    return null;
  }
  const codes = {};
  const byParent = new Map();
  for (const node of nodes) {
    if (!node.parentId) {
      continue;
    }
    const bucket = byParent.get(node.parentId) ?? [];
    bucket.push(node);
    byParent.set(node.parentId, bucket);
  }
  const walk = (node, prefix) => {
    if (node.label) {
      codes[node.label] = prefix || '0';
      return;
    }
    const children = byParent.get(node.id) ?? [];
    for (const child of children) {
      if (!child.edgeWeight) {
        return;
      }
      walk(child, `${prefix}${child.edgeWeight}`);
    }
  };
  walk(root, '');
  if (Object.keys(codes).length !== exercise.letters.length) {
    return null;
  }
  return codes;
}

function isOptimalHuffmanTree(exercise, referenceBits, codes) {
  const bits = computeHuffmanBits(exercise, codes);
  return bits !== null && bits === referenceBits;
}

function createHuffmanSessionDescriptor(sessionId) {
  const exercise = generateHuffmanExercise();
  const referenceCodes = buildReferenceHuffmanCodes(exercise);
  const referenceBits = computeHuffmanBits(exercise, referenceCodes);

  return {
    category: 'greedy',
    variant: 'huffman-builder',
    scenario: {
      exercise,
      referenceCodes,
      referenceBits,
      codesAwardId: `huffman-codes-${sessionId}`,
      bitsAwardId: `huffman-bits-${sessionId}`,
    },
    clientScenario: {
      exercise,
    },
    state: {
      awardedCodes: false,
      awardedBits: false,
      codesAttempts: 0,
      codesErrors: 0,
      bitsAttempts: 0,
      bitsErrors: 0,
    },
    progress: {
      awardedCodes: false,
      awardedBits: false,
    },
    initialResult: {
      message: "Collega i nodi per costruire il tuo albero di Huffman.",
      awardedCodes: false,
      awardedBits: false,
      treeReady: false,
      optimal: false,
    },
  };
}

function applyHuffmanSubmission(session, eventType, payload) {
  const scenario = session.scenario;
  const state = ensureRecord(session.state);
  const progress = ensureRecord(session.progress);
  const nodes = ensureArray(payload?.nodes).map((node) => ({
    id: String(node?.id ?? ''),
    label: node?.label === null || node?.label === undefined ? null : String(node.label),
    value: Number(node?.value),
    parentId: node?.parentId === null || node?.parentId === undefined ? null : String(node.parentId),
    edgeWeight:
      node?.edgeWeight === '0' || node?.edgeWeight === '1' ? node.edgeWeight : null,
    isGenerated: Boolean(node?.isGenerated),
  }));
  const actualCodes = computeActualHuffmanCodes(scenario.exercise, nodes);
  const optimal = Boolean(actualCodes && isOptimalHuffmanTree(scenario.exercise, scenario.referenceBits, actualCodes));
  const awards = [];
  let message = '';

  if (eventType === 'codes') {
    state.codesAttempts = Math.max(0, Number(state.codesAttempts || 0)) + 1;
    if (!actualCodes) {
      state.codesErrors = Math.max(0, Number(state.codesErrors || 0)) + 1;
      message = "Completa l'albero e assegna pesi 0/1 per ottenere i codici.";
    } else if (!optimal) {
      state.codesErrors = Math.max(0, Number(state.codesErrors || 0)) + 1;
      message = "L'albero non rispetta l'unione progressiva dei nodi con peso minore.";
    } else {
      const submittedCodes = ensureRecord(payload?.letterCodes);
      const incorrect = Object.keys(scenario.referenceCodes).filter(
        (symbol) => String(submittedCodes[symbol] ?? '').trim() !== actualCodes[symbol]
      );
      if (incorrect.length) {
        state.codesErrors = Math.max(0, Number(state.codesErrors || 0)) + incorrect.length;
        message = `Alcuni codici non coincidono: ${incorrect.join(', ')}`;
      } else {
        message = "Ottimo! I codici coincidono con l'albero costruito.";
        if (!state.awardedCodes) {
          state.awardedCodes = true;
          awards.push(
            buildAward(
              session,
              scenario.codesAwardId,
              'greedy',
              120,
              Number(state.codesErrors || 0),
              Math.max(1, Number(state.codesAttempts || 1))
            )
          );
        }
      }
    }
  } else if (eventType === 'bits') {
    state.bitsAttempts = Math.max(0, Number(state.bitsAttempts || 0)) + 1;
    if (!actualCodes || !optimal) {
      state.bitsErrors = Math.max(0, Number(state.bitsErrors || 0)) + 1;
      message = 'Completa correttamente l’albero di Huffman prima di verificare i calcoli.';
    } else {
      const fixedBits = computeFixedBits(scenario.exercise);
      const savings = fixedBits - scenario.referenceBits;
      const userBits = ensureRecord(payload?.userBits);
      const userHuffman = Number(userBits.huffmanBits);
      const userFixed = Number(userBits.fixedBits);
      const userSavings = Number(userBits.savings);
      const feedback = [];
      if (userHuffman === scenario.referenceBits) {
        feedback.push('Calcolo Huffman corretto.');
      } else {
        feedback.push(`Huffman: ${scenario.referenceBits} bit attesi.`);
      }
      if (userFixed === fixedBits) {
        feedback.push('Bit a lunghezza fissa corretti.');
      } else {
        feedback.push(`A lunghezza fissa servono ${fixedBits} bit.`);
      }
      if (userSavings === savings) {
        feedback.push('Risparmio corretto.');
      } else {
        feedback.push(`Risparmio atteso: ${savings} bit.`);
      }
      const allCorrect = userHuffman === scenario.referenceBits && userFixed === fixedBits && userSavings === savings;
      if (!allCorrect) {
        state.bitsErrors =
          Math.max(0, Number(state.bitsErrors || 0)) +
          [userHuffman !== scenario.referenceBits, userFixed !== fixedBits, userSavings !== savings].filter(Boolean).length;
      } else if (!state.awardedBits) {
        state.awardedBits = true;
        awards.push(
          buildAward(
            session,
            scenario.bitsAwardId,
            'greedy',
            100,
            Number(state.bitsErrors || 0),
            Math.max(1, Number(state.bitsAttempts || 1))
          )
        );
      }
      message = feedback.join(' ');
    }
  } else {
    message = actualCodes
      ? optimal
        ? 'Albero di Huffman valido lato server.'
        : "L'albero esiste ma non è ottimale."
      : "Albero non ancora completo.";
  }

  progress.awardedCodes = Boolean(state.awardedCodes);
  progress.awardedBits = Boolean(state.awardedBits);

  return {
    state,
    progress,
    lastClientState: {
      nodes,
      letterCodes: ensureRecord(payload?.letterCodes),
      userBits: ensureRecord(payload?.userBits),
    },
    status: state.awardedCodes && state.awardedBits ? 'completed' : 'active',
    awards,
    result: {
      message,
      awardedCodes: Boolean(state.awardedCodes),
      awardedBits: Boolean(state.awardedBits),
      treeReady: Boolean(actualCodes),
      optimal,
    },
  };
}

function randomRbValue(min, max) {
  return randomBetween(min, max);
}

function generateUniqueRbValues(count, min, max) {
  const values = new Set();
  while (values.size < count) {
    values.add(randomRbValue(min, max));
  }
  return Array.from(values);
}

function pickUniqueRbValue(used, min, max) {
  let value = randomRbValue(min, max);
  while (used.has(value)) {
    value = randomRbValue(min, max);
  }
  return value;
}

function generateRbBuildSequence(length, min, max) {
  const sequence = generateUniqueRbValues(length, min, max);
  for (let i = sequence.length - 1; i > 0; i -= 1) {
    const index = Math.floor(Math.random() * (i + 1));
    [sequence[i], sequence[index]] = [sequence[index], sequence[i]];
  }
  return sequence;
}

function generateRbTasks(baseValues) {
  const tasks = [];
  const usedValues = new Set(baseValues);
  const insertCount = 3 + Math.floor(Math.random() * 2);
  for (let i = 0; i < insertCount; i += 1) {
    const value = pickUniqueRbValue(usedValues, 5, 70);
    usedValues.add(value);
    tasks.push({
      type: 'insert',
      value,
      description: `Inserisci ${value} e sistema i conflitti.`,
    });
  }

  const deleteCount = 1 + Math.floor(Math.random() * 2);
  const deletePool = [
    ...baseValues,
    ...tasks.filter((task) => task.type === 'insert').map((task) => task.value),
  ];
  for (let i = 0; i < deleteCount && deletePool.length; i += 1) {
    const index = Math.floor(Math.random() * deletePool.length);
    const value = deletePool.splice(index, 1)[0];
    tasks.push({
      type: 'delete',
      value,
      description: `Elimina ${value} mantenendo il bilanciamento.`,
    });
  }

  const buildSequence = generateRbBuildSequence(randomBetween(4, 6), 5, 80);
  tasks.push({
    type: 'build',
    sequence: buildSequence,
    description: `Costruisci l'albero partendo da ${buildSequence[0]} e usa tutti i valori dell'array.`,
  });
  return tasks;
}

function cloneRbStructure(node, parent = null) {
  if (!node) {
    return null;
  }
  const clone = {
    value: node.value,
    color: node.color,
    left: null,
    right: null,
    parent,
  };
  clone.left = cloneRbStructure(node.left, clone);
  clone.right = cloneRbStructure(node.right, clone);
  return clone;
}

function createRbMetrics() {
  return {
    inserts: 0,
    deletes: 0,
    rotations: 0,
    recolors: 0,
  };
}

function rbStructureColor(node) {
  return node?.color ?? 'black';
}

function applyRbStructureColor(node, color, metrics) {
  if (!node) {
    return;
  }
  if (node.color !== color) {
    node.color = color;
    if (metrics) {
      metrics.recolors += 1;
    }
  }
}

function rotateRbStructureLeft(root, node, metrics) {
  const pivot = node.right;
  if (!pivot) {
    return root;
  }
  if (metrics) {
    metrics.rotations += 1;
  }
  node.right = pivot.left;
  if (pivot.left) {
    pivot.left.parent = node;
  }
  pivot.parent = node.parent ?? null;
  if (!node.parent) {
    root = pivot;
  } else if (node === node.parent.left) {
    node.parent.left = pivot;
  } else {
    node.parent.right = pivot;
  }
  pivot.left = node;
  node.parent = pivot;
  return root;
}

function rotateRbStructureRight(root, node, metrics) {
  const pivot = node.left;
  if (!pivot) {
    return root;
  }
  if (metrics) {
    metrics.rotations += 1;
  }
  node.left = pivot.right;
  if (pivot.right) {
    pivot.right.parent = node;
  }
  pivot.parent = node.parent ?? null;
  if (!node.parent) {
    root = pivot;
  } else if (node === node.parent.right) {
    node.parent.right = pivot;
  } else {
    node.parent.left = pivot;
  }
  pivot.right = node;
  node.parent = pivot;
  return root;
}

function findRbStructureNode(root, value) {
  let current = root;
  while (current) {
    if (value === current.value) {
      return current;
    }
    current = value < current.value ? current.left : current.right;
  }
  return null;
}

function transplantRbStructure(root, source, target) {
  if (!source.parent) {
    root = target;
  } else if (source === source.parent.left) {
    source.parent.left = target;
  } else {
    source.parent.right = target;
  }
  if (target) {
    target.parent = source.parent;
  }
  return root;
}

function minimumRbStructureNode(node) {
  let current = node;
  while (current.left) {
    current = current.left;
  }
  return current;
}

function fixRbInsertStructure(root, node, metrics) {
  let current = node;
  while (current.parent && current.parent.color === 'red') {
    const parent = current.parent;
    const grand = parent.parent;
    if (!grand) {
      break;
    }
    if (parent === grand.left) {
      const uncle = grand.right;
      if (rbStructureColor(uncle) === 'red') {
        applyRbStructureColor(parent, 'black', metrics);
        applyRbStructureColor(uncle, 'black', metrics);
        applyRbStructureColor(grand, 'red', metrics);
        current = grand;
      } else {
        if (current === parent.right) {
          current = parent;
          root = rotateRbStructureLeft(root, current, metrics);
        }
        if (current.parent) {
          applyRbStructureColor(current.parent, 'black', metrics);
        }
        applyRbStructureColor(grand, 'red', metrics);
        root = rotateRbStructureRight(root, grand, metrics);
      }
    } else {
      const uncle = grand.left;
      if (rbStructureColor(uncle) === 'red') {
        applyRbStructureColor(parent, 'black', metrics);
        applyRbStructureColor(uncle, 'black', metrics);
        applyRbStructureColor(grand, 'red', metrics);
        current = grand;
      } else {
        if (current === parent.left) {
          current = parent;
          root = rotateRbStructureRight(root, current, metrics);
        }
        if (current.parent) {
          applyRbStructureColor(current.parent, 'black', metrics);
        }
        applyRbStructureColor(grand, 'red', metrics);
        root = rotateRbStructureLeft(root, grand, metrics);
      }
    }
  }
  applyRbStructureColor(root, 'black', metrics);
  if (root) {
    root.parent = null;
  }
  return root;
}

function insertRbStructureNode(root, value, metrics) {
  const node = {
    value,
    color: 'red',
    left: null,
    right: null,
    parent: null,
  };
  let parent = null;
  let current = root;
  while (current) {
    parent = current;
    current = value < current.value ? current.left : current.right;
  }
  node.parent = parent;
  if (!parent) {
    root = node;
  } else if (value < parent.value) {
    parent.left = node;
  } else {
    parent.right = node;
  }
  if (metrics) {
    metrics.inserts += 1;
  }
  return fixRbInsertStructure(root ?? node, node, metrics);
}

function fixRbDeleteStructure(root, node, parent, metrics) {
  let current = node;
  let currentParent = parent;
  while (current !== root && rbStructureColor(current) === 'black') {
    if (current === (currentParent?.left ?? null)) {
      let sibling = currentParent?.right ?? null;
      if (rbStructureColor(sibling) === 'red') {
        applyRbStructureColor(sibling, 'black', metrics);
        applyRbStructureColor(currentParent, 'red', metrics);
        root = rotateRbStructureLeft(root, currentParent, metrics);
        sibling = currentParent?.right ?? null;
      }
      if (
        rbStructureColor(sibling?.left ?? null) === 'black' &&
        rbStructureColor(sibling?.right ?? null) === 'black'
      ) {
        applyRbStructureColor(sibling, 'red', metrics);
        current = currentParent;
        currentParent = current?.parent ?? null;
      } else {
        if (rbStructureColor(sibling?.right ?? null) === 'black') {
          applyRbStructureColor(sibling?.left ?? null, 'black', metrics);
          applyRbStructureColor(sibling, 'red', metrics);
          root = rotateRbStructureRight(root, sibling, metrics);
          sibling = currentParent?.right ?? null;
        }
        applyRbStructureColor(sibling, currentParent?.color ?? 'black', metrics);
        applyRbStructureColor(currentParent, 'black', metrics);
        applyRbStructureColor(sibling?.right ?? null, 'black', metrics);
        root = rotateRbStructureLeft(root, currentParent, metrics);
        current = root;
        currentParent = null;
      }
    } else {
      let sibling = currentParent?.left ?? null;
      if (rbStructureColor(sibling) === 'red') {
        applyRbStructureColor(sibling, 'black', metrics);
        applyRbStructureColor(currentParent, 'red', metrics);
        root = rotateRbStructureRight(root, currentParent, metrics);
        sibling = currentParent?.left ?? null;
      }
      if (
        rbStructureColor(sibling?.left ?? null) === 'black' &&
        rbStructureColor(sibling?.right ?? null) === 'black'
      ) {
        applyRbStructureColor(sibling, 'red', metrics);
        current = currentParent;
        currentParent = current?.parent ?? null;
      } else {
        if (rbStructureColor(sibling?.left ?? null) === 'black') {
          applyRbStructureColor(sibling?.right ?? null, 'black', metrics);
          applyRbStructureColor(sibling, 'red', metrics);
          root = rotateRbStructureLeft(root, sibling, metrics);
          sibling = currentParent?.left ?? null;
        }
        applyRbStructureColor(sibling, currentParent?.color ?? 'black', metrics);
        applyRbStructureColor(currentParent, 'black', metrics);
        applyRbStructureColor(sibling?.left ?? null, 'black', metrics);
        root = rotateRbStructureRight(root, currentParent, metrics);
        current = root;
        currentParent = null;
      }
    }
  }
  applyRbStructureColor(current, 'black', metrics);
  if (root) {
    applyRbStructureColor(root, 'black', metrics);
    root.parent = null;
  }
  return root;
}

function deleteRbStructureNode(root, value, metrics) {
  let target = findRbStructureNode(root, value);
  if (!target) {
    return root;
  }
  if (metrics) {
    metrics.deletes += 1;
  }
  let replacement = target;
  let replacementOriginalColor = replacement.color;
  let current = null;
  if (!target.left) {
    current = target.right;
    root = transplantRbStructure(root, target, target.right);
  } else if (!target.right) {
    current = target.left;
    root = transplantRbStructure(root, target, target.left);
  } else {
    replacement = minimumRbStructureNode(target.right);
    replacementOriginalColor = replacement.color;
    current = replacement.right;
    if (replacement.parent === target) {
      if (current) {
        current.parent = replacement;
      }
    } else {
      root = transplantRbStructure(root, replacement, replacement.right);
      replacement.right = target.right;
      if (replacement.right) {
        replacement.right.parent = replacement;
      }
    }
    root = transplantRbStructure(root, target, replacement);
    replacement.left = target.left;
    if (replacement.left) {
      replacement.left.parent = replacement;
    }
    applyRbStructureColor(replacement, target.color, metrics);
  }
  if (replacementOriginalColor === 'black') {
    root = fixRbDeleteStructure(root, current, target.parent ?? null, metrics);
  }
  return root;
}

function buildRbStructureFromSequence(sequence, metrics) {
  let root = null;
  for (const value of sequence) {
    root = insertRbStructureNode(root, value, metrics);
  }
  return root;
}

function applyRbTaskToStructure(root, task, metrics) {
  let working = cloneRbStructure(root);
  if (!task) {
    return { root: working, ops: 0 };
  }
  switch (task.type) {
    case 'insert':
      if (typeof task.value === 'number') {
        working = insertRbStructureNode(working, task.value, metrics);
      }
      break;
    case 'delete':
      if (typeof task.value === 'number') {
        working = deleteRbStructureNode(working, task.value, metrics);
      }
      break;
    case 'build':
      working = buildRbStructureFromSequence(task.sequence ?? [], metrics);
      break;
    default:
      break;
  }
  return {
    root: working,
    ops:
      Number(metrics?.inserts || 0) +
      Number(metrics?.deletes || 0) +
      Number(metrics?.rotations || 0) +
      Number(metrics?.recolors || 0),
  };
}

function serializeRbStructure(node) {
  if (!node) {
    return null;
  }
  return {
    value: node.value,
    color: node.color,
    left: serializeRbStructure(node.left),
    right: serializeRbStructure(node.right),
  };
}

function compareSerializedRbStructure(a, b) {
  if (!a && !b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  if (a.value !== b.value || a.color !== b.color) {
    return false;
  }
  return compareSerializedRbStructure(a.left, b.left) && compareSerializedRbStructure(a.right, b.right);
}

function buildRbBaseTree(baseValues) {
  let root = null;
  for (const value of baseValues) {
    root = insertRbStructureNode(root, value, null);
  }
  return root;
}

function computeRbExpectedStructures(baseRoot, tasks) {
  let simulated = cloneRbStructure(baseRoot);
  const structures = [];
  const ops = [];
  for (const task of tasks) {
    const metrics = createRbMetrics();
    const result = applyRbTaskToStructure(simulated, task, metrics);
    simulated = result.root;
    structures.push(serializeRbStructure(simulated));
    ops.push(result.ops);
  }
  return { structures, ops };
}

function deserializeSubmittedRbTree(data, parent = null) {
  if (!data) {
    return null;
  }
  const node = {
    id: String(data.id ?? ''),
    value: Number(data.value),
    color: data.color === 'black' ? 'black' : 'red',
    left: null,
    right: null,
    parent,
  };
  node.left = deserializeSubmittedRbTree(data.left, node);
  node.right = deserializeSubmittedRbTree(data.right, node);
  return node;
}

function stripSubmittedRbTree(node) {
  if (!node) {
    return null;
  }
  return {
    value: node.value,
    color: node.color,
    left: stripSubmittedRbTree(node.left),
    right: stripSubmittedRbTree(node.right),
  };
}

function checkRbColoring(node, issues) {
  if (!node) {
    return true;
  }
  if (node.color !== 'red' && node.color !== 'black') {
    issues.push(`Nodo ${node.value} deve essere rosso o nero.`);
    return false;
  }
  return checkRbColoring(node.left, issues) && checkRbColoring(node.right, issues);
}

function checkRbRedChildren(node, issues) {
  if (!node) {
    return true;
  }
  let valid = true;
  if (node.color === 'red') {
    if ((node.left && node.left.color === 'red') || (node.right && node.right.color === 'red')) {
      issues.push(`Nodo ${node.value} rosso non può avere figli rossi.`);
      valid = false;
    }
  }
  return checkRbRedChildren(node.left, issues) && checkRbRedChildren(node.right, issues) && valid;
}

function computeRbBlackHeight(node, map) {
  if (!node) {
    return [true, 1];
  }
  const [leftValid, leftHeight] = computeRbBlackHeight(node.left, map);
  const [rightValid, rightHeight] = computeRbBlackHeight(node.right, map);
  const valid = leftValid && rightValid && leftHeight === rightHeight;
  const height = leftHeight + (node.color === 'black' ? 1 : 0);
  if (node.id) {
    map[node.id] = height;
  }
  return [valid, height];
}

function validateSubmittedRbTree(root) {
  if (!root) {
    return {
      property1: true,
      property2: true,
      property3: true,
      property4: true,
      property5: true,
      blackHeightMap: {},
      issues: [],
    };
  }
  const issues = [];
  const property1 = checkRbColoring(root, issues);
  const property2 = root.color === 'black';
  if (!property2) {
    issues.push('La radice deve essere nera.');
  }
  const property3 = true;
  const property4 = checkRbRedChildren(root, issues);
  const blackHeightMap = {};
  const [property5] = computeRbBlackHeight(root, blackHeightMap);
  if (!property5) {
    issues.push('Percorsi con altezza nera diversa.');
  }
  return {
    property1,
    property2,
    property3,
    property4,
    property5,
    blackHeightMap,
    issues,
  };
}

function collectRbBstViolations(node, min = -Infinity, max = Infinity, issues = []) {
  if (!node) {
    return issues;
  }
  if (!Number.isFinite(node.value)) {
    issues.push('Presente un nodo con valore non numerico.');
    return issues;
  }
  if (node.value <= min || node.value >= max) {
    issues.push(`Nodo ${node.value} viola l'ordinamento BST.`);
  }
  collectRbBstViolations(node.left, min, node.value, issues);
  collectRbBstViolations(node.right, node.value, max, issues);
  return issues;
}

function findSubmittedRbNodeByValue(node, value) {
  if (!node) {
    return null;
  }
  if (node.value === value) {
    return node;
  }
  if (value < node.value) {
    return findSubmittedRbNodeByValue(node.left, value);
  }
  return findSubmittedRbNodeByValue(node.right, value);
}

function collectSubmittedRbValues(node, values = []) {
  if (!node) {
    return values;
  }
  values.push(node.value);
  collectSubmittedRbValues(node.left, values);
  collectSubmittedRbValues(node.right, values);
  return values;
}

function rbTaskPoints(task) {
  if (task.type === 'build') {
    return 60;
  }
  if (task.type === 'delete') {
    return 50;
  }
  return 40;
}

function createRbSessionDescriptor(sessionId) {
  const template = pickRandom(RB_SCENARIO_TEMPLATES);
  const baseValues = generateUniqueRbValues(randomBetween(5, 7), 3, 60).sort((a, b) => a - b);
  const tasks = generateRbTasks(baseValues);
  const baseRoot = buildRbBaseTree(baseValues);
  const expected = computeRbExpectedStructures(baseRoot, tasks);

  return {
    category: 'rbTree',
    variant: 'rb-tree',
    scenario: {
      title: template.title,
      description: template.description,
      baseValues,
      tasks,
      expectedTaskStructures: expected.structures,
      expectedTaskOps: expected.ops,
      taskAwardIds: tasks.map((_, index) => `rb-tree-${sessionId}-task-${index}`),
      scenarioAwardId: `rb-tree-${sessionId}-complete`,
    },
    clientScenario: {
      title: template.title,
      description: template.description,
      baseValues,
      tasks,
    },
    state: {
      activeTaskIndex: 0,
      tasksCompleted: tasks.map(() => false),
      taskStepCount: 0,
      scenarioErrors: 0,
      scenarioCompleted: false,
    },
    progress: {
      activeTaskIndex: 0,
      tasksCompleted: tasks.map(() => false),
      scenarioCompleted: false,
    },
    initialResult: {
      validation: {
        property1: true,
        property2: true,
        property3: true,
        property4: true,
        property5: true,
        blackHeightMap: {},
        issues: [],
      },
      bstValid: true,
      activeTaskIndex: 0,
      tasksCompleted: tasks.map(() => false),
      scenarioCompleted: false,
      message: '',
    },
  };
}

function applyRbSubmission(session, eventType, payload) {
  const scenario = session.scenario;
  const state = ensureRecord(session.state);
  const progress = ensureRecord(session.progress);
  const tasks = ensureArray(scenario.tasks);
  const tasksCompleted = ensureArray(state.tasksCompleted).length === tasks.length
    ? ensureArray(state.tasksCompleted).map(Boolean)
    : tasks.map(() => false);
  const submittedRoot = deserializeSubmittedRbTree(payload?.tree);
  const validation = validateSubmittedRbTree(submittedRoot);
  const bstIssues = collectRbBstViolations(submittedRoot);
  const bstValid = bstIssues.length === 0;
  validation.issues = [...validation.issues, ...bstIssues];

  let activeTaskIndex = Number.isInteger(state.activeTaskIndex) ? state.activeTaskIndex : 0;
  let taskStepCount = Math.max(0, Number(state.taskStepCount || 0));
  let scenarioErrors = Math.max(0, Number(state.scenarioErrors || 0));
  let scenarioCompleted = Boolean(state.scenarioCompleted);

  if (eventType !== 'init' && !scenarioCompleted) {
    taskStepCount += 1;
  }

  let message = '';
  let taskJustCompletedIndex = null;
  const awards = [];
  const currentTask = tasks[activeTaskIndex] ?? null;
  const validRb =
    validation.property1 &&
    validation.property2 &&
    validation.property3 &&
    validation.property4 &&
    validation.property5;

  if (!scenarioCompleted && currentTask) {
    let taskCompleted = false;
    if (!validRb) {
      message = 'Sistema le proprietà RB prima di completare il task.';
    } else if (currentTask.type === 'insert') {
      taskCompleted = Boolean(findSubmittedRbNodeByValue(submittedRoot, currentTask.value));
      if (!taskCompleted) {
        message = `Non trovo il nodo ${currentTask.value} nell'albero.`;
      }
    } else if (currentTask.type === 'delete') {
      taskCompleted = !findSubmittedRbNodeByValue(submittedRoot, currentTask.value);
      if (!taskCompleted) {
        message = `Il nodo ${currentTask.value} è ancora presente.`;
      }
    } else if (currentTask.type === 'build') {
      if (!bstValid) {
        message = 'Sistema anche la proprietà BST prima di completare il build.';
      } else {
        const treeValues = collectSubmittedRbValues(submittedRoot).sort((a, b) => a - b);
        const targetValues = [...(currentTask.sequence ?? [])].sort((a, b) => a - b);
        if (treeValues.length !== targetValues.length) {
          message = "L'albero non contiene ancora tutti i valori richiesti.";
        } else {
          const sameValues = treeValues.every((value, index) => value === targetValues[index]);
          if (!sameValues) {
            message = 'Sono presenti valori diversi da quelli richiesti.';
          } else {
            taskCompleted = true;
          }
        }
      }
    }

    if (taskCompleted) {
      const expectedStructure = ensureArray(scenario.expectedTaskStructures)[activeTaskIndex] ?? null;
      const matchesStructure = compareSerializedRbStructure(stripSubmittedRbTree(submittedRoot), expectedStructure);
      if (!matchesStructure) {
        message = 'La struttura finale del task non coincide con la soluzione attesa.';
        taskCompleted = false;
      }
    }

    if (taskCompleted && !tasksCompleted[activeTaskIndex]) {
      tasksCompleted[activeTaskIndex] = true;
      taskJustCompletedIndex = activeTaskIndex;
      message = `Task completato: ${currentTask.description}`;
      const expectedOps = ensureArray(scenario.expectedTaskOps)[activeTaskIndex] ?? taskStepCount;
      const taskErrors = Math.min(Math.max(0, taskStepCount - expectedOps), 20);
      scenarioErrors += taskErrors;
      awards.push(
        buildAward(
          session,
          ensureArray(scenario.taskAwardIds)[activeTaskIndex],
          'rbTree',
          rbTaskPoints(currentTask),
          taskErrors,
          1
        )
      );
      const nextTaskIndex = tasks.findIndex((_, index) => !tasksCompleted[index]);
      if (nextTaskIndex === -1) {
        scenarioCompleted = true;
        activeTaskIndex = tasks.length;
        const safeScenarioErrors = Math.min(scenarioErrors, 30);
        awards.push(
          buildAward(session, scenario.scenarioAwardId, 'rbTree', 140, safeScenarioErrors, 1)
        );
        message = 'Scenario completato! Ottimo lavoro.';
      } else {
        activeTaskIndex = nextTaskIndex;
      }
      taskStepCount = 0;
    }
  } else if (scenarioCompleted) {
    message = 'Scenario completato! Ottimo lavoro.';
  }

  state.activeTaskIndex = activeTaskIndex;
  state.tasksCompleted = tasksCompleted;
  state.taskStepCount = taskStepCount;
  state.scenarioErrors = scenarioErrors;
  state.scenarioCompleted = scenarioCompleted;
  progress.activeTaskIndex = activeTaskIndex;
  progress.tasksCompleted = tasksCompleted;
  progress.scenarioCompleted = scenarioCompleted;
  progress.scenarioErrors = scenarioErrors;

  return {
    state,
    progress,
    lastClientState: {
      tree: payload?.tree ?? null,
    },
    status: scenarioCompleted ? 'completed' : 'active',
    awards,
    result: {
      validation,
      bstValid,
      activeTaskIndex,
      tasksCompleted,
      scenarioCompleted,
      taskJustCompletedIndex,
      message,
    },
  };
}

function createLabSessionDescriptor({ sessionId, labType, variant }) {
  switch (labType) {
    case 'heap':
      return createHeapSessionDescriptor(sessionId, variant);
    case 'graphs':
      return createGraphSessionDescriptor(sessionId, variant);
    case 'dp':
      return createDpSessionDescriptor(sessionId, variant);
    case 'hashTable':
      return createHashSessionDescriptor(sessionId);
    case 'master':
      return createMasterSessionDescriptor(sessionId);
    case 'greedy':
    case 'huffman':
      return createHuffmanSessionDescriptor(sessionId);
    case 'rbTree':
      return createRbSessionDescriptor(sessionId);
    default:
      throw new Error('Laboratorio non supportato');
  }
}

function applyLabSubmission(session, submission) {
  const eventType = typeof submission?.eventType === 'string' ? submission.eventType : 'draft';
  const payload = ensureRecord(submission?.payload);
  switch (session.labType) {
    case 'heap':
      return applyHeapSubmission(session, eventType, payload);
    case 'graphs':
      return applyGraphSubmission(session, eventType, payload);
    case 'dp':
      return applyDpSubmission(session, eventType, payload);
    case 'hashTable':
      return applyHashSubmission(session, eventType, payload);
    case 'master':
      return applyMasterSubmission(session, eventType, payload);
    case 'greedy':
    case 'huffman':
      return applyHuffmanSubmission(session, eventType, payload);
    case 'rbTree':
      return applyRbSubmission(session, eventType, payload);
    default:
      throw new Error('Laboratorio non supportato');
  }
}

module.exports = {
  createLabSessionDescriptor,
  applyLabSubmission,
};
