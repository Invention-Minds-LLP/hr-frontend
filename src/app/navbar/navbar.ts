import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { PopUp } from "../pop-up/pop-up";


@Component({
  selector: 'app-navbar',
  imports: [RouterModule, CommonModule, PopUp],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {
  isOpen = false;
  showLogoutPopup = false;

  constructor(private router: Router) { }

  toggleDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.isOpen = !this.isOpen;
  }



  goToProfile() {
    this.isOpen = false; 
    this.router.navigate(['/profile']);
  }

  openLogoutPopup() {
    this.isOpen = false; 
    this.showLogoutPopup = true; 
  }

  handleLogout() {
    localStorage.clear();
    this.showLogoutPopup = false;
    this.router.navigate(['/login']);
  }

  handleCancel() {
    this.showLogoutPopup = false;
  }




}
