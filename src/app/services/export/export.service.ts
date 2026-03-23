import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';

export interface ExportParams {
  startDate?: string;
  endDate?:   string;
  year?:      number;
  month?:     number;
  employeeId?: number;
}

@Injectable({ providedIn: 'root' })
export class ExportService {
  private readonly base = `${environment.apiUrl}/export`;

  constructor(private http: HttpClient) {}

  getBlob(table: string, params: ExportParams = {}): Observable<Blob> {
    let httpParams = new HttpParams();
    if (params.startDate)  httpParams = httpParams.set('startDate',  params.startDate);
    if (params.endDate)    httpParams = httpParams.set('endDate',    params.endDate);
    if (params.year)       httpParams = httpParams.set('year',       String(params.year));
    if (params.month)      httpParams = httpParams.set('month',      String(params.month));
    if (params.employeeId) httpParams = httpParams.set('employeeId', String(params.employeeId));

    return this.http.get(`${this.base}/${table}`, {
      params: httpParams,
      responseType: 'blob',
    });
  }

  triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `${filename}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
