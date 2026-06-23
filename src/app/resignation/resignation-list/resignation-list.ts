import { Component } from '@angular/core';
import { forkJoin } from 'rxjs';
import { CommonModule, DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { Resignation } from '../../services/resignation/resignation';
import { DialogModule } from 'primeng/dialog';
import { ResignPost } from '../resign-post/resign-post';
import { RouterLink, RouterModule } from '@angular/router';
import { label } from '@primeuix/themes/aura/metergroup';
import { value } from '@primeuix/themes/aura/knob';
import { IconField, IconFieldModule } from 'primeng/iconfield';
import { InputIcon, InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Departments } from '../../services/departments/departments';
import { Tooltip, TooltipModule } from "primeng/tooltip";
import { ToolbarModule } from 'primeng/toolbar';
import { SkeletonModule } from 'primeng/skeleton';
import { DatePicker, DatePickerModule } from 'primeng/datepicker';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { FileUrlPipe } from '../../pipes/file-url.pipe';


@Component({
  selector: 'app-resignation-list',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, DatePipe, DialogModule, ResignPost,
    RouterModule, IconFieldModule, InputIconModule, InputTextModule, TooltipModule, SkeletonModule, DatePickerModule, FormsModule, ToolbarModule, FileUrlPipe],
  templateUrl: './resignation-list.html',
  styleUrl: './resignation-list.css'
})
export class ResignationList {
  rows: any[] = [];
  role = (localStorage.getItem('role') || '');
  employeeId = Number(localStorage.getItem('empId') || 0);
  managerId = this.employeeId; // assumes logged in user is potential manager
  showPostHr = false;
  isHR = ['HR', 'HR MANAGER'].includes((localStorage.getItem('role') || '').toUpperCase());

  filteredRows: any[] = []
  showFilterDropdown = false
  selectedFilter: any = null;
  noteSubmitting = false;
  approveSubmitting = false;


  filterOptions = [
    { label: 'Name', value: 'name' },
    { label: 'Status', value: 'status' },
    { label: 'Department', value: 'department' }

  ]

  loading = true

  departments: any[] = [];
  departmentMap: Record<number, string> = {};
  selectedRecord: any = null;

  showApprovePopup = false;
  selectedLwd: Date | null = null;
  noteDialogVisible = false;
  noteDialogTitle = '';
  noteDialogAction: any = null;
  noteText = '';
  currentRecord: any = null;
  // buttonLoading: Record<number, boolean> = {};
  buttonLoading: Record<string, boolean> = {};




  constructor(private api: Resignation, private dept: Departments) { }

  ngOnInit() {
    // const norm = this.normalize(this.role);
    this.loadResignations();
    console.log('User Role:', this.role);
    this.dept.getDepartments().subscribe((depts: any[]) => {
      this.departments = depts;

      this.departmentMap = this.departments.reduce((map, dept) => {
        map[dept.id] = dept.name;
        return map;
      }, {} as Record<number, string>);
    });

    this.filteredRows = [...this.rows]
    document.addEventListener('click', this.handleOutsideClick);
  }

  handleOutsideClick = (event: Event) => {
    const dropdown = document.getElementById('filterDropdown');
    const btn = document.getElementById('filterButton');

    if (!dropdown || !btn) return;

    if (!dropdown.contains(event.target as Node) &&
      !btn.contains(event.target as Node)) {
      this.showFilterDropdown = false;
    }
  };

  // loadResignations() {
  //   if (this.role === 'HR' || this.role === 'HR Manager' || this.role === 'Management') {
  //     this.api.list({ scope: 'all' }).subscribe(r => {
  //       this.rows = r;
  //       this.filteredRows = [...this.rows]
  //       // console.log(this.filteredRows)
  //     });
  //   } else if (this.role === 'Reporting Manager' || this.role === 'Manager' || this.role === 'HR Manager') {
  //     this.api.list({ scope: 'manager', managerId: this.managerId }).subscribe(r => {
  //       this.rows = r
  //       this.filteredRows = [...this.rows]
  //       // console.log(this.filteredRows)
  //     });
  //   } else {
  //     this.api.list({ scope: 'mine', employeeId: this.employeeId }).subscribe(r => {
  //       this.rows = r
  //       this.filteredRows = [...this.rows]
  //       // console.log(this.filteredRows)
  //     });
  //   }


  //   setTimeout(() => {
  //     this.loading = false
  //   }, 2000)
  // }

  loadResignations() {
    const mapRows = (list: any[]) =>
      (list || []).map(r => ({
        ...r,
        gender: r.employee?.gender,
        photoUrl: r.employee?.photoUrl
      }));

    // De-dup helper for the manager case where we union "team" + "own" rows.
    // The same row can never appear twice in practice (an employee can't be
    // their own reporting manager), but the dedup is cheap insurance.
    const mergeUnique = (...lists: any[][]) => {
      const seen = new Map<number, any>();
      for (const list of lists) {
        for (const row of list || []) {
          if (!seen.has(row.id)) seen.set(row.id, row);
        }
      }
      return Array.from(seen.values()).sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    };

    if (this.role === 'HR' || this.role === 'HR Manager' || this.role === 'Management') {
      this.api.list({ scope: 'all' }).subscribe(r => {
        this.rows = mapRows(r);
        this.filteredRows = [...this.rows];
      });
    }
    else if (this.role === 'Reporting Manager' || this.role === 'Manager') {
      // Reporting managers / HODs see TWO things in one list:
      //   1. Their team's resignations (scope=manager)
      //   2. Their OWN resignation if they raised one (scope=mine)
      // Previously only #1 was fetched, so an HOD who resigned themselves
      // saw an empty list and assumed it failed.
      forkJoin({
        team: this.api.list({ scope: 'manager', managerId: this.managerId }),
        mine: this.api.list({ scope: 'mine',    employeeId: this.employeeId }),
      }).subscribe(({ team, mine }) => {
        this.rows = mapRows(mergeUnique(team, mine));
        this.filteredRows = [...this.rows];
      });
    }
    else {
      this.api.list({ scope: 'mine', employeeId: this.employeeId }).subscribe(r => {
        this.rows = mapRows(r);
        this.filteredRows = [...this.rows];
      });
    }

    setTimeout(() => {
      this.loading = false;
    }, 2000);
  }
  // approveManager(r: any) {
  //   this.api.managerApprove(r.id, {}).subscribe(upd => this.replace(upd));
  // }
  approveManager(r: any) {
    const key = `managerApprove-${r.id}`;
    this.setLoading(key, true);
    // this.setLoading(r.id, true);
    this.api.managerApprove(r.id, {}).subscribe({
      next: upd => this.replace(upd),
      error: () => { },
      complete: () => this.setLoading(key, false)
    });
  }

  // rejectManager(r: any) {
  //   const note = prompt('Rejection reason?') || '';
  //   this.api.managerReject(r.id, { note }).subscribe(upd => this.replace(upd));
  // }
  // rejectManager(r: any) {
  //   this.openNoteDialog(r, "Manager Rejection Reason", (id: number, note: string) => {
  //     this.api.managerReject(id, { note })
  //       .subscribe(upd => this.replace(upd));
  //   });
  // }

rejectManager(r: any) {
  this.openNoteDialog(r, "Manager Rejection Reason", (id: number, note: string) => {
    const key = `managerReject-${id}`;
    this.setLoading(key, true);

    this.api.managerReject(id, { note }).subscribe({
      next: upd => this.replace(upd),
      complete: () => this.setLoading(key, false)
    });
  });
}





  approveHR(r: any) {
    const lwd = prompt('Actual Last Working Day (yyyy-mm-dd)? Leave blank to keep proposed.') || '';
    this.api.hrApprove(r.id, { actualLastWorkingDay: lwd || undefined }).subscribe(upd => this.replace(upd));
  }
  // rejectHR(r: any) {
  //   const note = prompt('Rejection reason?') || '';
  //   this.api.hrReject(r.id, { note }).subscribe(upd => this.replace(upd));
  // }
  // rejectHR(r: any) {
  //   this.openNoteDialog(r, "HR Rejection Reason", (id: number, note: string) => {
  //     this.api.hrReject(id, { note })
  //       .subscribe(upd => this.replace(upd));
  //   });
  // }
rejectHR(r: any) {
  this.openNoteDialog(r, "HR Rejection Reason", (id: number, note: string) => {
    const key = `hrReject-${id}`;
    this.setLoading(key, true);

    return this.api.hrReject(id, { note }).pipe(
      finalize(() => this.setLoading(key, false))
    ).subscribe(upd => this.replace(upd));
  });
}


  // cancelHR(r: any) {
  //   this.api.hrCancel(r.id).subscribe(upd => this.replace(upd));
  // }

cancelHR(r: any) {
  const key = `hrCancel-${r.id}`;
  this.setLoading(key, true);

  this.api.hrCancel(r.id).subscribe({
    next: upd => this.replace(upd),
    complete: () => this.setLoading(key, false)
  });
}



  openApprovePopup(r: any) {
    this.selectedRecord = r;
    this.selectedLwd = null;
    this.showApprovePopup = true;
  }

  // submitHRApproval() {
  //   if (!this.selectedRecord) return;

  //   const id = this.selectedRecord.id;
  //   this.setLoading(id, true);

  //   const payload = {
  //     // actualLastWorkingDay: this.selectedLwd
  //     //   ? this.selectedLwd.toISOString().split('T')[0] // gives "yyyy-mm-dd"
  //     //   : undefined,
  //     actualLastWorkingDay: this.selectedLwd
  //       ? this.formatDate(this.selectedLwd)
  //       : undefined,

  //   };


  //   // this.api.hrApprove(this.selectedRecord.id, payload).subscribe({
  //   //   next: (upd) => {
  //   //     this.replace(upd);
  //   //     this.showApprovePopup = false;
  //   //   },
  //   //   error: (err) => console.error(err),
  //   // });
  //   this.api.hrApprove(this.selectedRecord.id, payload).subscribe({
  //     next: upd => {
  //       this.replace(upd);
  //       this.showApprovePopup = false;
  //     },
  //     error: () => { },
  //     complete: () => this.setLoading(this.selectedRecord.id, false)
  //   });
  // }

// submitHRApproval() {
//   if (!this.selectedRecord) return;

//   const id = this.selectedRecord.id;
//   const key = `hrApprove-${id}`;

//   this.setLoading(key, true);

//   const payload = {
//     actualLastWorkingDay: this.selectedLwd
//       ? this.formatDate(this.selectedLwd)
//       : undefined,
//   };

//   this.api.hrApprove(id, payload).subscribe({
//     next: upd => {
//       this.replace(upd);
//       this.showApprovePopup = false;
//     },
//     complete: () => this.setLoading(key, false)
//   });
// }
submitHRApproval() {
  if (!this.selectedRecord) return;

  const id = this.selectedRecord.id;
  const key = `hrApprove-${id}`;

  this.approveSubmitting = true;   // ← add this
  this.setLoading(key, true);

  const payload = {
    actualLastWorkingDay: this.selectedLwd
      ? this.formatDate(this.selectedLwd)
      : undefined,
  };

  this.api.hrApprove(id, payload).subscribe({
    next: upd => {
      this.replace(upd);
      this.showApprovePopup = false;
    },
    error: () => {},
    complete: () => {
      this.approveSubmitting = false;   // ← add this
      this.setLoading(key, false);
    }
  });
}




  private replace(upd: any) {
    this.rows = this.rows.map(x => x.id === upd.id ? upd : x);
    this.loadResignations()
  }

  private normalize(s: string) {
    const n = s.trim().replace(/[_\s]+/g, ' ');
    const map: Record<string, string> = {
      'hr': 'hr',
      'human resources': 'hr',
      'hr manager': 'hr manager',
      'hrm': 'hr manager',
      'reporting manager': 'reporting manager',
      'manager': 'reporting manager'
    };
    return map[n] || s.toLowerCase().replace(/\s+/g, '_');
  }
  // holdHR(r: any) {
  //   const note = prompt('Reason for putting on hold?') || '';
  //   this.api.hrHold(r.id, { note }).subscribe(upd => this.replace(upd));
  // }
  // holdHR(r: any) {
  //   this.openNoteDialog(r, "Put Resignation On Hold", (id: number, note: string) => {
  //     this.api.hrHold(id, { note })
  //       .subscribe(upd => this.replace(upd));
  //   });
  // }
holdHR(r: any) {
  this.openNoteDialog(r, "Put Resignation On Hold", (id: number, note: string) => {
    const key = `hrHold-${id}`;
    this.setLoading(key, true);

    return this.api.hrHold(id, { note }).pipe(
      finalize(() => this.setLoading(key, false))
    ).subscribe(upd => this.replace(upd));
  });
}



  dialogOpen: Record<number, boolean> = {};

  openDialog(id: number) { this.dialogOpen[id] = true; }
  closeDialog(id: number) { this.dialogOpen[id] = false; }
  isOpen(id: number) { return !!this.dialogOpen[id]; }
  // approveWithdrawHR(r: any) {
  //   const note = prompt('Optional note for approving withdraw?') || '';
  //   this.api.hrApproveWithdraw(r.id, { note, approvedBy: this.employeeId })
  //     .subscribe(upd => this.replace(upd));
  // }
  // approveWithdrawHR(r: any) {
  //   this.openNoteDialog(r, "Approve Withdraw – Optional Note", (id: number, note: string) => {
  //     this.api.hrApproveWithdraw(id, { note, approvedBy: this.employeeId })
  //       .subscribe(upd => this.replace(upd));
  //   });
  // }
approveWithdrawHR(r: any) {
  this.openNoteDialog(r, "Approve Withdraw – Optional Note", (id: number, note: string) => {
    const key = `approveWithdraw-${id}`;
    this.setLoading(key, true);

    return this.api.hrApproveWithdraw(id, { note, approvedBy: this.employeeId }).pipe(
      finalize(() => this.setLoading(key, false))
    ).subscribe(upd => this.replace(upd));
  });
}



  // rejectWithdrawHR(r: any) {
  //   const note = prompt('Reason for rejecting withdraw?') || '';
  //   this.api.hrRejectWithdraw(r.id, { note, rejectedBy: this.employeeId })
  //     .subscribe(upd => this.replace(upd));
  // }

  // rejectWithdrawHR(r: any) {
  //   this.openNoteDialog(r, "Reject Withdraw – Reason", (id: number, note: string) => {
  //     this.api.hrRejectWithdraw(id, { note, rejectedBy: this.employeeId })
  //       .subscribe(upd => this.replace(upd));
  //   });
  // }
rejectWithdrawHR(r: any) {
  this.openNoteDialog(r, "Reject Withdraw – Reason", (id: number, note: string) => {
    const key = `rejectWithdraw-${id}`;
    this.setLoading(key, true);

    return this.api.hrRejectWithdraw(id, { note, rejectedBy: this.employeeId }).pipe(
      finalize(() => this.setLoading(key, false))
    ).subscribe(upd => this.replace(upd));
  });
}





  toggleFilterDropdown() {
    this.showFilterDropdown = !this.showFilterDropdown;
  }

  selectFilter(option: any) {
    this.selectedFilter = option;
    const sb = document.getElementById('searchBox') as HTMLInputElement;
    if (sb) sb.value = '';
    this.filteredRows = [...this.rows];
    this.showFilterDropdown = false;
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    const searchText = input.value.trim().toLowerCase();

    if (!this.selectedFilter || !searchText) {
      this.filteredRows = [...this.rows];
      return;
    }
    if (!searchText) {
      this.filteredRows = [...this.rows];
      return;
    }

    const filterKey = this.selectedFilter.value;

    this.filteredRows = this.rows.filter(r => {
      if (filterKey === 'name') {
        const fullName = `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.toLowerCase();
        return fullName.includes(searchText);
      } else if (filterKey === 'department') {
        const deptName = this.departmentMap[r.employee?.departmentId] || '';
        return deptName.toLowerCase().includes(searchText);
      }
      else if (filterKey) {
        const val = r[filterKey];
        return val?.toString().toLowerCase().includes(searchText);
      }
      console.log(this.filteredRows)
    }

    )

  }

  getDepartmentColors(departmentId: number) {
    const baseHue = (departmentId * 40) % 360;
    const badgeColor = `hsl(${baseHue}, 70%, 85%)`;
    const dotColor = `hsl(${baseHue}, 70%, 40%)`;

    return { badgeColor, dotColor };
  }
  openNoteDialog(record: any, title: string, action: Function) {
    this.currentRecord = record;
    this.noteDialogTitle = title;
    this.noteDialogAction = action;   // store function to call on submit
    this.noteText = '';
    this.noteDialogVisible = true;
  }
  // submitNoteDialog() {
  //   if (!this.noteDialogAction || !this.currentRecord) return;

  //   this.noteDialogAction(this.currentRecord.id, this.noteText);

  //   this.noteDialogVisible = false;
  //   this.noteText = '';
  // }
  submitNoteDialog() {
    if (!this.noteDialogAction || !this.currentRecord) return;

    this.noteSubmitting = true;

    const done = () => {
      this.noteSubmitting = false;
      this.noteDialogVisible = false;
      this.noteText = '';
    };

    const result = this.noteDialogAction(this.currentRecord.id, this.noteText);

    // if it returns observable
    if (result?.subscribe) {
      result.subscribe({
        complete: done,
        error: done
      });
    } else {
      done();
    }
  }


  getDefaultImage(gender?: string | null): string {
    const g = gender?.toUpperCase?.() || 'MALE';
    return g === 'FEMALE'
      ? '/img-women.png'
      : '/img.png';
  }
  formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  // setLoading(id: number, state: boolean) {
  //   this.buttonLoading[id] = state;
  // }
  // isLoading(id: number) {
  //   return !!this.buttonLoading[id];
  // }
  setLoading(key: string, state: boolean) {
    this.buttonLoading[key] = state;
  }

  isLoading(key: string) {
    return !!this.buttonLoading[key];
  }
isManagerOf(r: any): boolean {
  console.log(r.managerId === this.employeeId)
  return r.managerId === this.employeeId;
}
}
