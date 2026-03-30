import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIf } from '@angular/common';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgIf],
  templateUrl: './forgot-password-page.html',
  styleUrl: './forgot-password-page.scss',
})
export class ForgotPasswordPageComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = false;
  errorMessage = '';
  infoMessage = '';
  resetToken: string | null = null;

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  submit(): void {
    if (this.form.invalid || this.isLoading) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.infoMessage = '';
    this.resetToken = null;
    this.isLoading = true;

    const { email } = this.form.getRawValue();

    this.authService
      .requestPasswordReset(email ?? '')
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response) => {
          this.infoMessage = response.message;
          this.resetToken = response.resetToken ?? null;
        },
        error: (error) => {
          this.errorMessage = error?.error?.error ?? 'Richiesta non riuscita.';
        },
      });
  }

  goToReset(): void {
    if (!this.resetToken) {
      return;
    }
    this.router.navigate(['/reset-password'], { queryParams: { token: this.resetToken } });
  }
}
