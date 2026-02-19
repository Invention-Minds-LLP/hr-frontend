import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment.prod';
import { Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GeoTracking {

  constructor(private http: HttpClient) { }

  private apiUrl = environment.apiUrl + '/geo-tracking/mobile/geo';

  getTrackingStatus(): Observable<any> {
    return this.http.get(`${this.apiUrl}/status`);
  }

  updateConsent(consent: boolean): Observable<any> {
    return this.http.post(`${this.apiUrl}/consent`, {
      consent
    });
  }

  sendLocationPoint(data: {
    sessionId: number;
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/point`, data);
  }

  endSession(sessionId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/session/end`, {
      sessionId
    });
  }




  createSession(name: string) {
    return this.http.post(`${this.apiUrl}/session/create`, { name });
  }

  startSession(sessionId: number) {
    return this.http.post(`${this.apiUrl}/session/start`, { sessionId });

  }
  getMySessions() {
    return this.http.get(`${this.apiUrl}/sessions`);
  }

  updateSessionName(sessionId: number, name: string) {
    return this.http.post(`${this.apiUrl}/session/update-name`, {
      sessionId,
      name
    });
  }

  getSessionPhotos(sessionId: number) {
    return this.http.get(`${this.apiUrl}/session/${sessionId}/photos`);
  }

  getManagerSessions() {
  return this.http.get<any[]>(`${this.apiUrl}/manager/sessions`);
}


}
