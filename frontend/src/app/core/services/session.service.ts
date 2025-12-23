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
    // Check localStorage first (since cookies are HttpOnly and can't be read by JS)
    this.sessionId = localStorage.getItem('d4d_session_id');

    console.log(
      '🔍 Session-Service Init: Session ID gefunden?',
      this.sessionId ? 'Ja: ' + this.sessionId : 'Nein'
    );

    if (this.sessionId) {
      // Validate existing session
      const isValid = await this.validateSession();
      console.log('✓ Session valid?', isValid);
      if (!isValid) {
        this.sessionId = null;
        localStorage.removeItem('d4d_session_id');
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

      // Store in localStorage since the cookie is HttpOnly and can't be read by JS
      if (this.sessionId) {
        localStorage.setItem('d4d_session_id', this.sessionId);
      }

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
    } catch (error: any) {
      console.error('Fehler beim Verknüpfen des Users:', error);

      // Session existiert nicht mehr (z.B. nach Backend-Neustart)
      if (error.status === 404) {
        console.log(
          '🔄 Session nicht gefunden, erstelle neue Session mit bestehenden Daten...'
        );

        // Speichere aktuelle Daten
        const currentOffers = [...this.offers];
        const currentDemands = [...this.demands];

        // Lösche alte Session-ID
        localStorage.removeItem('d4d_session_id');
        this.sessionId = null;

        // Erstelle neue Session
        await this.createSession();

        // Schreibe Daten in neue Session
        if (
          this.sessionId &&
          (currentOffers.length > 0 || currentDemands.length > 0)
        ) {
          this.offers = currentOffers;
          this.demands = currentDemands;
          await this.saveServices(currentOffers, currentDemands);
          console.log('✓ Daten in neue Session geschrieben:', {
            offers: currentOffers.length,
            demands: currentDemands.length,
          });
        }

        // Jetzt verknüpfe neue Session mit User
        if (this.sessionId) {
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
            console.log('✓ User mit neuer Session verknüpft');
            return true;
          } catch (retryError) {
            console.error(
              'Fehler beim Verknüpfen mit neuer Session:',
              retryError
            );
            return false;
          }
        }
      }

      return false;
    }
  }

  /**
   * Convert session data to market entries (after login) with intelligent merging
   */
  async convertToMarkets(): Promise<boolean> {
    if (!this.sessionId || this.isAnonymous) {
      console.warn('Session muss mit User verknüpft sein');
      return false;
    }

    if (!this.username) {
      console.warn('Username nicht gefunden');
      return false;
    }

    try {
      console.log('🔄 Starte intelligentes Merging:', {
        sessionId: this.sessionId,
        username: this.username,
        sessionOffers: this.offers,
        sessionDemands: this.demands,
      });

      // Check if there's anything to merge
      if (this.offers.length === 0 && this.demands.length === 0) {
        console.log('ℹ️ Keine Session-Services zum Mergen, überspringe');
        return true;
      }

      // Load service types to map IDs to names
      console.log('📥 Lade ServiceTypes für ID-zu-Name Mapping...');
      const serviceTypes = await firstValueFrom(
        this.http.get<any[]>(`${this.configService.getApiUrl()}/servicetype`, {
          withCredentials: true,
        })
      );

      console.log('📋 ServiceTypes geladen:', serviceTypes.length);

      const idToNameMap = new Map<number, string>();
      serviceTypes.forEach((st) => idToNameMap.set(st.id, st.name));

      // Convert session IDs to names
      const sessionOfferNames = this.offers
        .map((id) => {
          const name = idToNameMap.get(id);
          console.log(`  Mapping Offer ID ${id} → ${name}`);
          return name;
        })
        .filter((name) => name !== undefined) as string[];
      const sessionDemandNames = this.demands
        .map((id) => {
          const name = idToNameMap.get(id);
          console.log(`  Mapping Demand ID ${id} → ${name}`);
          return name;
        })
        .filter((name) => name !== undefined) as string[];

      console.log('🔤 IDs zu Namen konvertiert:', {
        offerNames: sessionOfferNames,
        demandNames: sessionDemandNames,
      });

      // Load existing user markets
      const existingMarkets = await this.loadUserMarkets(this.username);

      // Merge session services with existing markets (remove duplicates)
      const mergedOffers = [
        ...new Set([...existingMarkets.offers, ...sessionOfferNames]),
      ];
      const mergedDemands = [
        ...new Set([...existingMarkets.demands, ...sessionDemandNames]),
      ];

      console.log('🔀 Services gemerged:', {
        existingOffers: existingMarkets.offers,
        sessionOffers: sessionOfferNames,
        mergedOffers,
        existingDemands: existingMarkets.demands,
        sessionDemands: sessionDemandNames,
        mergedDemands,
      });

      // Save merged services to backend
      console.log('💾 Speichere gemergte Services...');
      const saveResponse = await firstValueFrom(
        this.http.post(
          `${this.configService.getApiUrl()}/market`,
          {
            username: this.username,
            offers: mergedOffers,
            demands: mergedDemands,
          },
          {
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

      console.log('✅ Backend-Response:', saveResponse);
      console.log('✓ Gemergte Markets erfolgreich gespeichert');

      // Clear session data (User nutzt jetzt Markets statt Session)
      this.offers = [];
      this.demands = [];

      console.log('✓ Guest-Daten erfolgreich zu User-Markets konvertiert');
      return true;
    } catch (error) {
      console.error('❌ Fehler beim Merging:', error);
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
   * Load existing user markets before merging
   */
  private async loadUserMarkets(username: string): Promise<{
    offers: string[];
    demands: string[];
  }> {
    try {
      const markets = await firstValueFrom(
        this.http.get<any[]>(
          `${this.configService.getApiUrl()}/market/${encodeURIComponent(
            username
          )}`,
          { withCredentials: true }
        )
      );

      const offers = markets
        .filter((m) => m.offer === 1)
        .map((m) => m.serviceType?.name)
        .filter((name) => name !== undefined);

      const demands = markets
        .filter((m) => m.offer === 0)
        .map((m) => m.serviceType?.name)
        .filter((name) => name !== undefined);

      console.log('📥 Bestehende User-Markets geladen:', {
        offers,
        demands,
      });

      return { offers, demands };
    } catch (error) {
      console.error('Fehler beim Laden der User-Markets:', error);
      return { offers: [], demands: [] };
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

      // Remove from localStorage
      localStorage.removeItem('d4d_session_id');

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
