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

   constructor(private http: HttpClient) {}

  getHolidays(year: number, countryCode: string): Observable<Holiday[]> {
    const url = `https://www.abstractapi.com/holidays-api/${year}/${countryCode}`;
    return this.http.get<Holiday[]>(url);
  }
}
