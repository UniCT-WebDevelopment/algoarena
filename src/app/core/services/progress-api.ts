import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../config';
import { AuthService } from './auth';

export interface ProgressResponse {
  alreadyCompleted: boolean;
  pointsAwarded: number;
  user: {
    id: string;
    name: string;
    email: string;
    totalScore: number;
    categoryScores: Record<string, number>;
    completedExercises: string[];
  };
}

@Injectable({
  providedIn: 'root',
})
export class ProgressApiService {
  constructor(private http: HttpClient, private authService: AuthService) {}

  completeExercise(payload: {
    exerciseId: string;
    category: string;
    points: number;
    durationMs?: number;
    errors?: number;
    attempts?: number;
  }): Observable<ProgressResponse> {
    return this.http.post<ProgressResponse>(`${API_BASE_URL}/progress/complete`, payload).pipe(
      tap((response) => {
        if (response?.user) {
          this.authService.updateUser(response.user);
        }
      })
    );
  }
}
