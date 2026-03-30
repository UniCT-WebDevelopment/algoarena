import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, take } from 'rxjs';
import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const loginUrl = router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });

  return authService.ensureSession().pipe(
    take(1),
    map((user) => (user ? true : loginUrl)),
    catchError(() => of(loginUrl))
  );
};
