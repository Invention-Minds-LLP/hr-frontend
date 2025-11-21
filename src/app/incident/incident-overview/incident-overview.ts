import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { IncidentForm } from "../incident-form/incident-form";
import { IncidentTable } from "../incident-table/incident-table";

@Component({
  selector: 'app-incident-overview',
  imports: [CommonModule, IncidentForm, IncidentTable],
  templateUrl: './incident-overview.html',
  styleUrl: './incident-overview.css',
})
export class IncidentOverview {
  active: string = 'list';
  reporterId: number = 0;

  ngOnInit() {
    this.reporterId = Number(localStorage.getItem('empId')) || 0;
    console.log('Reporter ID:', this.reporterId);
  }

  show(value: string) {
    this.active = value;
  }
}
