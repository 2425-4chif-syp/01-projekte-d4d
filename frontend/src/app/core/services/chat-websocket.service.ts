import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, timer } from 'rxjs';
import { ConfigService } from './config.service';
import { ChatMessage } from '../models/chat.model';

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR'
}

@Injectable({
  providedIn: 'root'
})
export class ChatWebSocketService {
  private socket: WebSocket | null = null;
  private userId: number | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private reconnectTimeout: any = null;
  private heartbeatInterval: any = null;

  // Reference counting: track how many components are actively using the connection
  private activeConsumers = 0;

  // State management
  private connectionState$ = new BehaviorSubject<ConnectionState>(ConnectionState.DISCONNECTED);
  private messages$ = new Subject<ChatMessage>();
  private errors$ = new Subject<Error>();

  // Message deduplication
  private receivedMessageIds = new Set<string | number>();
  private readonly maxCachedMessageIds = 1000;

  // Debug logging (set to false in production)
  private readonly debug = true;

  constructor(private configService: ConfigService) {
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.userId) {
        this.log('Page visible, checking connection...');
        if (this.connectionState$.value !== ConnectionState.CONNECTED) {
          this.reconnect();
        }
      }
    });

    // Handle online/offline
    window.addEventListener('online', () => {
      this.log('Browser online, reconnecting...');
      if (this.userId) this.reconnect();
    });

    window.addEventListener('offline', () => {
      this.log('Browser offline');
      this.updateConnectionState(ConnectionState.DISCONNECTED);
    });
  }

  /**
   * Connect to WebSocket for a specific user.
   * Multiple components can call connect() — the connection is shared.
   */
  connect(userId: number): void {
    this.activeConsumers++;
    this.log(`Consumer connected (active: ${this.activeConsumers})`);

    if (this.socket?.readyState === WebSocket.OPEN && this.userId === userId) {
      this.log('Already connected, reusing existing connection');
      return;
    }

    // Close existing connection if different user
    if (this.socket && this.userId !== userId) {
      this.forceDisconnect();
    }

    this.userId = userId;
    this.reconnectAttempts = 0;
    this.createConnection();
  }

  /**
   * Signal that a component no longer needs the connection.
   * The socket stays alive as long as at least one consumer remains.
   */
  release(): void {
    this.activeConsumers = Math.max(0, this.activeConsumers - 1);
    this.log(`Consumer released (active: ${this.activeConsumers})`);
    // Don't actually disconnect — the socket stays alive for other consumers (e.g., navbar)
  }

  /**
   * Force disconnect — only call on logout or when truly tearing down.
   */
  disconnect(): void {
    this.log('Force disconnecting...');
    this.forceDisconnect();
  }

  private forceDisconnect(): void {
    this.userId = null;
    this.activeConsumers = 0;
    this.reconnectAttempts = 0;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }

    this.updateConnectionState(ConnectionState.DISCONNECTED);
    this.receivedMessageIds.clear();
  }

  /**
   * Send a message via WebSocket
   */
  sendMessage(message: ChatMessage): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.log('Cannot send message: not connected', 'error');
      throw new Error('WebSocket not connected');
    }

    try {
      const payload = JSON.stringify(message);
      this.socket.send(payload);
      this.log('Message sent');
    } catch (error) {
      this.log('Error sending message', 'error', error);
      throw error;
    }
  }

  /**
   * Get observable for incoming messages
   */
  getMessages(): Observable<ChatMessage> {
    return this.messages$.asObservable();
  }

  /**
   * Get observable for connection state
   */
  getConnectionState(): Observable<ConnectionState> {
    return this.connectionState$.asObservable();
  }

  /**
   * Get observable for errors
   */
  getErrors(): Observable<Error> {
    return this.errors$.asObservable();
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  /**
   * Create WebSocket connection
   */
  private createConnection(): void {
    if (!this.userId) {
      this.log('Cannot connect: no user ID', 'error');
      return;
    }

    this.updateConnectionState(
      this.reconnectAttempts > 0 ? ConnectionState.RECONNECTING : ConnectionState.CONNECTING
    );

    // Get WebSocket URL from API URL
    const wsUrl = this.getWebSocketUrl();
    this.log(`Connecting to ${wsUrl}...`);

    try {
      this.socket = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      this.log('Error creating WebSocket', 'error', error);
      this.handleConnectionError();
    }
  }

  /**
   * Get WebSocket URL from API URL
   */
  private getWebSocketUrl(): string {
    const apiUrl = this.configService.getApiUrl();
    // Convert https://localhost/api to wss://localhost/ws/chat/{userId}
    // Route through /ws/ location in nginx which has WebSocket upgrade support
    const wsProtocol = apiUrl.startsWith('https://') ? 'wss://' : 'ws://';
    const apiBase = apiUrl.replace(/^https?:\/\//, '').replace(/\/api$/, '');
    return `${wsProtocol}${apiBase}/ws/chat/${this.userId}`;
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.onopen = () => {
      this.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.updateConnectionState(ConnectionState.CONNECTED);
      this.startHeartbeat();
    };

    this.socket.onmessage = (event) => {
      try {
        const message: ChatMessage = JSON.parse(event.data);
        this.handleIncomingMessage(message);
      } catch (error) {
        this.log('Error parsing message', 'error', error);
      }
    };

    this.socket.onerror = (error) => {
      this.log('WebSocket error', 'error', error);
      this.updateConnectionState(ConnectionState.ERROR);
      this.errors$.next(new Error('WebSocket connection error'));
    };

    this.socket.onclose = (event) => {
      this.log(`WebSocket closed: ${event.code} - ${event.reason}`);
      this.stopHeartbeat();
      
      if (event.code !== 1000 && this.userId) {
        // Not a normal closure, attempt reconnection
        this.handleConnectionError();
      } else {
        this.updateConnectionState(ConnectionState.DISCONNECTED);
      }
    };
  }

  /**
   * Handle incoming message with deduplication
   */
  private handleIncomingMessage(message: ChatMessage): void {
    // Deduplicate messages by ID
    if (message.id && this.receivedMessageIds.has(message.id)) {
      this.log('Duplicate message ignored');
      return;
    }

    if (message.id) {
      this.receivedMessageIds.add(message.id);
      
      // Limit cache size to prevent memory leaks
      if (this.receivedMessageIds.size > this.maxCachedMessageIds) {
        const idsArray = Array.from(this.receivedMessageIds);
        this.receivedMessageIds = new Set(idsArray.slice(-this.maxCachedMessageIds));
      }
    }

    this.log('Message received');
    this.messages$.next(message);
  }

  /**
   * Handle connection errors and reconnection
   */
  private handleConnectionError(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.log('Max reconnection attempts reached', 'error');
      this.updateConnectionState(ConnectionState.ERROR);
      this.errors$.next(new Error('Failed to reconnect after maximum attempts'));
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, ..., max 30s
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    
    this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      if (this.userId) {
        this.createConnection();
      }
    }, delay);
  }

  /**
   * Reconnect immediately
   */
  private reconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.reconnectAttempts = 0;
    this.createConnection();
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    // Ping server every 30 seconds to keep connection alive
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        try {
          this.socket.send(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          this.log('Error sending heartbeat', 'error', error);
        }
      }
    }, 30000);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Update connection state
   */
  private updateConnectionState(state: ConnectionState): void {
    if (this.connectionState$.value !== state) {
      this.connectionState$.next(state);
      this.log(`Connection state: ${state}`);
    }
  }

  /**
   * Debug logging
   */
  private log(message: string, level: 'info' | 'error' = 'info', ...args: any[]): void {
    if (!this.debug) return;
    
    const prefix = '[ChatWebSocket]';
    if (level === 'error') {
      console.error(prefix, message, ...args);
    } else {
      console.debug(prefix, message, ...args);
    }
  }
}
