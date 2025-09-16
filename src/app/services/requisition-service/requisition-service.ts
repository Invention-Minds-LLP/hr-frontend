import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RequisitionService {
  private apiUrl = 'http://localhost:3002/api/requisitions';

  constructor(private http: HttpClient) {}

  // Create requisition
  createRequisition(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  // Get all requisitions
  getRequisitions(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // Update requisition approval status (RAISED, HOD, SMO, HR)
  updateStatus(id: number, payload: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/status`, payload);
  }
}
