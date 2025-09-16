import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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


  constructor(private http: HttpClient) { }

  getHolidays(year: number, countryCode: string): Observable<Holiday[]> {
    const url = `${this.baseUrl}?api_key=${this.apiKey}`;
    return this.http.get<Holiday[]>(url);
  }


}
