import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Appointment, AppointmentCreate } from '../models/appointment.model';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private apiUrl: string;

  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {
    this.apiUrl = `${this.configService.getApiUrl()}/appointments`;
  }

  /**
   * Erstellt einen neuen Terminvorschlag
   */
  createAppointment(appointment: AppointmentCreate): Observable<Appointment> {
    return this.http.post<Appointment>(this.apiUrl, appointment);
  }

  /**
   * Holt alle Termine eines Users
   */
  getAppointments(username: string): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.apiUrl}/${username}`);
  }

  /**
   * Holt anstehende bestätigte Termine
   */
  getUpcomingAppointments(username: string): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.apiUrl}/${username}/upcoming`);
  }

  /**
   * Holt ausstehende Terminanfragen
   */
  getPendingAppointments(username: string): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.apiUrl}/${username}/pending`);
  }

  /**
   * Holt Termine in einem Zeitbereich (für Kalender)
   */
  getAppointmentsInRange(username: string, start: Date, end: Date): Observable<Appointment[]> {
    const startStr = start.toISOString().slice(0, 19);
    const endStr = end.toISOString().slice(0, 19);
    return this.http.get<Appointment[]>(
      `${this.apiUrl}/${username}/range?start=${startStr}&end=${endStr}`
    );
  }

  /**
   * Holt Details eines Termins
   */
  getAppointmentDetail(id: number): Observable<Appointment> {
    return this.http.get<Appointment>(`${this.apiUrl}/detail/${id}`);
  }

  /**
   * Bestätigt einen Terminvorschlag
   */
  confirmAppointment(id: number): Observable<Appointment> {
    return this.http.put<Appointment>(`${this.apiUrl}/${id}/confirm`, {});
  }

  /**
   * Lehnt einen Terminvorschlag ab
   */
  rejectAppointment(id: number): Observable<Appointment> {
    return this.http.put<Appointment>(`${this.apiUrl}/${id}/reject`, {});
  }

  /**
   * Storniert einen Termin
   */
  cancelAppointment(id: number): Observable<Appointment> {
    return this.http.put<Appointment>(`${this.apiUrl}/${id}/cancel`, {});
  }

  /**
   * Formatiert Zeit für die Anzeige
   */
  formatDateTime(dateTimeStr: string): string {
    const date = new Date(dateTimeStr);
    return date.toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Formatiert nur die Zeit
   */
  formatTime(dateTimeStr: string): string {
    const date = new Date(dateTimeStr);
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Berechnet die Dauer in Minuten
   */
  getDurationMinutes(startTime: string, endTime: string): number {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  }

  /**
   * Gibt Status-Label zurück
   */
  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'PENDING': 'Ausstehend',
      'CONFIRMED': 'Bestätigt',
      'REJECTED': 'Abgelehnt',
      'CANCELLED': 'Storniert',
      'COMPLETED': 'Abgeschlossen'
    };
    return labels[status] || status;
  }

  /**
   * Gibt Status-Farbe für UI zurück
   */
  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'PENDING': '#f59e0b',    // Amber
      'CONFIRMED': '#10b981',  // Green
      'REJECTED': '#ef4444',   // Red
      'CANCELLED': '#6b7280',  // Gray
      'COMPLETED': '#3b82f6'   // Blue
    };
    return colors[status] || '#6b7280';
  }
}
