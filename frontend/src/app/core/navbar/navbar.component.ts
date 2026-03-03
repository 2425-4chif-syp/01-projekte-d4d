import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { Subscription, filter, interval } from 'rxjs';
import { KeycloakService } from '../services/keycloak.service';
import { RequestService } from '../services/request.service';
import { ChatService } from '../services/chat.service';
import { ChatWebSocketService } from '../services/chat-websocket.service';

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
  hasChatNotification = false;
  chatNotificationCount = 0;

  private routerSubscription?: Subscription;
  private keycloakSubscription?: Subscription;
  private notificationSubscription?: Subscription;
  private chatNotificationSubscription?: Subscription;
  private wsMessageSubscription?: Subscription;
  private currentUsername: string | null = null;
  private currentUserId: number | null = null;
  notificationCount = 0;
  
  // Event listeners for chat notifications
  private chatReadListener = () => this.checkChatNotifications();
  private chatMessageReceivedListener = () => this.checkChatNotifications();

  constructor(
    private router: Router,
    private keycloakService: KeycloakService,
    private requestService: RequestService,
    private chatService: ChatService,
    private chatWsService: ChatWebSocketService
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

    // Listen for chat events to refresh notifications
    window.addEventListener('chat-read', this.chatReadListener);
    window.addEventListener('chat-message-received', this.chatMessageReceivedListener);

    // Check user authentication status
    await this.checkUserStatus();
  }

  ngOnDestroy() {
    
    // Remove chat event listeners
    window.removeEventListener('chat-read', this.chatReadListener);
    window.removeEventListener('chat-message-received', this.chatMessageReceivedListener);
    this.routerSubscription?.unsubscribe();
    this.keycloakSubscription?.unsubscribe();
    this.notificationSubscription?.unsubscribe();
    this.chatNotificationSubscription?.unsubscribe();
    this.wsMessageSubscription?.unsubscribe();
  }

  async checkUserStatus() {
    try {
      const user = await this.keycloakService.getCurrentUser();

      if (user && user !== 'guest' && user !== 'Gast-Modus') {
        this.currentUser = user;
        this.currentUsername = user;
        this.currentUserState = user === 'Admin' ? 'admin' : 'user';

        // Resolve user ID for WebSocket connection
        await this.resolveUserId();

        // Check for inbox and chat notifications if logged in
        await this.checkInboxNotifications();
        await this.checkChatNotifications();
        this.startNotificationPolling();
        this.startChatNotificationPolling();
        this.setupWebSocketListener();
      } else {
        this.currentUser = null;
        this.currentUsername = null;
        this.currentUserState = 'guest';
        this.stopNotificationPolling();
        this.stopChatNotificationPolling();
        this.wsMessageSubscription?.unsubscribe();
      }
    } catch (error) {
      console.error('Error checking user status:', error);
      this.currentUser = null;
      this.currentUsername = null;
      this.currentUserState = 'guest';
    }
  }

  private async resolveUserId() {
    if (this.currentUserId || !this.currentUsername) return;
    try {
      const users = await this.chatService.getAllUsers(false).toPromise();
      const me = users?.find(u => u.name === this.currentUsername);
      if (me) this.currentUserId = me.id;
    } catch {
      // Will retry on next poll
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
      
      const seenAcceptedStr = localStorage.getItem('seenAcceptedRequests');
      const seenAccepted: Record<string, boolean> = seenAcceptedStr ? JSON.parse(seenAcceptedStr) : {};

      let inboxCount = 0;
      let chatNotificationCount = 0;

      // Count unseen PENDING received requests (for inbox)
      if (received) {
        received.forEach((req: any) => {
          if (req.status === 'PENDING' && !seenReceived[req.id]) {
            inboxCount++;
          }
        });
      }

      // Count unseen ACCEPTED received requests (for chat badge)
      if (received) {
        received.forEach((req: any) => {
          if (req.status === 'ACCEPTED' && !seenAccepted[req.id]) {
            chatNotificationCount++;
          }
        });
      }

      // Count unseen REJECTED sent requests (for inbox)
      // Count unseen ACCEPTED sent requests (for chat badge - sender side)
      if (sent) {
        const seenSentStr = localStorage.getItem('seenSentRequests');
        const seenSent: Record<string, string> = seenSentStr ? JSON.parse(seenSentStr) : {};
        sent.forEach((req: any) => {
          if (req.status === 'REJECTED' && seenSent[req.id] !== req.status) {
            inboxCount++;
          }
          if (req.status === 'ACCEPTED' && !seenAccepted[req.id]) {
            chatNotificationCount++;
          }
        });
      }

      this.notificationCount = inboxCount;
      this.hasInboxNotification = inboxCount > 0;
      
      // Update chat notification for accepted requests
      // This will be ADDED to chat message notifications
      this.updateChatNotificationForAcceptedRequests(chatNotificationCount);
    } catch (error) {
      console.error('Error checking inbox notifications:', error);
      this.hasInboxNotification = false;
      this.notificationCount = 0;
    }
  }

  private acceptedRequestNotificationCount = 0;

  private updateChatNotificationForAcceptedRequests(count: number) {
    this.acceptedRequestNotificationCount = count;
    // Combine with existing chat notifications
    this.updateChatBadgeDisplay();
  }

  private startNotificationPolling() {
    this.stopNotificationPolling();
    // Poll every 5 seconds for inbox notification changes
    this.notificationSubscription = interval(5000).subscribe(() => {
      this.checkInboxNotifications();
    });
  }

  private stopNotificationPolling() {
    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
      this.notificationSubscription = undefined;
    }
  }

  async checkChatNotifications() {
    if (!this.currentUsername) {
      this.hasChatNotification = false;
      this.chatNotificationCount = 0;
      this.updateChatBadgeDisplay();
      return;
    }

    try {
      // Get all users to find chats - use cached data for speed
      const users = await this.chatService.getAllUsers(false).toPromise();
      const currentUser = users?.find(u => u.name === this.currentUsername);
      
      if (!currentUser) {
        this.hasChatNotification = false;
        this.chatNotificationCount = 0;
        this.updateChatBadgeDisplay();
        return;
      }

      const currentUserId = currentUser.id;
      
      // Get last read timestamps from localStorage
      const readTimestampsStr = localStorage.getItem('chatReadTimestamps');
      const readTimestamps: Record<string | number, string> = readTimestampsStr ? JSON.parse(readTimestampsStr) : {};

      let unreadCount = 0;

      // Check each other user for unread messages - use cached data
      const otherUsers = users?.filter(u => u.name !== this.currentUsername) || [];
      
      for (const otherUser of otherUsers) {
        try {
          const messages = await this.chatService.getMessagesForChat(currentUserId, otherUser.id, false).toPromise();
          
          if (messages && messages.length > 0) {
            const lastReadTime = readTimestamps[otherUser.id];
            
            if (!lastReadTime) {
              // Never read this chat - count all messages from other user
              const unreadInChat = messages.filter(m => m.sender?.id !== currentUserId).length;
              unreadCount += unreadInChat;
            } else {
              // Count messages after last read time from other user
              const lastReadTimestamp = new Date(lastReadTime).getTime();
              const unreadInChat = messages.filter(m => {
                if (m.sender?.id === currentUserId) return false;
                const msgTime = new Date(m.time).getTime();
                return msgTime > lastReadTimestamp;
              }).length;
              unreadCount += unreadInChat;
            }
          }
        } catch (err) {
          // Ignore errors for individual chats
        }
      }

      this.chatNotificationCount = unreadCount;
      this.updateChatBadgeDisplay();
    } catch (error) {
      console.error('Error checking chat notifications:', error);
      this.hasChatNotification = false;
      this.chatNotificationCount = 0;
      this.updateChatBadgeDisplay();
    }
  }

  private updateChatBadgeDisplay() {
    // Don't show red dot while user is on the chats page
    if (this.currentPage === 'chats') {
      this.hasChatNotification = false;
      return;
    }
    // Combine unread chat messages + accepted request notifications
    const totalChatNotifications = this.chatNotificationCount + this.acceptedRequestNotificationCount;
    this.hasChatNotification = totalChatNotifications > 0;
  }

  private startChatNotificationPolling() {
    this.stopChatNotificationPolling();
    // Poll every 10 seconds as fallback (WebSocket provides instant updates)
    this.chatNotificationSubscription = interval(10000).subscribe(() => {
      this.checkChatNotifications();
    });
  }

  private stopChatNotificationPolling() {
    if (this.chatNotificationSubscription) {
      this.chatNotificationSubscription.unsubscribe();
      this.chatNotificationSubscription = undefined;
    }
  }

  /**
   * Subscribe to WebSocket messages for instant chat notifications
   */
  private setupWebSocketListener() {
    if (!this.currentUserId) return;

    // Ensure WebSocket is connected (may already be connected by chat component)
    this.chatWsService.connect(this.currentUserId);

    // Unsubscribe previous
    this.wsMessageSubscription?.unsubscribe();

    this.wsMessageSubscription = this.chatWsService.getMessages().subscribe(message => {
      // A message arrived via WebSocket - if it's from someone else, show red dot instantly
      // But not if user is already on the chats page
      if (message.sender?.id !== this.currentUserId && this.currentPage !== 'chats') {
        this.hasChatNotification = true;
      }
    });
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
    if (route === 'chats') {
      this.hasChatNotification = false;
      this.chatNotificationCount = 0;
    }
    this.router.navigate(['/' + route]);
  }

  navigateToHome() {
    this.router.navigate(['/']);
  }
}
