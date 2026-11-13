import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { saveAs } from 'file-saver';
import { Shifts } from '../../services/shifts/shifts';

@Component({
  selector: 'app-shift-adherence-report',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    DatePickerModule,
    TooltipModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './shift-adherence-report.html',
  styleUrl: './shift-adherence-report.css'
})
export class ShiftAdherenceReport implements OnInit {
  selectedMonth: Date = new Date();
  data: any = null;
  loading = false;
  exporting = false;

  selectedFilter: any = null;
  showFilterDropdown = false;
  searchText = '';
  filteredRows: any[] = [];
  filterOptions = [
    { label: 'Employee Code', value: 'employeeCode' },
    { label: 'Name', value: 'name' },
    { label: 'Department', value: 'department' },
  ];

  constructor(
    private shiftsService: Shifts,
    private toast: MessageService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  private monthYear(): { month: number; year: number } {
    const d = this.selectedMonth || new Date();
    return { month: d.getMonth() + 1, year: d.getFullYear() };
  }

  load(): void {
    const { month, year } = this.monthYear();
    this.loading = true;
    this.data = null;
    this.shiftsService.getShiftAdherenceReport(month, year).subscribe({
      next: (res) => {
      this.data = res;
      this.filteredRows = [...(res.rows || [])];

      this.applyFilter();

        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toast.add({ severity: 'error', summary: 'Failed', detail: 'Could not load the report.' });
      }
    });
  }

  export(): void {
    const { month, year } = this.monthYear();
    this.exporting = true;
    this.shiftsService.exportShiftAdherenceReport(month, year).subscribe({
      next: (blob) => {
        const label = this.data?.monthLabel || `${month}-${year}`;
        saveAs(blob, `shift-adherence-${String(label).replace(/\s+/g, '-').toLowerCase()}.xlsx`);
        this.exporting = false;
      },
      error: () => {
        this.exporting = false;
        this.toast.add({ severity: 'error', summary: 'Export failed', detail: 'Could not generate the Excel file.' });
      }
    });
  }

  cellClass(cell: any): string {
    switch (cell.type) {
      case 'MATCH': return 'c-match';
      case 'MISMATCH': return 'c-mismatch';
      case 'NO_SHIFT': return 'c-noshift';
      case 'WEEKOFF': return 'c-wo';
      case 'HOLIDAY': return 'c-holiday';
      case 'ABSENT': return 'c-absent';
      default: return 'c-empty';
    }
  }

  private short(name: string | null, type: string | null): string {
    const n = name || type || '';
    return n.length > 9 ? n.slice(0, 9) : n;
  }

  allottedShort(cell: any): string { return this.short(cell.allottedName, cell.allottedType); }
  workedShort(cell: any): string { return this.short(cell.workedName, cell.workedType); }

applyFilter(): void {
  const field = this.selectedFilter?.value;

  this.filteredRows = (this.data?.rows || []).filter((row: any) => {

    return String(row[field] || '')
      .toLowerCase()
      .includes(this.searchText.toLowerCase());
  });

}

  onSearch(event: Event):void {
    const input = event.target as HTMLInputElement;
      this.searchText = input.value.toLowerCase();

  this.applyFilter();
  }

  toggleFilterDropdown(): void {
    this.showFilterDropdown = !this.showFilterDropdown;
  }

selectFilter(option: any): void {

  this.selectedFilter = option;

  this.searchText = '';

  const searchBox = document.getElementById('searchBox') as HTMLInputElement;

  if (searchBox) {
    searchBox.value = '';
  }

  this.applyFilter();

  this.showFilterDropdown = false;
}
}
