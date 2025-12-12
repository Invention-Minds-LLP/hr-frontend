import { Component } from '@angular/core';
import { Incident } from '../../services/incident/incident';
import { MessageService } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FileUploadModule } from 'primeng/fileupload';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { Employee, Employees } from '../../services/employees/employees';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-incident-form',
  imports: [
    CommonModule,
    CardModule,
    ToastModule,
    ReactiveFormsModule,
    FormsModule,
    FileUploadModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    ButtonModule
  ],
  templateUrl: './incident-form.html',
  styleUrl: './incident-form.css',
})
export class IncidentForm {
  incident = {
    employeeId: null,
    title: '',
    description: '',
    attachment: null
  };

  employees: any[] = [];


  selectedFile: File | null = null;

  isLoading = false;

  constructor(private incidentService: Incident, private toast: MessageService, private employeeService: Employees) {}

  ngOnInit() {
    this.fetchEmployees();
  }

  
fetchEmployees() {
  this.employeeService.getActiveEmployees().subscribe({
    next: (res: any[]) => {
      this.employees = res.map((e) => ({
        label: `${e.firstName} ${e.lastName} (${e.employeeCode})`,
        value: e.id
      }));
    },
    error: (err) => console.error('Failed to fetch employees', err),
  });
}



  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }


  
  submitIncident() {
    if (!this.incident.employeeId || !this.incident.title || !this.incident.description) {
      this.toast.add({
        severity: 'error',
        summary: 'Missing fields',
        detail: 'Please fill all required fields.'
      });
      return;
    }
  
    const reportedById = Number(localStorage.getItem('empid') || 0);
  
    const payload = {
      employeeId: this.incident.employeeId,
      title: this.incident.title,
      description: this.incident.description,
      reportedBy: reportedById,
      attachment: null      // because you are NOT using attachment now
    };
    this.isLoading = true;
  
    this.incidentService.createIncident(payload).subscribe({
      next: () => {
        this.toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Incident created successfully'
        });
        this.isLoading = false;
        this.incident = { employeeId: null, title: '', description: '', attachment: null };
      },
      error: () => {
        this.toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to create incident'
        });
        this.isLoading = false;
      }
    });
  }
  
  
}
