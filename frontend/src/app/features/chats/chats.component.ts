import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  HostBinding,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../core/services/chat.service';
import { AppointmentService } from '../../core/services/appointment.service';
import { Chat, ChatMessage, ChatUser } from '../../core/models/chat.model';
import { Appointment, AppointmentCreate } from '../../core/models/appointment.model';
import { Subscription, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { ChatWebSocketService, ConnectionState } from '../../core/services/chat-websocket.service';
import { ActiveServiceService } from '../../core/services/active-service.service';
import { ActiveService } from '../../core/models/service.model';

@Component({
  selector: 'app-chats',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chats.component.html',
  styleUrl: './chats.component.css',
})
export class ChatsComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer?: ElementRef;

  chats: Chat[] = [];
  filteredChats: Chat[] = [];
  messages: ChatMessage[] = [];

  currentUser: string | null = null;
  currentUserId: number | null = null;
  currentChatId: string | number | null = null;
  currentChatTitle = '';
  selectedChat: Chat | null = null;

  searchTerm = '';
  newChatSearchTerm = '';
  showNewChatSearch = false;
  showNewChatModal = false;
  allUsers: ChatUser[] = [];
  foundUsers: ChatUser[] = [];

  messageText = '';
  loading = true;
  submitting = false;

  // Appointment Modal
  showAppointmentModal = false;
  appointmentTitle = '';
  appointmentDate = '';
  appointmentStartTime = '';
  appointmentEndTime = '';
  appointmentLocation = '';
  appointmentNotes = '';
  creatingAppointment = false;

  // Track appointment statuses
  appointmentStatuses: Map<number, string> = new Map();

  // WebSocket state
  wsConnectionState: ConnectionState = ConnectionState.DISCONNECTED;
  
  private wsMessageSubscription?: Subscription;
  private wsStateSubscription?: Subscription;
  private shouldScrollToBottom = false;
  private viewportHandler = () => this.updateViewportHeight();
  private userLoggedInHandler = async () => {
    console.log('🔄 User logged in, reloading chats...');
    await this.loadActiveUser();
  };

  private chatMessageReceivedHandler = () => {
    console.log('🔄 chat-message-received event, reloading chats...');
    this.loadChats();
  };

  constructor(
    private chatService: ChatService,
    private appointmentService: AppointmentService,
    private chatWsService: ChatWebSocketService,
    private activeServiceService: ActiveServiceService
  ) {}

  ngOnInit() {
    // Set up dynamic viewport height for mobile (avoids URL bar overlap)
    this.updateViewportHeight();
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', this.viewportHandler);
      window.visualViewport.addEventListener('scroll', this.viewportHandler);
    }
    window.addEventListener('resize', this.viewportHandler);

    // Initial setup - WebSocket is connected inside loadChats() after currentUserId is known
    this.loadActiveUser();

    // Reload data after login
    window.addEventListener('user-logged-in', this.userLoggedInHandler);

    // Reload chats when a new system message is created (e.g. request accepted)
    window.addEventListener('chat-message-received', this.chatMessageReceivedHandler);
  }

  ngOnDestroy() {
    // Clean up viewport listeners
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', this.viewportHandler);
      window.visualViewport.removeEventListener('scroll', this.viewportHandler);
    }
    window.removeEventListener('resize', this.viewportHandler);
    window.removeEventListener('user-logged-in', this.userLoggedInHandler);
    window.removeEventListener('chat-message-received', this.chatMessageReceivedHandler);

    // Clean up WebSocket subscriptions
    if (this.wsMessageSubscription) {
      this.wsMessageSubscription.unsubscribe();
    }
    if (this.wsStateSubscription) {
      this.wsStateSubscription.unsubscribe();
    }
    // Disconnect WebSocket
    this.chatWsService.disconnect();
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  async loadActiveUser() {
    try {
      this.chatService.getCurrentUser().subscribe({
        next: (username) => {
          if (username && username.trim() !== '' && username !== 'Gast-Modus') {
            this.currentUser = username;
            this.loadChats();
          } else {
            this.loading = false;
          }
        },
        error: () => {
          this.loading = false;
        },
      });
    } catch (err) {
      this.loading = false;
    }
  }

  async loadChats() {
    if (!this.currentUser) return;

    // Force fresh data on load
    this.chatService.getAllUsers(true).subscribe({
      next: (users) => {
        this.allUsers = users;
        const currentUserObj = users.find((u) => u.name === this.currentUser);
        if (currentUserObj) {
          this.currentUserId = currentUserObj.id;
          // Connect WebSocket now that we have the user ID
          this.setupWebSocket();
        }
        
        const filteredUsers = users.filter((u) => u.name !== this.currentUser);
        
        if (!this.currentUserId || filteredUsers.length === 0) {
          this.chats = [];
          this.filteredChats = [];
          this.loading = false;
          return;
        }

        // PARALLEL LOADING with fresh data
        const chatObservables = filteredUsers.map((user) =>
          this.chatService
            .getMessagesForChat(this.currentUserId!, user.id, true)
            .pipe(
              map((messages) => {
                if (!messages || messages.length === 0) {
                  return null;
                }

                const lastMsg = messages[messages.length - 1];
                let lastMessage = lastMsg.message || 'Nachricht';
                lastMessage =
                  lastMessage.length > 50
                    ? lastMessage.substring(0, 50) + '...'
                    : lastMessage;
                let lastUpdate = lastMsg.time || new Date().toISOString();

                const userName =
                  typeof user.name === 'object'
                    ? (user.name as any).username || String(user.name)
                    : user.name;

                const newChat: Chat = {
                  id: user.id,
                  user1Username: this.currentUser || '',
                  user2Username: userName,
                  lastMessage: lastMessage,
                  lastUpdate: lastUpdate,
                  isAdmin: userName.toLowerCase() === 'admin',
                  isPinned: userName.toLowerCase() === 'admin',
                  unreadCount: this.calculateUnreadCount(
                    {
                      id: user.id,
                      user1Username: this.currentUser || '',
                      user2Username: userName,
                      lastMessage,
                      lastUpdate,
                      isAdmin: userName.toLowerCase() === 'admin',
                      isPinned: userName.toLowerCase() === 'admin',
                      unreadCount: 0,
                    },
                    messages
                  ),
                };

                return newChat;
              })
            )
        );

        // Execute all requests in parallel with cached data
        forkJoin(chatObservables).subscribe({
          next: (allChats) => {
            this.chats = allChats.filter((chat) => chat !== null) as Chat[];
            this.sortChats();
            this.filteredChats = [...this.chats];
            this.loading = false;
            console.log('✅ Chats loaded INSTANTLY (cached):', this.chats.length);
          },
          error: (err) => {
            console.error('Fehler beim Laden der Chats:', err);
            this.loading = false;
          },
        });
      },
      error: (err) => {
        console.error('Fehler beim Laden der Chats:', err);
        this.loading = false;
      },
    });
  }

  openNewChatModal() {
    this.showNewChatModal = true;
    this.newChatSearchTerm = '';
    this.foundUsers = [];
    // Focus input after a short delay to allow rendering
    setTimeout(() => {
      const input = document.getElementById('newChatInput');
      if (input) input.focus();
    }, 100);
  }

  closeNewChatModal() {
    this.showNewChatModal = false;
    this.newChatSearchTerm = '';
    this.foundUsers = [];
  }

  searchNewUsers() {
    if (!this.newChatSearchTerm.trim()) {
      this.foundUsers = [];
      return;
    }

    const term = this.newChatSearchTerm.toLowerCase();
    this.foundUsers = this.allUsers.filter(user => {
      const userName = typeof user.name === 'object'
        ? (user.name as any).username || String(user.name)
        : user.name;
      
      // Filter out current user and users already in chat list
      const isCurrentUser = userName === this.currentUser;
      const alreadyInChat = this.chats.some(chat => chat.id === user.id);
      
      return !isCurrentUser && !alreadyInChat && userName.toLowerCase().includes(term);
    });
  }

  startNewChat(user: ChatUser) {
    const userName = typeof user.name === 'object'
      ? (user.name as any).username || String(user.name)
      : user.name;

    // Check if chat already exists (shouldn't happen due to filter, but safety check)
    let chat = this.chats.find(c => c.id === user.id);

    if (!chat) {
      // Create new temporary chat object
      chat = {
        id: user.id,
        user1Username: this.currentUser || '',
        user2Username: userName,
        lastMessage: 'Neue Unterhaltung starten',
        lastUpdate: new Date().toISOString(),
        isAdmin: userName.toLowerCase() === 'admin',
        isPinned: false
      };
      this.chats.unshift(chat);
      this.filteredChats = [...this.chats];
    }

    this.selectChat(chat);
    this.closeNewChatModal();
  }

  sortChats() {
    this.chats.sort((a, b) => {
      // Admin/Pinned zuerst
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      // Dann nach Aktivität
      return (
        new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime()
      );
    });
  }

  selectChat(chat: Chat) {
    this.currentChatId = chat.id;
    this.selectedChat = chat;
    this.currentChatTitle = `Chat mit ${chat.user2Username}`;
    
    // Mark messages as read
    this.markChatAsRead(chat);
    
    this.loadMessagesForChat(chat.id);
  }

  /**
   * Close mobile chat view and return to list
   */
  closeMobileChat() {
    // On mobile, clear selection to show list again
    if (window.innerWidth < 768) {
      this.selectedChat = null;
      this.currentChatId = null;
      this.messages = [];
    }
  }

  private markChatAsRead(chat: Chat) {
    // Clear unread count
    chat.unreadCount = 0;
    
    // Store last read timestamp in localStorage
    const readTimestamps = this.getReadTimestamps();
    readTimestamps[chat.id] = new Date().toISOString();
    localStorage.setItem('chatReadTimestamps', JSON.stringify(readTimestamps));
    
    // Notify navbar to refresh chat notifications
    window.dispatchEvent(new Event('chat-read'));
  }

  private getReadTimestamps(): Record<string | number, string> {
    const stored = localStorage.getItem('chatReadTimestamps');
    return stored ? JSON.parse(stored) : {};
  }

  private calculateUnreadCount(chat: Chat, messages: ChatMessage[]): number {
    const readTimestamps = this.getReadTimestamps();
    const lastRead = readTimestamps[chat.id];
    
    if (!lastRead) {
      // Never opened this chat - initialize read timestamp to now so it doesn't appear unread
      // Only new messages arriving AFTER this point will be marked unread
      readTimestamps[chat.id] = new Date().toISOString();
      localStorage.setItem('chatReadTimestamps', JSON.stringify(readTimestamps));
      return 0;
    }
    
    const lastReadTime = new Date(lastRead).getTime();
    return messages.filter(m => {
      if (m.sender?.name === this.currentUser) return false;
      const msgTime = new Date(m.time).getTime();
      return msgTime > lastReadTime;
    }).length;
  }

  async loadMessagesForChat(chatId: string | number) {
    if (!this.currentUserId) return;

    // Always load fresh messages when selecting a chat
    this.chatService
      .getMessagesForChat(this.currentUserId, Number(chatId), true)
      .subscribe({
        next: (messages) => {
          this.messages = messages;
          this.shouldScrollToBottom = true;

          // Load appointment statuses for appointment messages
          this.loadAppointmentStatuses(messages);

          // Update chat object
          const chat = this.chats.find((c) => c.id === chatId);
          if (chat && messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            const lastMessage = lastMsg.message || 'Nachricht';
            chat.lastMessage =
              lastMessage.length > 50
                ? lastMessage.substring(0, 50) + '...'
                : lastMessage;
            chat.lastUpdate = lastMsg.time || new Date().toISOString();

            this.sortChats();
            this.filterChats();
          }
        },
        error: () => {
          this.messages = [];
        },
      });
  }

  loadAppointmentStatuses(messages: ChatMessage[]) {
    // Find all appointment messages and load their statuses
    for (const msg of messages) {
      if (this.isAppointmentMessage(msg)) {
        const appointmentId = this.getAppointmentId(msg);
        if (appointmentId && !this.appointmentStatuses.has(appointmentId)) {
          this.appointmentService.getAppointmentDetail(appointmentId).subscribe({
            next: (appointment) => {
              this.appointmentStatuses.set(appointmentId, appointment.status);
            },
            error: () => {
              // If appointment not found, assume it's still pending
              this.appointmentStatuses.set(appointmentId, 'PENDING');
            }
          });
        }
      }
    }
  }

  getAppointmentStatus(appointmentId: number): string {
    return this.appointmentStatuses.get(appointmentId) || 'PENDING';
  }

  sendMessage(event?: Event) {
    if (event) {
      event.preventDefault();
    }

    if (
      !this.messageText.trim() ||
      !this.currentUserId ||
      !this.currentChatId
    ) {
      return;
    }

    this.submitting = true;
    const messageToSend = this.messageText.trim();
    this.messageText = '';

    // Create message object
    const message: ChatMessage = {
      sender: { id: this.currentUserId, name: this.currentUser || '' },
      receiver: { id: Number(this.currentChatId), name: this.selectedChat?.user2Username || '' },
      message: messageToSend,
      time: new Date().toISOString()
    };

    // Try to send via WebSocket first (real-time)
    if (this.chatWsService.isConnected()) {
      try {
        this.chatWsService.sendMessage(message);
        
        // Optimistic UI update
        this.messages.push(message);
        this.shouldScrollToBottom = true;
        this.submitting = false;

        // Update chat list
        this.updateChatInList(messageToSend);
      } catch (error) {
        console.error('WebSocket send failed, falling back to HTTP:', error);
        // Fallback to HTTP
        this.sendMessageViaHttp(messageToSend);
      }
    } else {
      // WebSocket not connected, use HTTP
      console.log('WebSocket not connected, using HTTP fallback');
      this.sendMessageViaHttp(messageToSend);
    }
  }

  private sendMessageViaHttp(messageToSend: string): void {
    this.chatService
      .sendMessage(
        this.currentUserId!,
        Number(this.currentChatId),
        messageToSend
      )
      .subscribe({
        next: (sentMessage) => {
          this.messages.push(sentMessage);
          this.shouldScrollToBottom = true;
          this.submitting = false;

          // Update chat list
          this.updateChatInList(messageToSend);
        },
        error: (err) => {
          console.error('Fehler beim Senden:', err);
          this.submitting = false;
          alert('Fehler beim Senden der Nachricht');
        },
      });
  }

  private updateChatInList(messageToSend: string): void {
    const chat = this.chats.find((c) => c.id === this.currentChatId);
    if (chat) {
      chat.lastMessage =
        messageToSend.length > 50
          ? messageToSend.substring(0, 50) + '...'
          : messageToSend;
      chat.lastUpdate = new Date().toISOString();

      this.sortChats();
      this.filterChats();
    }
  }

  filterChats() {
    if (!this.searchTerm.trim()) {
      this.filteredChats = [...this.chats];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredChats = this.chats.filter((chat) =>
        chat.user2Username.toLowerCase().includes(term)
      );
    }
  }

  startPeriodicUpdates() {
    // No longer needed - WebSocket provides real-time updates
    // Keep method for compatibility but don't poll
    console.log('Using WebSocket for real-time updates, polling disabled');
  }

  async updateChats() {
    // No longer needed - WebSocket provides real-time updates
    // Keep method for compatibility
  }

  // WebSocket setup and handlers
  private setupWebSocket(): void {
    if (!this.currentUserId) {
      console.log('Cannot setup WebSocket: no user ID');
      return;
    }

    console.log('🔌 Setting up WebSocket connection...');

    // Subscribe to connection state changes
    this.wsStateSubscription = this.chatWsService.getConnectionState().subscribe(state => {
      this.wsConnectionState = state;
      console.log(`WebSocket state: ${state}`);
    });

    // Subscribe to incoming messages
    this.wsMessageSubscription = this.chatWsService.getMessages().subscribe(message => {
      this.handleIncomingWebSocketMessage(message);
    });

    // Connect to WebSocket
    this.chatWsService.connect(this.currentUserId);
  }

  private handleIncomingWebSocketMessage(message: ChatMessage): void {
    console.log('📩 Received WebSocket message:', message);

    const isFromMe = message.sender?.id === this.currentUserId;

    if (isFromMe) {
      // Echo of our own sent message from the server (now with real ID/timestamp)
      // Replace the optimistic message we already added
      const optimisticIdx = this.messages.findIndex(m =>
        !m.id && m.message === message.message && m.sender?.id === this.currentUserId
      );
      if (optimisticIdx !== -1) {
        this.messages[optimisticIdx] = message;
      }
      // Update chat list preview and return - no notification needed for own messages
      this.updateChatListFromMessage(message);
      return;
    }

    // Message from another user
    const isForCurrentChat = this.currentChatId &&
      message.sender?.id === Number(this.currentChatId);

    if (isForCurrentChat) {
      // Deduplicate by ID
      const isDuplicate = this.messages.some(m =>
        m.id && message.id && m.id === message.id
      );
      if (!isDuplicate) {
        this.messages.push(message);
        this.shouldScrollToBottom = true;
        // Mark as read since chat is open
        if (this.selectedChat) {
          this.markChatAsRead(this.selectedChat);
        }
      }
    }

    // Update chat list preview
    this.updateChatListFromMessage(message);

    // Notify navbar to refresh chat notifications
    window.dispatchEvent(new Event('chat-message-received'));
  }

  private updateChatListFromMessage(message: ChatMessage): void {
    // Find which chat this message belongs to
    const otherUserId = message.sender?.id === this.currentUserId 
      ? message.receiver?.id 
      : message.sender?.id;

    if (!otherUserId) return;

    const chat = this.chats.find(c => c.id === otherUserId);
    if (chat) {
      const preview = message.message.length > 50 
        ? message.message.substring(0, 50) + '...' 
        : message.message;
      
      chat.lastMessage = preview;
      chat.lastUpdate = message.time;

      // Increment unread count if message is from other user and chat is not active
      if (message.sender?.id !== this.currentUserId && this.currentChatId !== otherUserId) {
        chat.unreadCount = (chat.unreadCount || 0) + 1;
      }

      this.sortChats();
      this.filterChats();
    } else if (otherUserId) {
      // New chat from unknown user - reload chat list to include it
      this.loadChats();
    }
  }

  // Template helper methods
  get adminChats(): Chat[] {
    return this.filteredChats.filter((c) => c.isAdmin || c.isPinned);
  }

  get activeChats(): Chat[] {
    return this.filteredChats.filter(
      (c) =>
        !c.isAdmin &&
        !c.isPinned &&
        c.lastMessage !== 'Neue Unterhaltung starten'
    );
  }

  get newChats(): Chat[] {
    return this.filteredChats.filter(
      (c) =>
        !c.isAdmin &&
        !c.isPinned &&
        c.lastMessage === 'Neue Unterhaltung starten'
    );
  }

  getInitial(username: any): string {
    if (!username) return '?';
    const name = typeof username === 'object' ? (username.username || username.name || '') : username;
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  hasMessages(chat: Chat): boolean {
    return chat.lastMessage !== 'Neue Unterhaltung starten';
  }

  formatTime(dateString: string): string {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      return `${diffDays}d`;
    } else if (diffHours > 0) {
      return `${diffHours}h`;
    } else {
      return 'jetzt';
    }
  }

  formatDateTime(dateString: string): string {
    if (!dateString) return '';

    const date = new Date(dateString);
    return date.toLocaleString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  isCurrentUser(message: ChatMessage): boolean {
    // Prefer ID check if available
    if (this.currentUserId && message.sender?.id) {
      return Number(message.sender.id) === Number(this.currentUserId);
    }
    return message.sender?.name === this.currentUser;
  }

  isSystemMessage(message: ChatMessage): boolean {
    return !!message.message && message.message.startsWith('<<<SYSTEM>>>');
  }

  isAppointmentMessage(message: ChatMessage): boolean {
    return !!message.message && message.message.startsWith('<<<APPOINTMENT:');
  }

  getAppointmentId(message: ChatMessage): number | null {
    if (!message.message) return null;
    const match = message.message.match(/<<<APPOINTMENT:(\d+)>>>/);
    return match ? parseInt(match[1], 10) : null;
  }

  getAppointmentContent(message: ChatMessage): string {
    if (!message.message) return '';
    return message.message.replace(/<<<APPOINTMENT:\d+>>>/, '').trim();
  }

  getSystemMessageContent(message: ChatMessage): string {
    return message.message ? message.message.replace('<<<SYSTEM>>>', '').trim() : '';
  }

  // Appointment Modal Functions
  openAppointmentModal() {
    if (!this.selectedChat) return;
    
    this.showAppointmentModal = true;
    this.appointmentTitle = 'Nachhilfetermin';
    this.appointmentDate = '';
    this.appointmentStartTime = '';
    this.appointmentEndTime = '';
    this.appointmentLocation = 'Online';
    this.appointmentNotes = '';
    
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.appointmentDate = tomorrow.toISOString().split('T')[0];
    
    // Set default times
    this.appointmentStartTime = '14:00';
    this.appointmentEndTime = '15:00';

    // Prefill title with subject name if there's an active service between users
    if (this.currentUser) {
      this.activeServiceService.getMyServices(this.currentUser).subscribe({
        next: (services: ActiveService[]) => {
          const partnerUsername = this.selectedChat?.user2Username;
          const shared = services.find(s =>
            s.status === 'ACTIVE' &&
            (s.providerName === partnerUsername || s.clientName === partnerUsername)
          );
          if (shared?.serviceTypeName) {
            this.appointmentTitle = shared.serviceTypeName + ' - Nachhilfetermin';
          }
        },
        error: () => { /* keep default title */ }
      });
    }
  }

  closeAppointmentModal() {
    this.showAppointmentModal = false;
  }

  createAppointment() {
    if (!this.selectedChat || !this.currentUser) return;
    
    if (!this.appointmentDate || !this.appointmentStartTime || !this.appointmentEndTime) {
      alert('Bitte fülle alle Pflichtfelder aus');
      return;
    }

    this.creatingAppointment = true;

    const startDateTime = `${this.appointmentDate}T${this.appointmentStartTime}:00`;
    const endDateTime = `${this.appointmentDate}T${this.appointmentEndTime}:00`;

    const appointment: AppointmentCreate = {
      proposerUsername: this.currentUser,
      recipientUsername: this.selectedChat.user2Username,
      title: this.appointmentTitle || 'Nachhilfetermin',
      startTime: startDateTime,
      endTime: endDateTime,
      location: this.appointmentLocation,
      notes: this.appointmentNotes
    };

    this.appointmentService.createAppointment(appointment).subscribe({
      next: () => {
        this.creatingAppointment = false;
        this.closeAppointmentModal();
        // Reload messages to show the appointment
        if (this.currentChatId) {
          this.loadMessagesForChat(this.currentChatId);
        }
      },
      error: (err) => {
        this.creatingAppointment = false;
        console.error('Error creating appointment:', err);
        if (err.status === 409) {
          alert('Terminkonflikt: Ein Teilnehmer hat zu dieser Zeit bereits einen Termin.');
        } else {
          alert('Fehler beim Erstellen des Termins');
        }
      }
    });
  }

  confirmAppointment(appointmentId: number) {
    this.appointmentService.confirmAppointment(appointmentId).subscribe({
      next: () => {
        // Update status in local map immediately
        this.appointmentStatuses.set(appointmentId, 'CONFIRMED');
        if (this.currentChatId) {
          this.loadMessagesForChat(this.currentChatId);
        }
      },
      error: (err) => {
        console.error('Error confirming:', err);
        alert('Fehler beim Bestätigen des Termins');
      }
    });
  }

  rejectAppointment(appointmentId: number) {
    this.appointmentService.rejectAppointment(appointmentId).subscribe({
      next: () => {
        // Update status in local map immediately
        this.appointmentStatuses.set(appointmentId, 'REJECTED');
        if (this.currentChatId) {
          this.loadMessagesForChat(this.currentChatId);
        }
      },
      error: (err) => {
        console.error('Error rejecting:', err);
        alert('Fehler beim Ablehnen des Termins');
      }
    });
  }

  getMessageAge(message: ChatMessage): number {
    if (!message.time) return 10000;
    return Date.now() - new Date(message.time).getTime();
  }

  // TrackBy functions for performance (prevent duplicate DOM rendering)
  trackByChatId(index: number, chat: Chat): string | number {
    return chat.id;
  }

  trackByMessageId(index: number, message: ChatMessage): string | number {
    return message.id || `${message.time}-${message.message}`;
  }

  private scrollToBottom() {
    if (this.messagesContainer) {
      try {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      } catch (err) {
        // Ignore scroll errors
      }
    }
  }

  private updateViewportHeight() {
    const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--app-vh', `${vh}px`);
  }
}
