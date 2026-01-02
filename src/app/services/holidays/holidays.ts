import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

export interface Holiday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
}

@Injectable({
  providedIn: 'root'
})
export class Holidays {

  private apiKey = '11902fe721a945168e09d45be14a2ef5&country=IN&year=2025&month=12&day=25'; 
  private baseUrl = 'https://holidays.abstractapi.com/v1/';

  private apiUrl = environment.apiUrl + '/holidays';


  constructor(private http: HttpClient) { }

  getHolidays(year: number, countryCode: string): Observable<Holiday[]> {
    const url = `${this.baseUrl}?api_key=${this.apiKey}`;
    return this.http.get<Holiday[]>(url);
  }
/**
   * Get holidays by year
   * GET /api/holidays/calendar/:year
   */
  getHolidaysByYear(year: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/calendar/${year}`);
  }

  /**
   * Create holiday calendar
   * POST /api/holidays/calendar
   */
  createCalendar(payload: { year: number; name: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/calendar`, payload);
  }

  /**
   * Add holiday to calendar
   * POST /api/holidays/calendar/:calendarId
   */
  addHoliday(calendarId: number, payload: {
    title: string;
    date: string;
    description?: string;
    isOptional?: boolean;
  }): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/calendar/${calendarId}`,
      payload
    );
  }

  /**
   * Update holiday
   * PUT /api/holidays/holiday/:id
   */
  updateHoliday(id: number, payload: any): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}/holiday/${id}`,
      payload
    );
  }

  /**
   * Delete holiday
   * DELETE /api/holidays/holiday/:id
   */
  deleteHoliday(id: number): Observable<any> {
    return this.http.delete<any>(
      `${this.apiUrl}/holiday/${id}`
    );
  }

}
