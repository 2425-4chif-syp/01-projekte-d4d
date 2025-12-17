import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import { MarketItem } from '../models/market.model';

@Injectable({
  providedIn: 'root',
})
export class MarketService {
  private apiUrl: string;

  constructor(private http: HttpClient, private configService: ConfigService) {
    this.apiUrl = this.configService.getApiUrl();
  }

  getAllMarketItems(): Observable<MarketItem[]> {
    return this.http.get<MarketItem[]>(`${this.apiUrl}/market`);
  }

  getUserRating(
    username: string
  ): Observable<{ averageRating: number; totalReviews: number }> {
    return this.http.get<{ averageRating: number; totalReviews: number }>(
      `${this.apiUrl}/reviews/user/by-name/${encodeURIComponent(username)}`
    );
  }

  getRatingByTypeAndProvider(
    typeId: number,
    providerId: number
  ): Observable<{ averageRating: number; totalReviews: number }> {
    return this.http.get<{ averageRating: number; totalReviews: number }>(
      `${this.apiUrl}/reviews/type/${typeId}/provider/${providerId}`
    );
  }

  sendServiceRequest(
    senderUsername: string,
    marketId: number
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/service-requests`, {
      senderUsername,
      marketId,
    });
  }
}
