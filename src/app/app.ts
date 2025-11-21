import { RouterOutlet } from '@angular/router';
import { Login } from './Login/login/login';
import { Component, inject } from '@angular/core';
import { PrimeNG } from 'primeng/config';
import { Navbar } from "./navbar/navbar";
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { AnnouncementPopup } from "./announcements/announcement-popup/announcement-popup";
import { Announcement, Announcements } from './services/announcement/announcements';
import { InactivityService } from './services/inactivity.service';
import { AcknowledgePopup } from './grievance/acknowledge-popup/acknowledge-popup';
import { Grievance } from './services/grievance/grievance';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Login, Navbar, CommonModule, ToastModule, AnnouncementPopup, AcknowledgePopup],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {

  constructor(private router: Router,private svc: Announcements, private inactivityService: InactivityService, private ackService: Grievance) { }
  protected title = 'hr-frontend';

  dark = false;
  popupVisible = false;
  pendingComplaint: any = null;
  allPending: any[] = [];
  employeeId: number = Number(localStorage.getItem('empId'));
  role: string = localStorage.getItem('role') || '';

  toggleTheme() {
    document.documentElement.classList.toggle('app-dark', this.dark);
  }

  isLoginRoute(): boolean {
    return this.router.url === '/login'; // Adjust this if your login route is different
  }
  isTestRoute(): boolean {
    return this.router.url.includes('/take-test'); // Adjust this if your login route is different
  }
  hideNavbar(): boolean {
    const url = this.router.url;

    // hide if login route
    if (url.includes('/login')) return true;

    // hide if take-test route
    if (url.includes('/take-test')) return true;

    return false;
  }

  ngOnInit() {
    this.role = this.role.toUpperCase();
    console.log('User Role:', this.role);
    if(this.role === 'HR' || this.role === 'HR MANAGER'){
      this.loadPendingComplaints();
    }
  }
  loadPendingComplaints() {
    const employeeId = localStorage.getItem('empId');
    this.ackService.getUnacknowledged(Number(employeeId)).subscribe({
      next: (res) => {
        this.allPending = [
          ...res.grievances.map(g => ({ ...g, type: 'GRIEVANCE' })),
          ...res.poshCases.map(p => ({ ...p, type: 'POSH' })),
        ];
        console.log('Pending Complaints:', this.allPending);
        this.showNextPopup();
      },
      error: (err) => console.error(err),
    });
  }

  showNextPopup() {
    if (this.allPending.length > 0) {
      this.pendingComplaint = this.allPending.shift();
      console.log('Showing popup for:', this.pendingComplaint);
      this.popupVisible = true;
    } else {
      this.popupVisible = false;
      this.pendingComplaint = null;
    }
  }

  onPopupClosed(acknowledged: boolean) {
    this.popupVisible = false;
    if (acknowledged) {
      setTimeout(() => this.showNextPopup(), 400); // brief pause before next popup
    }
  }
  isCandidateTestsRoute(): boolean {
    return this.router.url.startsWith('/candidate-tests');
  }
  
}
