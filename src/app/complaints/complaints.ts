import { Component } from '@angular/core';
import { PoshList } from "../posh/posh-list/posh-list";
import { GrievanceList } from "../grievance/grievance-list/grievance-list";
import { convertToParamMap } from '@angular/router';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-complaints',
  imports: [PoshList, GrievanceList, CommonModule],
  templateUrl: './complaints.html',
  styleUrl: './complaints.css'
})
export class Complaints {
  
}
