import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentService } from '../../core/services/appointment.service';
import { ChatService } from '../../core/services/chat.service';
import { Appointment } from '../../core/models/appointment.model';

interface CalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  appointments: Appointment[];
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css'
})
export class CalendarComponent implements OnInit {
  currentDate = new Date();
  currentMonth = this.currentDate.getMonth();
  currentYear = this.currentDate.getFullYear();
  
  calendarDays: CalendarDay[] = [];
  weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  monthNames = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];

  appointments: Appointment[] = [];
  upcomingAppointments: Appointment[] = [];
  pendingAppointments: Appointment[] = [];
  
  selectedAppointment: Appointment | null = null;
  showDetailModal = false;
  
  currentUser: string | null = null;
  loading = true;

  constructor(
    private appointmentService: AppointmentService,
    private chatService: ChatService
  ) {}

  async ngOnInit() {
    this.chatService.getCurrentUser().subscribe({
      next: (username) => {
        if (username && username.trim() !== '' && username !== 'Gast-Modus') {
          this.currentUser = username;
          this.loadAppointments();
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
    this.generateCalendar();
  }

  loadAppointments() {
    if (!this.currentUser) return;

    // Load all appointments for the current view
    const start = new Date(this.currentYear, this.currentMonth, 1);
    const end = new Date(this.currentYear, this.currentMonth + 1, 0);
    
    this.appointmentService.getAppointmentsInRange(this.currentUser, start, end).subscribe({
      next: (appointments) => {
        this.appointments = appointments.filter(a => a.status !== 'REJECTED');
        this.generateCalendar();
      },
      error: (err) => console.error('Error loading appointments:', err)
    });

    // Load upcoming appointments
    this.appointmentService.getUpcomingAppointments(this.currentUser).subscribe({
      next: (appointments) => {
        this.upcomingAppointments = appointments.slice(0, 5); // Top 5
      },
      error: (err) => console.error('Error loading upcoming:', err)
    });

    // Load pending appointments
    this.appointmentService.getPendingAppointments(this.currentUser).subscribe({
      next: (appointments) => {
        this.pendingAppointments = appointments;
      },
      error: (err) => console.error('Error loading pending:', err)
    });
  }

  generateCalendar() {
    this.calendarDays = [];
    
    const firstDayOfMonth = new Date(this.currentYear, this.currentMonth, 1);
    const lastDayOfMonth = new Date(this.currentYear, this.currentMonth + 1, 0);
    
    // Adjust for Monday start (0 = Sunday in JS)
    let startDay = firstDayOfMonth.getDay() - 1;
    if (startDay < 0) startDay = 6;
    
    // Previous month's days
    const prevMonth = new Date(this.currentYear, this.currentMonth, 0);
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(this.currentYear, this.currentMonth - 1, prevMonth.getDate() - i);
      this.calendarDays.push(this.createCalendarDay(date, false));
    }
    
    // Current month's days
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const date = new Date(this.currentYear, this.currentMonth, i);
      this.calendarDays.push(this.createCalendarDay(date, true));
    }
    
    // Next month's days to fill the grid
    const remainingDays = 42 - this.calendarDays.length; // 6 weeks * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(this.currentYear, this.currentMonth + 1, i);
      this.calendarDays.push(this.createCalendarDay(date, false));
    }
  }

  createCalendarDay(date: Date, isCurrentMonth: boolean): CalendarDay {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    // Find appointments for this day
    const dayAppointments = this.appointments.filter(apt => {
      const aptDate = new Date(apt.startTime);
      return aptDate.toDateString() === date.toDateString();
    });

    return {
      date,
      dayNumber: date.getDate(),
      isCurrentMonth,
      isToday,
      appointments: dayAppointments
    };
  }

  previousMonth() {
    this.currentMonth--;
    if (this.currentMonth < 0) {
      this.currentMonth = 11;
      this.currentYear--;
    }
    this.loadAppointments();
  }

  nextMonth() {
    this.currentMonth++;
    if (this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear++;
    }
    this.loadAppointments();
  }

  goToToday() {
    this.currentMonth = new Date().getMonth();
    this.currentYear = new Date().getFullYear();
    this.loadAppointments();
  }

  openAppointmentDetail(appointment: Appointment) {
    this.selectedAppointment = appointment;
    this.showDetailModal = true;
  }

  closeDetailModal() {
    this.showDetailModal = false;
    this.selectedAppointment = null;
  }

  confirmAppointment(appointment: Appointment) {
    this.appointmentService.confirmAppointment(appointment.id).subscribe({
      next: () => {
        this.loadAppointments();
        this.closeDetailModal();
      },
      error: (err) => {
        console.error('Error confirming:', err);
        alert('Fehler beim Bestätigen des Termins');
      }
    });
  }

  rejectAppointment(appointment: Appointment) {
    this.appointmentService.rejectAppointment(appointment.id).subscribe({
      next: () => {
        this.loadAppointments();
        this.closeDetailModal();
      },
      error: (err) => {
        console.error('Error rejecting:', err);
        alert('Fehler beim Ablehnen des Termins');
      }
    });
  }

  cancelAppointment(appointment: Appointment) {
    if (confirm('Möchtest du diesen Termin wirklich stornieren?')) {
      this.appointmentService.cancelAppointment(appointment.id).subscribe({
        next: () => {
          this.loadAppointments();
          this.closeDetailModal();
        },
        error: (err) => {
          console.error('Error cancelling:', err);
          alert('Fehler beim Stornieren des Termins');
        }
      });
    }
  }

  formatTime(dateStr: string): string {
    return this.appointmentService.formatTime(dateStr);
  }

  formatDateTime(dateStr: string): string {
    return this.appointmentService.formatDateTime(dateStr);
  }

  getStatusLabel(status: string): string {
    return this.appointmentService.getStatusLabel(status);
  }

  getStatusColor(status: string): string {
    return this.appointmentService.getStatusColor(status);
  }

  isProposer(appointment: Appointment): boolean {
    return appointment.proposerName === this.currentUser;
  }

  getOtherParticipant(appointment: Appointment): string {
    return this.isProposer(appointment) ? appointment.recipientName : appointment.proposerName;
  }
}
