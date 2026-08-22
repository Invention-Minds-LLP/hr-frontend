import { CommonModule } from '@angular/common';
import { Component, HostListener, ViewChild, ElementRef } from '@angular/core';
import { NavigationEnd, RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { PopUp } from "../pop-up/pop-up";
import { AnnouncementForm } from "../announcements/announcement-form/announcement-form";
import { ResignationForm } from "../resignation/resignation-form/resignation-form";
import { environment } from '../../environment/environment.prod';
import { Notifications } from '../services/notifications/notifications';
import { Announcements, } from '../services/announcement/announcements';
import { AuthSession } from '../services/auth/auth-session';
import { PermissionService } from '../services/auth/permission.service';
import { HasPermDirective } from '../shared/has-perm.directive';



@Component({
  selector: 'app-navbar',
  imports: [RouterModule, CommonModule, PopUp, AnnouncementForm, ResignationForm, HasPermDirective],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {
  isOpen = false;
  showLogoutPopup = false;
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
  audio = new Audio('./notification.mp3');

  @ViewChild('resignationForm') resignationForm!: ResignationForm;
  @ViewChild('notificationWrapper') notificationWrapper!: ElementRef;


  constructor(private router: Router, private notificationsService: Notifications, private svc: Announcements, private auth: AuthSession, private perms: PermissionService) { }

  toggleDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.isOpen = !this.isOpen;
  }

  username = '';
  // apiUrl = 'http://localhost:3002/api'; // Replace with your actual API URL
  employeeId = localStorage.getItem('empId') || '';
  announcements: any[] = [];
  // Per-client module flags (set in environment): show these nav items only for
  // clients that have the module (e.g. IM). Off for others (e.g. JMRH).
  // Separate axis from permissions — a licensed module is still permission-gated.
  readonly payrollEnabled = environment.payrollEnabled;
  readonly weeklyTrackerEnabled = environment.weeklyTrackerEnabled;

  ngOnInit(): void {
    this.photoUrl = localStorage.getItem('photoUrl') ?? '';
    this.username = localStorage.getItem('name') || '';

    // ✅ Connect to Notification Stream
    this.notificationsService.connectStream();

    // Subscribe to live updates
    this.notificationsService.notifications$.subscribe((data) => {
      this.notifications = data;
      if (data.length > 0) {
        this.hasNewNotification = true;
        this.audio.play().catch((err) => console.error('Audio play failed:', err));
      }
    });

    // Fetch existing notifications
    this.notificationsService.getAll(this.employeeId).subscribe((existing) => {
      this.notifications = existing
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

  /**
   * Training gets its own top-level link ONLY for people with no Administration
   * menu to reach it through — Nurse Educators, whose single admin function is
   * managing trainings. Anyone who has Administration finds it under
   * Performance, so showing both would list the same screen twice.
   *
   * Placement, not capability: `admin.training.view` still decides WHETHER they
   * get Training at all. This only decides WHERE the link sits, which is why it
   * isn't a permission key of its own.
   */
  get showStandaloneTraining(): boolean {
    return this.perms.has('admin.training.view') && !this.perms.has('admin.section.view');
  }

  /** Which permission opens each sub-nav, so the URL can't force one open. */
  private readonly sectionPerm: Record<string, string> = {
    admin: 'admin.section.view',
    hrmanual: 'hrManual.section.view',
    recruit: 'recruitment.section.view',
    masters: 'masters.section.view',
  };

  setActiveMenu(url: string): void {
    let menu: string | null;

    // '/admin/comp-off-approvals' lives under HR Ops, not HR Manual Entries, so
    // it is excluded here — a bare startsWith('/admin/comp-off') claims it too.
    const isCompOffRegister = url.startsWith('/admin/comp-off')
      && !url.startsWith('/admin/comp-off-approvals');

    if (url.startsWith('/admin/hr-corrections') || url.startsWith('/admin/force-present')
      || url.startsWith('/admin/encashment') || isCompOffRegister
      || url.startsWith('/admin/incentives') || url.startsWith('/admin/loans')) {
      menu = 'hrmanual';
    } else if (url.startsWith('/admin')) {
      menu = 'admin';
    } else if (url.startsWith('/recruitment')) {
      menu = 'recruit';
    } else if (url.startsWith('/masters')) {
      menu = 'masters';
    } else {
      menu = null;
    }

    // A section the user can't open must not appear just because the URL sits
    // underneath it. A Nurse Educator reaches /admin/evaluation from a direct
    // top-level link and has no Administration menu — without this, navigating
    // there re-opened the admin sub-nav the click had just closed.
    if (menu && !this.perms.has(this.sectionPerm[menu])) menu = null;

    this.activeMenu = menu;
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

  /**
   * Opening a section lands on its first page the user can actually reach.
   * Previously this branched on role (Reporting Manager / Incharge); now it
   * asks the same question the menu items ask, so the landing page can never
   * disagree with what's visible.
   */
  onAdminClick() {
    this.router.navigate([
      this.perms.has('admin.employee.view') ? '/admin/employee' : '/admin/leave',
    ]);
  }

  onHrManualClick() {
    this.router.navigate(['/admin/force-present']);
  }

  onRecruitClick() {
    if (this.perms.has('recruitment.jobs.view')) {
      this.router.navigate(['/recruitment/jobs']);
    } else if (this.perms.has('recruitment.interviews.view')) {
      this.router.navigate(['/recruitment/my-interview']);
    } else {
      this.router.navigate(['/recruitment/recquisition']);
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
    // Revokes the server-side session too, so the refresh cookie can't be
    // replayed after logout.
    this.auth.logout();
    this.showLogoutPopup = false;
    this.router.navigate(['/login']);
  }

  handleCancel() {
    this.showLogoutPopup = false;
  }

  activeMenu: string | null = null;
  activeAdminGroup: string = 'workforce';

  onMastersClick() {
    this.router.navigate(['/masters/departments']);
  }

  toggle(menu: 'admin' | 'recruit' | 'hrmanual' | 'masters') {
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
      this.notificationsService.getAll(this.employeeId).subscribe((existing) => {
        this.notifications = existing.reverse();
      });
  
    });
  }
  // 👇 This detects clicks outside the dropdown and closes it
  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {

    const target = event.target as HTMLElement;
    const dropdown = document.querySelector('.dropdown');

    if (dropdown && !dropdown.contains(target)) {
      this.isOpen = false;
    }

    if (
      this.showNotifications &&
      this.notificationWrapper &&
      !this.notificationWrapper.nativeElement.contains(event.target)
    ) {
      this.showNotifications = false;
    }
  }

}



