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
  initialDemands: number[] = []; // Track initial state for change detection
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
            this.loadUserDemands(username);
          } else {
            // Guest mode - load session demands
            this.loadSessionDemands();
          }
        },
        error: () => {
          // Guest mode - load session demands
          this.loadSessionDemands();
        },
      });
    } catch (err) {
      console.error('Fehler beim Prüfen des User-Status:', err);
    }
  }

  async loadSessionDemands() {
    try {
      const sessionDemands = this.sessionService.getDemands();
      this.selectedDemands = [...sessionDemands];
      this.initialDemands = [...sessionDemands]; // Track initial state
      console.log('📦 Session-Demands geladen:', sessionDemands);
    } catch (err) {
      console.error('Fehler beim Laden der Session-Demands:', err);
    }
  }

  async loadUserDemands(username: string) {
    try {
      this.serviceTypeService.getUserMarkets(username).subscribe({
        next: (markets) => {
          const demandMarkets = markets.filter((m) => m.offer === 0);
          this.selectedDemands = demandMarkets.map((market) => market.serviceType.id);
          this.initialDemands = [...this.selectedDemands]; // Track initial state
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

  /**
   * Check if selections have changed from initial state
   */
  hasChanges(): boolean {
    if (this.selectedDemands.length !== this.initialDemands.length) {
      return true;
    }
    const sortedCurrent = [...this.selectedDemands].sort();
    const sortedInitial = [...this.initialDemands].sort();
    return !sortedCurrent.every((val, idx) => val === sortedInitial[idx]);
  }

  async submitDemands() {
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

          // Logged-in mode - REPLACE (not merge) with current selections
          const currentDemandNames = this.selectedDemands.map(
            (id) => this.serviceTypeMap.get(id) || ''
          );

          // Load existing markets to preserve offers
          this.serviceTypeService.getUserMarkets(username).subscribe({
            next: (markets) => {
              // Extract existing offers (keep these unchanged)
              const existingOffers = markets
                .filter((m) => m.offer === 1)
                .map((m) => m.serviceType.name);

              console.log('💾 Saving Demands (REPLACE mode):', {
                old: this.initialDemands.map(id => this.serviceTypeMap.get(id)),
                new: currentDemandNames,
                offers: existingOffers,
              });

              // Save ONLY current demands (not merged) + keep existing offers
              this.serviceTypeService
                .saveMarkets(username, existingOffers, currentDemandNames)
                .subscribe({
                  next: () => {
                    this.submitting = false;
                    // Update initial state after successful save
                    this.initialDemands = [...this.selectedDemands];
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
                .saveMarkets(username, [], currentDemandNames)
                .subscribe({
                  next: () => {
                    this.submitting = false;
                    this.initialDemands = [...this.selectedDemands];
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
