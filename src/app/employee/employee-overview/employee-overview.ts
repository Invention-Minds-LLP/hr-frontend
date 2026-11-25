import { Component } from '@angular/core';
import { EmployeeForm } from "../employee-form/employee-form";
import { EmployeeList } from "../employee-list/employee-list";
import { CommonModule } from '@angular/common';
import { ModuleGuide } from '../../shared/module-guide/module-guide';
import { UnreportedEmployee } from "../unreported-employee/unreported-employee";
import { Employee, EmployeeImportResult, Employees } from '../../services/employees/employees';
import { saveAs } from 'file-saver';
import { MessageService } from 'primeng/api';
import { SurveyList } from "../../survey/survey-list/survey-list";
import { ManageAttendance } from "../../attendance/manage-attendance/manage-attendance";
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-employee-overview',
  imports: [EmployeeForm, EmployeeList, CommonModule,
     UnreportedEmployee, SurveyList, ManageAttendance, ModuleGuide, ReactiveFormsModule, FormsModule],
  templateUrl: './employee-overview.html',
  styleUrl: './employee-overview.css',
  providers: [MessageService]
})
export class EmployeeOverview {
  active:string = 'list';
  selectedEmployee: any = null;
  roleId: number = Number(localStorage.getItem('roleId')) || 0;
  uploadYear: number = new Date().getFullYear();
  uploadMonth: number = new Date().getMonth() + 1;



  show(value: string){
    this.active = value;
    
  }
  onEditEmployee(employee: any) {
    this.selectedEmployee = employee;
    this.active = 'form';
  }
  onFormClose(refreshList: boolean = false) {
    this.selectedEmployee = null;
    this.active = 'list';
  }
  logs: string[] = [];
  errorReportUrl: string | null = null;
  uploading = false;

  constructor(private uploadService: Employees , private messageService: MessageService) {}

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.upload(file);
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.upload(file);
    }
  }

  allowDrop(event: DragEvent) {
    event.preventDefault();
  }

  upload(file: File) {
        if (!this.uploadYear || !this.uploadMonth) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Missing values',
        detail: 'Please select year and month before uploading.'
      });
      return;
    }

    this.uploading = true;


    this.uploadService.uploadExcel(file, this.uploadYear, this.uploadMonth).subscribe({
      next: (response) => {
        this.logs = response.logs;
        this.errorReportUrl = response.errors;
        this.uploading = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Upload Complete',
          detail: 'Employee data uploaded successfully.',
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Upload Failed',
          detail: 'There was an error uploading the employee data.',
        });
        this.uploading = false;
      }
    });
  }

  // ---------- Employee import ----------
  importing = false;
  importResult: EmployeeImportResult | null = null;
  importError = '';

  downloadImportTemplate() {
    this.importError = '';
    this.uploadService.downloadEmployeeImportTemplate().subscribe({
      next: (blob) => saveAs(blob, 'employee-import-template.xlsx'),
      error: () => (this.importError = 'Could not download the template.'),
    });
  }

  onImportFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.importEmployees(file);
    input.value = ''; // allow re-selecting the same file after fixing it
  }

  onImportDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) this.importEmployees(file);
  }

  importEmployees(file: File) {
    this.importing = true;
    this.importResult = null;
    this.importError = '';
    this.uploadService.bulkImportEmployees(file).subscribe({
      next: (res) => {
        this.importResult = res;
        this.importing = false;
      },
      error: (err) => {
        this.importError = err?.error?.error || 'Import failed. Please try again.';
        this.importing = false;
      },
    });
  }
}
