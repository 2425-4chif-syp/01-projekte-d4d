import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../core/services/chat.service';
import { AppointmentService } from '../../core/services/appointment.service';
import { Chat, ChatMessage, ChatUser } from '../../core/models/chat.model';
import { Appointment, AppointmentCreate } from '../../core/models/appointment.model';
import { interval, Subscription } from 'rxjs';

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

  private updateSubscription?: Subscription;
  private shouldScrollToBottom = false;

  constructor(
    private chatService: ChatService,
    private appointmentService: AppointmentService
  ) {}

  async ngOnInit() {
    await this.loadActiveUser();
    this.startPeriodicUpdates();

    // Reload data after login
    window.addEventListener('user-logged-in', async () => {
      console.log('🔄 User logged in, reloading chats...');
      await this.loadActiveUser();
      this.startPeriodicUpdates();
    });
  }

  ngOnDestroy() {
    if (this.updateSubscription) {
      this.updateSubscription.unsubscribe();
    }
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

    try {
      this.chatService.getAllUsers().subscribe({
        next: async (users) => {
          this.allUsers = users; // Store all users for search
          const currentUserObj = users.find((u) => u.name === this.currentUser);
          if (currentUserObj) {
            this.currentUserId = currentUserObj.id;
          }

          const filteredUsers = users.filter(
            (u) => u.name !== this.currentUser
          );
          this.chats = [];

          // Lade Chat-Informationen für alle Benutzer
          for (const user of filteredUsers) {
            if (this.currentUserId) {
              try {
                const messages = await this.chatService
                  .getMessagesForChat(this.currentUserId, user.id)
                  .toPromise();

                if (messages && messages.length > 0) {
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

                  this.chats.push({
                    id: user.id,
                    user1Username: this.currentUser || '',
                    user2Username: userName,
                    lastMessage: lastMessage,
                    lastUpdate: lastUpdate,
                    isAdmin: userName.toLowerCase() === 'admin',
                    isPinned: userName.toLowerCase() === 'admin',
                  });
                }
              } catch (err) {
                // Ignore errors, just don't add the chat
              }
            }
          }

          this.sortChats();
          this.filteredChats = [...this.chats];
          this.loading = false;
        },
        error: (err) => {
          console.error('Fehler beim Laden der Chats:', err);
          this.loading = false;
        },
      });
    } catch (err) {
      console.error('Fehler:', err);
      this.loading = false;
    }
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
    this.loadMessagesForChat(chat.id);
  }

  async loadMessagesForChat(chatId: string | number) {
    if (!this.currentUserId) return;

    try {
      this.chatService
        .getMessagesForChat(this.currentUserId, Number(chatId))
        .subscribe({
          next: (messages) => {
            this.messages = messages;
            this.shouldScrollToBottom = true;

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
    } catch (err) {
      this.messages = [];
    }
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

    this.chatService
      .sendMessage(
        this.currentUserId,
        Number(this.currentChatId),
        messageToSend
      )
      .subscribe({
        next: (sentMessage) => {
          this.messages.push(sentMessage);
          this.shouldScrollToBottom = true;
          this.submitting = false;

          // Update chat list
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
        },
        error: (err) => {
          console.error('Fehler beim Senden:', err);
          this.submitting = false;
          alert('Fehler beim Senden der Nachricht');
        },
      });
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
    this.updateSubscription = interval(10000).subscribe(() => {
      if (this.currentUser && this.currentUserId) {
        this.updateChats();
      }
    });
  }

  async updateChats() {
    if (!this.currentUserId) return;

    // Update nur für aktive Chats mit Nachrichten
    const activeChats = this.chats.filter(
      (chat) => chat.lastMessage !== 'Neue Unterhaltung starten'
    );

    for (const chat of activeChats) {
      try {
        const messages = await this.chatService
          .getMessagesForChat(this.currentUserId, Number(chat.id))
          .toPromise();

        if (messages && messages.length > 0) {
          const lastMsg = messages[messages.length - 1];
          const newLastUpdate = lastMsg.time || new Date().toISOString();

          if (chat.lastUpdate !== newLastUpdate) {
            chat.lastMessage =
              lastMsg.message.length > 50
                ? lastMsg.message.substring(0, 50) + '...'
                : lastMsg.message;
            chat.lastUpdate = newLastUpdate;

            // Wenn aktuell geöffneter Chat, aktualisiere Nachrichten
            if (this.currentChatId === chat.id) {
              this.messages = messages;
              this.shouldScrollToBottom = true;
            }
          }
        }
      } catch (err) {
        // Ignoriere Fehler bei Updates
      }
    }

    this.sortChats();
    this.filterChats();
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
}
