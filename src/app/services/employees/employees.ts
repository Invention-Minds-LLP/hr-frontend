import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';
import { FormArray } from '@angular/forms';

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
export interface EmployeeRow { id: number; firstName: string; lastName: string; employeeCode?: string | null; departmentId?: number | null; }

@Injectable({
  providedIn: 'root'
})
export class Employees {
  private apiUrl = environment.apiUrl + '/employees';
  // private apiUrl = 'http://localhost:3002/api/employees';

  constructor(private http: HttpClient) { }

  // getEmployees(): Observable<Employee[]> {
  //   return this.http.get<Employee[]>(this.apiUrl);
  // }
  getEmployees(page: number, pageSize: number, search?: string, filter?: any) {
    const params: any = { page, pageSize };

    if (search) params.search = search;
    if (filter) params.filter = filter

    return this.http.get(this.apiUrl, { params });
  }


  getEmployeeById(id: number): Observable<any> {
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
  // uploadEmployeeDocuments(employeeId: number, docsForm: any) {
  //   const formData = new FormData();

  //   // Append metadata
  //   formData.append('metadata', JSON.stringify(docsForm.value));

  //   // Append actual files
  //   docsForm.controls.forEach((docGroup: any) => {
  //     if (docGroup.value.file) {
  //       formData.append('file', docGroup.value.file);
  //     }
  //   });

  //   return this.http.post(`${this.apiUrl}/${employeeId}/documents/upload`, formData);
  // }
  // uploadEmployeeDocuments(employeeId: number, docsForm: FormArray) {
  //   const formData = new FormData();

  //   // metadata
  //   formData.append('metadata', JSON.stringify(docsForm.value));

  //   // files + index mapping
  //   docsForm.controls.forEach((ctrl, index) => {
  //     if (ctrl.value.file instanceof File) {
  //       formData.append('file', ctrl.value.file);
  //       formData.append('fileIndex', index.toString());
  //     }
  //   });

  //   return this.http.post(
  //     `${this.apiUrl}/${employeeId}/documents/upload`,
  //     formData
  //   );
  // }
  uploadEmployeeDocuments(employeeId: number, formData: FormData) {
    return this.http.post(
      `${this.apiUrl}/${employeeId}/documents/upload`,
      formData
    );
  }



  getEmployeesWithSpecificRoles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/specific-roles`);
  }
  getActiveEmployees() {
    return this.http.get<any[]>(`${this.apiUrl}/active`);
  }
  getAccruals(employeeId: number): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/${employeeId}/accruals`
    );
  }
  getEmployeeRequests(employeeId: number) {
    return this.http.get<{ leaves: any[]; permissions: any[]; wfh: any[] }>(
      `${this.apiUrl}/${employeeId}/requests`
    );
  }
  getToday(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/today`);
  }
  list(q: { departmentId?: number; status?: string } = {}): Observable<EmployeeRow[]> {
    let params = new HttpParams();
    if (q.departmentId != null) params = params.set('departmentId', String(q.departmentId));
    if (q.status) params = params.set('status', q.status);
    return this.http.get<EmployeeRow[]>(`${this.apiUrl}/dept`, { params });
  }
  uploadEmployeePhoto(employeeId: number, formData: FormData) {
    return this.http.post(`${this.apiUrl}/${employeeId}/photo`, formData);
  }
  uploadDisabilityProof(employeeCode: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(
      `${this.apiUrl}/${employeeCode}/disability`,
      formData
    );
  }


  uploadVaccineProof(employeeId: number, vaccineIndex: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);  // must match backend
    return this.http.post<any>(
      `${this.apiUrl}/${employeeId}/vaccinations/${vaccineIndex}/proof`,
      formData
    );
  }
  // 🔹 Get employees by multiple departments
  getByDepartments(departmentIds: number[]): Observable<any[]> {
    const ids = departmentIds.join(',');
    return this.http.get<any[]>(`${this.apiUrl}/by-departments?ids=${ids}`);
  }
  getAbsentWithoutLeave(date: string): Observable<any[]> {
    const params = new HttpParams().set('date', date);

    return this.http.get<any[]>(`${this.apiUrl}/absent-without-leave`, { params });
  }

  uploadExcel(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post(`${this.apiUrl}/bulk-upload`, formData);
  }
  getDesignations(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/designation`);
  }


  getIncharges(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/incharge`);
  }
  deleteEmployeeDocument(documentId: number) {
    return this.http.delete(
      `${this.apiUrl}/documents/${documentId}`
    );
  }

}
