import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Observable, BehaviorSubject } from 'rxjs';
import { ConfigService } from './config.service';
import { ChatMessage } from '../models/chat.model';

export interface WebSocketMessage {
  type: 'connected' | 'message' | 'pong' | 'error';
  id?: number;
  sender?: { id: number; name: string };
  receiver?: { id: number; name: string };
  message?: string;
  time?: string;
  clientMessageId?: string;
  userId?: number;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {
  private socket: WebSocket | null = null;
  private userId: number | null = null;
  
  // Message stream
  private messageSubject = new Subject<WebSocketMessage>();
  public messages$ = this.messageSubject.asObservable();
  
  // Connection status
  private statusSubject = new BehaviorSubject<ConnectionStatus>('disconnected');
  public status$ = this.statusSubject.asObservable();
  
  // Reconnection settings
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelays = [500, 1000, 2000, 5000, 10000]; // Exponential backoff
  private reconnectTimeout: any = null;
  private pingInterval: any = null;
  private intentionalClose = false;

  // Track sent messages for deduplication
  private pendingMessages = new Map<string, boolean>();

  constructor(private configService: ConfigService) {}

  ngOnDestroy() {
    this.disconnect();
  }

  /**
   * Connect to the WebSocket server for a specific user
   */
  connect(userId: number): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.userId === userId) {
      console.log('WebSocket already connected for user', userId);
      return;
    }

    // Disconnect existing connection if different user
    if (this.socket) {
      this.intentionalClose = true;
      this.socket.close();
    }

    this.userId = userId;
    this.intentionalClose = false;
    this.reconnectAttempts = 0;
    this.createConnection();
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.intentionalClose = true;
    this.clearTimers();
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    this.userId = null;
    this.statusSubject.next('disconnected');
  }

  /**
   * Send a chat message
   */
  sendMessage(receiverId: number, message: string): string {
    const clientMessageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const payload = {
        type: 'message',
        receiverId,
        message,
        clientMessageId
      };
      
      this.pendingMessages.set(clientMessageId, true);
      this.socket.send(JSON.stringify(payload));
      console.log('Sent message via WebSocket:', payload);
    } else {
      console.warn('WebSocket not connected, message not sent');
    }
    
    return clientMessageId;
  }

  /**
   * Check if a message was sent by this client (for deduplication)
   */
  isPendingMessage(clientMessageId: string | undefined): boolean {
    if (!clientMessageId) return false;
    return this.pendingMessages.has(clientMessageId);
  }

  /**
   * Clear pending message tracking
   */
  clearPendingMessage(clientMessageId: string): void {
    this.pendingMessages.delete(clientMessageId);
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.statusSubject.value;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  private createConnection(): void {
    if (!this.userId) return;

    this.statusSubject.next(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    // Build WebSocket URL
    const apiUrl = this.configService.getApiUrl();
    const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
    const wsHost = apiUrl.replace(/^https?:\/\//, '').replace(/\/api$/, '');
    const wsUrl = `${wsProtocol}://${wsHost}/ws/chat/${this.userId}`;
    
    console.log('Connecting to WebSocket:', wsUrl);

    try {
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = () => {
        console.log('WebSocket connected');
        this.statusSubject.next('connected');
        this.reconnectAttempts = 0;
        this.startPingInterval();
      };

      this.socket.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          
          if (data.type === 'pong') {
            // Ping-pong for keepalive, ignore
            return;
          }
          
          this.messageSubject.next(data);
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      this.socket.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this.clearTimers();
        
        if (!this.intentionalClose) {
          this.statusSubject.next('disconnected');
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (e) {
      console.error('Error creating WebSocket:', e);
      this.statusSubject.next('disconnected');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.intentionalClose || !this.userId) return;
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }

    const delayIndex = Math.min(this.reconnectAttempts, this.reconnectDelays.length - 1);
    const delay = this.reconnectDelays[delayIndex];
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts + 1} in ${delay}ms`);
    this.statusSubject.next('reconnecting');
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.createConnection();
    }, delay);
  }

  private startPingInterval(): void {
    // Send ping every 30 seconds to keep connection alive
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }

  private clearTimers(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}
