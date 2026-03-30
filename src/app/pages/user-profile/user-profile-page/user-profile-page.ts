import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { finalize } from 'rxjs';
import { UserStatsService } from '../../../core/services/user-stats';
import { UserStatsResponse } from '../../../core/models/user-stats.model';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-user-profile-page',
  standalone: true,
  imports: [NgIf, NgFor, DecimalPipe],
  templateUrl: './user-profile-page.html',
  styleUrl: './user-profile-page.scss',
})
export class UserProfilePageComponent implements OnInit {
  profile: UserStatsResponse | null = null;
  isLoading = false;
  errorMessage = '';
  userId = '';
  private authService = inject(AuthService);
  readonly currentUser$ = this.authService.user$;

  constructor(
    private route: ActivatedRoute,
    private userStatsService: UserStatsService
  ) {}

  private readonly categoryLabels: Record<string, string> = {
    code: 'Code',
    heap: 'Heap',
    rbTree: 'RB-Tree',
    graphs: 'Graphs',
    master: 'Master',
    huffman: 'Huffman',
    dp: 'DP',
    greedy: 'Greedy',
    hashTable: 'Hash',
  };

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id') ?? '';
      this.userId = id;
      this.load();
    });
  }

  load(): void {
    if (!this.userId) return;
    this.isLoading = true;
    this.errorMessage = '';
    this.userStatsService
      .getUserStats(this.userId)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response) => {
          this.profile = response;
        },
        error: (error) => {
          this.errorMessage = error?.error?.error ?? 'Impossibile caricare le statistiche utente.';
        },
      });
  }

  formatDuration(ms?: number | null): string {
    if (!ms || ms <= 0) return '-';
    const totalSeconds = Math.round(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes <= 0) return `${seconds}s`;
    if (minutes < 60) return `${minutes}m ${seconds}s`;
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return `${hours}h ${remaining}m`;
  }

  formatDate(value?: string): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString();
  }

  categoryLabel(key?: string): string {
    if (!key) return '-';
    return this.categoryLabels[key] ?? key;
  }

  categoryScore(key: string): number {
    return this.profile?.user?.categoryScores?.[key] ?? 0;
  }
}
