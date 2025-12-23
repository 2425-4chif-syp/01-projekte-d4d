import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { MatchService } from '../../core/services/match.service';
import { MarketService } from '../../core/services/market.service';
import { ServiceTypeService } from '../../core/services/service-type.service';
import { ConfigService } from '../../core/services/config.service';
import { KeycloakService } from '../../core/services/keycloak.service';
import { SessionService } from '../../core/services/session.service';
import { Match, MatchGroup } from '../../core/models/match.model';

type ViewMode = 'grouped' | 'compact' | 'card';

@Component({
  selector: 'app-user-matches',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-matches.component.html',
  styleUrl: './user-matches.component.css',
})
export class UserMatchesComponent implements OnInit {
  // State
  allMatches: Match[] = [];
  filteredMatches: Match[] = [];
  paginatedMatches: Match[] = [];
  groupedMatches: MatchGroup[] = [];
  serviceTypes: string[] = [];
  loading = true;

  // Filters
  searchText = '';
  selectedServiceType = 'all';
  offerFilter: 'all' | 'offer' | 'demand' = 'all';
  ratingFilter = 'all';
  sortOption = 'rating-desc';
  viewMode: ViewMode = 'grouped';

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;
  pageNumbers: number[] = [];
  startPage = 1;
  endPage = 1;
  startItem = 0;
  endItem = 0;

  // Card View
  currentCardIndex = 0;

  // Modal
  showModal = false;
  selectedMatch: Match | null = null;
  submitting = false;
  modalMessage = '';
  modalMessageType: 'success' | 'error' = 'success';

  // Helper for template
  Math = Math;
  private apiUrl: string;

  constructor(
    private matchService: MatchService,
    private marketService: MarketService,
    private serviceTypeService: ServiceTypeService,
    private configService: ConfigService,
    private keycloakService: KeycloakService,
    private sessionService: SessionService
  ) {
    this.apiUrl = this.configService.getApiUrl();
    // Load view mode from localStorage
    const savedViewMode = localStorage.getItem('matchesViewMode');
    if (
      savedViewMode &&
      ['grouped', 'compact', 'card'].includes(savedViewMode)
    ) {
      this.viewMode = savedViewMode as ViewMode;
    }

    // Load filter state from localStorage
    this.loadFilterState();
  }

  ngOnInit() {
    this.loadData();

    // Listen for login event to reload data without page refresh
    window.addEventListener('user-logged-in', () => {
      console.log('🔄 User logged in, reloading matches...');
      this.loadData();
    });
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

      // Get current user from backend
      const username = await this.getCurrentUser();

      if (username && username !== 'Gast-Modus') {
        await this.loadUserMatches(username);
      } else {
        // Guest mode - load from localStorage
        await this.loadGuestMatches();
      }
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
            resolve(text.trim() || 'Gast-Modus');
          }
        })
        .catch(() => resolve('Gast-Modus'));
    });
  }

  private async loadGuestMatches() {
    try {
      // Load matches from backend session
      const sessionMatches = await this.sessionService.getMatches();

      console.log('📦 Session-Matches vom Backend:', sessionMatches);

      // Transform backend matches to frontend Match model
      const matchesArray: Match[] = sessionMatches.map((match: any) => ({
        id: match.id,
        username: match.user?.name || 'Unbekannt',
        serviceTypeName: match.serviceType?.name || 'Unbekannt',
        isOffer: match.offer === 1,
        typeId: match.serviceType?.id || 0,
        providerId: match.user?.id || 0,
        rating: match.rating || null,
        isPerfectMatch: match.isPerfectMatch || false,
        marketId: match.id,
      }));

      this.allMatches = matchesArray;
      await this.loadRatingsForMatches();
      this.filterMatches();
      this.loading = false;
    } catch (err: any) {
      console.error('Error in loadGuestMatches:', err);
      this.loading = false;
    }
  }

  private async loadUserMatches(username: string) {
    try {
      console.log('📊 Lade Matches für User:', username);

      // Load perfect matches
      const perfectMatches = await firstValueFrom(
        this.matchService.getPerfectMatches(username)
      ).catch((err) => {
        console.error('Fehler beim Laden der Perfect Matches:', err);
        return [];
      });

      // Load regular matches
      const regularMatches = await firstValueFrom(
        this.matchService.getRelevantMatches(username)
      ).catch((err) => {
        console.error('Fehler beim Laden der Regular Matches:', err);
        return [];
      });

      console.log('📦 Backend Matches:', {
        perfect: perfectMatches,
        regular: regularMatches,
      });

      // Map regular matches to Match interface
      const mappedRegularMatches = regularMatches.map((match: any) => ({
        id: match.id,
        username: match.username || match.user?.name || 'Unbekannt',
        serviceTypeName:
          match.serviceTypeName || match.serviceType?.name || 'Unbekannt',
        isOffer: match.offer === 1 || match.offer === true,
        typeId: match.typeId || match.serviceType?.id,
        providerId: match.providerId || match.user?.id,
        rating: null,
        isPerfectMatch: false,
        marketId: match.id,
      }));

      // Map perfect matches
      const mappedPerfectMatches = perfectMatches.map((match: any) => ({
        id: match.id,
        username: match.username || match.user?.name || 'Unbekannt',
        serviceTypeName:
          match.serviceTypeName || match.serviceType?.name || 'Unbekannt',
        isOffer: match.offer === 1 || match.offer === true,
        typeId: match.typeId || match.serviceType?.id,
        providerId: match.providerId || match.user?.id,
        rating: null,
        isPerfectMatch: true,
        marketId: match.id,
      }));

      // Combine all matches (perfect first)
      this.allMatches = [...mappedPerfectMatches, ...mappedRegularMatches];

      console.log('✅ Matches gemappt:', this.allMatches);

      // Load ratings for all matches
      await this.loadRatingsForMatches();

      // Initial filter
      this.filterMatches();

      this.loading = false;
    } catch (error) {
      console.error('❌ Error loading matches:', error);
      this.loading = false;
    }
  }

  private async loadRatingsForMatches() {
    // Get unique usernames
    const usernames = [...new Set(this.allMatches.map((m) => m.username))];

    // Load user ratings
    const ratingPromises = usernames.map(async (username) => {
      try {
        const stats = await firstValueFrom(
          this.matchService.getUserRating(username)
        );
        return {
          username,
          rating: stats?.averageRating || 0,
          count: stats?.totalReviews || 0,
        };
      } catch {
        return { username, rating: 0, count: 0 };
      }
    });

    const ratings = await Promise.all(ratingPromises);
    const ratingMap = new Map(
      ratings.map((r) => [r.username, { rating: r.rating, count: r.count }])
    );

    // Set ratings on matches
    this.allMatches.forEach((match) => {
      const userRating = ratingMap.get(match.username);
      if (userRating) {
        match.rating = userRating.rating;
      }
    });
  }

  filterMatches() {
    // Save filter state to localStorage
    this.saveFilterState();

    let filtered = [...this.allMatches];

    // Text filter
    if (this.searchText.trim()) {
      const term = this.searchText.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.username.toLowerCase().includes(term) ||
          m.serviceTypeName.toLowerCase().includes(term)
      );
    }

    // Service type filter
    if (this.selectedServiceType !== 'all') {
      filtered = filtered.filter(
        (m) => m.serviceTypeName === this.selectedServiceType
      );
    }

    // Offer/Demand filter
    if (this.offerFilter === 'offer') {
      filtered = filtered.filter((m) => m.isOffer);
    } else if (this.offerFilter === 'demand') {
      filtered = filtered.filter((m) => !m.isOffer);
    }

    // Rating filter
    if (this.ratingFilter !== 'all') {
      if (this.ratingFilter === 'unrated') {
        filtered = filtered.filter((m) => !m.rating || m.rating === 0);
      } else {
        const minRating = parseFloat(this.ratingFilter.replace('+', ''));
        filtered = filtered.filter((m) => m.rating && m.rating >= minRating);
      }
    }

    // Sort
    this.sortMatches(filtered);

    // Perfect matches first
    filtered.sort((a, b) => {
      if (a.isPerfectMatch && !b.isPerfectMatch) return -1;
      if (!a.isPerfectMatch && b.isPerfectMatch) return 1;
      return 0;
    });

    this.filteredMatches = filtered;

    // Update view based on mode
    if (this.viewMode === 'grouped') {
      this.createGroupedView();
      this.calculatePagination(this.groupedMatches.length);
    } else {
      this.calculatePagination(filtered.length);
      this.updatePaginatedMatches();
    }
  }

  private sortMatches(matches: Match[]) {
    matches.sort((a, b) => {
      switch (this.sortOption) {
        case 'rating-desc':
          return (b.rating || 0) - (a.rating || 0);
        case 'rating-asc':
          return (a.rating || 0) - (b.rating || 0);
        case 'name-asc':
          return a.username.localeCompare(b.username);
        case 'name-desc':
          return b.username.localeCompare(a.username);
        default:
          return 0;
      }
    });
  }

  private createGroupedView() {
    const groups = new Map<string, Match[]>();

    // Group by username
    this.filteredMatches.forEach((match) => {
      if (!groups.has(match.username)) {
        groups.set(match.username, []);
      }
      groups.get(match.username)!.push(match);
    });

    // Convert to MatchGroup array
    this.groupedMatches = Array.from(groups.entries()).map(
      ([username, matches]) => {
        const isPerfectMatch = matches.some((m) => m.isPerfectMatch);
        const userRating = matches[0].rating || 0;

        return {
          username,
          matches,
          userRating,
          reviewCount: 0, // Could be loaded separately
          isPerfectMatch,
        };
      }
    );
  }

  private calculatePagination(totalItems: number) {
    // Calculate items per page based on view mode
    if (this.viewMode === 'card') {
      this.itemsPerPage = 1;
    } else if (this.viewMode === 'compact') {
      this.itemsPerPage = 16;
    } else {
      this.itemsPerPage = 2; // Groups per page
    }

    this.totalPages = Math.ceil(totalItems / this.itemsPerPage);

    // Ensure current page is valid
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }

    // Calculate page numbers to show
    const maxVisible = 5;
    this.startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    this.endPage = Math.min(this.totalPages, this.startPage + maxVisible - 1);

    if (this.endPage - this.startPage + 1 < maxVisible) {
      this.startPage = Math.max(1, this.endPage - maxVisible + 1);
    }

    this.pageNumbers = [];
    for (let i = this.startPage; i <= this.endPage; i++) {
      this.pageNumbers.push(i);
    }

    // Calculate item range
    this.startItem = (this.currentPage - 1) * this.itemsPerPage + 1;
    this.endItem = Math.min(this.currentPage * this.itemsPerPage, totalItems);
  }

  private updatePaginatedMatches() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.paginatedMatches = this.filteredMatches.slice(start, end);

    // Reset card index when changing page
    if (this.viewMode === 'card') {
      this.currentCardIndex = 0;
    }
  }

  changeViewMode(mode: ViewMode) {
    this.viewMode = mode;
    this.currentPage = 1;
    this.currentCardIndex = 0;
    localStorage.setItem('matchesViewMode', mode);
    this.filterMatches();
  }

  private loadFilterState() {
    try {
      const savedFilters = localStorage.getItem('matchesFilters');
      if (savedFilters) {
        const filters = JSON.parse(savedFilters);
        this.searchText = filters.searchText || '';
        this.selectedServiceType = filters.selectedServiceType || 'all';
        this.offerFilter = filters.offerFilter || 'all';
        this.ratingFilter = filters.ratingFilter || 'all';
        this.sortOption = filters.sortOption || 'rating-desc';
      }
    } catch (error) {
      console.error('Error loading filter state:', error);
    }
  }

  private saveFilterState() {
    try {
      const filters = {
        searchText: this.searchText,
        selectedServiceType: this.selectedServiceType,
        offerFilter: this.offerFilter,
        ratingFilter: this.ratingFilter,
        sortOption: this.sortOption,
      };
      localStorage.setItem('matchesFilters', JSON.stringify(filters));
    } catch (error) {
      console.error('Error saving filter state:', error);
    }
  }

  changePage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;

    if (this.viewMode === 'grouped') {
      // For grouped view, pagination is handled differently
      this.filterMatches();
    } else {
      this.updatePaginatedMatches();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  nextCard() {
    if (this.currentCardIndex < this.paginatedMatches.length - 1) {
      this.currentCardIndex++;
    }
  }

  previousCard() {
    if (this.currentCardIndex > 0) {
      this.currentCardIndex--;
    }
  }

  openRequestModal(match: Match) {
    if (!match.isOffer) return;

    // Save card ID for scroll restoration after login
    sessionStorage.setItem('scrollToMatchId', match.id.toString());

    this.selectedMatch = match;
    this.showModal = true;
    this.modalMessage = '';
  }

  closeModal() {
    this.showModal = false;
    this.selectedMatch = null;
    this.modalMessage = '';
    this.submitting = false;
  }

  async submitRequest() {
    if (!this.selectedMatch || this.submitting) return;

    this.submitting = true;
    this.modalMessage = '';

    try {
      // Check if user is authenticated, redirect to login if not
      await this.keycloakService.ensureThatUserIsAuthenticated();

      // Get current user
      const username = await this.getCurrentUser();

      if (!username || username === 'Gast-Modus') {
        this.modalMessage = 'Du musst angemeldet sein';
        this.modalMessageType = 'error';
        this.submitting = false;
        return;
      }

      // Send request
      const marketId = this.selectedMatch.marketId || this.selectedMatch.id;
      await this.matchService
        .sendServiceRequest(username, Number(marketId))
        .toPromise();

      this.modalMessage = 'Anfrage erfolgreich gesendet!';
      this.modalMessageType = 'success';

      // Close modal after delay
      setTimeout(() => {
        this.closeModal();
      }, 1500);
    } catch (error: any) {
      console.error('Error sending request:', error);

      if (error.status === 409) {
        this.modalMessage =
          'Du hast bereits eine Anfrage an diesen User gesendet';
      } else if (error.status === 404) {
        this.modalMessage = 'Service nicht gefunden';
      } else {
        this.modalMessage = 'Fehler beim Senden der Anfrage';
      }

      this.modalMessageType = 'error';
    } finally {
      this.submitting = false;
    }
  }
}
