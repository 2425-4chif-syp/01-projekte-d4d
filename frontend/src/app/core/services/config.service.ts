import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private readonly isLocal = window.location.hostname === 'localhost';

  readonly API_URL = this.isLocal
    ? 'https://localhost/api'
    : 'https://vm10.htl-leonding.ac.at/api';

  getApiUrl(): string {
    return this.API_URL;
  }
}
