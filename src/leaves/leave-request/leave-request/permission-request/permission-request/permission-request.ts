import { Component } from '@angular/core';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { DatePicker } from 'primeng/datepicker';

interface requestTable {
  empName:string;
  department:string;
  jobTitle:string;
  premDate:string;
  reson:string;
  noOfHours:string;
  email:string;
}

@Component({
  selector: 'app-permission-request',
  imports: [InputIconModule, IconFieldModule, InputTextModule, FloatLabelModule, FormsModule, TableModule, CommonModule],
  templateUrl: './permission-request.html',
  styleUrl: './permission-request.css'
})
export class PermissionRequest {
 requestData :requestTable[] = [
    {
      empName:'Govindaraj',department:'Design',jobTitle:'UI/UX Designer',premDate:'09-05-2025',reson:'Personal I don’t w...',noOfHours:'2.15 Hours',email:'govindaraj@gmail.com'
    },
    {
      empName:'Govindaraj',department:'Design',jobTitle:'UI/UX Designer',premDate:'09-05-2025',reson:'Personal I don’t w...',noOfHours:'1.38 Hours',email:'govindaraj@gmail.com'
    },
    {
      empName:'Govindaraj',department:'Design',jobTitle:'UI/UX Designer',premDate:'09-05-2025',reson:'Personal I don’t w...',noOfHours:'2 Hours',email:'govindaraj@gmail.com'
    },
    {
      empName:'Govindaraj',department:'Design',jobTitle:'UI/UX Designer',premDate:'09-05-2025',reson:'Personal I don’t w...',noOfHours:'1.38 Hours',email:'govindaraj@gmail.com'
    },
    {
      empName:'Govindaraj',department:'Design',jobTitle:'UI/UX Designer',premDate:'09-05-2025',reson:'Personal I don’t w...',noOfHours:'2.15 Hours',email:'govindaraj@gmail.com'
    },
    {
      empName:'Govindaraj',department:'Design',jobTitle:'UI/UX Designer',premDate:'09-05-2025',reson:'Personal I don’t w...',noOfHours:'2 Hours',email:'govindaraj@gmail.com'
    },
    {
      empName:'Govindaraj',department:'Design',jobTitle:'UI/UX Designer',premDate:'09-05-2025',reson:'Personal I don’t w...',noOfHours:'2.49 Hours',email:'govindaraj@gmail.com'
    },
    {
      empName:'Govindaraj',department:'Design',jobTitle:'UI/UX Designer',premDate:'09-05-2025',reson:'Personal I don’t w...',noOfHours:'2.15 Hours',email:'govindaraj@gmail.com'
    },
    {
      empName:'Govindaraj',department:'Design',jobTitle:'UI/UX Designer',premDate:'09-05-2025',reson:'Personal I don’t w...',noOfHours:'1.38 Hours',email:'govindaraj@gmail.com'
    },
  ]
}
