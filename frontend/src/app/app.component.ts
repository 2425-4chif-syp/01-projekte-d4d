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
    // Register scroll restoration listener FIRST (before any events are triggered)
    this.setupScrollRestoration();

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
  }

  private setupScrollRestoration() {
    window.addEventListener('user-logged-in', () => {
      console.log('🔄 User logged in, restoring scroll position...');

      // Wait for components to reload their data
      setTimeout(() => {
        const savedMatchId = sessionStorage.getItem('scrollToMatchId');
        const savedScrollY = sessionStorage.getItem('preLoginScrollY');

        console.log('📍 Scroll restoration check:', { savedMatchId, savedScrollY });

        // Priority 1: Scroll to specific card (if user clicked on card before login)
        if (savedMatchId) {
          console.log('🔍 Looking for card with data-match-id:', savedMatchId);
          const cardElement = document.querySelector(
            `[data-match-id="${savedMatchId}"]`
          );

          console.log('📌 Card element found:', cardElement);

          if (cardElement) {
            console.log('✅ Scrolling to card...');
            
            // Smooth scroll with better timing
            setTimeout(() => {
              cardElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
              });
            }, 50);

            // Highlight card with improved animation
            setTimeout(() => {
              console.log('✨ Adding highlight-card class...');
              cardElement.classList.add('highlight-card');
              setTimeout(() => {
                cardElement.classList.remove('highlight-card');
              }, 1000); // 1 iteration × 1s = 1s
            }, 400);

            // Auto-open the request modal after highlighting completes
            setTimeout(() => {
              // Trigger click on the card to open modal
              console.log('🖱️ Triggering click on card...');
              (cardElement as HTMLElement).click();
            }, 1500);
          } else {
            console.warn('⚠️ Card element not found!');
          }

          // Clean up
          sessionStorage.removeItem('scrollToMatchId');
          sessionStorage.removeItem('preLoginScrollY');
        }
        // Priority 2: Restore scroll position (if user logged in without clicking card)
        else if (savedScrollY) {
          console.log('📜 Restoring scroll position to:', savedScrollY);
          window.scrollTo({
            top: parseInt(savedScrollY),
            behavior: 'smooth',
          });
          sessionStorage.removeItem('preLoginScrollY');
        } else {
          console.log('ℹ️ No scroll restoration needed');
        }
      }, 1500); // Increased timeout to ensure data is loaded
    });
  }
}
