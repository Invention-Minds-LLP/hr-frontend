import { CommonModule } from '@angular/common';
import { Component, HostListener, ViewChild, ElementRef } from '@angular/core';
import { NavigationEnd, RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { PopUp } from "../pop-up/pop-up";
import { AnnouncementForm } from "../announcements/announcement-form/announcement-form";
import { ResignationForm } from "../resignation/resignation-form/resignation-form";
// import { environment } from '../../../environment/environment';
import { Notifications } from '../services/notifications/notifications';
import { Announcements, } from '../services/announcement/announcements';



@Component({
  selector: 'app-navbar',
  imports: [RouterModule, CommonModule, PopUp, AnnouncementForm, ResignationForm],
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
  showAnnouncement = false;
  photoUrl: string = '';
  private eventSource: EventSource | null = null;
  notifications: any[] = [];
  showNotifications = false;
  hasNewNotification = false;
  audio = new Audio('/notification.mp3');

  @ViewChild('resignationForm') resignationForm!: ResignationForm;
  @ViewChild('notificationWrapper') notificationWrapper!: ElementRef;


  constructor(private router: Router, private notificationsService: Notifications, private svc: Announcements) { }

  toggleDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.isOpen = !this.isOpen;
  }

  isRestricted = false;
  isReportingManager = false;
  username = '';
  apiUrl = 'http://localhost:3002/api'; // Replace with your actual API URL
  employeeId = localStorage.getItem('empId') || '';
  announcements: any[] = [];

  ngOnInit(): void {
    const rawRole = localStorage.getItem('role') ?? '';
    this.photoUrl = localStorage.getItem('photoUrl') ?? '';
    this.role = rawRole;
    const norm = this.normalizeRole(rawRole);

    const deptRaw =
      localStorage.getItem('departmentId') ||
      (JSON.parse(localStorage.getItem('user') || '{}')?.departmentId ?? '');
    const deptId = Number(deptRaw) || 0;

    // Restrict only Executives not in dept 1
    this.isRestricted = (norm === 'EXECUTIVE' && deptId !== 1);
    this.isReportingManager = this.role === 'Reporting Manager';
    console.log('isReportingManager:', this.isReportingManager);
    this.username = localStorage.getItem('name') || '';
    console.log('role:', rawRole, '→', norm, 'deptId:', deptId, 'isRestricted:', this.isRestricted);
    // ✅ Connect to Notification Stream
    this.notificationsService.connectStream();

    // Subscribe to live updates
    this.notificationsService.notifications$.subscribe((data) => {
      this.notifications = data;
    });

    // Fetch existing notifications
    this.notificationsService.getAll(this.employeeId).subscribe((existing) => {
      this.notifications = existing.reverse();
    });

    this.activeMenu = localStorage.getItem('activeMenu') || null;
    this.setActiveMenu(this.router.url);

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.setActiveMenu(event.urlAfterRedirects);
      }
    });
    this.svc.listAllLiveForEmployee().subscribe({
      next: (data) => {
        this.announcements = data.map(a => ({
          title: a.title,
          body: a.body
        }));
        console.log(this.announcements);
      },
      error: (err) => console.error('Failed to load announcements', err)
    });
  }

  setActiveMenu(url: string): void {
    if (url.startsWith('/admin')) {
      this.activeMenu = 'admin';
    } else if (url.startsWith('/recruitment')) {
      this.activeMenu = 'recruit';
    } else {
      this.activeMenu = null;
    }
    localStorage.setItem('activeMenu', this.activeMenu || '');
  }


  toggleNotificationDropdown(): void {
    this.showNotifications = !this.showNotifications;
    if (this.hasNewNotification) {
      this.hasNewNotification = false;
    }
  }
  handleNotificationClick(index: number): void {
    const notification = this.notifications[index];
    if (!notification) return;
    this.router.navigate(['/notifications']); // customize navigation
    this.showNotifications = false;
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


  onAdminClick() {
    if (this.isReportingManager) {
      this.router.navigate(['/admin/leave']);
    } else {
      this.router.navigate(['/admin/employee']);
    }
  }

  onRecruitClick() {
    // Expand submenu
    if (this.isReportingManager) {
      this.router.navigate(['/recruitment/my-interview']);
    }
    else {
      this.router.navigate(['/recruitment/jobs']);
    }

    console.log(this.activeMenu);
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

  openAnnouncement() {
    this.isOpen = false;
    if (this.resignationForm) {
      this.resignationForm.open();
    }
  }

  closeAnnouncement() {
    this.isOpen = false;
    if (this.resignationForm) {
      this.resignationForm.close();
    }
  }


  ngOnDestroy(): void {
    this.notificationsService.disconnectStream();
  }
  markAsRead(id: number, index: number): void {
    // Mark it as read visually first
    this.notifications[index].isRead = true;

    // Optionally call your API
    this.notificationsService.markAsRead(id).subscribe(() => {
      console.log('Marked as read:', id);
    });
  }
  // 👇 This detects clicks outside the dropdown and closes it
  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (
      this.showNotifications &&
      this.notificationWrapper &&
      !this.notificationWrapper.nativeElement.contains(event.target)
    ) {
      this.showNotifications = false;
    }
  }

}



