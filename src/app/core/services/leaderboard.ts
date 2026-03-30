import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config';
import { LeaderboardEntry } from '../models/leaderboard.model';

@Injectable({
  providedIn: 'root',
})
export class LeaderboardService {
  constructor(private http: HttpClient) {}

  getLeaderboard(limit = 10): Observable<{ leaderboard: LeaderboardEntry[] }> {
    return this.http.get<{ leaderboard: LeaderboardEntry[] }>(
      `${API_BASE_URL}/leaderboard?limit=${limit}`
    );
  }

  getMyRank(): Observable<{ rank: number; totalUsers: number; totalScore: number }> {
    return this.http.get<{ rank: number; totalUsers: number; totalScore: number }>(
      `${API_BASE_URL}/leaderboard/me`
    );
  }
}
