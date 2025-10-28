import { Component, Input, ViewChild } from '@angular/core';
import { Trainings } from '../../services/trainings/trainings';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MultiSelectModule } from 'primeng/multiselect';
import { FormBuilder, FormsModule } from '@angular/forms';
import { TrainingForm } from '../training-form/training-form';
import { TrainingOverview } from '../training-overview/training-overview';
import { CommonModule } from '@angular/common';
import { Employees } from '../../services/employees/employees';
import { Tests } from '../../services/tests/tests';
import { FloatLabelModule } from 'primeng/floatlabel';
import { FormGroup } from '@angular/forms';
import { Departments } from '../../services/departments/departments';
import { ReactiveFormsModule } from '@angular/forms';


@Component({
  selector: 'app-training-list',
  imports: [
    TableModule,
    ButtonModule,
    CardModule,
    DialogModule,
    MultiSelectModule,
    FormsModule,
    TrainingForm,
    TrainingOverview,
    CommonModule,
    FloatLabelModule,
    ReactiveFormsModule,
    FormsModule
  ],
  templateUrl: './training-list.html',
  styleUrl: './training-list.css'
})
export class TrainingList {
  trainings: any[] = [];
  userRole: 'HR' | 'EMPLOYEE' = 'EMPLOYEE';
  loading = true;
  @Input() visible: boolean = false;
  @Input() trainingId!: number;

  form!: FormGroup;
  departments: any[] = [];
  employeeOptions: any[] = [];
  loadingEmployees = false;

  showForm = false;
  selectedTraining: any = null;

  // Dialogs
  showAssignEmpDialog = false;
  showAssignTestDialog = false;
  showFeedbackDialog = false;
  feedbackSummary: any = null;
  selectedEmployees: any[] = [];
  testOptions: any[] = [];
  selectedTests: any[] = [];
  employees: any[] = [];
  @ViewChild('trainingFormRef') trainingForm!: TrainingForm;


  constructor(private trainingService: Trainings, private employeeService: Employees,
    private testService: Tests, private fb: FormBuilder, private departmentService: Departments) { }

  ngOnInit() {
    const role = localStorage.getItem('role') || 'EMPLOYEE';
    this.userRole = role === 'HR' || role === 'HR Manager' ? 'HR' : 'EMPLOYEE';
    this.fetchTrainings();
    this.loadEmployees();
    this.loadTests();
    this.form = this.fb.group({
      departmentIds: this.fb.control<number[]>([]),
      employeeIds: this.fb.control<number[]>([])
    });


    this.loadDepartments();

    // when departments change, load employees
    this.form.get('departmentIds')?.valueChanges.subscribe((deptIds) => {
      if (deptIds && deptIds.length > 0) {
        this.loadEmployeesByDepartments(deptIds);
      } else {
        this.employeeOptions = [];
      }
    });
  }
  loadEmployees() {
    this.loading = true;
    this.employeeService.getActiveEmployees().subscribe({
      next: (res) => {
        // Map API data to dropdown format
        this.employeeOptions = res.map((emp: any) => ({
          label: `${emp.firstName} ${emp.lastName} ${emp.employeeCode ? ' (' + emp.employeeCode + ')' : ''}`,
          value: emp.id
        }));
        this.employees = res;
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Failed to fetch employees', err);
        this.loading = false;
      }
    });
  }

  loadTests() {
    this.loading = true;
    this.testService.getAll().subscribe({
      next: (res) => {
        // Map API data to dropdown format
        this.testOptions = res.map((test: any) => ({
          label: test.name || test.title, // depends on your model field
          value: test.id
        }));
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Failed to fetch tests', err);
        this.loading = false;
      }
    });
  }
  fetchTrainings() {
    this.loading = true;
    if (this.userRole === 'HR') {
      this.trainingService.getAllTrainings().subscribe({
        next: (res) => {
          this.trainings = res;
          this.loading = false;
        },
        error: (err) => {
          console.error(err);
          this.loading = false;
        },
      });
    } else {
      const employeeId = localStorage.getItem('empId') || '1';
      this.trainingService.getTrainingsByEmployee(employeeId).subscribe({
        next: (res: any) => {
          this.trainings = res;
          this.loading = false;
        },
        error: (err: any) => {
          console.error(err);
          this.loading = false;
        },
      });

    }
  }

  toggleForm() {
    this.showForm = !this.showForm;
  }

  onTrainingCreated() {
    this.showForm = false;
    this.fetchTrainings();
  }

  openAssignEmployees(training: any) {
    this.selectedTraining = training;
    this.selectedEmployees = [];
    this.showAssignEmpDialog = true;
  }

  onAssign() {
    const employeeIds = this.form.value.employeeIds || [];
    if (!employeeIds.length) {
      alert('Please select at least one employee.');
      return;
    }

    const payload = {
      trainingId: this.selectedTraining.id,
      employeeIds,
      assignedBy: Number(localStorage.getItem('userId')) || 1, // 👈 from logged user
    };

    console.log('📤 Assigning payload:', payload);

    this.trainingService.assignEmployees(payload).subscribe({
      next: () => {
        alert('✅ Employees assigned successfully!');
        this.showAssignEmpDialog = false;
        this.fetchTrainings();
      },
      error: (err) => console.error('❌ Failed to assign employees', err),
    });
  }


  openAssignTests(training: any) {
    this.selectedTraining = training;
    this.selectedTests = [];
    this.showAssignTestDialog = true;
  }

  assignTests() {
    const ids = this.selectedTests.map((t) => t.value);
    this.trainingService.assignTests(this.selectedTraining.id, ids).subscribe({
      next: () => {
        alert('Tests assigned successfully!');
        this.showAssignTestDialog = false;
        this.fetchTrainings();
      },
      error: (err) => console.error(err),
    });
  }

  openFeedbackDialog(training: any) {
    this.selectedTraining = training;
    this.showFeedbackDialog = true;

    if (this.userRole === 'HR') {
      this.trainingService.getFeedbackSummary(training.id).subscribe({
        next: (res) => (this.feedbackSummary = res),
        error: (err) => console.error(err),
      });
    }
  }

  openFeedback(training: any) {
    this.selectedTraining = training;
    this.showFeedbackDialog = true;
  }
  loadDepartments() {
    this.departmentService.getDepartments().subscribe({
      next: (res) => {
        this.departments = res.map((d: any) => ({
          label: d.name,
          value: d.id
        }));
      },
      error: (err) => console.error('❌ Failed to load departments:', err)
    });
  }

  loadEmployeesByDepartments(departmentIds: number[]) {
    if (!Array.isArray(departmentIds) || !departmentIds.length) {
      this.employeeOptions = [];
      return;
    }

    this.loadingEmployees = true;
    this.employeeService.getByDepartments(departmentIds).subscribe({
      next: (res) => {
        this.employeeOptions = res.map((emp: any) => ({
          label: `${emp.firstName} ${emp.lastName} ${emp.employeeCode ? ' (' + emp.employeeCode + ')' : ''}`,
          value: emp.id
        }));
        this.loadingEmployees = false;
      },
      error: (err) => {
        console.error('❌ Failed to load employees:', err);
        this.loadingEmployees = false;
      }
    });
  }




  getInternalTrainerName(id: number): string {
    const emp = this.employees?.find((e: any) => e.id === id);
    return emp ? `${emp.firstName} ${emp.lastName}` : `Employee #${id}`;
  }
  editTraining(training: any) {
    this.selectedTraining = training;
    this.showForm = true;

    // Wait until the form component is visible in DOM, then populate
    setTimeout(() => {
      if (this.trainingForm) {
        this.trainingForm.populateForm(training);
      }
    });

  }



  showTestsDialog = false;
  showEmployeesDialog = false;

  openTestsDialog(training: any) {
    this.selectedTraining = training;
    this.showTestsDialog = true;
  }

  openEmployeesDialog(training: any) {
    this.selectedTraining = training;
    this.showEmployeesDialog = true;
  }

}
