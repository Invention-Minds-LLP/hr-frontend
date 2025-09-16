import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SurveyQuestion {
  id: number;
  section: string;
  questionText: string;
  orderNo: number;
}

export interface SurveySubmitPayload {
  employeeId: number;
  answers: { questionId: number; answer: string }[];
}

@Injectable({
  providedIn: 'root'
})
export class SurveryService {
  private baseUrl = 'http://192.168.1.15:3002/api/survey';

  constructor(private http: HttpClient) {}

  getQuestions(): Observable<SurveyQuestion[]> {
    return this.http.get<SurveyQuestion[]>(`${this.baseUrl}/questions`);
  }

  submitSurvey(payload: SurveySubmitPayload): Observable<any> {
    return this.http.post(`${this.baseUrl}/submit`, payload);
  }

  getSurveyResults(surveyId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/results/${surveyId}`);
  }

  getAllSurveys(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/all`);
  }
}
