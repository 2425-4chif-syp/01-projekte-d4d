import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { ConfigService } from './config.service';
import { Chat, ChatMessage, ChatUser } from '../models/chat.model';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl: string;
  
  // Cache for users list to avoid repeated requests
  private usersCache$?: Observable<ChatUser[]>;
  
  // Cache for messages per conversation (key: "userId1-userId2")
  private messagesCache: Map<string, Observable<ChatMessage[]>> = new Map();

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {
    this.apiUrl = this.configService.getApiUrl();
  }

  getCurrentUser(): Observable<string> {
    return this.http.get(`${this.apiUrl}/user`, { responseType: 'text' });
  }

  setCurrentUser(username: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/user`, { username });
  }

  /**
   * Get all users with caching
   * @param forceRefresh - Force cache invalidation (e.g., after new user created)
   */
  getAllUsers(forceRefresh = false): Observable<ChatUser[]> {
    if (!this.usersCache$ || forceRefresh) {
      this.usersCache$ = this.http.get<ChatUser[]>(`${this.apiUrl}/chatentry/users`)
        .pipe(shareReplay(1));
    }
    return this.usersCache$;
  }

  /**
   * Get messages for a chat with caching
   * @param currentUserId - Current user's ID
   * @param otherUserId - Other user's ID  
   * @param forceRefresh - Force cache invalidation (e.g., after sending message)
   */
  getMessagesForChat(
    currentUserId: number, 
    otherUserId: number,
    forceRefresh = false
  ): Observable<ChatMessage[]> {
    // Create stable cache key (sorted to handle both directions)
    const cacheKey = [currentUserId, otherUserId].sort().join('-');
    
    if (!this.messagesCache.has(cacheKey) || forceRefresh) {
      const messages$ = this.http.get<ChatMessage[]>(
        `${this.apiUrl}/chatentry/${currentUserId}/${otherUserId}`
      ).pipe(shareReplay(1));
      
      this.messagesCache.set(cacheKey, messages$);
    }
    
    return this.messagesCache.get(cacheKey)!;
  }

  sendMessage(senderId: number, receiverId: number, message: string): Observable<ChatMessage> {
    // Invalidate cache for this conversation to get fresh data
    const cacheKey = [senderId, receiverId].sort().join('-');
    this.messagesCache.delete(cacheKey);
    
    return this.http.post<ChatMessage>(`${this.apiUrl}/chatentry`, {
      sender: { id: senderId },
      receiver: { id: receiverId },
      message: message,
      time: new Date().toISOString()
    });
  }
  
  /**
   * Clear all caches (useful on logout or major data changes)
   */
  clearCache(): void {
    this.usersCache$ = undefined;
    this.messagesCache.clear();
  }
}
