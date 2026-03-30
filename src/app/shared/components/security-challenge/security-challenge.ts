import { AsyncPipe, NgIf } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { SecurityChallengeService, SecurityChallengeState } from '../../../core/services/security-challenge';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

@Component({
  selector: 'app-security-challenge',
  standalone: true,
  imports: [NgIf, AsyncPipe],
  templateUrl: './security-challenge.html',
  styleUrl: './security-challenge.scss',
})
export class SecurityChallengeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('widgetHost') widgetHost?: ElementRef<HTMLDivElement>;

  private readonly securityChallengeService = inject(SecurityChallengeService);
  private readonly subscription = new Subscription();
  private widgetId: string | null = null;
  private scriptPromise: Promise<void> | null = null;
  private lastRenderKey = '';
  private currentState: SecurityChallengeState = {
    open: false,
    loading: false,
    verifying: false,
    error: '',
    request: null,
    config: null,
  };

  readonly state$ = this.securityChallengeService.state$;

  ngAfterViewInit(): void {
    this.subscription.add(
      this.state$.subscribe((state) => {
        this.currentState = state;
        void this.syncWidget(state);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.destroyWidget();
  }

  retry(): void {
    const state = this.currentState;
    if (!state.open || !state.config?.siteKey) {
      return;
    }
    this.securityChallengeService.fail('');
    this.lastRenderKey = '';
    void this.syncWidget(state);
  }

  cancel(): void {
    this.securityChallengeService.cancel();
  }

  private async syncWidget(state: SecurityChallengeState): Promise<void> {
    if (!state.open) {
      this.lastRenderKey = '';
      this.destroyWidget();
      return;
    }

    if (state.loading || !state.config?.siteKey || !this.widgetHost?.nativeElement) {
      return;
    }

    const renderKey = `${state.request?.reason || 'challenge'}:${state.config.siteKey}:${state.config.action}`;
    if (renderKey === this.lastRenderKey && this.widgetId) {
      return;
    }

    try {
      await this.loadTurnstileScript();
      this.renderTurnstile(state);
      this.lastRenderKey = renderKey;
    } catch {
      this.securityChallengeService.fail('Impossibile caricare il challenge widget.');
    }
  }

  private loadTurnstileScript(): Promise<void> {
    if (typeof window !== 'undefined' && window.turnstile) {
      return Promise.resolve();
    }
    if (this.scriptPromise) {
      return this.scriptPromise;
    }
    this.scriptPromise = new Promise<void>((resolve, reject) => {
      if (typeof document === 'undefined') {
        reject(new Error('Document non disponibile'));
        return;
      }
      const existingScript = document.querySelector<HTMLScriptElement>('script[data-turnstile-script="true"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('Turnstile script load failed')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset['turnstileScript'] = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Turnstile script load failed'));
      document.head.appendChild(script);
    });
    return this.scriptPromise;
  }

  private renderTurnstile(state: SecurityChallengeState): void {
    if (!window.turnstile || !this.widgetHost?.nativeElement || !state.config?.siteKey) {
      return;
    }

    this.destroyWidget();
    const host = this.widgetHost.nativeElement;
    host.innerHTML = '';
    const theme = document.documentElement.classList.contains('theme-light') ? 'light' : 'dark';

    this.widgetId = window.turnstile.render(host, {
      sitekey: state.config.siteKey,
      action: state.config.action,
      theme,
      callback: (token: string) => {
        this.securityChallengeService.verifyToken(token).subscribe({
          error: () => {
            this.resetWidget();
          },
        });
      },
      'error-callback': () => {
        this.securityChallengeService.fail('Widget challenge non disponibile.');
      },
      'expired-callback': () => {
        this.resetWidget();
      },
    });
  }

  private resetWidget(): void {
    if (window.turnstile && this.widgetId) {
      window.turnstile.reset(this.widgetId);
    }
  }

  private destroyWidget(): void {
    if (window.turnstile && this.widgetId) {
      window.turnstile.remove(this.widgetId);
    }
    this.widgetId = null;
    if (this.widgetHost?.nativeElement) {
      this.widgetHost.nativeElement.innerHTML = '';
    }
  }
}
