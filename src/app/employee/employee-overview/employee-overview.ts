import { Component } from '@angular/core';
import { EmployeeForm } from "../employee-form/employee-form";
import { EmployeeList } from "../employee-list/employee-list";
import { CommonModule } from '@angular/common';
import { UnreportedEmployee } from "../unreported-employee/unreported-employee";
import { Employee, Employees } from '../../services/employees/employees';
import { MessageService } from 'primeng/api';
import { SurveyList } from "../../survey/survey-list/survey-list";

@Component({
  selector: 'app-employee-overview',
  imports: [EmployeeForm, EmployeeList, CommonModule, UnreportedEmployee, SurveyList],
  templateUrl: './employee-overview.html',
  styleUrl: './employee-overview.css',
  providers: [MessageService]
})
export class EmployeeOverview {
  active:string = 'list';
  selectedEmployee: any = null;


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
    this.uploading = true;

    this.uploadService.uploadExcel(file).subscribe({
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
}
