import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, switchMap, throwError } from 'rxjs';
import { SecurityChallengeService, SecurityChallengeRequest } from './security-challenge';
import { CHALLENGE_RETRIED, SKIP_SECURITY_CHALLENGE } from './http-context-tokens';
import { AutomationSignalsService } from './automation-signals';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const securityChallengeService = inject(SecurityChallengeService);
  const automationSignalsService = inject(AutomationSignalsService);
  const preparedRequest = req.clone({
    withCredentials: true,
    setHeaders: automationSignalsService.buildHeaders(),
  });

  return next(preparedRequest).pipe(
    catchError((error: unknown) => {
      if (
        !(error instanceof HttpErrorResponse)
        || preparedRequest.context.get(SKIP_SECURITY_CHALLENGE)
        || preparedRequest.context.get(CHALLENGE_RETRIED)
      ) {
        return throwError(() => error);
      }

      const challenge = error.error?.challenge as SecurityChallengeRequest | undefined;
      if (!error.error?.challengeRequired || !challenge) {
        return throwError(() => error);
      }

      return securityChallengeService.ensureChallenge(challenge).pipe(
        switchMap(() =>
          next(
            preparedRequest.clone({
              context: preparedRequest.context.set(CHALLENGE_RETRIED, true),
            })
          )
        ),
        catchError((challengeError) => throwError(() => challengeError))
      );
    })
  );
};
