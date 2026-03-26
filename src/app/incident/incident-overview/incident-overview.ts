import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ModuleGuide } from '../../shared/module-guide/module-guide';
import { IncidentForm } from "../incident-form/incident-form";
import { IncidentTable } from "../incident-table/incident-table";

@Component({
  selector: 'app-incident-overview',
  imports: [CommonModule, IncidentForm, IncidentTable, ModuleGuide],
  templateUrl: './incident-overview.html',
  styleUrl: './incident-overview.css',
})
export class IncidentOverview {
  active: string = 'list';
  reporterId: number = 0;
  isHR: boolean = false;

  ngOnInit() {
    this.reporterId = Number(localStorage.getItem('empId')) || 0;
    const roleId = Number(localStorage.getItem('roleId'));

    this.isHR = roleId === 1;
    console.log('Reporter ID:', this.reporterId);
  }

  show(value: string) {
    this.active = value;
  }
}
