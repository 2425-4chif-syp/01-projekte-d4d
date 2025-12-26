import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { Subscription, filter, interval } from 'rxjs';
import { KeycloakService } from '../services/keycloak.service';
import { RequestService } from '../services/request.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent implements OnInit, OnDestroy {
  currentUser: string | null = null;
  currentUserState: 'guest' | 'user' | 'admin' = 'guest';
  currentPage: string = '';
  isProfileMenuOpen = false;
  hasInboxNotification = false;

  private routerSubscription?: Subscription;
  private keycloakSubscription?: Subscription;
  private notificationSubscription?: Subscription;
  private currentUsername: string | null = null;
  notificationCount = 0;
  hasUnreadMessages = false;

  constructor(
    private router: Router,
    private keycloakService: KeycloakService,
    private requestService: RequestService
  ) {}

  async ngOnInit() {
    // Track current page for active button styling
    this.currentPage = this.router.url.split('/').pop() || 'home';

    this.routerSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentPage = event.url.split('/').pop() || 'home';
      });

    // Subscribe to Keycloak model changes to update navbar on login/logout
    this.keycloakSubscription = this.keycloakService.model$.subscribe(() => {
      this.checkUserStatus();
    });

    // Check user authentication status
    await this.checkUserStatus();
  }

  ngOnDestroy() {
    this.routerSubscription?.unsubscribe();
    this.keycloakSubscription?.unsubscribe();
    this.notificationSubscription?.unsubscribe();
  }

  async checkUserStatus() {
    try {
      const user = await this.keycloakService.getCurrentUser();

      if (user && user !== 'guest' && user !== 'Gast-Modus') {
        this.currentUser = user;
        this.currentUsername = user;
        this.currentUserState = user === 'Admin' ? 'admin' : 'user';

        // Check for inbox notifications if logged in
        await this.checkInboxNotifications();
        this.startNotificationPolling();
      } else {
        this.currentUser = null;
        this.currentUsername = null;
        this.currentUserState = 'guest';
        this.stopNotificationPolling();
      }
    } catch (error) {
      console.error('Error checking user status:', error);
      this.currentUser = null;
      this.currentUsername = null;
      this.currentUserState = 'guest';
    }
  }

  async checkInboxNotifications() {
    if (!this.currentUsername) {
      this.hasInboxNotification = false;
      this.notificationCount = 0;
      return;
    }

    try {
      // Get received requests
      const received = await this.requestService.getReceivedRequests(this.currentUsername).toPromise();
      const sent = await this.requestService.getSentRequests(this.currentUsername).toPromise();
      
      // Get seen requests from localStorage
      const seenReceivedStr = localStorage.getItem('seenReceivedRequests');
      const seenReceived: Record<string, boolean> = seenReceivedStr ? JSON.parse(seenReceivedStr) : {};
      
      const seenSentStr = localStorage.getItem('seenSentRequests');
      const seenSent: Record<string, string> = seenSentStr ? JSON.parse(seenSentStr) : {};

      let count = 0;

      // Count unseen pending received requests
      if (received) {
        received.forEach((req: any) => {
          if (req.status === 'PENDING' && !seenReceived[req.id]) {
            count++;
          }
        });
      }

      // Count unseen status changes on sent requests
      if (sent) {
        sent.forEach((req: any) => {
          if ((req.status === 'ACCEPTED' || req.status === 'REJECTED') && seenSent[req.id] !== req.status) {
            count++;
          }
        });
      }

      this.notificationCount = count;
      this.hasInboxNotification = count > 0;
    } catch (error) {
      console.error('Error checking inbox notifications:', error);
      this.hasInboxNotification = false;
      this.notificationCount = 0;
    }
  }

  private startNotificationPolling() {
    this.stopNotificationPolling();
    // Poll every 15 seconds
    this.notificationSubscription = interval(15000).subscribe(() => {
      this.checkInboxNotifications();
    });
  }

  private stopNotificationPolling() {
    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
      this.notificationSubscription = undefined;
    }
  }

  async handleLogin() {
    await this.keycloakService.login();
  }

  async handleLogout() {
    await this.keycloakService.logout();
    this.currentUser = null;
    this.currentUserState = 'guest';
    this.isProfileMenuOpen = false;
    this.router.navigate(['/']);
  }

  toggleProfileMenu(event: Event) {
    event.stopPropagation();
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  closeProfileMenu() {
    this.isProfileMenuOpen = false;
  }

  isActive(route: string): boolean {
    return this.currentPage === route;
  }

  navigateTo(route: string) {
    this.router.navigate(['/' + route]);
  }

  navigateToHome() {
    this.router.navigate(['/']);
  }
}
