import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ServiceTypeService } from '../../core/services/service-type.service';
import { ServiceType } from '../../core/models/service-type.model';
import { KeycloakService } from '../../core/services/keycloak.service';
import { SessionService } from '../../core/services/session.service';

@Component({
  selector: 'app-offer-services',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './offer-services.component.html',
  styleUrl: './offer-services.component.css',
})
export class OfferServicesComponent implements OnInit {
  serviceTypes: ServiceType[] = [];
  selectedOffers: number[] = [];
  initialOffers: number[] = []; // Track initial state for change detection
  loading = true;
  error = '';
  submitting = false;
  private serviceTypeMap: Map<number, string> = new Map();

  constructor(
    private serviceTypeService: ServiceTypeService,
    private router: Router,
    private keycloakService: KeycloakService,
    private sessionService: SessionService
  ) {}

  async ngOnInit() {
    await this.loadServiceTypes();
    await this.checkUserStatus();

    // Reload data after login
    window.addEventListener('user-logged-in', () => {
      this.loadServiceTypes();
      this.checkUserStatus();
    });
  }

  async loadServiceTypes() {
    try {
      this.serviceTypeService.getServiceTypes().subscribe({
        next: (types) => {
          this.serviceTypes = types;
          types.forEach((type) => this.serviceTypeMap.set(type.id, type.name));
          this.loading = false;
        },
        error: (err) => {
          console.error('Fehler beim Laden der Kategorien:', err);
          this.error = 'Fehler beim Laden der Fächer';
          this.loading = false;
        },
      });
    } catch (err) {
      this.error = 'Fehler beim Laden der Fächer';
      this.loading = false;
    }
  }

  async checkUserStatus() {
    try {
      this.serviceTypeService.getCurrentUser().subscribe({
        next: (username) => {
          if (username && username.trim() !== '' && username !== 'Gast-Modus') {
            this.loadUserOffers(username);
          } else {
            // Guest mode - load session offers
            this.loadSessionOffers();
          }
        },
        error: () => {
          // Guest mode - load session offers
          this.loadSessionOffers();
        },
      });
    } catch (err) {
      console.error('Fehler beim Prüfen des User-Status:', err);
    }
  }

  async loadSessionOffers() {
    try {
      const sessionOffers = this.sessionService.getOffers();
      this.selectedOffers = [...sessionOffers];
      this.initialOffers = [...sessionOffers]; // Track initial state
      console.log('📦 Session-Offers geladen:', sessionOffers);
    } catch (err) {
      console.error('Fehler beim Laden der Session-Offers:', err);
    }
  }

  async loadUserOffers(username: string) {
    try {
      this.serviceTypeService.getUserMarkets(username).subscribe({
        next: (markets) => {
          const offerMarkets = markets.filter((m) => m.offer === 1);
          this.selectedOffers = offerMarkets.map((market) => market.serviceType.id);
          this.initialOffers = [...this.selectedOffers]; // Track initial state
        },
        error: (err) => {
          console.error('Fehler beim Laden der Märkte:', err);
        },
      });
    } catch (err) {
      console.error('Fehler beim Laden der Märkte:', err);
    }
  }

  isSelected(serviceId: number): boolean {
    return this.selectedOffers.includes(serviceId);
  }

  toggleService(serviceId: number) {
    const index = this.selectedOffers.indexOf(serviceId);
    if (index > -1) {
      this.selectedOffers.splice(index, 1);
    } else {
      this.selectedOffers.push(serviceId);
    }
  }

  /**
   * Check if selections have changed from initial state
   */
  hasChanges(): boolean {
    if (this.selectedOffers.length !== this.initialOffers.length) {
      return true;
    }
    const sortedCurrent = [...this.selectedOffers].sort();
    const sortedInitial = [...this.initialOffers].sort();
    return !sortedCurrent.every((val, idx) => val === sortedInitial[idx]);
  }

  async submitOffers() {
    if (this.selectedOffers.length === 0 && this.initialOffers.length === 0) {
      alert('Bitte wähle mindestens ein Fach aus');
      return;
    }

    this.submitting = true;

    try {
      this.serviceTypeService.getCurrentUser().subscribe({
        next: async (username) => {
          const isLoggedIn =
            username && username.trim() !== '' && username !== 'Gast-Modus';

          if (!isLoggedIn) {
            // Guest mode - save to session
            const existingDemands = this.sessionService.getDemands();
            const success = await this.sessionService.saveServices(
              this.selectedOffers,
              existingDemands
            );

            this.submitting = false;

            if (success) {
              console.log('✓ Angebote in Session gespeichert');
              this.router.navigate(['/user-matches']);
            } else {
              alert('Fehler beim Speichern der Angebote');
            }
            return;
          }

          // Logged-in mode - REPLACE (not merge) with current selections
          const currentOfferNames = this.selectedOffers.map(
            (id) => this.serviceTypeMap.get(id) || ''
          );

          // Load existing markets to preserve demands
          this.serviceTypeService.getUserMarkets(username).subscribe({
            next: (markets) => {
              // Extract existing demands (keep these unchanged)
              const existingDemands = markets
                .filter((m) => m.offer === 0)
                .map((m) => m.serviceType.name);

              console.log('💾 Saving Offers (REPLACE mode):', {
                old: this.initialOffers.map(id => this.serviceTypeMap.get(id)),
                new: currentOfferNames,
                demands: existingDemands,
              });

              // Save ONLY current offers (not merged) + keep existing demands
              this.serviceTypeService
                .saveMarkets(username, currentOfferNames, existingDemands)
                .subscribe({
                  next: () => {
                    this.submitting = false;
                    // Update initial state after successful save
                    this.initialOffers = [...this.selectedOffers];
                    this.router.navigate(['/user-matches']);
                  },
                  error: (err) => {
                    console.error('Fehler beim Speichern:', err);
                    this.submitting = false;
                    alert('Fehler beim Speichern');
                  },
                });
            },
            error: () => {
              // No existing markets, save new ones
              this.serviceTypeService
                .saveMarkets(username, currentOfferNames, [])
                .subscribe({
                  next: () => {
                    this.submitting = false;
                    this.initialOffers = [...this.selectedOffers];
                    this.router.navigate(['/user-matches']);
                  },
                  error: (err) => {
                    console.error('Fehler beim Speichern:', err);
                    this.submitting = false;
                    alert('Fehler beim Speichern');
                  },
                });
            },
          });
        },
        error: (err) => {
          console.error('Fehler:', err);
          this.submitting = false;
          alert('Fehler beim Speichern');
        },
      });
    } catch (err) {
      console.error('Fehler:', err);
      this.submitting = false;
      alert('Fehler beim Speichern');
    }
  }
}
