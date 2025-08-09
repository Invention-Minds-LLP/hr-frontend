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
import { Wfh } from '../../services/wfh/wfh';
import { WfhPopup } from '../wfh-popup/wfh-popup';
import { Departments } from '../../services/departments/departments';

export type BucketKey = 'today' | 'thisWeek' | 'nextMonth';



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
  imports: [InputIconModule, IconFieldModule, InputTextModule, FloatLabelModule, FormsModule, TableModule, CommonModule, TooltipModule, WfhPopup],
  templateUrl: './work-from-home.html',
  styleUrl: './work-from-home.css'
})
export class WorkFromHome {


  constructor(private wfhService: Wfh, private departmentService: Departments) { }

  filterWFHData: any[] = [];
  selectedFilter: any = null;
  showFilterDropdown: boolean = false;
  selectedWFH: any = null;
  viewMode: boolean = false;
  showWFHPopup: boolean = false;
  departments: any[] = [];
  currentUserId = 1; // Example, replace with actual logged-in user ID
  declineDialogVisible: boolean = false;  // Controls the dialog visibility
  declineReason: string = '';             // Stores the decline reason input
  currentDeclineId: number | null = null; // Stores the leave ID being declined
  buckets: { today: any[]; thisWeek: any[]; nextMonth: any[] } = {
    today: [], thisWeek: [], nextMonth: []
  };


  expanded: Record<BucketKey, boolean> = {
    today: false,
    thisWeek: false,
    nextMonth: false,
  };
  

  filterOption = [
    { label: 'Employee Id', value: 'empId' },
    { label: 'Name', value: 'name' },
    { label: 'Department', value: 'department' },
    { label: 'JobTitle', value: 'jobtitle' },
  ]


  wfhData: WFHTable[] = []

  ngOnInit() {
    this.loadWFHRequests();
    this.departmentService.getDepartments().subscribe(data => this.departments = data);
  }
  loadWFHRequests() {
    this.wfhService.getWFHRequests().subscribe({
      next: (data) => {
        this.wfhData = data.map((wfh: any, index: number) => ({
          no: index + 1,
          empID: wfh.employee?.employeeCode,
          empName: `${wfh.employee?.firstName} ${wfh.employee?.lastName}`,
          email: wfh.employee?.email || '',
          department: wfh.employee?.departmentId || '',
          jobTitle: wfh.employee?.designation || '',
          WFHDate: `${new Date(wfh.startDate).toLocaleDateString()} - ${new Date(wfh.endDate).toLocaleDateString()}`,
          reson: wfh.reason,
          id: wfh.id,
          status: wfh.status,
          startDate: wfh.startDate,
          endDate: wfh.endDate
        }));
        this.filterWFHData = [...this.wfhData];
      },
      error: (err) => {
        console.error('Error fetching WFH requests:', err);
      }
    });
  }


  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    const searchText = input.value.trim().toLowerCase();;

    if (!searchText) {
      this.filterWFHData = [...this.wfhData]
      return
    }

    const filterKey = this.selectedFilter?.value as keyof WFHTable

    this.filterWFHData = this.wfhData.filter((wfh: WFHTable) => {
      if (filterKey === 'name') {
        return wfh.empName?.toLowerCase().includes(searchText)
      }

      return wfh[filterKey]?.toString()?.toLowerCase().includes(searchText)
    })
  }

  onFilterChange() {
    this.filterWFHData = [...this.wfhData];
  }

  toggleFilterDropdown(): void {
    this.showFilterDropdown = !this.showFilterDropdown
  }

  selectFiler(option: any) {
    this.selectedFilter = option;
    this.showFilterDropdown = false;
    this.onFilterChange()
  }




  getDepartmentColors(departmentId: number) {
    const baseHue = (departmentId * 40) % 360;
    const badgeColor = `hsl(${baseHue}, 70%, 85%)`;
    const dotColor = `hsl(${baseHue}, 70%, 40%)`;

    return { badgeColor, dotColor };
  }

  getDepartmentName(id: number): string {
    return this.departments.find(dep => dep.id === id)?.name || 'N/A';
  }
  acceptWFH(id: number) {
    const currentUserId = Number(localStorage.getItem('userId'));

    this.wfhService.updateWFHStatus(id, 'APPROVED', currentUserId).subscribe({
      next: () => this.loadWFHRequests(),
      error: (err) => console.error('Error approving WFH:', err)
    });
  }
  openDeclineDialog(id: number) {
    this.currentDeclineId = id;
    this.declineDialogVisible = true;
  }

  confirmDecline() {
    if (!this.declineReason.trim()) return;

    const currentUserId = Number(localStorage.getItem('userId'));

    this.wfhService.updateWFHStatus(this.currentDeclineId!, 'REJECTED', currentUserId, this.declineReason).subscribe({
      next: () => {
        this.declineDialogVisible = false;
        this.declineReason = '';
        this.currentDeclineId = null;
        this.loadWFHRequests();
      },
      error: (err) => console.error('Error declining WFH:', err)
    });
  }
  openWFHDetails(wfh: any) {
    this.selectedWFH = {
      ...wfh,
      startDate: wfh.startDate,
      endDate: wfh.endDate,
      reason: wfh.reson
    };
    this.viewMode = true;
    this.showWFHPopup = true;
    this.wfhService.getWhoIsOnWFHBuckets().subscribe(b => this.buckets = b);
  }
  closeDeclineDialog() {
    this.declineDialogVisible = false;
    this.declineReason = '';
    this.currentDeclineId = null;
  }
  visible(list: any[], key: BucketKey) {
    return this.expanded[key] ? list : list.slice(0, 2);
  }
  moreCount(list: any[]) {
    return Math.max(0, list.length - 2);
  }
  toggle(key: BucketKey) {
    this.expanded[key] = !this.expanded[key];
  }
}
