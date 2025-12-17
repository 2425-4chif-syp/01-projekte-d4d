import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import { Match } from '../models/match.model';

@Injectable({
  providedIn: 'root'
})
export class MatchService {
  private apiUrl: string;

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {
    this.apiUrl = this.configService.getApiUrl();
  }

  // Get all relevant matches for a user
  getRelevantMatches(username: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/service/relevant/${encodeURIComponent(username)}`);
  }

  // Get perfect matches for a user
  getPerfectMatches(username: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/service/perfect-matches/${encodeURIComponent(username)}`);
  }

  // Get matches for guest session
  getSessionMatches(sessionId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/session/${sessionId}/matches`);
  }

  // Get user ratings
  getUserRating(username: string): Observable<{ averageRating: number; totalReviews: number }> {
    return this.http.get<{ averageRating: number; totalReviews: number }>(
      `${this.apiUrl}/reviews/user/by-name/${encodeURIComponent(username)}`
    );
  }

  // Get rating for specific type and provider
  getTypeProviderRating(typeId: number, providerId: number): Observable<{ averageRating: number; totalReviews: number }> {
    return this.http.get<{ averageRating: number; totalReviews: number }>(
      `${this.apiUrl}/reviews/type/${typeId}/provider/${providerId}`
    );
  }

  // Send service request
  sendServiceRequest(senderUsername: string, marketId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/service-requests`, {
      senderUsername,
      marketId
    });
  }
}
