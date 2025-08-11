import { Component, EventEmitter, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';


@Component({
  selector: 'app-pop-up',
  imports: [ButtonModule],
  templateUrl: './pop-up.html',
  styleUrl: './pop-up.css'
})
export class PopUp {

  @Output() logoutConfirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  confirmLogout() {
    this.logoutConfirmed.emit();
  }

  cancel() {
    this.cancelled.emit();
  }
}
