import { Component, OnInit, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { AuthService } from './core/services/auth';
import { AssistantChatComponent } from './shared/components/assistant-chat/assistant-chat';
import { SecurityChallengeComponent } from './shared/components/security-challenge/security-challenge';

interface NavLink {
  label: string;
  route: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NgFor,
    NgIf,
    AsyncPipe,
    AssistantChatComponent,
    SecurityChallengeComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class AppComponent implements OnInit {
  readonly navLinks: NavLink[] = [
    { label: 'Dashboard', route: '/' },
    { label: 'Leaderboard', route: '/leaderboard' },
    { label: 'Code Arena', route: '/code-arena' },
    { label: 'Heap Arena', route: '/heap' },
    { label: 'RB-Tree', route: '/rb-tree' },
    { label: 'Graph Lab', route: '/graphs/lab' },
    { label: 'Master', route: '/master-theorem' },
    { label: 'Huffman', route: '/huffman' },
    { label: 'String DP', route: '/strings/dp' },
    { label: 'Hash Open', route: '/hash/open' },
  ];

  private authService = inject(AuthService);
  private router = inject(Router);
  readonly user$ = this.authService.user$;
  isLightMode = false;
  selectedNavRoute = '';

  ngOnInit(): void {
    this.syncSelectedRoute(this.router.url);
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.syncSelectedRoute(event.urlAfterRedirects);
      }
    });

    if (typeof window === 'undefined') {
      return;
    }
    const savedTheme = window.localStorage.getItem('theme');
    this.isLightMode = savedTheme === 'light';
    this.applyTheme();
  }

  toggleTheme(): void {
    this.isLightMode = !this.isLightMode;
    this.applyTheme();
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.navigateToLogin(),
      error: () => this.navigateToLogin(),
    });
  }

  onNavSelect(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    if (!target) {
      return;
    }
    const route = target.value;
    if (route) {
      this.router.navigateByUrl(route);
    }
  }

  private applyTheme(): void {
    if (typeof document === 'undefined') {
      return;
    }
    const root = document.documentElement;
    root.classList.toggle('theme-light', this.isLightMode);
    window.localStorage.setItem('theme', this.isLightMode ? 'light' : 'dark');
  }

  private syncSelectedRoute(url: string): void {
    const cleanUrl = url.split('?')[0]?.split('#')[0] ?? '';
    if (cleanUrl === '/') {
      this.selectedNavRoute = '/';
      return;
    }
    const match = this.navLinks.find((link) => link.route !== '/' && cleanUrl.startsWith(link.route));
    this.selectedNavRoute = match?.route ?? '';
  }

  private navigateToLogin(): void {
    this.router.navigateByUrl('/login', { replaceUrl: true }).then((navigated) => {
      if (!navigated) {
        window.location.href = '/login';
      }
    });
  }
}
