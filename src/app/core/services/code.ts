import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config';
import { CodeExercise, CodeSubmissionResult } from '../models/code-exercise.model';

@Injectable({
  providedIn: 'root',
})
export class CodeService {
  constructor(private http: HttpClient) {}

  getExercises(): Observable<{ exercises: CodeExercise[] }> {
    return this.http.get<{ exercises: CodeExercise[] }>(`${API_BASE_URL}/code/exercises`);
  }

  submit(payload: {
    exerciseId: string;
    language: 'c' | 'cpp';
    code: string;
    durationMs?: number;
    attempts?: number;
  }): Observable<CodeSubmissionResult> {
    return this.http.post<CodeSubmissionResult>(`${API_BASE_URL}/code/submit`, payload);
  }
}
