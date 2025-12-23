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
import { Chat, ChatMessage, ChatUser } from '../../core/models/chat.model';
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

  searchTerm = '';
  messageText = '';
  loading = true;
  submitting = false;

  private updateSubscription?: Subscription;
  private shouldScrollToBottom = false;

  constructor(private chatService: ChatService) {}

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

                let lastMessage = 'Neue Unterhaltung starten';
                let lastUpdate = new Date().toISOString();

                if (messages && messages.length > 0) {
                  const lastMsg = messages[messages.length - 1];
                  lastMessage = lastMsg.message || 'Nachricht';
                  lastMessage =
                    lastMessage.length > 50
                      ? lastMessage.substring(0, 50) + '...'
                      : lastMessage;
                  lastUpdate = lastMsg.time || new Date().toISOString();
                }

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
              } catch (err) {
                const userName =
                  typeof user.name === 'object'
                    ? (user.name as any).username || String(user.name)
                    : user.name;

                this.chats.push({
                  id: user.id,
                  user1Username: this.currentUser || '',
                  user2Username: userName,
                  lastMessage: 'Neue Unterhaltung starten',
                  lastUpdate: new Date().toISOString(),
                  isAdmin: userName.toLowerCase() === 'admin',
                  isPinned: userName.toLowerCase() === 'admin',
                });
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

  sendMessage(event: Event) {
    event.preventDefault();

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

  getInitial(username: string): string {
    return username ? username.charAt(0).toUpperCase() : '?';
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
    return message.sender?.name === this.currentUser;
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
