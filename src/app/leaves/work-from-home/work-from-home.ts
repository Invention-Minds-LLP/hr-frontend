import { Component } from '@angular/core';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { label } from '@primeuix/themes/aura/metergroup';
import { value } from '@primeuix/themes/aura/knob';



interface WFHTable {
  empID: string
  empName: string;
  department: string;
  jobTitle: string;
  WFHDate: string;
  reson: string;
  email: string;
  [key: string]: any
}

@Component({
  selector: 'app-work-from-home',
  imports: [InputIconModule, IconFieldModule, InputTextModule, FloatLabelModule, FormsModule, TableModule, CommonModule, TooltipModule],
  templateUrl: './work-from-home.html',
  styleUrl: './work-from-home.css'
})
export class WorkFromHome {

  filterWFHData: any[] = [];
  selectedFilter: any = null;
  showFilterDropdown: boolean = false;
  
  filterOption = [
    { label: 'Employee Id', value: 'empId' },
    { label: 'Name', value: 'name' },
    { label: 'Department', value: 'department' },
    { label: 'JobTitle', value: 'jobtitle' },
  ]


  wfhData: WFHTable[] = [
    {
      empID: 'IM003', empName: 'Govindaraj', department: 'Design', jobTitle: 'UI/UX Designer', WFHDate: '09-05-2025', reson: 'Personal I don’t w...', email: 'govindaraj@gmail.com'
    },
    {
      empID: 'IM003', empName: 'Govindaraj', department: 'Development', jobTitle: 'UI/UX Designer', WFHDate: '09-05-2025', reson: 'Personal I don’t w...', email: 'govindaraj@gmail.com'
    },
    {
      empID: 'IM003', empName: 'Govindaraj', department: 'HR', jobTitle: 'UI/UX Designer', WFHDate: '09-05-2025', reson: 'Personal I don’t w...', email: 'govindaraj@gmail.com'
    },
    {
      empID: 'IM003', empName: 'Govindaraj', department: 'Finance', jobTitle: 'UI/UX Designer', WFHDate: '09-05-2025', reson: 'Personal I don’t w...', email: 'govindaraj@gmail.com'
    },
    {
      empID: 'IM003', empName: 'Govindaraj', department: 'Design', jobTitle: 'UI/UX Designer', WFHDate: '09-05-2025', reson: 'Personal I don’t w...', email: 'govindaraj@gmail.com'
    },
    {
      empID: 'IM003', empName: 'Govindaraj', department: 'Design', jobTitle: 'UI/UX Designer', WFHDate: '09-05-2025', reson: 'Personal I don’t w...', email: 'govindaraj@gmail.com'
    },
    {
      empID: 'IM003', empName: 'Govindaraj', department: 'Development', jobTitle: 'UI/UX Designer', WFHDate: '09-05-2025', reson: 'Personal I don’t w...', email: 'govindaraj@gmail.com'
    },
    {
      empID: 'IM003', empName: 'Govindaraj', department: 'Design', jobTitle: 'UI/UX Designer', WFHDate: '09-05-2025', reson: 'Personal I don’t w...', email: 'govindaraj@gmail.com'
    },
    {
      empID: 'IM003', empName: 'Govindaraj', department: 'Finance', jobTitle: 'UI/UX Designer', WFHDate: '09-05-2025', reson: 'Personal I don’t w...', email: 'govindaraj@gmail.com'
    },
  ]

  ngOnInit() {
    this.wfhData = [...this.wfhData];
    this.filterWFHData = [...this.wfhData];
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    const searchText = input.value.trim().toLowerCase();;

    if (!searchText) {
      this.filterWFHData = [...this.wfhData]
      return
    }

    const filterKey = this.selectedFilter?.value as keyof WFHTable

    this.filterWFHData = this.wfhData.filter((wfh : WFHTable)=>{
      if(filterKey === 'name'){
        return wfh.empName?.toLowerCase().includes(searchText)
      }

      return wfh[filterKey]?.toString()?.toLowerCase().includes(searchText)
    })
  }

  onFilterChange(){
    this.filterWFHData = [...this.wfhData];
  }

  toggleFilterDropdown(): void{
    this.showFilterDropdown = !this.showFilterDropdown
  }

  selectFiler(option : any){
    this.selectedFilter = option;
    this.showFilterDropdown = false;
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
