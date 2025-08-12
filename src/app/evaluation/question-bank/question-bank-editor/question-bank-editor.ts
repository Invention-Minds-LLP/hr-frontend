import { Component, OnInit, Input, EventEmitter, Output,SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray, FormControl, FormGroup, Validators,
  ReactiveFormsModule, NonNullableFormBuilder
} from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { Departments } from '../../../services/departments/departments';
import { QuestionBankService } from '../../../services/question-bank/question-bank';
import { QuestionsService } from '../../../services/questions/questions';
import { Checkbox } from 'primeng/checkbox';

type QType = 'MCQ'  | 'Descriptive';

type AnswerType = 'single' | 'multiple' | null;

type OptionFG = FormGroup<{
  id: FormControl<number | null>; 
  text: FormControl<string>;
  isCorrect: FormControl<boolean>;
}>;

type QuestionFG = FormGroup<{
  id: FormControl<number | null>; 
  type: FormControl<QType>;
  maxTime: FormControl<number | null>;
  weight: FormControl<number | null>;
  negativeWeight: FormControl<number>;
  answerType: FormControl<AnswerType>;
  text: FormControl<string>;
  options: FormArray<OptionFG>;
}>;

type BankForm = FormGroup<{
  name: FormControl<string>;
  category: FormControl<string>;
  departmentId: FormControl<number | null>;
  designation: FormControl<string>;
  level: FormControl<string | null>;
  createdBy: FormControl<number>;
  questions: FormArray<QuestionFG>;
}>;

@Component({
  selector: 'app-question-bank-editor',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    TableModule, ButtonModule, SelectModule, InputTextModule, TextareaModule,
    InputNumberModule, DialogModule, ToastModule, Checkbox
  ],
  templateUrl: './question-bank-editor.html',
  styleUrls: ['./question-bank-editor.css'],
  providers: [MessageService]
})
export class QuestionBankEditor implements OnInit {
  bankForm!: BankForm;
  @Input() bankId: number | null | undefined;
  @Input() bankPreset: any | null | undefined;

  @Output() saved = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  submitted = false;         // you referenced this in the template
  saving = false;

  departments: any[] = [];
  testLevels = [
    { label: 'Beginner', value: 'Beginner' },
    { label: 'Intermediate', value: 'Intermediate' },
    { label: 'Advanced', value: 'Advanced' }
  ];
  qTypes = [
    { label: 'MCQ', value: 'MCQ' as QType },
    { label: 'Single Choice', value: 'SingleChoice' as QType },
    { label: 'Descriptive', value: 'Descriptive' as QType }
  ];

  showPreview = false;

  getDeptName(id: number | null): string {           // +
    if (id == null) return '—';
    const d = this.departments?.find(x => x.id === id);
    return d?.name ?? '—';
  }

  constructor(
    private fb: NonNullableFormBuilder,
    private deptService: Departments,
    private qbService: QuestionBankService,
    private qService: QuestionsService,
    private toast: MessageService
  ) {}

  ngOnInit(): void {
    // initialize empty form as before
    this.initForm();
    // if opened in edit mode with id, load from API
    if (this.bankId) {
      this.loadBankAndQuestions(this.bankId);
    } else if (this.bankPreset) {
      // quick patch from parent if it sent partial data
      this.patchBankBasics(this.bankPreset);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['bankId'] && !changes['bankId'].firstChange) {
      if (this.bankId) this.loadBankAndQuestions(this.bankId);
    }
    if (changes['bankPreset'] && !changes['bankPreset'].firstChange) {
      if (this.bankPreset) this.patchBankBasics(this.bankPreset);
    }
  }


  initForm(){
    this.bankForm = this.fb.group({
      name: this.fb.control('', { validators: [Validators.required] }),
      category: this.fb.control(''),
      departmentId: new FormControl<number | null>(null),
      designation: this.fb.control(''),
      level: new FormControl<string | null>(null, { validators: [Validators.required] }),
      createdBy: this.fb.control(1),
      questions: this.fb.array<QuestionFG>([
        this.createQuestionRow('MCQ'),
        this.createQuestionRow('Descriptive')
      ])
    }) as BankForm;

    this.deptService.getDepartments().subscribe(d => (this.departments = d || []));
  }

  // ---------- getters
  get questionsFA(): FormArray<QuestionFG> {
    return this.bankForm.get('questions') as FormArray<QuestionFG>;
  }

  optionsFA(qIndex: number): FormArray<OptionFG> {
    return this.questionsFA.at(qIndex).get('options') as FormArray<OptionFG>;
  }

  // ---------- factories
  createOption(text = '', isCorrect = false, id: number | null = null): OptionFG {
    return this.fb.group({
      id:        new FormControl<number | null>(id),
      text: this.fb.control(text, { validators: [Validators.required] }),
      isCorrect: this.fb.control(isCorrect)
    });
  }

  createQuestionRow(type: QType): QuestionFG {
    const isDesc = type === 'Descriptive';
    return this.fb.group({
      id:           new FormControl<number | null>(null),
      type: this.fb.control(type, { validators: [Validators.required] }),
      maxTime: new FormControl<number | null>(null),
      weight: new FormControl<number | null>(null),
      negativeWeight: this.fb.control(0),
      text: this.fb.control('', { validators: [Validators.required] }),
      answerType: this.fb.control<AnswerType>(isDesc ? null : 'single'),
      options: this.fb.array<OptionFG>(
        type === 'Descriptive' ? [] : [this.createOption(), this.createOption()]
      )
    }) as QuestionFG;
  }

  // ---------- UI actions
  addQuestionRow(type: QType) {
    this.questionsFA.push(this.createQuestionRow(type));
  }

  removeQuestionRow(idx: number) {
    this.questionsFA.removeAt(idx);
  }

  addOption(qIndex: number) {
    this.optionsFA(qIndex).push(this.createOption());
  }

  removeOption(qIndex: number, oIndex: number) {
    const opts = this.optionsFA(qIndex);
    opts.removeAt(oIndex);
  }

  onTypeChange(qIndex: number) {
    const q = this.questionsFA.at(qIndex);
    const type = q.get('type')!.value;
    const opts = this.optionsFA(qIndex);
  
    if (type === 'Descriptive') {
      while (opts.length) opts.removeAt(0);
      q.get('answerType')!.setValue(null);
    } else {
      // Ensure at least 2 options and default answerType
      while (opts.length < 2) opts.push(this.createOption());
      if (!q.get('answerType')!.value) q.get('answerType')!.setValue('single');
    }
  }
  
  onAnswerTypeChange(qIndex: number) {
    const q = this.questionsFA.at(qIndex);
    const at = q.get('answerType')!.value;
    if (at === 'single') {
      // keep only the first correct checked
      const opts = this.optionsFA(qIndex);
      let found = false;
      opts.controls.forEach(c => {
        const v = c.get('isCorrect')!.value;
        if (v && !found) { found = true; }
        else { c.get('isCorrect')!.setValue(false, { emitEvent: false }); }
      });
    }
  }
  
  onCorrectChange(qIndex: number, optIndex: number) {
    const q = this.questionsFA.at(qIndex);
    if (q.get('answerType')!.value !== 'single') return;
  
    // single choice → uncheck all others
    const opts = this.optionsFA(qIndex);
    opts.controls.forEach((c, i) =>
      c.get('isCorrect')!.setValue(i === optIndex, { emitEvent: false })
    );
  }
  
  // Count correct answers for question at index
  countCorrectAt(qIndex: number): number {
    const opts = this.optionsFA(qIndex)?.controls ?? [];
    let n = 0;
    for (const c of opts) if (c.get('isCorrect')?.value) n++;
    return n;
  }

  isMCQorSC(q: QuestionFG) {
    return q.get('type')!.value === 'MCQ';
  }
  
  isSingleChoice(q: QuestionFG) {
    return q.get('type')!.value === 'MCQ' && q.get('answerType')!.value === 'single';
  }
  
  isMultipleChoice(q: QuestionFG) {
    return q.get('type')!.value === 'MCQ' && q.get('answerType')!.value === 'multiple';
  }
  

  // ---------- validation
  invalidQuestion(q: QuestionFG): string[] {
    const errs: string[] = [];
    const type = q.get('type')!.value;
  
    if (!q.get('text')!.value?.trim()) errs.push('Question text');
    if (!q.get('weight')!.value) errs.push('Weightage');
  
    if (type !== 'Descriptive') {
      const answerType = q.get('answerType')!.value;
      if (!answerType) errs.push('Answer Type (Single/Multiple)');
  
      const opts = q.get('options') as FormArray<OptionFG>;
      if ((opts?.length || 0) < 2) errs.push('At least 2 options');
      if (opts.controls.some(c => !c.get('text')!.value?.trim())) errs.push('Option text');
  
      const correctCount = opts.controls.filter(c => !!c.get('isCorrect')!.value).length;
      if (answerType === 'single' && correctCount !== 1) errs.push('Exactly one correct');
      if (answerType === 'multiple' && correctCount < 1) errs.push('At least one correct');
    }
    return errs;
  }
  

  validateAll(): boolean {
    if (this.bankForm.invalid) return false;
    const problems = this.questionsFA.controls
      .map((q, i) => ({ i, issues: this.invalidQuestion(q) }))
      .filter(x => x.issues.length);
    console.log(problems)
    if (problems.length) {
      const first = problems[0];
      this.toast.add({
        severity: 'warn',
        summary: `Fix Question #${first.i + 1}`,
        detail: first.issues.join(', ')
      });
      return false;
    }
    return true;
  }

  // ---------- save / preview / cancel
  openPreview() {
    if (!this.validateAll()) return;
    this.showPreview = true;
  }

  cancel() {
    this.bankForm.reset({ level: null, createdBy: 1 });
    this.questionsFA.clear();
    this.questionsFA.push(this.createQuestionRow('MCQ'));
    this.questionsFA.push(this.createQuestionRow('Descriptive'));
  }

  // saveAll() {
  //   if (!this.validateAll()) return;
  //   this.submitted = true;

  //   const { name, category, departmentId, designation, level, createdBy } = this.bankForm.value;
  //   const qbPayload = {
  //     name: name!,
  //     role: designation!,
  //     departmentId: departmentId ?? undefined,
  //     difficulty: level!,
  //     createdBy: createdBy!
  //   };

  //   this.saving = true;
  //   this.qbService.create(qbPayload).subscribe({
  //     next: (bank) => {
  //       const bankId = bank.id;

  //       const toSend = this.questionsFA.value.map((q) => {
  //         const base: any = {
  //           questionBankId: bankId,
  //           text: q.text!,
  //           type: q.type,                 // 'MCQ' | 'Descriptive'
  //           weight: Number(q.weight) || 1,
  //           answerType: q.type === 'Descriptive' ? undefined : q.answerType // include for MCQ
  //         };
  //         if (q.type === 'Descriptive') return base;
  //         return {
  //           ...base,
  //           options: (q.options || []).map(o => ({ text: o.text!, isCorrect: !!o.isCorrect }))
  //         };
  //       });
        

  //       let saved = 0;
  //       toSend.forEach(item =>
  //         this.qService.create(item).subscribe({
  //           next: () => (saved++),
  //           error: (err) => console.error('Failed to save question', err),
  //           complete: () => {
  //             if (saved === toSend.length) {
  //               this.toast.add({ severity: 'success', summary: 'Saved', detail: 'Question Bank & Questions saved.' });
  //               this.saving = false;
  //               this.showPreview = false;
  //               this.cancel();
  //             }
  //           }
  //         })
  //       );
  //     },
  //     error: (err) => {
  //       console.error('Failed to save question bank', err);
  //       this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save question bank.' });
  //       this.saving = false;
  //     }
  //   });
  // }
  saveAll() {
    this.submitted = true;
    if (!this.validateAll()) return;
  
    const header = this.bankForm.value;
    const qbPayload = {
      name: header.name!,
      role: header.designation!,
      departmentId: header.departmentId ?? undefined,
      difficulty: header.level!,
      createdBy: header.createdBy!
    };
  
    this.saving = true;
  
    const afterHeader = (bankId: number) => {
      // Build a quick map of form questions
      const formQs = this.questionsFA.value;
  
      // 1) Load existing IDs to find deletions
      this.qService.getByBank(bankId).subscribe({
        next: (existing: any[]) => {
          const existingIds = new Set((existing || []).map(q => q.id));
          const formIds = new Set(formQs.map(q => q.id).filter(Boolean));
  
          const toDelete = [...existingIds].filter(id => !formIds.has(id));
          // delete removed questions
          toDelete.forEach(id => this.qService.delete(id).subscribe());
  
          // 2) Upsert each form question
          let done = 0, total = formQs.length;
          const finish = () => {
            done++;
            if (done === total) {
              this.toast.add({ severity: 'success', summary: 'Saved', detail: 'Question Bank saved.' });
              this.saving = false;
              this.saved.emit();
            }
          };
  
          for (const q of formQs) {
            const payload: any = {
              questionBankId: bankId,
              text: q.text!,
              type: q.type,                               // 'MCQ' or 'Descriptive'
              weight: Number(q.weight) || 1,
              answerType: q.type === 'Descriptive' ? undefined : q.answerType,
              options: q.type === 'Descriptive'
                ? undefined
                : (q.options || []).map((o: any) => ({ text: o.text!, isCorrect: !!o.isCorrect }))
            };
  
            const req$ = q.id
              ? this.qService.update(q.id, payload) // if you have update endpoint
              : this.qService.create(payload);
  
            req$.subscribe({ next: () => {}, error: () => {}, complete: finish });
          }
  
          if (total === 0) finish();
        },
        error: () => {
          this.saving = false;
          this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to sync questions' });
        }
      });
    };
  
    // Create vs Update header
    if (this.bankId) {
      this.qbService.update(this.bankId, qbPayload).subscribe({
        next: () => afterHeader(this.bankId!),
        error: () => {
          this.saving = false;
          this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update question bank' });
        }
      });
    } else {
      this.qbService.create(qbPayload).subscribe({
        next: (bank) => afterHeader(bank.id),
        error: () => {
          this.saving = false;
          this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to create question bank' });
        }
      });
    }
  }
  
  close() {
    this.closed.emit();
  }
  
  private patchBankBasics(bank: any) {
    this.bankForm.patchValue({
      name: bank?.name ?? '',
      category: bank?.category ?? '',
      departmentId: bank?.departmentId ?? null,
      designation: bank?.role ?? '',
      level: bank?.difficulty ?? null
    }, { emitEvent: false });
  }

  /** Load full bank (if needed) and its questions, then patch */
  private loadBankAndQuestions(id: number) {
    // 1) load bank header (if your service has getById)
    this.qbService.getById?.(id).subscribe({
      next: (bank: any) => this.patchBankBasics(bank),
      error: () => {} // it's ok if you only have header props already
    });

    // 2) load questions
    this.qService.getByBank(id).subscribe({
      next: (list: any[]) => this.setQuestionsFromApi(list || []),
      error: err => {
        console.error('Failed to load questions', err);
        this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load questions' });
      }
    });
  }

  /** Replace FormArray with the server questions */
  private setQuestionsFromApi(questions: any[]) {
    const fa = this.questionsFA;
    fa.clear();
    for (const q of questions) {
      const row = this.fb.group({
        // include id so we can update later
        id: this.fb.control<number | null>(q.id ?? null),
        type: this.fb.control<QType>(q.type === 'Descriptive' ? 'Descriptive' : 'MCQ', { validators: [Validators.required] }),
        maxTime: new FormControl<number | null>(q.maxTime ?? null),
        weight: new FormControl<number | null>(q.weight ?? 1),
        negativeWeight: this.fb.control(q.negativeWeight ?? 0),
        text: this.fb.control(q.text ?? '', { validators: [Validators.required] }),
        answerType: this.fb.control<AnswerType>(
          q.type === 'Descriptive' ? null : (q.answerType ?? (q.options?.filter((o:any)=>o.isCorrect).length === 1 ? 'single' : 'multiple'))
        ),
        options: this.fb.array<OptionFG>(
          q.type === 'Descriptive'
            ? []
            : (q.options || []).map((o: any) =>
                this.fb.group({
                  id: this.fb.control<number | null>(o.id ?? null),
                  text: this.fb.control(o.text ?? '', { validators: [Validators.required] }),
                  isCorrect: this.fb.control(!!o.isCorrect)
                }) as OptionFG
              )
        )
      }) as QuestionFG;
      // ensure at least 2 option controls for MCQ
      if (row.get('type')!.value === 'MCQ') {
        const opts = row.get('options') as FormArray;
        while (opts.length < 2) opts.push(this.createOption());
      }
      fa.push(row);
    }

    // if no questions, start with one blank row
    if (fa.length === 0) {
      fa.push(this.createQuestionRow('MCQ'));
    }
  }
}
