import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface Qualification {
  degree: string;
  institution: string;
  year: number;
}

export interface Employee {
  id?: number;
  employeeCode: string;
  referenceCode?: string;
  firstName: string;
  lastName: string;
  gender: string;
  dob: string;
  photoUrl?: string;
  phone: string;
  email: string;
  designation: string;
  departmentId: number;
  branchId: number;
  dateOfJoining: string;
  employmentType: string;
  probationEndDate?: string;
  employmentStatus: string;
  roleId: number;
  emergencyContacts?: EmergencyContact[];
  qualifications?: Qualification[];
}

@Injectable({
  providedIn: 'root'
})
export class Employees {
  private apiUrl = 'http://localhost:3002/api/employees';

  constructor(private http: HttpClient) {}

  getEmployees(): Observable<Employee[]> {
    return this.http.get<Employee[]>(this.apiUrl);
  }

  getEmployeeById(id: number): Observable<Employee> {
    return this.http.get<Employee>(`${this.apiUrl}/${id}`);
  }

  createEmployee(employee: Employee): Observable<Employee> {
    return this.http.post<Employee>(this.apiUrl, employee);
  }

  updateEmployee(id: number, employee: Partial<Employee>): Observable<Employee> {
    return this.http.put<Employee>(`${this.apiUrl}/${id}`, employee);
  }

  deleteEmployee(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
  uploadEmployeeDocuments(employeeId: number, docsForm: any) {
    const formData = new FormData();

    // Append metadata
    formData.append('metadata', JSON.stringify(docsForm.value));

    // Append actual files
    docsForm.controls.forEach((docGroup: any) => {
      if (docGroup.value.file) {
        formData.append('file', docGroup.value.file);
      }
    });

    return this.http.post(`${this.apiUrl}/${employeeId}/documents/upload`, formData);
  }
}
