import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
import { Chat, ChatMessage, ChatUser } from '../models/chat.model';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl: string;

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

  getAllUsers(): Observable<ChatUser[]> {
    return this.http.get<ChatUser[]>(`${this.apiUrl}/chatentry/users`);
  }

  getMessagesForChat(currentUserId: number, otherUserId: number): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.apiUrl}/chatentry/${currentUserId}/${otherUserId}`);
  }

  sendMessage(senderId: number, receiverId: number, message: string): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(`${this.apiUrl}/chatentry`, {
      sender: { id: senderId },
      receiver: { id: receiverId },
      message: message,
      time: new Date().toISOString()
    });
  }
}
