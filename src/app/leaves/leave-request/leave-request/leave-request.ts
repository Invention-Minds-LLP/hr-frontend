import { Component } from '@angular/core';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { DatePicker } from 'primeng/datepicker';

interface leaveTable {
  empName:string;
  department:string;
  jobTitle:string;
  leaveType:string;
  reson:string;
  noOfDays:string;
  email:string;
}

@Component({
  selector: 'app-leave-request',
  imports: [InputIconModule, IconFieldModule, InputTextModule, FloatLabelModule, FormsModule, TableModule, CommonModule,DatePicker],
  templateUrl: './leave-request.html',
  styleUrl: './leave-request.css'
})
export class LeaveRequest {

  leaveData :leaveTable[] = [
    {
      empName:'Govindaraj',department:'Design',jobTitle:'UI/UX Designer',leaveType:'09-05-2025',reson:'Personal I don’t w...',noOfDays:'',email:'govindaraj@gmail.com'
    },
    {
      empName:'Govindaraj',department:'Design',jobTitle:'UI/UX Designer',leaveType:'09-05-2025',reson:'Personal I don’t w...',noOfDays:'',email:'govindaraj@gmail.com'
    },
    {
      empName:'Govindaraj',department:'Design',jobTitle:'UI/UX Designer',leaveType:'09-05-2025',reson:'Personal I don’t w...',noOfDays:'',email:'govindaraj@gmail.com'
    },
    {
      empName:'Govindaraj',department:'Design',jobTitle:'UI/UX Designer',leaveType:'09-05-2025',reson:'Personal I don’t w...',noOfDays:'',email:'govindaraj@gmail.com'
    },
    {
      empName:'Govindaraj',department:'Design',jobTitle:'UI/UX Designer',leaveType:'09-05-2025',reson:'Personal I don’t w...',noOfDays:'',email:'govindaraj@gmail.com'
    },
    {
      empName:'Govindaraj',department:'Design',jobTitle:'UI/UX Designer',leaveType:'09-05-2025',reson:'Personal I don’t w...',noOfDays:'',email:'govindaraj@gmail.com'
    },
    {
      empName:'Govindaraj',department:'Design',jobTitle:'UI/UX Designer',leaveType:'09-05-2025',reson:'Personal I don’t w...',noOfDays:'',email:'govindaraj@gmail.com'
    },
    {
      empName:'Govindaraj',department:'Design',jobTitle:'UI/UX Designer',leaveType:'09-05-2025',reson:'Personal I don’t w...',noOfDays:'',email:'govindaraj@gmail.com'
    },
    {
      empName:'Govindaraj',department:'Design',jobTitle:'UI/UX Designer',leaveType:'09-05-2025',reson:'Personal I don’t w...',noOfDays:'',email:'govindaraj@gmail.com'
    },
  ]

   getStatusClass(status: string): string {
  // Example logic
  if (status === 'Manager Review') {
    return 'green-color';
  } else if (status === 'Pending') {
    return 'yellow-color';
  } else {
    return 'green-color'; // default
  }
}

getDotClass(status: string): string {
  if (status === 'Manager Review') {
    return 'green-dot';
  } else if (status === 'Pending') {
    return 'yellow-dot';
  } else {
    return 'green-dot'; // default
  }
}

}
