import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AsyncPipe, DecimalPipe, NgFor, NgIf } from '@angular/common';
import { ExerciseService } from '../../../core/services/exercise';
import { ExerciseDescriptor } from '../../../core/models/exercise.model';
import { AuthService } from '../../../core/services/auth';
import { LeaderboardService } from '../../../core/services/leaderboard';
import { catchError, of } from 'rxjs';

interface DashboardCard {
  title: string;
  description: string;
  icon: string;
  route: string;
  category: string;
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [RouterLink, NgFor, NgIf, AsyncPipe, DecimalPipe],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPageComponent {
  featuredExercises: ExerciseDescriptor[];
  private exerciseService = inject(ExerciseService);
  private authService = inject(AuthService);
  private leaderboardService = inject(LeaderboardService);
  readonly user$ = this.authService.user$;
  readonly rankInfo$ = this.leaderboardService.getMyRank().pipe(catchError(() => of(null)));
  cards: DashboardCard[] = [
    {
      title: 'Code Arena',
      description: 'Sfida il tempo con algoritmi veri: compila, testa e conquista punti',
      icon: '⌨️',
      route: '/code-arena',
      category: 'code',
    },
    {
      title: 'Heap Arena',
      description: 'Costruisci un heap perfetto con drag & drop e porta il tuo punteggio alle stelle',
      icon: '🧱',
      route: '/heap',
      category: 'heap',
    },
    {
      title: 'RB-Tree Builder',
      description: 'Stabilizza ogni inserimento: rotazioni, ricolorazioni e albero sempre bilanciato',
      icon: '🌳',
      route: '/rb-tree',
      category: 'rbTree',
    },
    {
      title: 'Graph Shortest Path Lab',
      description: 'Trova il percorso migliore: visualizza e verifica ogni step',
      icon: '🕸️',
      route: '/graphs/lab',
      category: 'graphs',
    },
    {
      title: 'Master Theorem',
      description: 'Sblocca le ricorrenze e individua la complessita a colpo d occhio',
      icon: '📐',
      route: '/master-theorem',
      category: 'master',
    },
    {
      title: 'Huffman Arena',
      description: 'Comprimi i dati: costruisci l albero e taglia i bit in eccesso',
      icon: '🔤',
      route: '/huffman',
      category: 'huffman',
    },
    {
      title: 'String DP Lab',
      description: 'Domina gli algoritmi LCS ed edit distance',
      icon: '🧮',
      route: '/strings/dp',
      category: 'dp',
    },
    {
      title: 'Hash Open Lab',
      description: 'Gioca con probing e collisioni: ottimizza i bucket e scala',
      icon: '🧊',
      route: '/hash/open',
      category: 'hashTable',
    },
  ];

  constructor() {
    this.featuredExercises = this.exerciseService.getExercises();
  }
}
