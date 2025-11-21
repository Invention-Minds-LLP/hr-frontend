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
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { Router } from '@angular/router';
import { SelectModule } from 'primeng/select';
import { DatePicker, DatePickerModule } from 'primeng/datepicker';
import { CheckboxModule } from 'primeng/checkbox';


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
    FormsModule,
    InputIconModule,
    IconFieldModule,
    InputTextModule,
    SkeletonModule,
    SelectModule,
    DatePickerModule,
    CheckboxModule,
    TableModule
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
  @Input() viewMode: 'admin' | 'individual' = 'admin';


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
  currentPath: string = '';
  role = localStorage.getItem('role') || 'EMPLOYEE';

  showAttendanceDialog = false;
  attendanceList: any[] = [];
  attendanceDate: Date = new Date();
  selectAll = false;
  bulkStatus: string | null = null;

  statusOptions = [
    { label: "Present", value: "PRESENT" },
    { label: "Absent", value: "ABSENT" }
  ];

  selectedTrainingId!: number;
  today = new Date();
  minDate = this.today;
  maxDate = this.today;
  selectedRows: any[] = [];

  



  constructor(private trainingService: Trainings, private employeeService: Employees, private router: Router,
    private testService: Tests, private fb: FormBuilder, private departmentService: Departments) { }

  ngOnInit() {
    const role = localStorage.getItem('role') || 'EMPLOYEE';
    this.currentPath = this.router.url;
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

    const empId = localStorage.getItem('empId') || '1';
    const currentPath = this.router.url;

    if ((this.userRole === 'HR' || this.role === 'Reporting Manager') && currentPath !== '/individual') {
      this.trainingService.getAllTrainings().subscribe({
        next: (res) => {
          this.filteredTrainings = [...res];
          console.log('📥 Fetched all trainings for HR', this.filteredTrainings);
          this.trainings = res;
          setTimeout(() => {
            this.loading = false;
          }, 3000)
        },
        error: (err) => {
          console.error(err);
          this.loading = false;
        },
      });
    } else {
      this.trainingService.getTrainingsByEmployee(empId).subscribe({
        next: (res: any) => {
          this.filteredTrainings = [...res];
          this.trainings = res;
          console.log('📥 Fetched trainings for employee', empId, this.filteredTrainings);
          setTimeout(() => {
            this.loading = false;
          }, 3000)
        },
        error: (err: any) => {
          console.error(err);
          this.loading = false;
        },
      });
    }
  }


  isIndividualOrEmployee() {
    return this.userRole === 'EMPLOYEE' || this.viewMode === 'individual';
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
    console.log('Selected training data:', this.selectedTraining);

  }

  openEmployeesDialog(training: any) {
    this.selectedTraining = training;
    this.showEmployeesDialog = true;
  }

  getDepartmentColors(departmentId: number) {
    const baseHue = (departmentId * 40) % 360;
    const badgeColor = `hsl(${baseHue}, 70%, 85%)`;
    const dotColor = `hsl(${baseHue}, 70%, 40%)`;

    return { badgeColor, dotColor };
  }

  filteredTrainings: any[] = [];
  showFilterDropdown = false;
  selectedFilter: any = null;
  showDateInput = false;

  filterOptions = [
    { label: 'Title', value: 'title' },
    { label: 'Trainer', value: 'trainer' },
    { label: 'StartDate', value: 'startDate' }
  ];

  toggleFilterDropdown() {
    this.showFilterDropdown = !this.showFilterDropdown;
  }

  selectFilter(option: any) {
    this.selectedFilter = option;
    this.showFilterDropdown = false;
    this.filteredTrainings = [...this.trainings];
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    const searchText = input.value.trim().toLowerCase();

    if (!this.selectedFilter || !searchText) {
      this.filteredTrainings = [...this.trainings];
      return;
    }

    const filterKey = this.selectedFilter.value;

    this.filteredTrainings = this.trainings.filter(training => {
      if (filterKey === 'title') {
        const title = (training.title || training.name || '').toLowerCase();
        return title.includes(searchText);
      }
      else if (filterKey === 'trainer') {
        const trainerName = (training.trainer || '').toLowerCase();
        return trainerName.includes(searchText);
      }
      else if (filterKey === 'startDate') {
        const dateVal = (training.startDate || '').toString().trim();

        // Normalize both date and searchText to MM/DD/YY format (2-digit year)
        const normalizedDate = this.normalizeDateFormat(dateVal);
        const normalizedSearch = this.normalizeDateFormat(searchText);

        return normalizedDate.includes(normalizedSearch);
      }
      return false;
    });
  }

  normalizeDateFormat(value: string): string {
    if (!value) return '';
    value = value.toLowerCase().replace(/-/g, '/').trim();

    // Handle yyyy-mm-dd → mm/dd/yy
    const isoMatch = value.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (isoMatch) {
      const [_, year, month, day] = isoMatch;
      const shortYear = year.slice(-2);
      return `${month.padStart(2, '0')}/${day.padStart(2, '0')}/${shortYear}`;
    }

    // already in mm/dd/yy or partial
    return value;
  }
  openAttendanceDialog(training: any) {
    this.selectedTrainingId = training.id;
    this.selectedTraining = training;
    this.showAttendanceDialog = true;
  }
  loadAttendance() {

    this.attendanceDate.setHours(0, 0, 0, 0);


    const employees = this.selectedTraining.assignedEmployees || [];

    console.log('Assigned employees:', employees);

    // Load existing attendance for the selected date
    this.trainingService.getTrainingAttendance(this.selectedTrainingId).subscribe((att: any) => {

      this.attendanceList = employees.map((emp: any) => {
        const match = att.find((x: any) =>
          x.employeeId === emp.employeeId &&
          new Date(x.date).toDateString() === this.attendanceDate.toDateString()
        );

        return {
          employeeId: emp.employeeId,
          employeeName: emp.employee.firstName + " " + emp.employee.lastName,
          department: emp.employee.Department?.name || "-",
          status: match ? match.status : null,
          alreadyMarked: !!match,
          selected: false
        };
      });
    });
  }

  // toggleSelectAll() {
  //   this.attendanceList.forEach(a => {
  //     a.selected = this.selectAll;
  
  //     if (this.selectAll && this.bulkStatus) {
  //       // Only apply if:
  //       // 1. It was NOT marked before OR
  //       // 2. New status = previous status
  //       if (!a.alreadyMarked || a.status === this.bulkStatus) {
  //         a.status = this.bulkStatus;
  //       }
  //     }
  //   });
  // }
  
  applyBulkStatus() {
    this.selectedRows.forEach(row => {
      if (!row.alreadyMarked || row.status === this.bulkStatus) {
        row.status = this.bulkStatus;
      }
    });
  }
  
  saveAttendance() {
    const formatted = {
      attendanceList: this.attendanceList
        .filter(a => a.status !== null && a.status !== undefined)
        .map(a => ({
          employeeId: a.employeeId,
          status: a.status
        })),
      date: this.attendanceDate
    };
  
    this.trainingService.bulkMarkTrainingAttendance(this.selectedTrainingId, formatted)
      .subscribe(() => {
        this.showAttendanceDialog = false;
        this.closeAttendanceDialog();
      });
  }
  
  closeAttendanceDialog() {
    this.attendanceList = [];
    this.selectedRows = [];
    this.bulkStatus = null;
    this.selectedTraining = null;
  
    // Reset date
    this.attendanceDate = new Date();
    this.attendanceDate.setHours(0, 0, 0, 0);
  
    // If you're using selectAll somewhere
    this.selectAll = false;
  
    console.log("Attendance dialog reset");
  }
  


}
