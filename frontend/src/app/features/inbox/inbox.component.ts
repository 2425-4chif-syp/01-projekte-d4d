import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RequestService } from '../../core/services/request.service';
import { ConfigService } from '../../core/services/config.service';
import { ServiceRequest, RequestsData } from '../../core/models/request.model';

type ViewType = 'received' | 'sent';
type FilterType = 'all' | 'PENDING' | 'ACCEPTED' | 'REJECTED';

interface Notification {
  message: string;
  type: 'success' | 'error' | 'info';
  show: boolean;
}

@Component({
  selector: 'app-inbox',
  imports: [CommonModule],
  templateUrl: './inbox.component.html',
  styleUrl: './inbox.component.css',
})
export class InboxComponent implements OnInit {
  currentFilter: FilterType = 'all';
  currentView: ViewType = 'received';
  allRequests: RequestsData = { received: [], sent: [] };
  displayedRequests: ServiceRequest[] = [];
  loading = true;
  isLoggedIn = false;
  processingRequest: number | null = null;
  showSentNotification = false;
  notification: Notification | null = null;
  private apiUrl: string;

  constructor(
    private requestService: RequestService,
    private configService: ConfigService,
    private router: Router
  ) {
    this.apiUrl = this.configService.getApiUrl();
  }

  ngOnInit() {
    this.loadData();

    // Reload data after login
    window.addEventListener('user-logged-in', () => {
      console.log('🔄 User logged in, reloading inbox...');
      this.loadData();
    });
  }

  async loadData() {
    this.loading = true;

    try {
      const username = await this.getCurrentUser();

      if (
        !username ||
        username === 'Nicht angemeldet' ||
        username === 'Gast-Modus'
      ) {
        this.isLoggedIn = false;
        this.loading = false;
        return;
      }

      this.isLoggedIn = true;
      await this.loadRequests(username);

      this.loading = false;
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

  private async loadRequests(username: string) {
    try {
      const [received, sent] = await Promise.all([
        this.requestService.getReceivedRequests(username).toPromise(),
        this.requestService.getSentRequests(username).toPromise(),
      ]);

      this.allRequests = {
        received: received || [],
        sent: sent || [],
      };

      this.checkSentNotifications(sent || []);
      this.updateDisplay();
    } catch (error) {
      console.error('Error loading requests:', error);
      throw error;
    }
  }

  changeView(view: ViewType) {
    this.currentView = view;

    // Clear notification dot when switching to sent view
    if (view === 'sent') {
      this.showSentNotification = false;
      this.markSentRequestsAsSeen();
    }
    
    // Mark received requests as seen when viewing received
    if (view === 'received') {
      this.markReceivedRequestsAsSeen();
    }

    this.updateDisplay();
  }

  changeFilter(filter: FilterType) {
    this.currentFilter = filter;
    this.updateDisplay();
  }

  private updateDisplay() {
    let requests = [...this.allRequests[this.currentView]];

    // Apply filter
    if (this.currentFilter !== 'all') {
      requests = requests.filter((r) => r.status === this.currentFilter);
    }

    // Sort by newest first
    requests.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    this.displayedRequests = requests;
  }

  getCounts() {
    const requests = this.allRequests[this.currentView];
    return {
      all: requests.length,
      PENDING: requests.filter((r) => r.status === 'PENDING').length,
      ACCEPTED: requests.filter((r) => r.status === 'ACCEPTED').length,
      REJECTED: requests.filter((r) => r.status === 'REJECTED').length,
    };
  }

  getFilterLabel(): string {
    const labels: Record<FilterType, string> = {
      all: '',
      PENDING: 'ausstehenden',
      ACCEPTED: 'akzeptierten',
      REJECTED: 'abgelehnten',
    };
    return labels[this.currentFilter];
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  async acceptRequest(request: ServiceRequest) {
    if (
      !confirm(
        `Möchtest du die Anfrage von ${request.senderName} wirklich akzeptieren?`
      )
    ) {
      return;
    }

    this.processingRequest = request.id;

    try {
      await this.requestService.acceptRequest(request.id).toPromise();

      this.showNotification(
        `✓ Anfrage von ${request.senderName} akzeptiert!`,
        'success'
      );

      // Reload requests
      const username = await this.getCurrentUser();
      if (username && username !== 'Gast-Modus') {
        await this.loadRequests(username);
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      this.showNotification('Fehler beim Akzeptieren der Anfrage', 'error');
    } finally {
      this.processingRequest = null;
    }
  }

  async rejectRequest(request: ServiceRequest) {
    if (
      !confirm(
        `Möchtest du die Anfrage von ${request.senderName} wirklich ablehnen?`
      )
    ) {
      return;
    }

    this.processingRequest = request.id;

    try {
      await this.requestService.rejectRequest(request.id).toPromise();

      this.showNotification(
        `Anfrage von ${request.senderName} abgelehnt`,
        'info'
      );

      // Reload requests
      const username = await this.getCurrentUser();
      if (username && username !== 'Gast-Modus') {
        await this.loadRequests(username);
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      this.showNotification('Fehler beim Ablehnen der Anfrage', 'error');
    } finally {
      this.processingRequest = null;
    }
  }

  goToHome() {
    this.router.navigate(['/']);
  }

  private showNotification(
    message: string,
    type: 'success' | 'error' | 'info'
  ) {
    // Remove old notification
    this.notification = null;

    // Show new notification
    setTimeout(() => {
      this.notification = { message, type, show: false };

      // Animate in
      setTimeout(() => {
        if (this.notification) {
          this.notification.show = true;
        }
      }, 10);

      // Remove after 3 seconds
      setTimeout(() => {
        if (this.notification) {
          this.notification.show = false;
        }
        setTimeout(() => {
          this.notification = null;
        }, 300);
      }, 3000);
    }, 10);
  }

  private checkSentNotifications(sentRequests: ServiceRequest[]) {
    // Get the IDs of requests we've already seen with their status
    const seenRequestsStr = localStorage.getItem('seenSentRequests');
    const seenRequests: Record<string, string> = seenRequestsStr
      ? JSON.parse(seenRequestsStr)
      : {};

    // Check for status changes on sent requests (accepted or rejected)
    let hasNewStatusChange = false;

    sentRequests.forEach((request) => {
      if (request.status === 'ACCEPTED' || request.status === 'REJECTED') {
        const requestKey = `${request.id}`;
        const seenStatus = seenRequests[requestKey];

        // If we haven't seen this status before, it's new
        if (seenStatus !== request.status) {
          hasNewStatusChange = true;
        }
      }
    });

    // Show notification dot on "Gesendet" button if there are new status changes
    this.showSentNotification = hasNewStatusChange;
  }

  private markSentRequestsAsSeen() {
    if (!this.allRequests.sent) return;

    const seenRequestsStr = localStorage.getItem('seenSentRequests');
    const seenRequests: Record<string, string> = seenRequestsStr
      ? JSON.parse(seenRequestsStr)
      : {};

    // Mark all current sent requests with their status as seen
    this.allRequests.sent.forEach((request) => {
      seenRequests[`${request.id}`] = request.status;
    });

    localStorage.setItem('seenSentRequests', JSON.stringify(seenRequests));
  }

  private markReceivedRequestsAsSeen() {
    if (!this.allRequests.received) return;

    const seenRequestsStr = localStorage.getItem('seenReceivedRequests');
    const seenRequests: Record<string, boolean> = seenRequestsStr
      ? JSON.parse(seenRequestsStr)
      : {};

    // Mark all pending received requests as seen
    this.allRequests.received.forEach((request) => {
      if (request.status === 'PENDING') {
        seenRequests[request.id] = true;
      }
    });

    localStorage.setItem('seenReceivedRequests', JSON.stringify(seenRequests));
  }
}
