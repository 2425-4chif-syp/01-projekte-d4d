import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ActiveServiceService } from '../../core/services/active-service.service';
import { KeycloakService } from '../../core/services/keycloak.service';
import { ConfigService } from '../../core/services/config.service';
import { ActiveService } from '../../core/models/service.model';

@Component({
  selector: 'app-my-services',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-services.component.html',
  styleUrl: './my-services.component.css'
})
export class MyServicesComponent implements OnInit {
  services: ActiveService[] = [];
  filteredServices: ActiveService[] = [];
  loading = true;
  currentUsername = '';
  filterStatus: 'all' | 'active' | 'completed' = 'all';

  showReviewModal = false;
  selectedService: ActiveService | null = null;
  reviewRating = 0;
  reviewComment = '';
  submittingReview = false;
  reviewMessage = '';
  reviewMessageType: 'success' | 'error' = 'success';

  constructor(
    private activeServiceService: ActiveServiceService,
    private keycloakService: KeycloakService,
    private configService: ConfigService
  ) {}

  async ngOnInit() {
    await this.loadServices();
  }

  private async loadServices() {
    this.loading = true;
    try {
      const username = await this.getCurrentUser();
      if (username && username !== 'Gast-Modus') {
        this.currentUsername = username;
        this.services = await firstValueFrom(
          this.activeServiceService.getMyServices(username)
        );
        this.filterServices();
      }
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      this.loading = false;
    }
  }

  private getCurrentUser(): Promise<string> {
    const apiUrl = this.configService.getApiUrl();
    return new Promise((resolve) => {
      fetch(`${apiUrl}/user`, { credentials: 'include' })
        .then((response) => response.text())
        .then((text) => {
          try {
            const json = JSON.parse(text);
            resolve(json.username || 'Gast-Modus');
          } catch {
            resolve(text.trim() || 'Gast-Modus');
          }
        })
        .catch(() => resolve('Gast-Modus'));
    });
  }

  filterServices() {
    if (this.filterStatus === 'all') {
      this.filteredServices = this.services;
    } else if (this.filterStatus === 'active') {
      this.filteredServices = this.services.filter(s => 
        s.status === 'ACTIVE' || s.status === 'PENDING_COMPLETION'
      );
    } else {
      this.filteredServices = this.services.filter(s => s.status === 'COMPLETED');
    }
  }

  async confirmCompletion(service: ActiveService) {
    if (!this.currentUsername) return;

    try {
      const updated = await firstValueFrom(
        this.activeServiceService.confirmServiceCompletion(service.id, this.currentUsername)
      );
      
      // Update service in list
      const index = this.services.findIndex(s => s.id === service.id);
      if (index !== -1) {
        this.services[index] = updated;
        this.filterServices();
      }
    } catch (error) {
      console.error('Error confirming completion:', error);
      alert('Fehler beim Bestätigen der Fertigstellung');
    }
  }

  isProvider(service: ActiveService): boolean {
    // Check if current user is the provider by comparing names
    return service.providerName === this.currentUsername;
  }

  canConfirm(service: ActiveService): boolean {
    if (service.status === 'COMPLETED' || service.status === 'CANCELLED') {
      return false;
    }
    
    const isProvider = this.isProvider(service);
    if (isProvider) {
      return !service.providerConfirmed;
    } else {
      return !service.clientConfirmed;
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'bg-success';
      case 'PENDING_COMPLETION':
        return 'bg-warning text-dark';
      case 'COMPLETED':
        return 'bg-primary';
      case 'CANCELLED':
        return 'bg-secondary';
      default:
        return 'bg-secondary';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'Aktiv';
      case 'PENDING_COMPLETION':
        return 'Warten auf Bestätigung';
      case 'COMPLETED':
        return 'Abgeschlossen';
      case 'CANCELLED':
        return 'Abgebrochen';
      default:
        return status;
    }
  }

  openReviewModal(service: ActiveService) {
    this.selectedService = service;
    this.showReviewModal = true;
    this.reviewRating = 0;
    this.reviewComment = '';
    this.reviewMessage = '';
  }

  closeReviewModal() {
    this.showReviewModal = false;
    this.selectedService = null;
    this.reviewRating = 0;
    this.reviewComment = '';
    this.reviewMessage = '';
  }

  setRating(rating: number) {
    this.reviewRating = rating;
  }

  async submitReview() {
    if (!this.selectedService || this.reviewRating === 0) {
      this.reviewMessage = 'Bitte wähle eine Bewertung aus';
      this.reviewMessageType = 'error';
      return;
    }

    this.submittingReview = true;
    this.reviewMessage = '';

    try {
      await firstValueFrom(
        this.activeServiceService.submitReview({
          serviceId: this.selectedService.id,
          stars: this.reviewRating,
          comment: this.reviewComment
        })
      );

      this.reviewMessage = 'Bewertung erfolgreich abgegeben!';
      this.reviewMessageType = 'success';

      // Mark as reviewed
      const index = this.services.findIndex(s => s.id === this.selectedService!.id);
      if (index !== -1) {
        this.services[index].hasReviewed = true;
        this.filterServices();
      }

      setTimeout(() => {
        this.closeReviewModal();
      }, 1500);
    } catch (error: any) {
      console.error('Error submitting review:', error);
      if (error.status === 409) {
        this.reviewMessage = 'Du hast diesen Service bereits bewertet';
      } else {
        this.reviewMessage = 'Fehler beim Absenden der Bewertung';
      }
      this.reviewMessageType = 'error';
    } finally {
      this.submittingReview = false;
    }
  }
}
