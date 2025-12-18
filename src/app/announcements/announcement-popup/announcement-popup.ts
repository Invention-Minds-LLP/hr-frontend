import { Component } from '@angular/core';
import { Announcements, Announcement } from '../../services/announcement/announcements';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-announcement-popup',
  imports: [DialogModule, CommonModule, ButtonModule],
  templateUrl: './announcement-popup.html',
  styleUrl: './announcement-popup.css',
  providers: [MessageService]
})
export class AnnouncementPopup {
  announcements: Announcement[] = [];
  current: Announcement | null = null;
  visible = false;
  isLoading = false;

  constructor(private svc: Announcements, private msg: MessageService) {}

  ngOnInit() {
    this.loadAnnouncements()
  }

  loadAnnouncements(){
    this.svc.listLiveForEmployee().subscribe({
      next: (data) => {
        // show only those requiring acknowledgment
        this.announcements = data.map(a => ({
          ...a,
          attachments: a.attachments ? JSON.parse(a.attachments) : []
        }));
        if (this.announcements.length) {
          this.current = this.announcements[0];
          this.visible = true;
        }
      }
    });
  }

  acknowledge() {
    if (!this.current) return;
    this.isLoading = true;
    const empId = Number(localStorage.getItem('empId')) || 0;
  
    this.svc.ack(this.current.id, empId).subscribe({
      next: () => {
        this.isLoading = false;
        this.msg.add({ severity: 'success', summary: 'Acknowledged' });
        this.announcements.shift();
        this.current = this.announcements[0] || null;
        this.visible = !!this.current;
      },
      error: () => {
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Could not ack' })
        this.isLoading = false;
      }
    });
  }
  
}
