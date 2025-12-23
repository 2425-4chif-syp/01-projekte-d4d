import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { ConfigService } from './config.service';

declare const Keycloak: any;

// Model Interface (exakt wie in ldap-demo/web/src/model.ts)
interface Model {
  token?: string;
  tokenParsed?: object;
}

@Injectable({
  providedIn: 'root',
})
export class KeycloakService {
  private keycloakConfig = {
    url: 'https://auth.htl-leonding.ac.at',
    realm: '2526_5bhitm',
    clientId: 'frontend',
  };

  private keycloak: any;

  // Model Store (wie in Vorlage)
  private store: Model = {};

  // Observer Pattern mit BehaviorSubject (Angular-Variante)
  private modelSubject = new BehaviorSubject<Model>(this.store);
  public model$ = this.modelSubject.asObservable();

  constructor(private http: HttpClient, private configService: ConfigService) {
    // Initialize Keycloak instance
    if (typeof Keycloak !== 'undefined') {
      this.keycloak = new Keycloak(this.keycloakConfig);
    } else {
      console.error('Keycloak library not loaded!');
    }
  }

  // SessionService wird später per Setter gesetzt um Circular Dependency zu vermeiden
  private sessionService?: any;
  setSessionService(sessionService: any) {
    this.sessionService = sessionService;
  }

  private initialized = false;

  // Initialize Keycloak silently - allows guest mode
  async initializeSilently(): Promise<void> {
    // Prevent multiple initializations
    if (this.initialized) {
      return;
    }

    const initOptions = {
      onLoad: 'check-sso',
      enableLogging: false,
      silentCheckSsoRedirectUri:
        window.location.origin + '/silent-check-sso.html',
    };

    try {
      await this.keycloak.init(initOptions);
      this.initialized = true;
      this.store.token = this.keycloak.token;
      this.store.tokenParsed = this.keycloak.tokenParsed;
      this.notifyObservers();

      // Sync with backend if authenticated (but don't fail if not)
      if (this.keycloak.authenticated) {
        try {
          // Only sync on first login, not on every page reload
          const alreadySynced = sessionStorage.getItem('backendSynced');
          if (!alreadySynced) {
            await this.syncWithBackend(this.keycloak.token);
            sessionStorage.setItem('backendSynced', 'true');
          } else {
            // User already synced, but still trigger event for scroll restoration
            console.log('🔄 User already synced, triggering user-logged-in event');
            window.dispatchEvent(new CustomEvent('user-logged-in'));
          }
        } catch (error) {
          console.warn('Backend sync failed, continuing as guest:', error);
        }
      }
    } catch (error) {
      console.warn('Keycloak init failed, continuing as guest:', error);
      this.initialized = true; // Mark as initialized to prevent retries
    }
  }

  // Ensure user is authenticated - redirects to login if not
  async ensureThatUserIsAuthenticated(): Promise<void> {
    if (!this.initialized) {
      await this.initializeSilently();
    }

    if (!this.keycloak.authenticated) {
      await this.login();
    }
  }

  // login (exakt wie in Vorlage)
  async login(): Promise<void> {
    // Save current URL and scroll position for redirect after login
    sessionStorage.setItem('preLoginUrl', window.location.href);
    sessionStorage.setItem('preLoginScrollY', window.scrollY.toString());

    await this.keycloak.login();
    console.log('token:', this.store.token);
  }

  // logout - clear all state and redirect to Keycloak logout
  async logout(): Promise<void> {
    try {
      // First, logout from backend to clear session cookie
      await firstValueFrom(
        this.http.post(
          this.configService.getApiUrl() + '/user/logout',
          {},
          {
            withCredentials: true,
            responseType: 'text',
          }
        )
      ).catch((error) => {
        console.warn('Backend logout failed:', error);
      });
    } catch (error) {
      console.warn('Backend logout error:', error);
    }

    // Clear local state
    this.store = {};
    this.initialized = false;

    // Clear localStorage
    localStorage.removeItem('guestOffers');
    localStorage.removeItem('guestDemands');
    localStorage.clear(); // Clear all localStorage

    // Clear sync flag
    sessionStorage.removeItem('backendSynced');

    // Notify observers
    this.notifyObservers();

    // Logout from Keycloak (redirects to Keycloak logout page)
    if (this.keycloak && this.keycloak.authenticated) {
      await this.keycloak.logout({
        redirectUri: window.location.origin,
      });
    } else {
      // If not authenticated via Keycloak, just reload the page
      window.location.href = window.location.origin;
    }
  }

  // Subscribe function (Observer Pattern)
  subscribe(observer: (model: Model) => void): void {
    this.model$.subscribe(observer);
  }

  private notifyObservers(): void {
    this.modelSubject.next(this.store);
  }

  // Helper methods
  isAuthenticated(): boolean {
    return this.keycloak?.authenticated || false;
  }

  getToken(): string | undefined {
    return this.store.token;
  }

  getTokenParsed(): object | undefined {
    return this.store.tokenParsed;
  }

  /**
   * Get current user ID (preferred_username/pupilId) for backend communication
   */
  async getCurrentUserId(): Promise<string | null> {
    if (
      this.keycloak?.authenticated &&
      this.keycloak?.tokenParsed?.preferred_username
    ) {
      return this.keycloak.tokenParsed.preferred_username;
    }
    return null;
  }

  /**
   * Get current user display name (full name)
   */
  async getCurrentUserDisplayName(): Promise<string | null> {
    if (this.keycloak?.authenticated && this.keycloak?.tokenParsed?.name) {
      return this.keycloak.tokenParsed.name;
    }
    return null;
  }

  /**
   * Get current user (for backward compatibility - returns display name)
   */
  async getCurrentUser(): Promise<string | null> {
    // Check if authenticated via Keycloak - return display name
    if (this.keycloak?.authenticated && this.keycloak?.tokenParsed?.name) {
      return this.keycloak.tokenParsed.name;
    }

    // Fallback: Check backend for session-based user
    try {
      const username = await firstValueFrom(
        this.http.get(this.configService.getApiUrl() + '/user', {
          responseType: 'text',
          withCredentials: true,
        })
      );

      if (
        username &&
        username.trim() !== '' &&
        username !== 'guest' &&
        username !== 'Gast-Modus'
      ) {
        return username;
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }

    return null;
  }

  private async syncWithBackend(token: string): Promise<void> {
    try {
      console.log('Syncing with backend...');

      const headers = new HttpHeaders({
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      });

      const response = await firstValueFrom(
        this.http.post(
          this.configService.getApiUrl() + '/user/keycloak',
          {},
          {
            headers,
            responseType: 'text',
            withCredentials: true,
          }
        )
      );

      console.log(
        'Keycloak login successful, user:',
        this.keycloak?.tokenParsed?.name
      );

      // Convert guest session data to user markets (use the injected sessionService)
      const userId = this.keycloak?.tokenParsed?.preferred_username; // pupilId for backend

      if (userId && this.sessionService) {
        console.log('🔄 Attempting to convert session to markets...');
        await this.sessionService.attachUser(userId);
        const success = await this.sessionService.convertToMarkets();
        if (success) {
          console.log('✓ Guest-Daten erfolgreich zu User-Markets konvertiert');
        } else {
          console.log('ℹ️ Keine Guest-Daten zum Konvertieren vorhanden');
        }

        // Notify observers that login is complete (trigger data refresh in components)
        this.notifyObservers();

        // ALWAYS trigger custom event for components to reload data (even without guest data)
        window.dispatchEvent(new CustomEvent('user-logged-in'));
      } else {
        console.warn('⚠️ SessionService nicht verfügbar oder kein Username');
        
        // Still trigger event even if session service unavailable
        window.dispatchEvent(new CustomEvent('user-logged-in'));
      }
    } catch (error: any) {
      console.error('Backend sync failed:', error);
      throw error;
    }
  }

  getUserRoles(): string[] {
    if (!this.keycloak?.tokenParsed) {
      return [];
    }

    const realmRoles = this.keycloak.tokenParsed.realm_access?.roles || [];
    const resourceRoles =
      this.keycloak.tokenParsed.resource_access?.[this.keycloakConfig.clientId]
        ?.roles || [];

    return [...realmRoles, ...resourceRoles];
  }

  hasRole(role: string): boolean {
    return this.getUserRoles().includes(role);
  }

  isAdmin(): boolean {
    const userId = this.keycloak?.tokenParsed?.preferred_username;
    return userId === 'Admin' || this.hasRole('admin');
  }
}
