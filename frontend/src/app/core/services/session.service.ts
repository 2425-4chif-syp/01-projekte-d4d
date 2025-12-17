import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from './config.service';

interface SessionInfo {
  sessionId: string;
  isAnonymous: boolean;
  expiresAt: number;
  offers: number[];
  demands: number[];
  username?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private sessionId: string | null = null;
  private isAnonymous = true;
  private username: string | null = null;
  private offers: number[] = [];
  private demands: number[] = [];

  constructor(private http: HttpClient, private configService: ConfigService) {}

  /**
   * Initialize session on app start
   */
  async init(): Promise<void> {
    // Check if session cookie exists
    this.sessionId = this.getCookie('d4d_session_id');

    console.log(
      '🔍 Session-Service Init: Cookie gefunden?',
      this.sessionId ? 'Ja: ' + this.sessionId : 'Nein'
    );

    if (this.sessionId) {
      // Validate existing session
      const isValid = await this.validateSession();
      console.log('✓ Session valid?', isValid);
      if (!isValid) {
        this.sessionId = null;
      }
    }

    // Create new session if none exists
    if (!this.sessionId) {
      await this.createSession();
    }

    // Load session data
    await this.loadSession();

    console.log('📋 Session-Service Status:', {
      sessionId: this.sessionId,
      isAnonymous: this.isAnonymous,
      username: this.username,
    });
  }

  /**
   * Create a new session
   */
  private async createSession(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.post<any>(
          `${this.configService.getApiUrl()}/session/create`,
          {},
          { withCredentials: true }
        )
      );

      this.sessionId = response.sessionId;
      this.isAnonymous = response.isAnonymous;

      console.log('✓ Neue Session erstellt:', this.sessionId);
    } catch (error) {
      console.error('Fehler beim Erstellen der Session:', error);
    }
  }

  /**
   * Validate existing session
   */
  private async validateSession(): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http.get(
          `${this.configService.getApiUrl()}/session/${this.sessionId}`,
          { withCredentials: true }
        )
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Load session data from server
   */
  async loadSession(): Promise<void> {
    if (!this.sessionId) return;

    try {
      const data = await firstValueFrom(
        this.http.get<SessionInfo>(
          `${this.configService.getApiUrl()}/session/${this.sessionId}`,
          { withCredentials: true }
        )
      );

      this.isAnonymous = data.isAnonymous;
      this.username = data.username || null;
      this.offers = data.offers || [];
      this.demands = data.demands || [];

      console.log('📦 Session geladen:', {
        offers: this.offers,
        demands: this.demands,
        username: this.username,
      });
    } catch (error) {
      console.error('Fehler beim Laden der Session:', error);
    }
  }

  /**
   * Save services (offers/demands) to session
   */
  async saveServices(offers: number[], demands: number[]): Promise<boolean> {
    if (!this.sessionId) {
      await this.createSession();
    }

    try {
      await firstValueFrom(
        this.http.put(
          `${this.configService.getApiUrl()}/session/${
            this.sessionId
          }/services`,
          { offers, demands },
          {
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' },
            responseType: 'text',
          }
        )
      );

      this.offers = offers;
      this.demands = demands;
      console.log('✓ Services in Session gespeichert:', { offers, demands });
      return true;
    } catch (error) {
      console.error('Fehler beim Speichern der Services:', error);
      return false;
    }
  }

  /**
   * Attach user to session (on login)
   */
  async attachUser(username: string): Promise<boolean> {
    if (!this.sessionId) return false;

    try {
      await firstValueFrom(
        this.http.post(
          `${this.configService.getApiUrl()}/session/${
            this.sessionId
          }/attach-user`,
          { username },
          {
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' },
            responseType: 'text',
          }
        )
      );

      this.username = username;
      this.isAnonymous = false;
      console.log('✓ User mit Session verknüpft');
      return true;
    } catch (error) {
      console.error('Fehler beim Verknüpfen des Users:', error);
      return false;
    }
  }

  /**
   * Convert session data to market entries (after login)
   */
  async convertToMarkets(): Promise<boolean> {
    if (!this.sessionId || this.isAnonymous) {
      console.warn('Session muss mit User verknüpft sein');
      return false;
    }

    try {
      console.log('🔄 Konvertiere Session zu Markets:', {
        sessionId: this.sessionId,
        username: this.username,
        offers: this.offers,
        demands: this.demands,
      });

      const result = await firstValueFrom(
        this.http.post<any>(
          `${this.configService.getApiUrl()}/session/${
            this.sessionId
          }/convert-to-markets`,
          {},
          {
            withCredentials: true,
            responseType: 'json',
          }
        )
      );

      console.log('✓ Session zu Markets konvertiert:', result);

      // Clear session data
      this.offers = [];
      this.demands = [];

      // Create new session for future use
      await this.createSession();
      return true;
    } catch (error) {
      console.error('❌ Fehler beim Konvertieren:', error);
      return false;
    }
  }

  /**
   * Get matches for current session
   */
  async getMatches(): Promise<any[]> {
    if (!this.sessionId) {
      return [];
    }

    try {
      return await firstValueFrom(
        this.http.get<any[]>(
          `${this.configService.getApiUrl()}/session/${this.sessionId}/matches`,
          { withCredentials: true }
        )
      );
    } catch (error) {
      console.error('Fehler beim Laden der Session-Matches:', error);
      return [];
    }
  }

  /**
   * Delete session
   */
  async deleteSession(): Promise<void> {
    if (!this.sessionId) return;

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.configService.getApiUrl()}/session/${this.sessionId}`,
          {
            withCredentials: true,
            responseType: 'text',
          }
        )
      );

      this.sessionId = null;
      this.isAnonymous = true;
      this.offers = [];
      this.demands = [];

      console.log('✓ Session gelöscht');
    } catch (error) {
      console.error('Fehler beim Löschen der Session:', error);
    }
  }

  // Getters
  getSessionId(): string | null {
    return this.sessionId;
  }

  getOffers(): number[] {
    return [...this.offers];
  }

  getDemands(): number[] {
    return [...this.demands];
  }

  isLoggedIn(): boolean {
    return !this.isAnonymous && this.username !== null;
  }

  getUsername(): string | null {
    return this.username;
  }

  // Cookie helper methods
  private getCookie(name: string): string | null {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }
}
