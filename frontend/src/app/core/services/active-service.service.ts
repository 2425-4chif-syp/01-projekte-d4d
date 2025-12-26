import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import { ActiveService, ReviewRequest } from '../models/service.model';

@Injectable({
  providedIn: 'root'
})
export class ActiveServiceService {
  private apiUrl: string;

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {
    this.apiUrl = this.configService.getApiUrl();
  }

  // Get all services for a user
  getMyServices(username: string): Observable<ActiveService[]> {
    return this.http.get<ActiveService[]>(`${this.apiUrl}/services/my-services/${encodeURIComponent(username)}`);
  }

  // Confirm service completion
  confirmServiceCompletion(serviceId: number, username: string): Observable<ActiveService> {
    return this.http.put<ActiveService>(`${this.apiUrl}/services/${serviceId}/confirm-complete/${encodeURIComponent(username)}`, {});
  }

  // Cancel service
  cancelService(serviceId: number): Observable<ActiveService> {
    return this.http.put<ActiveService>(`${this.apiUrl}/services/${serviceId}/cancel`, {});
  }

  // Submit review
  submitReview(review: ReviewRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/reviews`, review);
  }
}
