import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  constructor(private http: HttpClient) {}

  ask(question: string, history: { role: 'user' | 'assistant'; content: string }[]): Observable<{ answer: string }> {
    return this.http.post<{ answer: string }>(`${API_BASE_URL}/chat/ask`, { question, history });
  }

  reindex(): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(`${API_BASE_URL}/chat/reindex`, {});
  }
}
