import { RouterOutlet } from '@angular/router';
import { Login } from './Login/login/login';
import { Component, inject } from '@angular/core';
import { PrimeNG } from 'primeng/config';
import { Navbar } from "./navbar/navbar";
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { AnnouncementPopup } from "./announcements/announcement-popup/announcement-popup";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Login, Navbar, CommonModule, ToastModule, AnnouncementPopup],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {

  constructor(private router: Router) { }
  protected title = 'hr-frontend';

  dark = false;

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
}
