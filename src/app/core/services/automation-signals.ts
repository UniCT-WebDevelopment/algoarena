import { Injectable } from '@angular/core';

interface AutomationSnapshot {
  wd: 0 | 1;
  hu: 0 | 1;
  ll: number;
  pl: number;
  ch: 0 | 1;
  tz: string;
  glv: string;
  glr: string;
}

interface TrustedInteractionSnapshot {
  type: string;
  ts: number;
}

@Injectable({
  providedIn: 'root',
})
export class AutomationSignalsService {
  private readonly automationHeaderValue: string;
  private lastTrustedInteraction: TrustedInteractionSnapshot | null = null;
  private listenersAttached = false;

  constructor() {
    this.automationHeaderValue = this.encodePayload(this.buildAutomationSnapshot());
    this.attachInteractionListeners();
  }

  buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'X-Client-Automation': this.automationHeaderValue,
    };

    if (this.lastTrustedInteraction) {
      headers['X-Client-Interaction'] = this.encodePayload(this.lastTrustedInteraction);
    }

    return headers;
  }

  private attachInteractionListeners(): void {
    if (this.listenersAttached || typeof window === 'undefined') {
      return;
    }
    this.listenersAttached = true;

    const updateInteraction = (event: Event) => {
      if (!event.isTrusted) {
        return;
      }
      this.lastTrustedInteraction = {
        type: event.type,
        ts: Date.now(),
      };
    };

    window.addEventListener('pointerdown', updateInteraction, { capture: true, passive: true });
    window.addEventListener('keydown', updateInteraction, { capture: true, passive: true });
    window.addEventListener('touchstart', updateInteraction, { capture: true, passive: true });
  }

  private buildAutomationSnapshot(): AutomationSnapshot {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return {
        wd: 0,
        hu: 0,
        ll: 0,
        pl: 0,
        ch: 0,
        tz: '',
        glv: '',
        glr: '',
      };
    }

    const nav = navigator as Navigator & {
      webdriver?: boolean;
      userAgentData?: { brands?: Array<{ brand?: string }> };
    };

    const ua = nav.userAgent || '';
    const uaBrands = nav.userAgentData?.brands?.map((brand) => brand.brand || '').join(' ') || '';
    const webgl = this.readWebGlInfo();

    return {
      wd: nav.webdriver ? 1 : 0,
      hu: /HeadlessChrome|PhantomJS|puppeteer|playwright/i.test(`${ua} ${uaBrands}`) ? 1 : 0,
      ll: Array.isArray(nav.languages) ? nav.languages.length : 0,
      pl: Number((nav.plugins && nav.plugins.length) || 0),
      ch: typeof (window as Window & { chrome?: unknown }).chrome !== 'undefined' ? 1 : 0,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      glv: webgl.vendor,
      glr: webgl.renderer,
    };
  }

  private readWebGlInfo(): { vendor: string; renderer: string } {
    try {
      const canvas = document.createElement('canvas');
      const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
      if (!gl || typeof gl.getExtension !== 'function') {
        return { vendor: '', renderer: '' };
      }

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (!debugInfo) {
        return { vendor: '', renderer: '' };
      }

      return {
        vendor: String(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || ''),
        renderer: String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || ''),
      };
    } catch {
      return { vendor: '', renderer: '' };
    }
  }

  private encodePayload(payload: unknown): string {
    const json = JSON.stringify(payload);
    return btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }
}
