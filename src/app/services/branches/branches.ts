import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

export interface Branch {
  id?: number;
  name: string;
  location?: string;
}

@Injectable({
  providedIn: 'root'
})
export class Branches {
  private apiUrl = environment.apiUrl + '/branches';
  // private apiUrl = 'http://localhost:3002/api/branches';

  constructor(private http: HttpClient) {}

  getBranches(): Observable<Branch[]> {
    return this.http.get<Branch[]>(this.apiUrl);
  }

  getBranchById(id: number): Observable<Branch> {
    return this.http.get<Branch>(`${this.apiUrl}/${id}`);
  }

  createBranch(branch: Branch): Observable<Branch> {
    return this.http.post<Branch>(this.apiUrl, branch);
  }

  updateBranch(id: number, branch: Branch): Observable<Branch> {
    return this.http.put<Branch>(`${this.apiUrl}/${id}`, branch);
  }

  deleteBranch(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
