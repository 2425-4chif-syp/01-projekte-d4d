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
          }
        },
        error: () => {
          // Guest mode - no pre-selection needed yet
          // TODO: implement session management
        },
      });
    } catch (err) {
      console.error('Fehler beim Prüfen des User-Status:', err);
    }
  }

  async loadUserOffers(username: string) {
    try {
      this.serviceTypeService.getUserMarkets(username).subscribe({
        next: (markets) => {
          const offerMarkets = markets.filter((m) => m.offer === 1);
          offerMarkets.forEach((market) => {
            this.selectedOffers.push(market.serviceType.id);
          });
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

  async submitOffers() {
    if (this.selectedOffers.length === 0) {
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

          // Logged-in mode - save to database
          const offerNames = this.selectedOffers.map(
            (id) => this.serviceTypeMap.get(id) || ''
          );

          // Load existing demands
          let existingDemands: string[] = [];
          this.serviceTypeService.getUserMarkets(username).subscribe({
            next: (markets) => {
              existingDemands = markets
                .filter((m) => m.offer === 0)
                .map((m) => m.serviceType.name);

              // Save to database
              this.serviceTypeService
                .saveMarkets(username, offerNames, existingDemands)
                .subscribe({
                  next: () => {
                    this.submitting = false;
                    alert('✓ Angebote gespeichert! Zeige Matches...');
                    setTimeout(() => {
                      this.router.navigate(['/user-matches']);
                    }, 1000);
                  },
                  error: (err) => {
                    console.error('Fehler beim Speichern:', err);
                    this.submitting = false;
                    alert('Fehler beim Speichern');
                  },
                });
            },
            error: () => {
              // No existing demands, save anyway
              this.serviceTypeService
                .saveMarkets(username, offerNames, [])
                .subscribe({
                  next: () => {
                    this.submitting = false;
                    alert('✓ Angebote gespeichert! Zeige Matches...');
                    setTimeout(() => {
                      this.router.navigate(['/user-matches']);
                    }, 1000);
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
