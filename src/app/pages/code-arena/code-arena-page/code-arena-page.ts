import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NgFor, NgIf, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { CodeExercise, CodeSubmissionResult } from '../../../core/models/code-exercise.model';
import { CodeService } from '../../../core/services/code';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-code-arena-page',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, FormsModule, MonacoEditorModule],
  templateUrl: './code-arena-page.html',
  styleUrl: './code-arena-page.scss',
})
export class CodeArenaPageComponent implements OnInit, OnDestroy {
  exercises: CodeExercise[] = [];
  completedIds = new Set<string>();
  selectedExercise: CodeExercise | null = null;
  selectedLanguage: 'c' | 'cpp' = 'cpp';
  code = '';
  editorOptions = this.createEditorOptions('cpp');
  isLoading = false;
  isSubmitting = false;
  errorMessage = '';
  submission: CodeSubmissionResult | null = null;
  submissionSummary = '';
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  @ViewChild('resultToast') resultToast?: ElementRef<HTMLElement>;
  pageSize = 12;
  currentPage = 1;
  private exerciseStartedAt = performance.now();
  private exerciseAttempts: Record<string, number> = {};
  private themeObserver?: MutationObserver;

  constructor(private codeService: CodeService, private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.user$.subscribe((user) => {
      this.completedIds = new Set(user?.completedExercises ?? []);
    });
    this.syncEditorTheme();
    this.observeTheme();
    this.loadExercises();
  }

  ngOnDestroy(): void {
    this.themeObserver?.disconnect();
  }

  loadExercises(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.codeService
      .getExercises()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response) => {
          this.exercises = this.sortExercises(response.exercises);
          this.currentPage = 1;
          if (!this.selectedExercise && this.exercises.length > 0) {
            this.selectExercise(this.exercises[0]);
          }
        },
        error: (error) => {
          this.errorMessage = error?.error?.error ?? 'Impossibile caricare gli esercizi.';
        },
      });
  }

  selectExercise(exercise: CodeExercise): void {
    this.selectedExercise = exercise;
    this.selectedLanguage = exercise.languages.includes(this.selectedLanguage) ? this.selectedLanguage : exercise.languages[0];
    this.code = exercise.starterCode[this.selectedLanguage] ?? '';
    this.editorOptions = this.createEditorOptions(this.selectedLanguage);
    this.submission = null;
    this.exerciseStartedAt = performance.now();
    if (this.exerciseAttempts[exercise.id] === undefined) {
      this.exerciseAttempts[exercise.id] = 0;
    }
  }

  changeLanguage(language: 'c' | 'cpp'): void {
    if (!this.selectedExercise) return;
    this.selectedLanguage = language;
    this.code = this.selectedExercise.starterCode[language] ?? '';
    this.editorOptions = this.createEditorOptions(language);
    this.submission = null;
  }

  submit(): void {
    if (!this.selectedExercise || !this.code.trim()) return;
    this.isSubmitting = true;
    this.errorMessage = '';
    this.submission = null;
    const exerciseId = this.selectedExercise.id;
    const attempts = (this.exerciseAttempts[exerciseId] ?? 0) + 1;
    this.exerciseAttempts[exerciseId] = attempts;
    const durationMs = Math.max(0, Math.round(performance.now() - this.exerciseStartedAt));

    this.codeService
      .submit({
        exerciseId,
        language: this.selectedLanguage,
        code: this.code,
        durationMs,
        attempts,
      })
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (result) => {
          this.submission = result;
          this.submissionSummary = this.buildSubmissionSummary(result);
          this.scheduleToastClear();
          if (result.user) {
            this.authService.updateUser(result.user);
          }
        },
        error: (error) => {
          this.errorMessage = 'Risposta non corretta.';
        },
      });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.submission) return;
    const target = event.target as Node | null;
    if (target && this.resultToast?.nativeElement.contains(target)) return;
    this.closeToast();
  }

  closeToast(): void {
    this.clearToastTimer();
    this.submission = null;
  }

  isCompleted(exercise: CodeExercise): boolean {
    return this.completedIds.has(exercise.id);
  }

  get pagedExercises(): CodeExercise[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.exercises.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.exercises.length / this.pageSize));
  }

  pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(page: number): void {
    const target = Math.min(this.totalPages, Math.max(1, page));
    this.currentPage = target;
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  prevPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  difficultyClass(difficulty: string): string {
    switch (difficulty) {
      case 'facile':
        return 'difficulty-easy';
      case 'media':
        return 'difficulty-medium';
      case 'difficile':
        return 'difficulty-hard';
      default:
        return '';
    }
  }

  private sortExercises(exercises: CodeExercise[]): CodeExercise[] {
    const order = new Map([
      ['facile', 1],
      ['media', 2],
      ['difficile', 3],
    ]);
    return [...exercises].sort((a, b) => {
      const diff = (order.get(a.difficulty) ?? 99) - (order.get(b.difficulty) ?? 99);
      if (diff !== 0) return diff;
      return a.title.localeCompare(b.title);
    });
  }

  private createEditorOptions(language: 'c' | 'cpp') {
    return {
      theme: this.isLightTheme() ? 'vs' : 'vs-dark',
      language,
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 13,
      scrollBeyondLastLine: false,
      tabSize: 2,
    };
  }

  private isLightTheme(): boolean {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('theme-light');
  }

  private syncEditorTheme(): void {
    this.editorOptions = { ...this.editorOptions, theme: this.isLightTheme() ? 'vs' : 'vs-dark' };
  }

  private observeTheme(): void {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
    this.themeObserver = new MutationObserver(() => this.syncEditorTheme());
    this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }

  private buildSubmissionSummary(result: CodeSubmissionResult): string {
    const total = result.results.length;
    const passed = result.results.filter((r) => r.passed).length;
    if (result.correct) {
      return `Tutti i test passati (${passed}/${total}).`;
    }
    return `Test passati: ${passed}/${total}.`;
  }

  private scheduleToastClear(): void {
    this.clearToastTimer();
    this.toastTimer = setTimeout(() => {
      this.submission = null;
    }, 5000);
  }

  private clearToastTimer(): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
  }
}
