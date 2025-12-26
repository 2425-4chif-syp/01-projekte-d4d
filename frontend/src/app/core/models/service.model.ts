export interface ActiveService {
  id: number;
  providerId: number | null;
  clientId: number | null;
  providerName: string | null;
  clientName: string | null;
  serviceTypeName: string | null;
  serviceTypeId: number | null;
  status: 'ACTIVE' | 'PENDING_COMPLETION' | 'COMPLETED' | 'CANCELLED';
  providerConfirmed: boolean;
  clientConfirmed: boolean;
  canReview: boolean;
  hasReviewed: boolean;
  createdAt: string | null;
  completedAt: string | null;
}

export interface ReviewRequest {
  serviceId: number;
  stars: number;
  comment: string;
}
