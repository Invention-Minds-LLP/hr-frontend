import { Component } from '@angular/core';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';

interface Attendance {
  empName: string;
  phoneNumber: number;
  department: string;
  jobTitle: string;
  empType: string;
  email: string;
  status: 'Present' | 'Absent' | null;
  empId:string;
  [key:string]:any
}

@Component({
  selector: 'app-manage-attendance',
  imports: [InputIconModule, IconFieldModule, InputTextModule, FloatLabelModule, FormsModule, TableModule, CommonModule],
  templateUrl: './manage-attendance.html',
  styleUrl: './manage-attendance.css'
})
export class ManageAttendance {

  filterAttendanceData:any[] =[];
  selectedFilter:any = null;
  filterDropdown:boolean = false;

  filterOption = [
    {label:'Employee ID', value:'empId'},
    {label:'Name', value:'name'},
    {label:'Departmnent', value:'department'},
    {label:'JobTitle', value:'jobtitle'},
    {label:'Employee Type', value:'empType'}
  ]

  attendanceData: Attendance[] = [
    { empName: 'Govindaraj', empId:'IM003', phoneNumber: 6382348091, department: 'Development', jobTitle: 'Development', empType: 'Full-time', email: 'govindaraj@gmail.com', status: 'Present' },
    { empName: 'Govindaraj',empId:'IM003' ,phoneNumber: 6382348091, department: 'Design', jobTitle: 'Development', empType: 'Full-time', email: 'govindaraj@gmail.com', status: 'Present' },
    { empName: 'Govindaraj', empId:'IM003', phoneNumber: 6382348091, department: 'Development', jobTitle: 'Development', empType: 'Full-time', email: 'govindaraj@gmail.com', status: 'Absent' },
    { empName: 'Govindaraj', empId:'IM003' ,phoneNumber: 6382348091, department: 'HR', jobTitle: 'Development', empType: 'Full-time', email: 'govindaraj@gmail.com', status: 'Present' },
    { empName: 'Govindaraj', empId:'IM003' ,phoneNumber: 6382348091, department: 'Development', jobTitle: 'Development', empType: 'Full-time', email: 'govindaraj@gmail.com', status: 'Absent' },
    { empName: 'Govindaraj', empId:'IM003' ,phoneNumber: 6382348091, department: 'Finance', jobTitle: 'Development', empType: 'Full-time', email: 'govindaraj@gmail.com', status: 'Present' },
    { empName: 'Govindaraj', empId:'IM003' ,phoneNumber: 6382348091, department: 'Development', jobTitle: 'Development', empType: 'Full-time', email: 'govindaraj@gmail.com', status: 'Absent' },
    { empName: 'Govindaraj', empId:'IM003' ,phoneNumber: 6382348091, department: 'Design', jobTitle: 'Development', empType: 'Full-time', email: 'govindaraj@gmail.com', status: 'Present' },
    { empName: 'Govindaraj', empId:'IM003' ,phoneNumber: 6382348091, department: 'Development', jobTitle: 'Development', empType: 'Full-time', email: 'govindaraj@gmail.com', status: 'Absent' },
    { empName: 'Govindaraj', empId:'IM003' ,phoneNumber: 6382348091, department: 'Finance', jobTitle: 'Development', empType: 'Full-time', email: 'govindaraj@gmail.com', status: 'Present' },
    { empName: 'Govindaraj', empId:'IM003' ,phoneNumber: 6382348091, department: 'Development', jobTitle: 'Development', empType: 'Full-time', email: 'govindaraj@gmail.com', status: 'Absent' },
    { empName: 'Govindaraj', empId:'IM003' ,phoneNumber: 6382348091, department: 'Finance', jobTitle: 'Development', empType: 'Full-time', email: 'govindaraj@gmail.com', status: 'Present' },
  ]


   ngOnInit(){
      this.filterAttendanceData = [...this.attendanceData];
      this.filterAttendanceData = [...this.attendanceData];
    }
  
    onSearch(event: Event){
      const input = event.target as HTMLInputElement;
      const searchText = input.value.trim().toLowerCase();
  
      if(!searchText){
        this.filterAttendanceData = [...this.attendanceData]
        return
      }
  
      const filterKey = this.selectedFilter?.value as keyof Attendance;
  
      this.filterAttendanceData = this.attendanceData.filter((attendance : Attendance)=>{
        if(filterKey === 'name'){
          return attendance.empName?.toLocaleLowerCase().includes(searchText)
        }
  
        return attendance[filterKey]?.toString().toLowerCase().includes(searchText)
      })
  
    }
  
  
    onFilterChange(){
      this.filterAttendanceData = [...this.attendanceData]
    }
  
    toggleDropdown(){
      this.filterDropdown =!this.filterDropdown
    }
  
    selectFilter(option : any){
      this.selectedFilter = option;
      this.filterDropdown = false;
      this.onFilterChange()
      }
  

  setStatus(attendanceData: Attendance, newStatus: 'Present' | 'Absent') {
    attendanceData.status = newStatus;
  }

  

  getDeptClass(department: string): string {
  switch (department) {
    case 'Design':
      return 'design-dept';
    case 'Development':
      return 'dev-dept';
    case 'HR':
      return 'hr-dept';
    case 'Finance':
      return 'finance-dept';
    default:
      return 'default-dept';
  }
}

getDotColor(department: string): string {
  switch (department) {
    case 'Design':
      return '#00c853'; // green
    case 'Development':
      return '#2962ff'; // blue
    case 'HR':
      return '#ff6d00'; // orange
    case 'Finance':
      return '#d500f9'; // purple
    default:
      return '#9e9e9e'; // gray
  }
}


}
