import { Component, Input, OnInit } from '@angular/core';
import { Incident } from '../../services/incident/incident';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-incident-table',
  imports: [CommonModule, TableModule, CardModule],
  templateUrl: './incident-table.html',
  styleUrl: './incident-table.css',
})
export class IncidentTable {
  @Input() employeeId?: number;   // If listing incidents FOR an employee
  @Input() reporterId?: number;   // If listing incidents BY a manager


  incidents: any[] = [];

  constructor(private incidentService: Incident) {}

  ngOnInit() {
    
  console.log(this.employeeId, this.reporterId);
    if (this.employeeId) {
      this.incidentService.getIncidentsByEmployee(this.employeeId).subscribe(res => {
        this.incidents = res;
      });
    }

    if (this.reporterId) {
      this.incidentService.getIncidentsByReporter(this.reporterId).subscribe(res => {
        this.incidents = res;
      });
    }
  }
}
