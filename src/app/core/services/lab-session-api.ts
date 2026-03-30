import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, defer, firstValueFrom, from, tap } from 'rxjs';
import { API_BASE_URL } from '../config';
import { AuthService } from './auth';

interface LabSessionEventAuth {
  sequence: number;
  nonce: string;
}

export interface LabSessionStartResponse<TScenario = unknown, TResult = unknown> {
  sessionId: string;
  labType: string;
  category: string;
  variant?: string | null;
  scenario: TScenario;
  progress: Record<string, unknown>;
  result: TResult;
  eventAuth?: LabSessionEventAuth;
}

export interface LabSessionStepResponse<TResult = unknown> {
  sessionId: string;
  labType: string;
  category: string;
  status: 'active' | 'completed' | 'abandoned';
  progress: Record<string, unknown>;
  result: TResult;
  eventAuth?: LabSessionEventAuth;
  pointsAwarded: number;
  awards: Array<{
    exerciseId: string;
    category: string;
    alreadyCompleted: boolean;
    pointsAwarded: number;
  }>;
  user?: {
    id: string;
    name: string;
    email: string;
    totalScore: number;
    categoryScores: Record<string, number>;
    completedExercises: string[];
  } | null;
}

@Injectable({
  providedIn: 'root',
})
export class LabSessionApiService {
  private readonly eventAuthBySession = new Map<string, LabSessionEventAuth>();
  private readonly stepQueues = new Map<string, Promise<unknown>>();

  constructor(private http: HttpClient, private authService: AuthService) {}

  startSession<TScenario = unknown, TResult = unknown>(payload: {
    labType: string;
    variant?: string;
  }): Observable<LabSessionStartResponse<TScenario, TResult>> {
    return this.http
      .post<LabSessionStartResponse<TScenario, TResult>>(`${API_BASE_URL}/progress/labs/start`, payload)
      .pipe(
        tap((response) => {
          if (response?.sessionId && response.eventAuth) {
            this.eventAuthBySession.set(response.sessionId, response.eventAuth);
          }
        })
      );
  }

  submitStep<TResult = unknown>(sessionId: string, payload: {
    eventType?: string;
    payload?: unknown;
  }): Observable<LabSessionStepResponse<TResult>> {
    return defer(() => {
      const previous = this.stepQueues.get(sessionId) ?? Promise.resolve();
      const requestPromise = previous
        .catch(() => undefined)
        .then(() => {
          const currentEventAuth = this.eventAuthBySession.get(sessionId);
          if (!currentEventAuth) {
            throw new Error('Autenticazione evento mancante per la sessione laboratorio.');
          }
          return (
          firstValueFrom(
            this.http.post<LabSessionStepResponse<TResult>>(`${API_BASE_URL}/progress/labs/${sessionId}/step`, {
              ...payload,
              eventAuth: currentEventAuth,
            })
          )
          );
        })
        .then((response) => {
          if (!response) {
            throw new Error('Risposta vuota dal server.');
          }
          if (response.eventAuth) {
            this.eventAuthBySession.set(sessionId, response.eventAuth);
          } else if (response.status !== 'active') {
            this.eventAuthBySession.delete(sessionId);
          }
          if (response?.user) {
            this.authService.updateUser(response.user);
          }
          return response;
        })
        .catch((error) => {
          if (error?.status === 404 || error?.status === 409 || error?.status === 410) {
            this.eventAuthBySession.delete(sessionId);
          }
          throw error;
        });

      this.stepQueues.set(sessionId, requestPromise);
      return from(requestPromise.finally(() => {
        if (this.stepQueues.get(sessionId) === requestPromise) {
          this.stepQueues.delete(sessionId);
        }
      }));
    });
  }
}
