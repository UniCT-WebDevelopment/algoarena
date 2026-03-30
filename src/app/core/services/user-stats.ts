import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config';
import { UserStatsResponse } from '../models/user-stats.model';

@Injectable({
  providedIn: 'root',
})
export class UserStatsService {
  constructor(private http: HttpClient) {}

  getUserStats(userId: string): Observable<UserStatsResponse> {
    return this.http.get<UserStatsResponse>(`${API_BASE_URL}/users/${userId}/stats`);
  }
}
