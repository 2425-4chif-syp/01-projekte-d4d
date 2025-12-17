import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { KeycloakService } from '../services/keycloak.service';

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

  constructor(
    private router: Router,
    private keycloakService: KeycloakService
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
  }

  async checkUserStatus() {
    try {
      const user = await this.keycloakService.getCurrentUser();

      if (user && user !== 'guest' && user !== 'Gast-Modus') {
        this.currentUser = user;
        this.currentUserState = user === 'Admin' ? 'admin' : 'user';

        // Check for inbox notifications if logged in
        await this.checkInboxNotifications();
      } else {
        this.currentUser = null;
        this.currentUserState = 'guest';
      }
    } catch (error) {
      console.error('Error checking user status:', error);
      this.currentUser = null;
      this.currentUserState = 'guest';
    }
  }

  async checkInboxNotifications() {
    // TODO: Implement inbox notification check
    // For now, just set to false
    this.hasInboxNotification = false;
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
