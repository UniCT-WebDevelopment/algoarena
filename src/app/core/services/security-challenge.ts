import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom, from, Observable } from 'rxjs';
import { API_BASE_URL } from '../config';
import { SKIP_SECURITY_CHALLENGE } from './http-context-tokens';

export interface SecurityChallengeRequest {
  provider: string;
  scope: string;
  reason: string;
  action?: string;
}

export interface SecurityChallengeConfig {
  enabled: boolean;
  provider: string;
  siteKey: string | null;
  action: string;
}

export interface SecurityChallengeState {
  open: boolean;
  loading: boolean;
  verifying: boolean;
  error: string;
  request: SecurityChallengeRequest | null;
  config: SecurityChallengeConfig | null;
}

const INITIAL_STATE: SecurityChallengeState = {
  open: false,
  loading: false,
  verifying: false,
  error: '',
  request: null,
  config: null,
};

@Injectable({
  providedIn: 'root',
})
export class SecurityChallengeService {
  private readonly stateSubject = new BehaviorSubject<SecurityChallengeState>(INITIAL_STATE);
  private activePromise: Promise<void> | null = null;
  private resolveChallenge: (() => void) | null = null;
  private rejectChallenge: ((reason?: unknown) => void) | null = null;

  readonly state$ = this.stateSubject.asObservable();

  constructor(private http: HttpClient) {}

  ensureChallenge(request: SecurityChallengeRequest): Observable<void> {
    if (!this.activePromise) {
      this.activePromise = this.openChallenge(request)
        .catch((error) => {
          this.resetState();
          throw error;
        })
        .finally(() => {
          this.activePromise = null;
        });
    }
    return from(this.activePromise);
  }

  verifyToken(token: string): Observable<void> {
    const current = this.stateSubject.value;
    this.stateSubject.next({
      ...current,
      verifying: true,
      error: '',
    });

    const request = firstValueFrom(
      this.http.post<{ success: boolean }>(
        `${API_BASE_URL}/security/challenge/verify`,
        { token },
        {
          context: new HttpContext().set(SKIP_SECURITY_CHALLENGE, true),
        }
      )
    )
      .then(() => {
        this.resolveChallenge?.();
        this.resetState();
      })
      .catch((error: { error?: { error?: string } }) => {
        this.stateSubject.next({
          ...this.stateSubject.value,
          verifying: false,
          error: error?.error?.error ?? 'Verifica challenge fallita.',
        });
        throw error;
      });

    return from(request);
  }

  fail(message: string): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      loading: false,
      verifying: false,
      error: message,
    });
  }

  cancel(): void {
    this.rejectChallenge?.(new Error('Challenge annullato.'));
    this.resetState();
  }

  private async openChallenge(request: SecurityChallengeRequest): Promise<void> {
    this.stateSubject.next({
      ...INITIAL_STATE,
      open: true,
      loading: true,
      request,
    });

    const config = await firstValueFrom(
      this.http.get<SecurityChallengeConfig>(`${API_BASE_URL}/security/challenge/config`, {
        context: new HttpContext().set(SKIP_SECURITY_CHALLENGE, true),
      })
    );

    if (!config?.enabled || !config.siteKey) {
      this.resetState();
      throw new Error('Challenge provider non configurato.');
    }

    this.stateSubject.next({
      open: true,
      loading: false,
      verifying: false,
      error: '',
      request,
      config,
    });

    return new Promise<void>((resolve, reject) => {
      this.resolveChallenge = resolve;
      this.rejectChallenge = reject;
    });
  }

  private resetState(): void {
    this.resolveChallenge = null;
    this.rejectChallenge = null;
    this.stateSubject.next(INITIAL_STATE);
  }
}
