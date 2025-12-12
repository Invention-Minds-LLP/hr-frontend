import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Posh } from '../../services/posh/posh';
import { DatePicker } from "primeng/datepicker";
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { Button, ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'app-posh-hearing',
  imports: [DatePicker, CommonModule, CardModule, TableModule, ButtonModule, ReactiveFormsModule, InputTextModule, TextareaModule],
  templateUrl: './posh-hearing.html',
  styleUrl: './posh-hearing.css'
})
export class PoshHearing {
  @Input() caseId!: number;
  hearings: any[] = [];
  form: FormGroup;
  isLoading = false;

  constructor(
    private poshService: Posh,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      date: [null, Validators.required],
      notes: [''],
      outcome: [''],
      createdAt: [new Date()]
    });
  }

  ngOnInit() {
    console.log(this.caseId)
    if (this.caseId) {
      this.loadHearings();
    }
  }

  loadHearings() {
    this.poshService.getHearings(this.caseId).subscribe(data => {
      this.hearings = data;
      console.log(data);
    });
  }
  ngOnChanges(changes: SimpleChanges) {
    if (changes['caseId'] && changes['caseId'].currentValue) {
      this.loadHearings();
    }
  }

  submit() {
    if (this.form.valid) {
      this.isLoading = true;
      this.poshService.addHearing(this.caseId, this.form.value).subscribe(() => {
        this.loadHearings();
        this.isLoading = false;
        this.form.reset({
          createdAt : new Date()
        });
      });
    }
  }
}
