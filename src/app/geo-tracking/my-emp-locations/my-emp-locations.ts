import { Component } from '@angular/core';
import { GeoTracking } from '../../services/geo-tracking/geo-tracking';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';


@Component({
  selector: 'app-my-emp-locations',
  imports: [CommonModule, TableModule, DialogModule, ButtonModule, DatePickerModule, FormsModule, ReactiveFormsModule],
  templateUrl: './my-emp-locations.html',
  styleUrl: './my-emp-locations.css',
})
export class MyEmpLocations {
teamSessions: any[] = [];

showEmployeePopup = false;
showSessionPopup = false;

selectedEmployee: any;
selectedSessionDate: Date = new Date();

filteredSessions: any[] = [];

photos: any[] = [];
routePoints: any[] = [];
showPhotoPopup: boolean = false;
showRoutePopup: boolean = false;




constructor( private geoService: GeoTracking){}

ngOnInit(){
  this.loadTeamSessions()
}



openEmployeeDetails(emp: any) {
  this.selectedEmployee = emp;
  this.showEmployeePopup = true;
  this.filterSessionsByDate();
}

loadTeamSessions() {
  this.geoService.getManagerSessions()
    .subscribe(data => this.teamSessions = data);
}

openPhotoPopup(photos: any[]) {
    this.photos = photos;
    this.showPhotoPopup = true;
  }

  closePhotoPopup() {
    this.showPhotoPopup = false;
    this.photos = [];
  }

  openRoute(points: any[]) {
    this.routePoints = points;
    this.showRoutePopup = true;
  }

  closeRoutePopup() {
    this.showRoutePopup = false;
    this.routePoints = [];
  }

  filterSessionsByDate() {
  if (!this.selectedEmployee) return;

  const selected = new Date(this.selectedSessionDate);
  selected.setHours(0, 0, 0, 0);

  this.filteredSessions =
    this.selectedEmployee.locationSessions.filter((s: any) => {
      const d = new Date(s.createdAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === selected.getTime();
    });
}

openSessionDetails(session: any) {
  this.photos = session.photos || [];
  this.routePoints = session.locationPoints || [];
  this.showSessionPopup = true;
}

}
