export interface ServiceRequest {
  id: number;
  senderName: string;
  receiverName: string;
  serviceTypeName: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
}

export interface RequestsData {
  received: ServiceRequest[];
  sent: ServiceRequest[];
}
