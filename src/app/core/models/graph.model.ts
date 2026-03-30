export interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  weight: number;
  directed?: boolean;
}

export interface GraphScenario {
  id: string;
  title: string;
  description: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  source: string;
}
