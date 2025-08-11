import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AssignTest } from '../../services/assign-test/assign-test';
import { TestAttempt } from '../../services/test-attempt/test-attempt';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ConfirmationService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { TextareaModule } from 'primeng/textarea';
import { ProgressBarModule } from 'primeng/progressbar';
import { BadgeModule } from 'primeng/badge';
import { ChipModule } from 'primeng/chip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

@Component({
  selector: 'app-test-platform',
  standalone: true,
  imports: [FormsModule, CommonModule, CardModule,
    ButtonModule,
    CheckboxModule,
    TextareaModule,
    ProgressBarModule,
    BadgeModule,
    ChipModule,
    ConfirmDialogModule],
  templateUrl: './test-platform.html',
  styleUrl: './test-platform.css',
  providers: [ConfirmationService]
})
export class TestPlatform implements OnInit, OnDestroy {
  test: any;
  responses: Array<{ questionId: number; answer: number[] | string; marked?: boolean }> = [];

  // timer
  timeLeft = 0;             // seconds
  private totalSeconds = 0; // seconds
  timerId: any;
  violations = 0;
  maxViolations = 3;
  violationReasons: string[] = [];
  started = false;

  // nav
  currentIndex = 0;

  assignedTestId: number;

  constructor(
    private route: ActivatedRoute,
    private assignedTestService: AssignTest,
    private attemptService: TestAttempt,
    private router: Router,
    private confirmation: ConfirmationService
  ) {
    this.assignedTestId = Number(this.route.snapshot.paramMap.get('id'));
  }

  ngOnInit(): void {
    this.attemptService.getDetails(this.assignedTestId).subscribe(data => {
      this.test = data.test;
      // init timer
      this.totalSeconds = (this.test.duration ?? 0) * 60;
      this.timeLeft = this.totalSeconds;

      // init responses (keep your answer shape)
      this.responses = this.test.questions.map((q: any) => ({
        questionId: q.id,
        answer: q.type === 'MCQ' ? [] : '',
        marked: false
      }));

      this.startTimer(); 
      this.attachProctoring(); 
    });
  }

  async begin(): Promise<void> {
    this.started = true;
    await this.requestFullscreen();
    this.attachProctoring();
    this.startTimer();
  }

  // ======= computed =======
  get total(): number {
    return this.test?.questions?.length ?? 0;
  }

  get currentQuestion(): any {
    return this.test?.questions?.[this.currentIndex];
  }

  get answeredCount(): number {
    return this.responses.filter(r =>
      Array.isArray(r.answer) ? (r.answer as number[]).length > 0 : (r.answer as string).trim().length > 0
    ).length;
  }

  get timeProgress(): number {
    if (!this.totalSeconds) return 0;
    return ((this.totalSeconds - this.timeLeft) / this.totalSeconds) * 100;
  }

  // ======= timer =======
  startTimer(): void {
    this.timerId = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
      } else {
        clearInterval(this.timerId);
        this.submit();
      }
    }, 1000);
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // ======= navigation & actions =======
  goToQuestion(i: number): void {
    if (i >= 0 && i < this.total) this.currentIndex = i;
  }

  next(): void {
    if (this.currentIndex < this.total - 1) this.currentIndex++;
  }

  prev(): void {
    if (this.currentIndex > 0) this.currentIndex--;
  }

  clearCurrent(): void {
    const r = this.responses[this.currentIndex];
    r.answer = Array.isArray(r.answer) ? [] : '';
  }

  toggleMark(): void {
    this.responses[this.currentIndex].marked = !this.responses[this.currentIndex].marked;
  }

  buttonClass(idx: number): string {
    const r = this.responses[idx];
    const answered = Array.isArray(r.answer) ? r.answer.length > 0 : (r.answer as string).trim().length > 0;
    const isCurrent = idx === this.currentIndex;
    const isMarked = !!r.marked;

    if (isCurrent) return 'p-button-info p-button-outlined qbtn current';
    if (isMarked) return 'p-button-help qbtn marked';
    if (answered) return 'p-button-success qbtn answered';
    return 'p-button-secondary p-button-outlined qbtn unanswered';
  }

  // For legacy checkbox template (not needed if you bind p-checkbox to the array directly)
  toggleOption(qIndex: number, optionId: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const checked = input.checked;
    const r = this.responses[qIndex];
    if (!Array.isArray(r.answer)) return;

    if (checked) {
      if (!r.answer.includes(optionId)) (r.answer as number[]).push(optionId);
    } else {
      r.answer = (r.answer as number[]).filter(id => id !== optionId);
    }
  }

  // ======= submit =======
  confirmSubmit(): void {
    this.confirmation.confirm({
      header: 'Submit Test',
      message: `You have answered ${this.answeredCount} of ${this.total} questions. Submit now?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Submit',
      rejectLabel: 'Cancel',
      accept: () => this.submit()
    });
  }

  submit(): void {
    clearInterval(this.timerId);

    // quick scoring for MCQ
    const correctCount = this.test.questions.reduce((count: number, q: any, i: number) => {
      if (q.type === 'MCQ') {
        const correct = q.options.filter((o: any) => o.isCorrect).map((o: any) => o.id).sort();
        const selected = (this.responses[i].answer as number[]).slice().sort();
        return JSON.stringify(correct) === JSON.stringify(selected) ? count + 1 : count;
      }
      return count;
    }, 0);

    const score = (correctCount / this.test.questions.length) * 100;
    const status = score >= this.test.passingPercent ? 'Pass' : 'Fail';

    const payload = {
      assignedTestId: this.assignedTestId,
      employeeId: 1, // TODO: replace with real user
      testId: this.test.id,
      responses: this.responses,
      score,
      status
    };

    this.attemptService.submit(payload).subscribe(() => {
      alert(`Test submitted! You ${status} with score ${score.toFixed(2)}%.`);
      this.router.navigate(['/my-tests']);
    });
  }
  isAnswered(i: number): boolean {
    const r = this.responses[i];
    if (!r) return false;
    return Array.isArray(r.answer)
      ? r.answer.length > 0
      : (r.answer ?? '').trim().length > 0;
  }
  ngOnDestroy(): void {
    clearInterval(this.timerId);
    this.detachProctoring();
  }

  // ---- Proctoring ----
  private attachProctoring() {
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('fullscreenchange', this.onFsChange);
    window.addEventListener('keydown', this.onKeyDown as any);
    document.addEventListener('contextmenu', this.blockContextMenu);
    document.addEventListener('copy', this.preventCopyCut);
    document.addEventListener('cut', this.preventCopyCut);
    document.addEventListener('dragstart', this.preventDefault);
  }

  private detachProctoring() {
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('fullscreenchange', this.onFsChange);
    window.removeEventListener('keydown', this.onKeyDown as any);
    document.removeEventListener('contextmenu', this.blockContextMenu);
    document.removeEventListener('copy', this.preventCopyCut);
    document.removeEventListener('cut', this.preventCopyCut);
    document.removeEventListener('dragstart', this.preventDefault);
  }

  onVisibility = () => {
    if (document.hidden) this.flagViolation('Tab/window change');
  };

  onBlur = () => {
    // Some browsers fire blur even inside the tab; pair with visibility for signal
    if (document.hidden) this.flagViolation('Blur while hidden');
  };

  onFsChange = () => {
    if (!document.fullscreenElement) this.flagViolation('Exited fullscreen');
  };

  onKeyDown = async (e: KeyboardEvent) => {
    if (e.key === 'PrintScreen') {
      e.preventDefault();
      // Best-effort: clear clipboard (requires HTTPS + user gesture in some browsers)
      try { await navigator.clipboard.writeText(''); } catch {}
      this.flagViolation('Attempted screenshot');
    }
  };

  blockContextMenu = (e: Event) => e.preventDefault();
  preventCopyCut = (e: Event) => e.preventDefault();
  preventDefault = (e: Event) => e.preventDefault();

  private flagViolation(reason: string) {
    this.violationReasons.push(`${new Date().toISOString()}: ${reason}`);
    this.violations++;
    // You can show a toast/banner here
    if (this.violations >= this.maxViolations) {
      alert('Max policy violations reached. Auto-submitting your test.');
      this.submit();
    }
  }

  async requestFullscreen() {
    const el = document.documentElement as any;
    if (el.requestFullscreen) await el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  }
}
