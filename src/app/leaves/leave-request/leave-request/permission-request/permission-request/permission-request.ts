import { Component } from '@angular/core';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { DatePicker } from 'primeng/datepicker';
import { label } from '@primeuix/themes/aura/metergroup';
import { value } from '@primeuix/themes/aura/knob';
import { TooltipModule } from 'primeng/tooltip';

interface requestTable {
  empName:string;
  department:string;
  jobTitle:string;
  premDate:string;
  reson:string;
  noOfHours:string;
  email:string;
  empId:string;
  [key:string]:any
}

@Component({
  selector: 'app-permission-request',
  imports: [InputIconModule, IconFieldModule, InputTextModule, FloatLabelModule, FormsModule, TableModule, CommonModule,TooltipModule],
  templateUrl: './permission-request.html',
  styleUrl: './permission-request.css'
})
export class PermissionRequest {

  filterReuqusetData:any[] =[];
  selectedFilter:any = null;
  filterDropdown:boolean = false;

  filterOption = [
    {label:'Employee ID', value:'empId'},
    {label:'Name', value:'name'},
    {label:'Departmnent', value:'department'},
    {label:'JobTitle', value:'jobtitle'},
  ]

 requestData :requestTable[] = [
    {
      empName:'Govindaraj', empId:'IM003',department:'Design',jobTitle:'UI/UX Designer',premDate:'09-05-2025',reson:'Personal I don’t w...',noOfHours:'2.15 Hours',email:'govindaraj@gmail.com'
    },
    {
      empName:'Govindaraj', empId:'IM003',department:'Design',jobTitle:'UI/UX Designer',premDate:'09-05-2025',reson:'Personal I don’t w...',noOfHours:'1.38 Hours',email:'govindaraj@gmail.com'
    },
    {
      empName:'Govindaraj', empId:'IM003',department:'Development',jobTitle:'UI/UX Designer',premDate:'09-05-2025',reson:'Personal I don’t w...',noOfHours:'2 Hours',email:'govindaraj@gmail.com'
    },
    {
      empName:'Govindaraj', empId:'IM003',department:'Design',jobTitle:'UI/UX Designer',premDate:'09-05-2025',reson:'Personal I don’t w...',noOfHours:'1.38 Hours',email:'govindaraj@gmail.com'
    },
    {
      empName:'Govindaraj', empId:'IM003',department:'Design',jobTitle:'UI/UX Designer',premDate:'09-05-2025',reson:'Personal I don’t w...',noOfHours:'2.15 Hours',email:'govindaraj@gmail.com'
    },
    {
      empName:'Govindaraj', empId:'IM003',department:'HR',jobTitle:'UI/UX Designer',premDate:'09-05-2025',reson:'Personal I don’t w...',noOfHours:'2 Hours',email:'govindaraj@gmail.com'
    },
    {
      empName:'Govindaraj', empId:'IM003',department:'Design',jobTitle:'UI/UX Designer',premDate:'09-05-2025',reson:'Personal I don’t w...',noOfHours:'2.49 Hours',email:'govindaraj@gmail.com'
    },
    {
      empName:'Govindaraj', empId:'IM003',department:'Design',jobTitle:'UI/UX Designer',premDate:'09-05-2025',reson:'Personal I don’t w...',noOfHours:'2.15 Hours',email:'govindaraj@gmail.com'
    },
    {
      empName:'Govindaraj', empId:'IM003',department:'Design',jobTitle:'UI/UX Designer',premDate:'09-05-2025',reson:'Personal I don’t w...',noOfHours:'1.38 Hours',email:'govindaraj@gmail.com'
    },
  ]


  ngOnInit(){
    this.requestData = [...this.requestData];
    this.filterReuqusetData = [...this.requestData];
  }

  onSearch(event: Event){
    const input = event.target as HTMLInputElement;
    const searchText = input.value.trim().toLowerCase();

    if(!searchText){
      this.filterReuqusetData = [...this.requestData]
      return
    }

    const filterKey = this.selectedFilter?.value as keyof requestTable;

    this.filterReuqusetData = this.requestData.filter((request : requestTable)=>{
      if(filterKey === 'name'){
        return request.empName?.toLocaleLowerCase().includes(searchText)
      }

      return request[filterKey]?.toString().toLowerCase().includes(searchText)
    })

  }


  onFilterChange(){
    this.filterReuqusetData = [...this.requestData]
  }

  toggleDropdown(){
    this.filterDropdown =!this.filterDropdown
  }

  selectFilter(option : any){
    this.selectedFilter = option;
    this.filterDropdown = false;
    this.onFilterChange()
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
