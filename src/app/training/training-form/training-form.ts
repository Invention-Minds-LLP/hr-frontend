import { Component, Input, OnChanges, SimpleChanges  } from '@angular/core';
import { FormBuilder, FormGroup, Validators,FormArray  } from '@angular/forms';
import { Trainings } from '../../services/trainings/trainings';
import { DatePicker } from 'primeng/datepicker';
import { Select } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { Employees } from '../../services/employees/employees';
import { FloatLabelModule } from 'primeng/floatlabel';
import { Tests } from '../../services/tests/tests';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

@Component({
  selector: 'app-training-form',
  imports: [
    DatePicker,
    Select,
    MultiSelectModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    CardModule,
    DividerModule,
    FloatLabelModule,
    TextareaModule,
    ToggleSwitchModule 
  ],
  templateUrl: './training-form.html',
  styleUrl: './training-form.css'
})
export class TrainingForm {
  form!: FormGroup;
  employees: any[] = [];
  testOptions: any[] = []; // ✅ list of available tests
  submitting = false;
  loading = false;
  @Input() trainingData: any | null = null; // 👈 incoming data from parent
  editing = false;
  trainingId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private trainingService: Trainings,
    private employeeService: Employees,
    private testService: Tests // ✅ inject test service
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      objectives: [''],
      mode: ['ONLINE', Validators.required],
      location: [''],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      trainers: this.fb.array([]),
      tests: this.fb.array([]), // array of objects { testId, isMandatory }
    });

    this.fetchEmployees();
    this.loadTests(); // ✅ load available tests
  }
  populateForm(training: any) {
    if (!training) return;
  
    this.editing = true;
    this.trainingId = training.id;
  
    // Patch simple fields
    this.form.patchValue({
      title: training.title,
      description: training.description,
      objectives: training.objectives,
      mode: training.mode,
      location: training.location,
      startDate: training.startDate ? new Date(training.startDate) : null,
      endDate: training.endDate ? new Date(training.endDate) : null,
    });
  
    // Clear and re-add trainers
    this.trainers.clear();
  
    if (Array.isArray(training.trainers)) {
      training.trainers.forEach((tr: any) => {
        this.trainers.push(
          this.fb.group({
            trainerType: [tr.trainerType],
            trainerId: [tr.trainerId],
            trainerName: [tr.trainerName],
            trainerOrg: [tr.trainerOrg],
          })
        );
      });
    }
  
    this.tests.clear();

    // Some APIs return trainingTests = [ { test: {id, title}, isMandatory } ]
    // others return just testId — so we handle both cases:
    if (Array.isArray(training.trainingTests)) {
      training.trainingTests.forEach((t: any) => {
        this.tests.push(
          this.fb.group({
            testId: [t.testId ?? t.test?.id],
            testLabel: [t.test?.title ?? t.test?.name ?? ''],
            isMandatory: [t.isMandatory ?? true],
          })
        );
      });
    }
  }
  
  get trainers(): FormArray {
    return this.form.get('trainers') as FormArray;
  }

  get trainerGroups(): FormGroup[] {
    return this.trainers.controls as FormGroup[];
  }

  addTrainer(type: 'INTERNAL' | 'EXTERNAL') {
    const group = this.fb.group({
      trainerType: [type, Validators.required],
      trainerId: [null],
      trainerName: [''],
      trainerOrg: [''],
    });
    this.trainers.push(group);
  }

  removeTrainer(index: number) {
    this.trainers.removeAt(index);
  }

  get tests(): FormArray {
    return this.form.get('tests') as FormArray;
  }
  
  get testGroups(): FormGroup[] {
    return this.tests.controls as FormGroup[];
  }
  
  
  addTest(testId: number, testLabel: string) {
    this.tests.push(
      this.fb.group({
        testId: [testId],
        testLabel: [testLabel],
        isMandatory: [true], // default true
      })
    );
  }
  
  removeTestAt(index: number) {
    this.tests.removeAt(index);
  }
  
  onTestSelectionChange(selectedTestIds: number[]) {
    const selectedTests = selectedTestIds.map(
      (id) => this.testOptions.find((t) => t.value === id)!
    );
  
    // clear form array first
    while (this.tests.length) {
      this.tests.removeAt(0);
    }
  
    // re-add all selected tests
    selectedTests.forEach((t) => {
      this.addTest(t.value, t.label);
    });
  }
  
  fetchEmployees() {
    this.employeeService.getActiveEmployees().subscribe({
      next: (res: any[]) => {
        this.employees = res.map((e) => ({
          label: `${e.firstName} ${e.lastName}`,
          value: e.id,
        }));
      },
      error: (err) => console.error('Failed to fetch employees', err),
    });
  }

  loadTests() {
    this.loading = true;
    this.testService.getAll().subscribe({
      next: (res) => {
        this.testOptions = res.map((test: any) => ({
          label: test.name || test.title,
          value: test.id,
        }));
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Failed to fetch tests', err);
        this.loading = false;
      },
    });
  }

  onSubmit() {
    if (this.form.invalid) return;
  
    this.submitting = true;
  
    const payload = {
      ...this.form.value,
      trainers: this.trainers.value,
      trainingTests: this.tests.value.map((t: any, index: number) => ({
        testId: t.testId,
        isMandatory: t.isMandatory ?? true,
        orderNo: index + 1,
      })),
    };
  
    // ✅ UPDATE EXISTING TRAINING
    if (this.editing && this.trainingId) {
      this.trainingService.updateTraining(this.trainingId, payload).subscribe({
        next: (res) => {
          alert('✅ Training updated successfully!');
          this.resetForm();
          this.submitting = false;
          // this.formSubmit.emit(); // optional event for parent
        },
        error: (err) => {
          console.error('❌ Failed to update training:', err);
          this.submitting = false;
        },
      });
  
    // ✅ CREATE NEW TRAINING
    } else {
      this.trainingService.createTraining(payload).subscribe({
        next: () => {
          alert('✅ Training created successfully!');
          this.resetForm();
          this.submitting = false;
          // this.formSubmit.emit(); // optional event for parent
        },
        error: (err) => {
          console.error('❌ Failed to create training:', err);
          this.submitting = false;
        },
      });
    }
  }
  resetForm() {
    this.form.reset({ mode: 'ONLINE' });
    this.trainers.clear();
    this.tests.clear();
    this.editing = false;
    this.trainingId = null;
  }
  
}
