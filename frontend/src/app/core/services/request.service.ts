import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import { ServiceRequest } from '../models/request.model';

@Injectable({
  providedIn: 'root',
})
export class RequestService {
  private apiUrl: string;

  constructor(private http: HttpClient, private configService: ConfigService) {
    this.apiUrl = this.configService.getApiUrl();
  }

  getReceivedRequests(username: string): Observable<ServiceRequest[]> {
    return this.http.get<ServiceRequest[]>(
      `${this.apiUrl}/service-requests/inbox/${encodeURIComponent(username)}`
    );
  }

  getSentRequests(username: string): Observable<ServiceRequest[]> {
    return this.http.get<ServiceRequest[]>(
      `${this.apiUrl}/service-requests/sent/${encodeURIComponent(username)}`
    );
  }

  acceptRequest(requestId: number): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/service-requests/${requestId}/accept`,
      {}
    );
  }

  rejectRequest(requestId: number): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/service-requests/${requestId}/reject`,
      {}
    );
  }
}
