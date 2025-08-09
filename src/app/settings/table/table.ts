import { Component } from '@angular/core';
import { TableModule } from 'primeng/table';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { CommonModule } from '@angular/common';
import { label } from '@primeuix/themes/aura/metergroup';
import { value } from '@primeuix/themes/aura/knob';

interface TableData {
  empId: string;
  name:string;
  role: string;
  loginTime: string;
  loginDate: string
  [key:string]:any;
}

@Component({
  selector: 'app-table',
  imports: [TableModule,InputIconModule, IconFieldModule, InputTextModule, FloatLabelModule, FormsModule,CommonModule],
  templateUrl: './table.html',
  styleUrl: './table.css'
})
export class Table {
  filterEmployeeData:any[] = [];
  selectedFilter: any = null;
  showDropdown: boolean = false;

  filterOption = [
    {label:'Employee ID', value:'empId'},
    {label:'Name', value:'name'},
    {label:'Role', value:'role'}
  ]

  tabledata: TableData[] = [
    {
      empId: 'IM001',name:'Govindaraj',role: 'Development',loginTime: '09.00AM',loginDate: '12-08-2025'
    },
    {
      empId: 'IM002',name:'Govind',role: 'HR',loginTime: '09.00AM',loginDate: '12-08-2025'
    },
    {
      empId: 'IM004',name:'Muni',role: 'DEsigner',loginTime: '09.00AM',loginDate: '12-08-2025'
    },
    {
      empId: 'IM008',name:'Govind',role: 'IT',loginTime: '09.00AM',loginDate: '12-08-2025'
    },
    {
      empId: 'IM005',name:'Govindaraj',role: 'HR',loginTime: '09.00AM',loginDate: '12-08-2025'
    },
    {
      empId: 'IM003',name:'Chandru',role: 'Development',loginTime: '09.00AM',loginDate: '12-08-2025'
    },
    {
      empId: 'IM009',name:'Govind',role: 'IT',loginTime: '09.00AM',loginDate: '12-08-2025'
    },
    {
      empId: 'IM002',name:'Chandru',role: 'Development',loginTime: '09.00AM',loginDate: '12-08-2025'
    },
  ]


  ngOnInit(){
    this.tabledata = [...this.tabledata];
    this.filterEmployeeData = [...this.tabledata];
  }

  onSearch(event : Event){
    const input = event.target as HTMLInputElement;
    const searchText = input.value.trim().toLowerCase();

    if(!searchText){
      this.filterEmployeeData = [...this.tabledata];
      return;
    }

    const filterKey = this.selectedFilter?.value as keyof TableData;

    this.filterEmployeeData = this.tabledata.filter((table: TableData)=>{

      if(filterKey === 'name'){
        return table.name?.toLowerCase().includes(searchText)
      }

      return table[filterKey]?.toString().toLowerCase().includes(searchText)
    })
  }


  onFilterChange(){
    this.filterEmployeeData = [...this.tabledata];
  }

  toggleFilterDropdown(){
    this.showDropdown = !this.showDropdown
  }


  selectFilter(option: any): void {
    this.selectedFilter = option;
    this.showDropdown = false;
    this.onFilterChange();
  }
}
