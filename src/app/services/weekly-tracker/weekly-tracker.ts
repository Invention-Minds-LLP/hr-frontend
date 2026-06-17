import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class WeeklyTrackerService {
  private apiUrl = environment.apiUrl + '/weekly-tracker';

  constructor(private http: HttpClient) {}

  createReport(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  getReports(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get(this.apiUrl, { params: httpParams });
  }

  getReportById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  updateReport(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  submitReport(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/submit`, {});
  }

  updateReportStatus(
    id: number,
    status: string,
    userId: number,
    role: 'INCHARGE' | 'REPORTING_MANAGER' | 'HR_MANAGER' | 'MANAGEMENT',
    declineReason?: string,
    rating?: number,
    note?: string
  ): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/status`, {
      status, userId, role, declineReason, rating, note
    });
  }

  deleteReport(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  addTask(reportId: number, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/${reportId}/tasks`, data);
  }

  updateTask(taskId: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/tasks/${taskId}`, data);
  }

  deleteTask(taskId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/tasks/${taskId}`);
  }

  carryForwardTasks(reportId: number, data?: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/${reportId}/carry-forward`, data || {});
  }

  getTaskHistory(taskId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/tasks/${taskId}/history`);
  }

  getDashboard(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get(`${this.apiUrl}/dashboard`, { params: httpParams });
  }
}
