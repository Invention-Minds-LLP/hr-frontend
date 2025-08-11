import { Component } from '@angular/core';
import { TableModule } from 'primeng/table';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { CommonModule } from '@angular/common';
import { User } from '../../services/user/user';

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

  tableData: any[] = [];


  constructor(private userService: User){}


  ngOnInit(){
    this.fetchUsers();
  }

  onSearch(event : Event){
    const input = event.target as HTMLInputElement;
    const searchText = input.value.trim().toLowerCase();

    if(!searchText){
      this.filterEmployeeData = [...this.tableData];
      return;
    }

    const filterKey = this.selectedFilter?.value as keyof TableData;

    this.filterEmployeeData = this.tableData.filter((table: TableData)=>{

      if(filterKey === 'name'){
        return table.name?.toLowerCase().includes(searchText)
      }

      return table[filterKey]?.toString().toLowerCase().includes(searchText)
    })
  }


  onFilterChange(){
    this.filterEmployeeData = [...this.tableData];
  }

  toggleFilterDropdown(){
    this.showDropdown = !this.showDropdown
  }


  selectFilter(option: any): void {
    this.selectedFilter = option;
    this.showDropdown = false;
    this.onFilterChange();
  }
  fetchUsers() {
    this.userService.listAllUsers().subscribe({
      next: (users) => {
        this.tableData = (users ?? []).map((u:any) => {
          const fullName = `${u.employee?.firstName ?? ''} ${u.employee?.lastName ?? ''}`.trim();
          const name = fullName || u.username || '';
          const { loginTime, loginDate } = this.splitDateTime(u.lastLogin);
          return {
            empId: u.employeeCode,
            name,
            role: u.role,
            loginTime,
            loginDate,
            // keep raw fields if you need them later
            _raw: u
          };
        });
        this.filterEmployeeData = [...this.tableData];
      },
      error: (err) => {
        console.error('Failed to load users', err);
        this.tableData = [];
        this.filterEmployeeData = [];
      }
    });
  }

  splitDateTime(iso?: string | null) {
    if (!iso) return { loginTime: '-', loginDate: '-' };
    const d = new Date(iso);
    if (isNaN(d.getTime())) return { loginTime: '-', loginDate: '-' };

    const loginTime = new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(d);

    const loginDate = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(d); // dd/mm/yyyy

    // If you need dd-MM-yyyy:
    const [dd, mm, yyyy] = loginDate.split('/');
    return { loginTime, loginDate: `${dd}-${mm}-${yyyy}` };
  }
}
