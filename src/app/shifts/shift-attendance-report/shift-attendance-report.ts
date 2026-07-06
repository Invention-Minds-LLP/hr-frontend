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
  selector: 'app-shift-attendance-report',
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
  templateUrl: './shift-attendance-report.html',
  styleUrl: './shift-attendance-report.css'
})
export class ShiftAttendanceReport implements OnInit {
  selectedMonth: Date = new Date();
  data: any = null;
  loading = false;
  exporting = false;

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
    this.shiftsService.getShiftAttendanceReport(month, year).subscribe({
      next: (res) => {
        this.data = res;
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
    this.shiftsService.exportShiftAttendanceReport(month, year).subscribe({
      next: (blob) => {
        const label = this.data?.monthLabel || `${month}-${year}`;
        saveAs(blob, `shift-attendance-${String(label).replace(/\s+/g, '-').toLowerCase()}.xlsx`);
        this.exporting = false;
      },
      error: () => {
        this.exporting = false;
        this.toast.add({ severity: 'error', summary: 'Export failed', detail: 'Could not generate the Excel file.' });
      }
    });
  }

  // ---- cell helpers ----
  cellClass(cell: any): string {
    switch (cell.type) {
      case 'WEEKOFF': return 'c-wo';
      case 'HOLIDAY': return 'c-holiday';
      case 'ABSENT': return 'c-absent';
      case 'EMPTY': return 'c-empty';
      case 'WORK': return 'c-work shift-' + (cell.shiftType || 'DEFAULT');
      default: return 'c-empty';
    }
  }

  inClass(cell: any): string {
    if (!cell.checkIn) return 'muted';
    return (cell.timing === 'LATE' || cell.timing === 'LATE_EARLY') ? 'late' : 'ok';
  }

  outClass(cell: any): string {
    if (!cell.checkOut) return 'muted';
    return (cell.timing === 'EARLY' || cell.timing === 'LATE_EARLY') ? 'late' : 'ok';
  }

  shiftShort(cell: any): string {
    const n = cell.shiftName || cell.shiftType || '';
    return n.length > 10 ? n.slice(0, 10) : n;
  }
}
