
import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Posh } from '../../services/posh/posh';
import { Employees } from '../../services/employees/employees';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { CommonModule } from '@angular/common';
import { TextareaModule } from 'primeng/textarea';
import { InputTextModule } from 'primeng/inputtext';


@Component({
  selector: 'app-posh-form',
  imports: [ButtonModule, SelectModule, CommonModule, ReactiveFormsModule, TextareaModule, InputTextModule],
  templateUrl: './posh-form.html',
  styleUrl: './posh-form.css'
})
export class PoshForm {
  form: FormGroup;
  employees: any[] = [];
  @Output() saved = new EventEmitter<void>();
  complaintId!: string | '';
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private poshService: Posh,
    private employeeService: Employees,
  ) {
    this.form = this.fb.group({
      complainantId: [''],
      accusedId: [null, Validators.required],
      description: ['', Validators.required],
    });
  }

  ngOnInit() {
    this.employeeService.getActiveEmployees().subscribe(data => {
      this.employees = data.map(e => ({ id: e.id, name: `${e.firstName} ${e.lastName}` }));
    });
    this.complaintId = localStorage.getItem('empId') || ''
  }

  submit() {
    if (this.form.valid) {
      this.isLoading = true;
      this.form.value.complainantId = this.complaintId || '';
      this.poshService.create(this.form.value).subscribe(() => {
        this.isLoading = false;
        this.saved.emit();
        this.form.reset();
      });
    }
  }
}
