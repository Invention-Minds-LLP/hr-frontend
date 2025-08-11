import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Profile } from "../profile/profile";
import { ResetPassword } from "../reset-password/reset-password";
import { Table } from "../table/table";
import { LoginCreation } from "../login-creation/login-creation";

@Component({
  selector: 'app-settings-overview',
  imports: [CommonModule, Profile, ResetPassword, Table, LoginCreation],
  templateUrl: './settings-overview.html',
  styleUrl: './settings-overview.css'
})
export class SettingsOverview {
  active:string = 'profile';
  selectedEmployee: any = null;

  show(value: string){
    this.active = value;
  }
}
