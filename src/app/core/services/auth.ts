import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, catchError, finalize, map, Observable, of, shareReplay, tap, throwError } from 'rxjs';
import { API_BASE_URL } from '../config';
import { AuthResponse, AuthUser, PasswordResetResponse } from '../models/auth.model';

interface AuthSession {
  user: AuthUser | null;
  initialized: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly legacyTokenStorageKey = 'algo-arena-token';
  private readonly userStorageKey = 'algo-arena-user';
  private readonly sessionSubject = new BehaviorSubject<AuthSession>({
    user: this.readCachedUser(),
    initialized: false,
  });
  private initRequest$: Observable<AuthUser | null> | null = null;

  readonly session$ = this.sessionSubject.asObservable();
  readonly user$ = this.session$.pipe(map((session) => session.user));
  readonly isAuthenticated$ = this.session$.pipe(map((session) => Boolean(session.user)));

  constructor(private http: HttpClient) {
    localStorage.removeItem('algo-arena-auth');
    localStorage.removeItem(this.legacyTokenStorageKey);
    this.ensureSession().subscribe({
      error: () => undefined,
    });
  }

  login(payload: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_BASE_URL}/auth/login`, payload).pipe(
      tap((response) => this.setSession(response.user))
    );
  }

  register(payload: { name: string; email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_BASE_URL}/auth/register`, payload).pipe(
      tap((response) => this.setSession(response.user))
    );
  }

  requestPasswordReset(email: string): Observable<PasswordResetResponse> {
    return this.http.post<PasswordResetResponse>(`${API_BASE_URL}/auth/forgot-password`, { email });
  }

  resetPassword(payload: { token: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_BASE_URL}/auth/reset-password`, payload).pipe(
      tap((response) => this.setSession(response.user))
    );
  }

  ensureSession(): Observable<AuthUser | null> {
    const current = this.sessionSubject.value;
    if (current.initialized) {
      return of(current.user);
    }
    if (!this.initRequest$) {
      this.initRequest$ = this.http.get<{ user: AuthUser }>(`${API_BASE_URL}/auth/me`).pipe(
        map((response) => response.user ?? null),
        tap((user) => this.setSession(user)),
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
            this.clearSession();
            return of(null);
          }
          return throwError(() => error);
        }),
        finalize(() => {
          this.initRequest$ = null;
        }),
        shareReplay(1)
      );
    }
    return this.initRequest$;
  }

  refreshMe(): Observable<AuthUser | null> {
    return this.http.get<{ user: AuthUser }>(`${API_BASE_URL}/auth/me`).pipe(
      map((response) => response.user ?? null),
      tap((user) => this.setSession(user)),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
          this.clearSession();
          return of(null);
        }
        return throwError(() => error);
      })
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${API_BASE_URL}/auth/logout`, {}).pipe(
      tap(() => this.clearSession()),
      catchError((error: unknown) => {
        this.clearSession();
        if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
          return of(void 0);
        }
        return throwError(() => error);
      })
    );
  }

  updateUser(user: AuthUser): void {
    const current = this.sessionSubject.value;
    const updatedUser = current.user ? { ...current.user, ...user } : user;
    this.setSession(updatedUser);
  }

  private setSession(user: AuthUser | null): void {
    if (user) {
      localStorage.setItem(this.userStorageKey, JSON.stringify(user));
    } else {
      localStorage.removeItem(this.userStorageKey);
    }
    this.sessionSubject.next({ user, initialized: true });
  }

  private clearSession(): void {
    localStorage.removeItem(this.userStorageKey);
    this.sessionSubject.next({ user: null, initialized: true });
  }

  private readCachedUser(): AuthUser | null {
    const raw = localStorage.getItem(this.userStorageKey);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      localStorage.removeItem(this.userStorageKey);
      return null;
    }
  }
}
