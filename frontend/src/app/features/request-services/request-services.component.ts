import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ServiceTypeService } from '../../core/services/service-type.service';
import { ServiceType } from '../../core/models/service-type.model';
import { KeycloakService } from '../../core/services/keycloak.service';
import { SessionService } from '../../core/services/session.service';

@Component({
  selector: 'app-request-services',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './request-services.component.html',
  styleUrl: './request-services.component.css',
})
export class RequestServicesComponent implements OnInit {
  serviceTypes: ServiceType[] = [];
  selectedDemands: number[] = [];
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
            this.loadUserDemands(username);
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

  async loadUserDemands(username: string) {
    try {
      this.serviceTypeService.getUserMarkets(username).subscribe({
        next: (markets) => {
          const demandMarkets = markets.filter((m) => m.offer === 0);
          demandMarkets.forEach((market) => {
            this.selectedDemands.push(market.serviceType.id);
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
    return this.selectedDemands.includes(serviceId);
  }

  toggleService(serviceId: number) {
    const index = this.selectedDemands.indexOf(serviceId);
    if (index > -1) {
      this.selectedDemands.splice(index, 1);
    } else {
      this.selectedDemands.push(serviceId);
    }
  }

  async submitDemands() {
    if (this.selectedDemands.length === 0) {
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
            const existingOffers = this.sessionService.getOffers();
            const success = await this.sessionService.saveServices(
              existingOffers,
              this.selectedDemands
            );

            this.submitting = false;

            if (success) {
              console.log('✓ Nachfragen in Session gespeichert');
              this.router.navigate(['/user-matches']);
            } else {
              alert('Fehler beim Speichern der Nachfragen');
            }
            return;
          }

          // Get demand names
          const demandNames = this.selectedDemands.map(
            (id) => this.serviceTypeMap.get(id) || ''
          );

          // Load existing offers
          let existingOffers: string[] = [];
          this.serviceTypeService.getUserMarkets(username).subscribe({
            next: (markets) => {
              existingOffers = markets
                .filter((m) => m.offer === 1)
                .map((m) => m.serviceType.name);

              // Save to database
              this.serviceTypeService
                .saveMarkets(username, existingOffers, demandNames)
                .subscribe({
                  next: () => {
                    this.submitting = false;
                    alert('✓ Nachfragen gespeichert! Zeige Matches...');
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
              // No existing offers, save anyway
              this.serviceTypeService
                .saveMarkets(username, [], demandNames)
                .subscribe({
                  next: () => {
                    this.submitting = false;
                    alert('✓ Nachfragen gespeichert! Zeige Matches...');
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
