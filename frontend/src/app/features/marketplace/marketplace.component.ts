import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarketService } from '../../core/services/market.service';
import { ServiceTypeService } from '../../core/services/service-type.service';
import { ConfigService } from '../../core/services/config.service';
import { KeycloakService } from '../../core/services/keycloak.service';
import { MarketItem } from '../../core/models/market.model';

type ServiceToggle = 'offers' | 'demands';

@Component({
  selector: 'app-marketplace',
  imports: [CommonModule, FormsModule],
  templateUrl: './marketplace.component.html',
  styleUrl: './marketplace.component.css',
})
export class MarketplaceComponent implements OnInit {
  // Data
  allItems: MarketItem[] = [];
  filteredItems: MarketItem[] = [];
  serviceTypes: string[] = [];

  // Filter state
  nameSearch = '';
  selectedServiceType = 'all';
  ratingFilter = 'all';
  sortOption = 'none';
  descriptionSearch = '';
  showClosedMarkets = false;
  selectedTags = new Set<string>();
  serviceToggle: ServiceToggle = 'demands';

  // UI state
  loading = true;
  isLoggedIn = false;
  sendingRequest: number | null = null;

  // Modal state
  showRequestModal = false;
  selectedItem: MarketItem | null = null;
  submitting = false;
  modalMessage = '';
  modalMessageType: 'success' | 'error' = 'success';

  // Helper
  Math = Math;
  Array = Array;

  private apiUrl: string;

  constructor(
    private marketService: MarketService,
    private serviceTypeService: ServiceTypeService,
    private configService: ConfigService,
    private keycloakService: KeycloakService
  ) {
    this.apiUrl = this.configService.getApiUrl();
  }

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.loading = true;

    try {
      // Load service types
      this.serviceTypeService.getServiceTypes().subscribe({
        next: (types) => {
          this.serviceTypes = types.map((t) => t.name);
        },
      });

      // Check if user is logged in
      const username = await this.getCurrentUser();
      this.isLoggedIn =
        !!username &&
        username !== 'Nicht angemeldet' &&
        username !== 'Gast-Modus';

      // Load market items
      this.marketService.getAllMarketItems().subscribe({
        next: async (items) => {
          this.allItems = items;

          // Load ratings for all users
          await this.loadRatings();

          // Apply initial filters
          this.applyFilters();

          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading market items:', error);
          this.loading = false;
        },
      });
    } catch (error) {
      console.error('Error loading data:', error);
      this.loading = false;
    }
  }

  private getCurrentUser(): Promise<string> {
    return new Promise((resolve) => {
      fetch(`${this.apiUrl}/user`, { credentials: 'include' })
        .then((response) => response.text())
        .then((text) => {
          try {
            const json = JSON.parse(text);
            resolve(json.username || 'Gast-Modus');
          } catch {
            const username = text.trim();
            resolve(username && username !== 'guest' ? username : 'Gast-Modus');
          }
        })
        .catch(() => resolve('Gast-Modus'));
    });
  }

  private async loadRatings() {
    const uniqueUsernames = [
      ...new Set(this.allItems.map((i) => this.getUserName(i)).filter(Boolean)),
    ];

    for (let username of uniqueUsernames) {
      try {
        this.marketService.getUserRating(username).subscribe({
          next: (stats) => {
            // Update rating on all items from this user
            this.allItems.forEach((item) => {
              if (this.getUserName(item) === username) {
                item.userRating = stats.averageRating || 0;
              }
            });
          },
        });
      } catch (error) {
        console.error('Error loading rating for', username, error);
      }
    }
  }

  applyFilters() {
    const currentUser = this.getCurrentUsername();

    let filtered = [...this.allItems];

    // Filter out current user's items
    if (currentUser) {
      filtered = filtered.filter(
        (item) => this.getUserName(item) !== currentUser
      );
    }

    // Toggle filter (offers vs demands)
    if (this.serviceToggle === 'offers') {
      filtered = filtered.filter((item) => this.isOffer(item));
    } else {
      filtered = filtered.filter((item) => !this.isOffer(item));
    }

    // Name filter
    if (this.nameSearch.trim()) {
      const term = this.nameSearch.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          this.getUserName(item).toLowerCase().includes(term) ||
          this.getServiceTypeName(item).toLowerCase().includes(term)
      );
    }

    // Service type filter
    if (this.selectedServiceType !== 'all') {
      filtered = filtered.filter(
        (item) => this.getServiceTypeName(item) === this.selectedServiceType
      );
    }

    // Tag filter
    if (this.selectedTags.size > 0) {
      filtered = filtered.filter((item) => {
        const serviceName = this.getServiceTypeName(item).toLowerCase();
        const description = (item.description || '').toLowerCase();

        return Array.from(this.selectedTags).some((tag) => {
          const tagLower = tag.toLowerCase();
          return (
            serviceName.includes(tagLower) || description.includes(tagLower)
          );
        });
      });
    }

    // Rating filter (only for offers)
    if (this.ratingFilter !== 'all' && this.serviceToggle === 'offers') {
      if (this.ratingFilter === 'unrated') {
        filtered = filtered.filter(
          (item) => !item.userRating || item.userRating === 0
        );
      } else {
        const minRating = parseFloat(this.ratingFilter.replace('+', ''));
        filtered = filtered.filter(
          (item) => item.userRating && item.userRating >= minRating
        );
      }
    }

    // Closed markets filter
    if (this.showClosedMarkets) {
      filtered = filtered.filter((item) => {
        if (item.endDate) {
          return new Date(item.endDate) < new Date();
        }
        return false;
      });
    } else {
      filtered = filtered.filter(
        (item) => !item.endDate || new Date(item.endDate) >= new Date()
      );
    }

    // Sorting
    if (this.sortOption !== 'none') {
      filtered.sort((a, b) => {
        switch (this.sortOption) {
          case 'rating-desc':
            return (b.userRating || 0) - (a.userRating || 0);
          case 'rating-asc':
            return (a.userRating || 0) - (b.userRating || 0);
          case 'name-asc':
            return this.getUserName(a).localeCompare(this.getUserName(b));
          case 'name-desc':
            return this.getUserName(b).localeCompare(this.getUserName(a));
          default:
            return 0;
        }
      });
    }

    this.filteredItems = filtered;
  }

  onServiceToggleChange() {
    // Disable rating filter for demands
    if (this.serviceToggle === 'demands') {
      this.ratingFilter = 'all';

      // Disable rating-based sorting
      if (this.sortOption.startsWith('rating-')) {
        this.sortOption = 'none';
      }
    }

    this.applyFilters();
  }

  onDescriptionKeypress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      const term = this.descriptionSearch.trim();
      if (term) {
        this.addTag(term);
        this.descriptionSearch = '';
      }
    }
  }

  toggleTag(tag: string) {
    if (this.selectedTags.has(tag)) {
      this.selectedTags.delete(tag);
    } else {
      this.selectedTags.add(tag);
    }
    this.applyFilters();
  }

  addTag(tag: string) {
    this.selectedTags.add(tag);
    this.applyFilters();
  }

  removeTag(tag: string) {
    this.selectedTags.delete(tag);
    this.applyFilters();
  }

  isPopularTag(tag: string): boolean {
    const popularTags = [
      'Wochenende',
      'Gruppennachhilfe',
      'Einzelnachhilfe',
      'Online',
      'Präsenz',
      'Prüfungsvorbereitung',
      'Hausaufgaben',
      'Intensivkurs',
    ];
    return popularTags.includes(tag);
  }

  get hasCustomTags(): boolean {
    return (
      Array.from(this.selectedTags).filter((tag) => !this.isPopularTag(tag))
        .length > 0
    );
  }

  get customTags(): string[] {
    return Array.from(this.selectedTags).filter(
      (tag) => !this.isPopularTag(tag)
    );
  }

  openRequestModal(item: MarketItem) {
    if (!this.isOffer(item)) return;

    this.selectedItem = item;
    this.showRequestModal = true;
    this.modalMessage = '';
  }

  closeRequestModal() {
    this.showRequestModal = false;
    this.selectedItem = null;
    this.modalMessage = '';
    this.submitting = false;
  }

  async submitRequest() {
    if (!this.selectedItem || this.submitting) return;

    this.submitting = true;
    this.modalMessage = '';

    try {
      // Check if user is authenticated, redirect to login if not
      await this.keycloakService.ensureThatUserIsAuthenticated();

      const username = await this.getCurrentUser();

      if (!username || username === 'Gast-Modus') {
        this.modalMessage = 'Du musst angemeldet sein';
        this.modalMessageType = 'error';
        this.submitting = false;
        return;
      }

      this.marketService
        .sendServiceRequest(username, this.selectedItem.id)
        .subscribe({
          next: () => {
            this.modalMessage = 'Anfrage erfolgreich gesendet!';
            this.modalMessageType = 'success';

            setTimeout(() => {
              this.closeRequestModal();
            }, 1500);
          },
          error: (error) => {
            if (error.status === 409) {
              this.modalMessage =
                'Du hast bereits eine Anfrage an diesen User gesendet';
            } else if (error.status === 404) {
              this.modalMessage = 'Service nicht gefunden';
            } else {
              this.modalMessage = 'Fehler beim Senden der Anfrage';
            }
            this.modalMessageType = 'error';
            this.submitting = false;
          },
        });
    } catch (error) {
      console.error('Error submitting request:', error);
      this.modalMessage = 'Fehler beim Senden der Anfrage';
      this.modalMessageType = 'error';
      this.submitting = false;
    }
  }

  private getCurrentUsername(): string {
    // This would come from auth service in production
    return '';
  }

  // Helper methods
  isOffer(item: MarketItem): boolean {
    return item.offer === 1 || item.offer === true;
  }

  getUserName(item: MarketItem): string {
    return item.user?.name || 'Unbekannt';
  }

  getServiceTypeName(item: MarketItem): string {
    return item.serviceType?.name || 'Unbekannt';
  }

  getRating(item: MarketItem): number {
    return item.userRating || 0;
  }

  formatDateRange(startDate?: string, endDate?: string): string {
    if (!startDate && !endDate) return 'Keine Zeitangabe';

    const formatDate = (dateStr: string) => {
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      } catch {
        return 'Nicht angegeben';
      }
    };

    const start = startDate ? formatDate(startDate) : 'Nicht angegeben';
    const end = endDate ? formatDate(endDate) : 'Nicht angegeben';

    return `${start} - ${end}`;
  }
}
