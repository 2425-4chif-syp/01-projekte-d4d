import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './core/navbar/navbar.component';
import { KeycloakService } from './core/services/keycloak.service';
import { SessionService } from './core/services/session.service';

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
  }
}
