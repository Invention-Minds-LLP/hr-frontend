import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
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
  allowedRoles = ['EXECUTIVE', 'INTERN', 'JUNIOR EXECUTIVE'];
  role: string = '';
  adminOpen = false;
  recruitOpen = false;
  // isRestricted = true;
  // username:string = ''

  constructor(private router: Router) { }

  toggleDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.isOpen = !this.isOpen;
  }

  isRestricted = false;
  username = '';

  ngOnInit(): void {
    const rawRole = localStorage.getItem('role') ?? '';
    this.role = rawRole;
    const norm = this.normalizeRole(rawRole);

    const deptRaw =
      localStorage.getItem('departmentId') ||
      (JSON.parse(localStorage.getItem('user') || '{}')?.departmentId ?? '');
    const deptId = Number(deptRaw) || 0;

    // Restrict only Executives not in dept 1
    this.isRestricted = (norm === 'EXECUTIVE' && deptId !== 1);

    this.username = localStorage.getItem('name') || '';
    console.log('role:', rawRole, '→', norm, 'deptId:', deptId, 'isRestricted:', this.isRestricted);
  }

  private normalizeRole(raw: any): string {
    const s = (raw || '').toString().trim().toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ');
    const map: Record<string, string> = {
      'executive': 'EXECUTIVE',
      'executives': 'EXECUTIVE',
      'junior executive': 'JUNIOR_EXECUTIVE',
      'jr executive': 'JUNIOR_EXECUTIVE',
      'jr. executive': 'JUNIOR_EXECUTIVE',
      'intern': 'INTERN',
      'interns': 'INTERN',
    };
    return map[s] ?? s.toUpperCase().replace(/ /g, '_');
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const dropdown = document.querySelector('.dropdown');

    
    if (dropdown && !dropdown.contains(target)) {
      this.isOpen = false;
    }
  }


  goToProfile() {
    this.isOpen = false;
    this.router.navigate(['/settings']);
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

  activeMenu: string | null = null;

  toggle(menu: 'admin' | 'recruit') {
    this.activeMenu = this.activeMenu === menu ? null : menu;
  }

  // Close when clicking outside
  // @HostListener('document:click', ['$event'])
  // onClickOutside(event: MouseEvent) {
  //   const target = event.target as HTMLElement;
  //   if (!target.closest('.main-nav')) {
  //     this.activeMenu = null;
  //   }
  // }

  // Close when clicking any other main heading
  closeMenus() {
    this.activeMenu = null;
  }

}



