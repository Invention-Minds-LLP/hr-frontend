import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AssignTest } from '../../services/assign-test/assign-test';
import { TestAttempt } from '../../services/test-attempt/test-attempt';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { TextareaModule } from 'primeng/textarea';
import { ProgressBarModule } from 'primeng/progressbar';
import { BadgeModule } from 'primeng/badge';
import { ChipModule } from 'primeng/chip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { firstValueFrom } from 'rxjs';
import { Recuriting } from '../../services/recruiting/recuriting';
import { DialogModule } from 'primeng/dialog';
import { interval, Subscription } from 'rxjs';


// utils
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = arr.slice();
  const rand = mulberry32(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

@Component({
  selector: 'app-test-platform',
  standalone: true,
  imports: [FormsModule, CommonModule, CardModule,
    DialogModule,
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
  responses: Array<{ questionId: number; answer: number[] | string; marked?: boolean; fileName:any; file:any }> = [];

  // timer
  timeLeft = 0;             // seconds
  private totalSeconds = 0; // seconds
  timerId: any;
  violations = 0;
  maxViolations = 3;
  violationReasons: string[] = [];
  started = false;
  showIntroPopup = true;

  // nav
  currentIndex = 0;
  showSubmitPopup: boolean = false;
  submitMessage: string = '';


  assignedTestId: number;
  attemptId?: number;
  candidateId?: number;
  timerSub?: Subscription;


  constructor(
    private route: ActivatedRoute,
    private assignedTestService: AssignTest,
    private attemptService: TestAttempt,
    private router: Router,
    private confirmation: ConfirmationService,
    private ct: Recuriting,
    private messageService: MessageService
  ) {
    this.assignedTestId = Number(this.route.snapshot.paramMap.get('id'));
  }
  private applyRandomization(test: any, mode: 'NONE' | 'SHUFFLE_QUESTIONS' | 'SHUFFLE_OPTIONS' | 'BOTH', seed: number) {
    // questions
    if (mode === 'SHUFFLE_QUESTIONS' || mode === 'BOTH') {
      test.questions = seededShuffle(test.questions, seed);
    }

    // options per question (use a per-question salt so each question shuffles differently)
    if (mode === 'SHUFFLE_OPTIONS' || mode === 'BOTH') {
      test.questions = test.questions.map((q: any, idx: number) => ({
        ...q,
        options: seededShuffle(q.options, seed + q.id + idx) // simple salt
      }));
    }
    return test;
  }


  ngOnInit(): void {
    this.candidateId = Number(localStorage.getItem('candidateId')) || 0
    this.assignedTestId = Number(this.route.snapshot.paramMap.get('id'));
    const qid = this.route.snapshot.queryParamMap.get('attemptId');
    this.attemptId = qid ? Number(qid) : undefined;
    if (this.candidateId) {
      this.load();
      return;
    }
    this.attemptService.getDetails(this.assignedTestId).subscribe(data => {
      const seed = this.attemptId ?? this.assignedTestId;

      const mode = (data.test.randomization ?? 'NONE') as 'NONE' | 'SHUFFLE_QUESTIONS' | 'SHUFFLE_OPTIONS' | 'BOTH';
      this.test = this.applyRandomization(data.test, mode, seed);
      // init timer
      this.totalSeconds = (this.test.duration ?? 0) * 60;
      this.timeLeft = this.totalSeconds;

      // init responses (keep your answer shape)
      this.responses = this.test.questions.map((q: any) => ({
        questionId: q.id,
        answer: q.type === 'MCQ' ? [] : '',
        marked: false
      }));

      // this.startTimer();
      this.attachProctoring();
    });
  }
  load() {
    this.ct.getAssignedTestDetail(this.assignedTestId).subscribe((t: any) => {
      const seed = this.assignedTestId;
      this.test = t;
      const mode = (t.randomization ?? 'NONE') as 'NONE' | 'SHUFFLE_QUESTIONS' | 'SHUFFLE_OPTIONS' | 'BOTH';
      this.test = this.applyRandomization(t, mode, seed);
      this.responses = t.questions.map((q: any) => ({
        questionId: q.id,
        answer: q.type === 'MCQ' ? [] : '',   // MCQ starts as [] ; Descriptive as ''
        marked: false,
      }));
      this.timeLeft = (t.duration || 30) * 60;
    });
  }

  async begin(): Promise<void> {
    if (this.candidateId) {
      // For candidates, just start the test without attempt
      this.started = true;
      this.showIntroPopup = false;
      await this.requestFullscreen();
      this.attachProctoring();
      this.startTimer();
      return;
    }
    if (!this.attemptId) {
      const { attemptId } = await firstValueFrom(this.attemptService.startAttempt(this.assignedTestId));
      this.attemptId = attemptId;
    }
    this.started = true;
    this.showIntroPopup = false;
    // await this.requestFullscreen();
    // this.attachProctoring();
    this.startTimer();
  }

  // ======= computed =======
  get total(): number {
    return this.test?.questions?.length ?? 0;
  }

  get currentQuestion(): any {
    return this.test?.questions?.[this.currentIndex];
  }

  // get answeredCount(): number {
  //   return this.responses.filter(r =>
  //     Array.isArray(r.answer) ? (r.answer as number[]).length > 0 : (r.answer as string).trim().length > 0
  //   ).length;
  // }
  get answeredCount(): number {
    return this.responses.filter(r => {
      // MCQ → array of selected option IDs
      if (Array.isArray(r.answer)) {
        return r.answer.length > 0;
      }
  
      // Descriptive with file
      if (r.file || r.fileName) {
        return true;
      }
  
      // Descriptive typed text (if you ever enable textarea again)
      if ((r.answer as string)?.trim().length > 0) {
        return true;
      }
  
      return false;
    }).length;
  }
  

  get timeProgress(): number {
    if (!this.totalSeconds) return 0;
    return ((this.totalSeconds - this.timeLeft) / this.totalSeconds) * 100;
  }

  // ======= timer =======
  // startTimer(): void {
  //   this.timerId = setInterval(() => {
  //     if (this.timeLeft > 0) {
  //       this.timeLeft--;
  //     } else {
  //       clearInterval(this.timerId);
  //       this.submit();
  //     }
  //   }, 1000);
  // }
  startTimer(): void {
    // Prevent duplicate timers
    if (this.timerSub) {
      this.timerSub.unsubscribe();
    }
  
    this.timerSub = interval(1000).subscribe(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
      } else {
        this.stopTimer();
        this.submit();
      }
    });
  }
  stopTimer(): void {
    if (this.timerSub) {
      this.timerSub.unsubscribe();
      this.timerSub = undefined;
    }
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
  onPopupClose() {
    this.showSubmitPopup = false;
    this.router.navigate(['/my-tests']); // navigate back after closing
  }
  onFileSelect(event: any, qIndex: number) {
    const file: File = event.target.files[0];
    if (file) {
      this.responses[qIndex].file = file;
      this.responses[qIndex].fileName = file.name;
    }
  }


  submit(): void {
    clearInterval(this.timerId);

    if (this.candidateId) {
      const answers = this.collectAnswers();
      this.ct.submitAssignedTest(this.assignedTestId, answers).subscribe(res => {
        this.submitMessage = 'Your test has been submitted successfully. Thank you.';
        this.showSubmitPopup = true;

        this.router.navigate(['/candidate-tests']);
      });
      return;
    }

    // // quick scoring for MCQ
    // const correctCount = this.test.questions.reduce((count: number, q: any, i: number) => {
    //   if (q.type === 'MCQ') {
    //     const correct = q.options.filter((o: any) => o.isCorrect).map((o: any) => o.id).sort();
    //     const selected = (this.responses[i].answer as number[]).slice().sort();
    //     return JSON.stringify(correct) === JSON.stringify(selected) ? count + 1 : count;
    //   }
    //   return count;
    // }, 0);

    // const score = (correctCount / this.test.questions.length) * 100;
    // const status = score >= this.test.passingPercent ? 'Pass' : 'Fail';

    // const payload = {
    //   assignedTestId: this.assignedTestId,
    //   employeeId: 1, // TODO: replace with real user
    //   testId: this.test.id,
    //   responses: this.responses,
    //   score,
    //   status,
    //   attemptId: this.attemptId,
    // };

    // this.attemptService.submit(payload).subscribe(() => {
    //   this.submitMessage = 'Your test has been submitted successfully. Thank you.';
    //   this.showSubmitPopup = true;

    //   this.router.navigate(['/my-tests']);
    // });
    // 👉 Build FormData to include answers + files
    const formData = new FormData();
    formData.append('attemptId', String(this.attemptId));
    formData.append('assignedTestId', String(this.assignedTestId));
    formData.append('testId', String(this.test.id));

    // Responses without file blobs (only meta)
    formData.append(
      'responses',
      JSON.stringify(this.responses.map(r => ({
        questionId: r.questionId,
        answer: r.answer,
        fileName: r.fileName || null
      })))
    );

    // Append file blobs separately
    this.responses.forEach(r => {
      if (r.file) {
        formData.append(`file_${r.questionId}`, r.file);
      }
    });

    this.attemptService.submitWithFiles(formData).subscribe(() => {
      this.submitMessage = 'Your test has been submitted successfully. Thank you.';
      this.showSubmitPopup = true;
      this.router.navigate(['/individual']);
    });
  }
  isAnswered(i: number): boolean {
    const r = this.responses[i];
    if (!r) return false;
  
    // MCQ
    if (Array.isArray(r.answer) && r.answer.length > 0) {
      return true;
    }
  
    // Descriptive upload
    if (r.file || r.fileName) {
      return true;
    }
  
    // Descriptive typed (if used)
    if ((r.answer ?? '').toString().trim().length > 0) {
      return true;
    }
  
    return false;
  }
  
  ngOnDestroy(): void {
    this.stopTimer();
    this.detachProctoring();
  }
  getHours(seconds: number): string {
    return Math.floor(seconds / 3600).toString().padStart(2, '0');
  }
  getMinutes(seconds: number): string {
    return Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  }
  getSeconds(seconds: number): string {
    return (seconds % 60).toString().padStart(2, '0');
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
      try { await navigator.clipboard.writeText(''); } catch { }
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
    // if (this.violations >= this.maxViolations) {
    //   this.submitMessage = 'Max policy violations reached. Your test has been auto-submitted.';
    //   this.showSubmitPopup = true;
    //   this.submit();
    // }
  }

  async requestFullscreen() {
    const el = document.documentElement as any;
    if (el.requestFullscreen) await el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  }
  // test-take.component.ts




  /** Build payload [{questionId, answer}] from UI state */
  collectAnswers(): { questionId: number; answer: any }[] {
    if (!this.test?.questions) return [];
    return this.test.questions.map((q: any, idx: number) => {
      const raw = this.responses[idx]?.answer;
      // Normalize: MCQ → number | number[] ; Descriptive → string
      let answer: any = raw;
      if (q.type === 'MCQ') {
        // allow single or multi
        answer = Array.isArray(raw)
          ? raw.map((x: any) => Number(x))
          : (raw == null || raw === '' ? null : Number(raw));
      } else {
        answer = raw == null ? '' : String(raw);
      }
      return { questionId: q.id, answer };
    });
  }

}
