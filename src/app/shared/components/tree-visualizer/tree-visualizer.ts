import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { NgFor, NgClass } from '@angular/common';

interface TreeNodeView {
  value: number;
  index: number;
}

@Component({
  selector: 'app-tree-visualizer',
  standalone: true,
  imports: [NgFor, NgClass],
  templateUrl: './tree-visualizer.html',
  styleUrl: './tree-visualizer.scss',
})
export class TreeVisualizerComponent implements OnChanges {
  @Input() array: number[] = [];
  @Input() violations: number[] = [];

  levels: TreeNodeView[][] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['array']) {
      this.levels = this.buildLevels(this.array);
    }
  }

  isViolation(index: number): boolean {
    return this.violations.includes(index);
  }

  private buildLevels(arr: number[]): TreeNodeView[][] {
    const levels: TreeNodeView[][] = [];
    let level = 0;
    let count = 1;
    let i = 0;
    while (i < arr.length) {
      const slice = arr.slice(i, i + count);
      levels[level] = slice.map((value, idx) => ({
        value,
        index: i + idx,
      }));
      i += count;
      count *= 2;
      level++;
    }
    return levels;
  }
}
