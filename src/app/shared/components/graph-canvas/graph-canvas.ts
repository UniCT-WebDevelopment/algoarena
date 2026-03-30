import { Component, Input } from '@angular/core';
import { NgFor, NgClass } from '@angular/common';
import { GraphEdge, GraphNode } from '../../../core/models/graph.model';

@Component({
  selector: 'app-graph-canvas',
  standalone: true,
  imports: [NgFor, NgClass],
  templateUrl: './graph-canvas.html',
  styleUrl: './graph-canvas.scss',
})
export class GraphCanvasComponent {
  @Input() nodes: GraphNode[] = [];
  @Input() edges: GraphEdge[] = [];
  @Input() activeNode?: string;
  @Input() settledNodes: Set<string> = new Set();
  @Input() frontierNodes: Set<string> = new Set();

  getNodeClasses(nodeId: string): Record<string, boolean> {
    return {
      active: this.activeNode === nodeId,
      settled: this.settledNodes.has(nodeId),
      frontier: this.frontierNodes.has(nodeId),
    };
  }

  getNodeById(id: string): GraphNode | undefined {
    return this.nodes.find((node) => node.id === id);
  }
}
