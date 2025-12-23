export interface Appointment {
  id: number;
  proposerId: number;
  proposerName: string;
  recipientId: number;
  recipientName: string;
  serviceTypeId?: number;
  serviceTypeName?: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  timezone: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
  location?: string;
  notes?: string;
  createdAt: string;
}

export interface AppointmentCreate {
  proposerUsername: string;
  recipientUsername: string;
  serviceTypeId?: number;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  timezone?: string;
  location?: string;
  notes?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color?: string;
  status: string;
  appointment: Appointment;
}
