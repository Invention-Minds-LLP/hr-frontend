import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PipService } from '../../services/pip/pip.service';

@Component({
  selector: 'app-pip-response-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, TextareaModule, ToastModule],
  templateUrl: './pip-response-form.html',
  styleUrl: './pip-response-form.css',
  providers: [MessageService],
})
export class PipResponseForm implements OnInit {
  token = '';
  responseText = '';
  submitting = false;
  submitted = false;
  alreadyUsed = false;
  invalid = false;
  result: any = null;

  constructor(
    private route: ActivatedRoute,
    private pipService: PipService,
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.token) this.invalid = true;
  }

  submit() {
    if (!this.responseText.trim()) return;
    this.submitting = true;
    this.pipService.respondViaToken(this.token, this.responseText).subscribe({
      next: (res) => {
        this.submitting = false;
        this.submitted = true;
        this.result = res;
      },
      error: (e) => {
        this.submitting = false;
        if (e.status === 409) this.alreadyUsed = true;
        else if (e.status === 404) this.invalid = true;
      },
    });
  }
}
