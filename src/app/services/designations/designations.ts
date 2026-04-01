import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

export interface Designation {
  id?: number;
  name: string;
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class Designations {
  private apiUrl = environment.apiUrl + '/designation';

  constructor(private http: HttpClient) {}

  getDesignations(): Observable<Designation[]> {
    return this.http.get<Designation[]>(this.apiUrl);
  }

  getDesignationById(id: number): Observable<Designation> {
    return this.http.get<Designation>(`${this.apiUrl}/${id}`);
  }

  createDesignation(designation: Designation): Observable<Designation> {
    return this.http.post<Designation>(this.apiUrl, designation);
  }

  updateDesignation(id: number, designation: Designation): Observable<Designation> {
    return this.http.put<Designation>(`${this.apiUrl}/${id}`, designation);
  }

  deleteDesignation(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
