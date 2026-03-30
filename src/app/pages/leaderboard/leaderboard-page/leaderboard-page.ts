import { Component, OnInit } from '@angular/core';
import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { LeaderboardService } from '../../../core/services/leaderboard';
import { LeaderboardEntry } from '../../../core/models/leaderboard.model';

interface CategoryHeader {
  key: string;
  label: string;
}

@Component({
  selector: 'app-leaderboard-page',
  standalone: true,
  imports: [NgFor, NgIf, DecimalPipe, RouterLink],
  templateUrl: './leaderboard-page.html',
  styleUrl: './leaderboard-page.scss',
})
export class LeaderboardPageComponent implements OnInit {
  entries: LeaderboardEntry[] = [];
  isLoading = false;
  errorMessage = '';

  readonly categories: CategoryHeader[] = [
    { key: 'code', label: 'Code' },
    { key: 'heap', label: 'Heap' },
    { key: 'rbTree', label: 'RB' },
    { key: 'graphs', label: 'Graphs' },
    { key: 'master', label: 'Master' },
    { key: 'huffman', label: 'Huffman' },
    { key: 'dp', label: 'DP' },
    { key: 'hashTable', label: 'Hash' },
  ];

  constructor(private leaderboardService: LeaderboardService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.leaderboardService
      .getLeaderboard(20)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response) => {
          this.entries = response.leaderboard;
        },
        error: (error) => {
          this.errorMessage = error?.error?.error ?? 'Impossibile caricare la classifica.';
        },
      });
  }

  scoreFor(entry: LeaderboardEntry, key: string): number {
    return entry.categoryScores?.[key] ?? 0;
  }
}
