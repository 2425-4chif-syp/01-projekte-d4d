import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './core/navbar/navbar.component';
import { SessionService } from './core/services/session.service';
import { KeycloakService } from './core/services/keycloak.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  title = 'frontend';

  constructor(
    private keycloakService: KeycloakService,
    private sessionService: SessionService
  ) {}

  async ngOnInit() {
    // Initialize session first (guest or logged-in)
    await this.sessionService.init();

    // Set SessionService reference in KeycloakService (avoid circular dependency)
    this.keycloakService.setSessionService(this.sessionService);

    // Initialize Keycloak silently - no forced login
    // Users can browse as guests, login only required for specific actions
    await this.keycloakService.initializeSilently();

    // If user just logged in (authenticated after init), notify navbar
    if (this.keycloakService.isAuthenticated()) {
      console.log('User authenticated after Keycloak init');
    }

    // Global scroll restoration after login (works on all pages)
    this.setupScrollRestoration();
  }

  private setupScrollRestoration() {
    window.addEventListener('user-logged-in', () => {
      console.log('🔄 User logged in, restoring scroll position...');

      // Wait for components to reload their data
      setTimeout(() => {
        const savedMatchId = sessionStorage.getItem('scrollToMatchId');
        const savedScrollY = sessionStorage.getItem('preLoginScrollY');

        // Priority 1: Scroll to specific card (if user clicked on card before login)
        if (savedMatchId) {
          const cardElement = document.querySelector(
            `[data-match-id="${savedMatchId}"]`
          );

          if (cardElement) {
            cardElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });

            // Highlight card briefly
            cardElement.classList.add('highlight-card');
            setTimeout(() => {
              cardElement.classList.remove('highlight-card');
            }, 5000);
          }

          // Clean up
          sessionStorage.removeItem('scrollToMatchId');
          sessionStorage.removeItem('preLoginScrollY');
        }
        // Priority 2: Restore scroll position (if user logged in without clicking card)
        else if (savedScrollY) {
          window.scrollTo({
            top: parseInt(savedScrollY),
            behavior: 'smooth',
          });
          sessionStorage.removeItem('preLoginScrollY');
        }
      }, 800); // Wait for components to finish loading
    });
  }
}
