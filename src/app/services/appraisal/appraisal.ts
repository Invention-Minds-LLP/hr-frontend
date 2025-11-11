import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';


@Injectable({
  providedIn: 'root'
})
export class Appraisal {

  constructor(private http: HttpClient){}

  private apiUrl= environment.apiUrl + '/appraisals'

  // apiUrl:string = 'http://localhost:3002/api/appraisals'

  bulkCreateAppraisals(payload: any) {
    return this.http.post(`${this.apiUrl}/bulk-create`, payload);
  }
  getAllAppraisals(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
  saveManagerReview(data: any) {
    return this.http.post(`${this.apiUrl}/manager-review`, data);
  }
  
}
