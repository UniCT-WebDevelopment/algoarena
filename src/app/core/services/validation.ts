import { Injectable } from '@angular/core';

export type HeapType = 'max' | 'min';

export interface HeapValidationResult {
  valid: boolean;
  violations: number[];
}

export interface RbTreeNode {
  id: string;
  value: number;
  color: 'red' | 'black';
  left?: RbTreeNode | null;
  right?: RbTreeNode | null;
}

export interface RbTreeValidationResult {
  property1: boolean;
  property2: boolean;
  property3: boolean;
  property4: boolean;
  property5: boolean;
  blackHeightMap: Record<string, number>;
  issues: string[];
}

@Injectable({
  providedIn: 'root',
})
export class ValidationService {
  validateHeap(arr: number[], type: HeapType): HeapValidationResult {
    const violations: number[] = [];
    for (let i = 0; i < arr.length; i++) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < arr.length && !this.compare(arr[i], arr[left], type)) {
        violations.push(left);
      }
      if (right < arr.length && !this.compare(arr[i], arr[right], type)) {
        violations.push(right);
      }
    }
    return { valid: violations.length === 0, violations };
  }

  validateRbTree(root: RbTreeNode | null): RbTreeValidationResult {
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
    const issues: string[] = [];
    const property1 = this.checkColoring(root, issues);
    const property2 = root.color === 'black';
    if (!property2) {
      issues.push('La radice deve essere nera.');
    }
    const property3 = this.checkNilNodesBlack(root, issues);
    const property4 = this.checkRedChildren(root, issues);
    const blackHeightMap: Record<string, number> = {};
    const property5 = this.checkBlackHeight(root, blackHeightMap, issues);
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

  private compare(parent: number, child: number, type: HeapType): boolean {
    return type === 'max' ? parent >= child : parent <= child;
  }

  private checkColoring(node: RbTreeNode | null, issues: string[]): boolean {
    if (!node) {
      return true;
    }
    if (node.color !== 'red' && node.color !== 'black') {
      issues.push(`Nodo ${node.value} deve essere rosso o nero.`);
      return false;
    }
    return this.checkColoring(node.left ?? null, issues) && this.checkColoring(node.right ?? null, issues);
  }

  private checkNilNodesBlack(node: RbTreeNode | null, issues: string[]): boolean {
    if (!node) {
      return true;
    }
    return this.checkNilNodesBlack(node.left ?? null, issues) && this.checkNilNodesBlack(node.right ?? null, issues);
  }

  private checkRedChildren(node: RbTreeNode | null, issues: string[]): boolean {
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
    return this.checkRedChildren(node.left ?? null, issues) && this.checkRedChildren(node.right ?? null, issues) && valid;
  }

  private checkBlackHeight(node: RbTreeNode | null, map: Record<string, number>, issues: string[]): boolean {
    if (!node) {
      return true;
    }
    const [valid, height] = this.computeBlackHeight(node, map);
    if (!valid) {
      issues.push('Percorsi con altezza nera diversa.');
    }
    map[node.id] = height;
    return valid;
  }

  private computeBlackHeight(node: RbTreeNode | null, map: Record<string, number>): [boolean, number] {
    if (!node) {
      return [true, 1];
    }
    const [leftValid, leftHeight] = this.computeBlackHeight(node.left ?? null, map);
    const [rightValid, rightHeight] = this.computeBlackHeight(node.right ?? null, map);
    const isBalanced = leftHeight === rightHeight;
    const height = leftHeight + (node.color === 'black' ? 1 : 0);
    map[node.id] = height;
    return [leftValid && rightValid && isBalanced, height];
  }
}
