export interface Chat {
  id: string | number;
  user1Username: string;
  user2Username: string;
  lastMessage: string;
  lastUpdate: string;
  isAdmin?: boolean;
  isPinned?: boolean;
}

export interface ChatMessage {
  id?: string | number;
  sender: {
    id?: number;
    name: string;
  };
  receiver?: {
    id?: number;
    name?: string;
  };
  message: string;
  time: string;
}

export interface ChatUser {
  id: number;
  name: string;
}
