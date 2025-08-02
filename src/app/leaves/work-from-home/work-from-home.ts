import { Component } from '@angular/core';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';


interface WFHTable {
  empName:string;
  department:string;
  jobTitle:string;
  WFHDate:string;
  reson:string;
  email:string;
}

@Component({
  selector: 'app-work-from-home',
  imports: [InputIconModule, IconFieldModule, InputTextModule, FloatLabelModule, FormsModule, TableModule, CommonModule],
  templateUrl: './work-from-home.html',
  styleUrl: './work-from-home.css'
})
export class WorkFromHome {
  wfhData :WFHTable[] = [
    {
      empName:'Govindaraj',department:'Design',jobTitle:'UI/UX Designer',WFHDate:'09-05-2025',reson:'Personal I don’t w...',email:'govindaraj@gmail.com'
    },
    {
      empName:'Govindaraj',department:'Design',jobTitle:'UI/UX Designer',WFHDate:'09-05-2025',reson:'Personal I don’t w...',email:'govindaraj@gmail.com'
    },
    {
      empName:'Govindaraj',department:'Design',jobTitle:'UI/UX Designer',WFHDate:'09-05-2025',reson:'Personal I don’t w...',email:'govindaraj@gmail.com'
    },
    {
      empName:'Govindaraj',department:'Design',jobTitle:'UI/UX Designer',WFHDate:'09-05-2025',reson:'Personal I don’t w...',email:'govindaraj@gmail.com'
    },
    {
      empName:'Govindaraj',department:'Design',jobTitle:'UI/UX Designer',WFHDate:'09-05-2025',reson:'Personal I don’t w...',email:'govindaraj@gmail.com'
    },
    {
      empName:'Govindaraj',department:'Design',jobTitle:'UI/UX Designer',WFHDate:'09-05-2025',reson:'Personal I don’t w...',email:'govindaraj@gmail.com'
    },
    {
      empName:'Govindaraj',department:'Design',jobTitle:'UI/UX Designer',WFHDate:'09-05-2025',reson:'Personal I don’t w...',email:'govindaraj@gmail.com'
    },
    {
      empName:'Govindaraj',department:'Design',jobTitle:'UI/UX Designer',WFHDate:'09-05-2025',reson:'Personal I don’t w...',email:'govindaraj@gmail.com'
    },
    {
      empName:'Govindaraj',department:'Design',jobTitle:'UI/UX Designer',WFHDate:'09-05-2025',reson:'Personal I don’t w...',email:'govindaraj@gmail.com'
    },
  ]
}
