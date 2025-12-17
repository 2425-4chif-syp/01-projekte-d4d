import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import { ServiceType, Market } from '../models/service-type.model';

@Injectable({
  providedIn: 'root',
})
export class ServiceTypeService {
  constructor(private http: HttpClient, private config: ConfigService) {}

  getServiceTypes(): Observable<ServiceType[]> {
    return this.http.get<ServiceType[]>(`${this.config.API_URL}/servicetype`, {
      withCredentials: true,
    });
  }

  getUserMarkets(username: string): Observable<Market[]> {
    return this.http.get<Market[]>(
      `${this.config.API_URL}/market/${encodeURIComponent(username)}`,
      { withCredentials: true }
    );
  }

  saveMarkets(
    username: string,
    offers: string[],
    demands: string[]
  ): Observable<any> {
    return this.http.post(
      `${this.config.API_URL}/market`,
      { username, offers, demands },
      {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
      }
    );
  }

  getCurrentUser(): Observable<string> {
    return this.http.get(`${this.config.API_URL}/user`, {
      withCredentials: true,
      responseType: 'text',
    });
  }
}
