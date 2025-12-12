import { Component, Input, ElementRef, ViewChild, Output, EventEmitter } from '@angular/core';
import SignaturePad from 'signature_pad';
import { FormBuilder, FormControl, FormArray, ReactiveFormsModule, Validators, FormGroup, FormsModule } from '@angular/forms';
import { RequisitionService } from '../../services/requisition-service/requisition-service';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { PanelModule } from 'primeng/panel';
import { FloatLabelModule } from 'primeng/floatlabel';
import { DatePickerModule } from 'primeng/datepicker';
import { TableModule } from 'primeng/table';
import { EditorModule } from 'primeng/editor';
import { TextareaModule } from 'primeng/textarea';
import { Departments } from '../../services/departments/departments';
import { DialogModule } from 'primeng/dialog';
import { Footer } from 'primeng/api';
import { MessageService } from 'primeng/api';


@Component({
  selector: 'app-requisition-form',
  imports: [CommonModule, ReactiveFormsModule, CardModule, InputText, SelectModule,
    DatePickerModule, CheckboxModule, ButtonModule, PanelModule, FloatLabelModule,
    TableModule, FormsModule, EditorModule, TextareaModule, DialogModule],
  templateUrl: './requisition-form.html',
  styleUrl: './requisition-form.css',
  providers: [MessageService]
})
export class RequisitionForm {
  requisitionForm!: FormGroup;
  currentStep: 'PENDING' | 'RAISED' | 'HOD' | 'COO' | 'HR' | 'CLOSED' | 'REJECTED' = 'PENDING';
  requisitionId?: number;
  requisitions: any[] = [];
  isRM: boolean = false;
  isManagement: boolean = false;
  isHRDept: boolean = false;
  isLoading: boolean = false;

  @Input()
  set requisition(req: any) {
    if (!req) return;

    this.requisitionId = req.id;
    this.requisitions = req;
    this.currentStep = this.mapStatusToStep(req.status);
    console.log('Received requisition input:', this.currentStep);

    // form may not be initialized yet
    if (this.requisitionForm) {
      console.log('Patching form with requisition:', req);
      this.requisitionForm.patchValue(req);
      if (req.reasonBreakdown && Array.isArray(req.reasonBreakdown)) {
        this.setReasonBreakdown(req.reasonBreakdown);
      }

      this.loadSignatures(req);
    } else {
      // store temporarily
      this._initialReq = req;
    }
  }
  private mapStatusToStep(status: string): 'PENDING' | 'RAISED' | 'HOD' | 'COO' | 'HR' | 'CLOSED' | 'REJECTED' {
    switch (status) {
      case 'RAISED':
        return 'HOD'; // waiting for HoD action
      case 'HOD_APPROVED':
        return 'COO'; // waiting for COO action
      case 'SMO_APPROVED':
        return 'HR';  // waiting for HR action
      case 'HR_RECEIVED':
        return 'CLOSED'; // workflow completed
      case 'REJECTED':
        return 'REJECTED'; // no more actions allowed
      default:
        return 'PENDING'; // default fallback
    }
  }

  private setReasonBreakdown(reasons: any[]) {
    const fa = this.fb.array<FormGroup>([]);  // 👈 tell Angular it's a FormArray of FormGroups

    reasons.forEach(r => {
      fa.push(this.fb.group({
        type: [r.type],
        count: [r.count],
        designation: [r.designation],
        details: [r.details],
        minExperience: [r.minExperience],
        maxExperience: [r.maxExperience]
      }));
    });

    this.requisitionForm.setControl('reasonBreakdown', fa);
    this.updateHeadcount();
  }



  private _initialReq: any;

  @Output() closeForm = new EventEmitter<void>();

  @ViewChild('raisedBySignatureCanvas') raisedByCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('hodSignatureCanvas') hodCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('smoSignatureCanvas') smoCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('hrSignatureCanvas') hrCanvasRef!: ElementRef<HTMLCanvasElement>;

  raisedBySignaturePad!: SignaturePad;
  hodSignaturePad!: SignaturePad;
  smoSignaturePad!: SignaturePad;
  hrSignaturePad!: SignaturePad;




  reasonOptions = [
    { label: 'New Opening', value: 'NEW_OPENING' },
    { label: 'Replacement', value: 'REPLACEMENT' },
    { label: 'Planned Addition', value: 'PLANNED_ADDITION' }
  ];

  sourceOptions = [
    { label: 'Advertisement', value: 'Advertisement' },
    { label: 'Internal Posting', value: 'Internal Posting' },
    { label: 'Agency', value: 'Agency' },
    { label: 'Database', value: 'Database' }
  ];

  // Example static department list, ideally fetched from API
  departments: any[] = [];

  reasons: any[] = [];
  totalVacancies = 0;


  // Load requisition and set currentStep based on its status
  loadRequisition(req: any) {
    this.currentStep = req.status as any;
  }
  getRejectedBy(): string {
    const req = this.requisitionForm.value;
    return req.hodRejectedBy || req.smoRejectedBy || req.hrRejectedBy || 'Unknown';
  }

  getRejectedReason(): string {
    const req = this.requisitionForm.value;
    return req.hodRejectedComments || req.smoRejectedComments || req.hrRejectedComments || 'No reason provided';
  }

  getRejectedDate(): string {
    const req = this.requisitionForm.value;
    return req.hodRejectedDate || req.smoRejectedDate || req.hrRejectedDate || '';
  }



  constructor(private fb: FormBuilder, private requisitionService: RequisitionService, 
    private departmentService: Departments, private messageService: MessageService) { }


  ngOnInit(): void {
    this.requisitionForm = this.fb.group({
      // Job info
      title: ['', Validators.required],
      departmentId: ['', Validators.required],
      location: [''],
      headcount: [1, Validators.required],
      createdBy: [localStorage.getItem('empId') || ''], // logged-in HR

      // Requisition-specific
      designation: [''],
      reasonType: ['NEW_OPENING'],
      reasonDetails: [''],
      reasonBreakdown: this.fb.array([]),
      vacancies: [null],
      skills: [''],
      education: [''],

      eduSSC: [false],
      eduSSCDetail: [''],
      eduDiploma: [false],
      eduDiplomaDetail: [''],
      eduBachelor: [false],
      eduBachelorDetail: [''],
      eduMaster: [false],
      eduMasterDetail: [''],
      eduOther: [''],
      eduOtherDetail: [false],
      training: [''],

      urgent: [false],
      duration: [''],
      reportingTo: [''],

      raisedBy: [''],
      raisedBySign: [''],
      raisedByDate: [''],
      raisedByComments: [''],

      approvedByHoD: [''],
      hodSign: [''],
      approvedByHoDDate: [''],
      approvedByHoDComments: [''],

      approvedBySMO: [''],
      smoSign: [''],
      approvedBySMODate: [''],
      approvedBySMOComments: [''],

      receivedByHR: [''],
      hrSign: [''],
      receivedByHRDate: [''],
      receivedByHRComments: [''],

      hodRejectedBy: [''],
      hodRejectedDate: [''],
      hodRejectedComments: [''],

      smoRejectedBy: [''],
      smoRejectedDate: [''],
      smoRejectedComments: [''],

      hrRejectedBy: [''],
      hrRejectedDate: [''],
      hrRejectedComments: [''],

      hrReferenceNo: [''],
      salaryRange: [''],
      source: [''],
      actionTaken: [''],
      closedOn: [null]
    });
    if (this._initialReq) {
      this.requisitionForm.patchValue(this._initialReq);
      if (this._initialReq.reasonBreakdown) {
        this.setReasonBreakdown(this._initialReq.reasonBreakdown);
      }

      this.loadSignatures(this._initialReq);
      this._initialReq = null;
    }
    if (!this.requisitionId) {
      this.addReason(); // Start with one reason entry
    }
    this.loadDepartments();
    const roleId = Number(localStorage.getItem('roleId'));
  const deptId = Number(localStorage.getItem('departmentId'));

  this.isRM = roleId === 3 || roleId === 5;          // RM or HOD
  this.isManagement = roleId === 4;                  // Management
  this.isHRDept = deptId === 1;   
  }

  get reasonBreakdown(): FormArray {
    return this.requisitionForm.get('reasonBreakdown') as FormArray;
  }


  addReason() {
    this.reasonBreakdown.push(this.fb.group({
      type: ['NEW_OPENING'],
      count: [0],
      designation: [''],
      details: [''],
      minExperience: [null],
      maxExperience: [null]
    }));
    this.updateHeadcount();
  }

  removeReason(index: number) {
    this.reasonBreakdown.removeAt(index);
    this.updateHeadcount();
  }

  updateHeadcount() {
    const total = this.reasonBreakdown.controls.reduce((sum, ctrl) => {
      return sum + (ctrl.get('count')?.value || 0);
    }, 0);
    this.totalVacancies = total;
    this.requisitionForm.patchValue({ headcount: total });
  }

  updateForm() {
    this.requisitionForm.patchValue({ reasonBreakdown: this.reasons });
  }

  loadDepartments() {
    this.departmentService.getDepartments().subscribe({
      next: (data) => this.departments = data,
      error: (err) => console.error('Error loading departments:', err)
    });
  }


  onSubmit() {
    if (this.requisitionForm.valid) {
      this.isLoading = true;
      this.saveSignature('raisedBy');
      this.requisitionService.createRequisition(this.requisitionForm.value).subscribe({
        next: () => {
          this.isLoading = false;
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Requisition submitted successfully.' });
          this.backToList();
        },
        error: (err) => {
          console.error(err);
          this.isLoading = false;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to submit requisition.' });
        }
      });
    }
  }


  ngAfterViewInit() {
    this.raisedBySignaturePad = new SignaturePad(this.raisedByCanvasRef.nativeElement);
    this.hodSignaturePad = new SignaturePad(this.hodCanvasRef.nativeElement);
    this.smoSignaturePad = new SignaturePad(this.smoCanvasRef.nativeElement);
    this.hrSignaturePad = new SignaturePad(this.hrCanvasRef.nativeElement);
  }

  saveAllSignatures() {
    if (!this.raisedBySignaturePad.isEmpty()) {
      this.requisitionForm.patchValue({ raisedBySign: this.raisedBySignaturePad.toDataURL() });
    }
    if (!this.hodSignaturePad.isEmpty()) {
      this.requisitionForm.patchValue({ hodSign: this.hodSignaturePad.toDataURL() });
    }
    if (!this.smoSignaturePad.isEmpty()) {
      this.requisitionForm.patchValue({ smoSign: this.smoSignaturePad.toDataURL() });
    }
    if (!this.hrSignaturePad.isEmpty()) {
      this.requisitionForm.patchValue({ hrSign: this.hrSignaturePad.toDataURL() });
    }
  }
  clearSignature(role: 'raisedBy' | 'hod' | 'smo' | 'hr') {
    switch (role) {
      case 'raisedBy':
        this.raisedBySignaturePad.clear();
        this.requisitionForm.patchValue({ raisedBySign: '' });
        break;
      case 'hod':
        this.hodSignaturePad.clear();
        this.requisitionForm.patchValue({ hodSign: '' });
        break;
      case 'smo':
        this.smoSignaturePad.clear();
        this.requisitionForm.patchValue({ smoSign: '' });
        break;
      case 'hr':
        this.hrSignaturePad.clear();
        this.requisitionForm.patchValue({ hrSign: '' });
        break;
    }
  }


  saveSignature(role: 'raisedBy' | 'hod' | 'smo' | 'hr') {
    const now = new Date().toLocaleString(); // capture system date/time

    switch (role) {
      case 'raisedBy':
        if (!this.raisedBySignaturePad.isEmpty()) {
          this.requisitionForm.patchValue({
            raisedBySign: this.raisedBySignaturePad.toDataURL(),
            raisedByDate: now
          });
        }
        break;

      case 'hod':
        if (!this.hodSignaturePad.isEmpty()) {
          this.requisitionForm.patchValue({
            hodSign: this.hodSignaturePad.toDataURL(),
            approvedByHoDDate: now
          });
        }
        break;

      case 'smo':
        if (!this.smoSignaturePad.isEmpty()) {
          this.requisitionForm.patchValue({
            smoSign: this.smoSignaturePad.toDataURL(),
            approvedBySMODate: now
          });
        }
        break;

      case 'hr':
        if (!this.hrSignaturePad.isEmpty()) {
          this.requisitionForm.patchValue({
            hrSign: this.hrSignaturePad.toDataURL(),
            receivedByHRDate: now
          });
        }
        break;
    }
  }
  // Approvals - Approve
  submitApproval(step: 'RAISED' | 'HOD' | 'COO' | 'HR') {
    this.saveSignature(step.toLowerCase() as any);
    this.isLoading = true;

    const payload = {
      step,
      approverName: this.getApproverName(step),
      signature: this.getSignatureBase64(step),
      comments: this.getComments(step),
      reject: false
    };

    this.requisitionService.updateStatus(this.requisitionId!, payload).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.currentStep = res.status;
        this.requisitionForm.patchValue(res); // refresh form with locked fields
        this.messageService.add({ severity: 'success', summary: 'Success', detail: `Requisition ${step} approved.` });
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: `Failed to approve requisition at ${step} step.` });
      }
    });
  }

  // Approvals - Reject
  // rejectApproval(step: 'HOD' | 'COO' | 'HR') {
  //   // raisedBy cannot reject its own submission
  //   const payload = {
  //     step,
  //     approverName: this.getApproverName(step),
  //     signature: this.getSignatureBase64(step),
  //     comments: this.getComments(step), // rejection reason
  //     reject: true
  //   };

  //   this.requisitionService.updateStatus(this.requisitionId!, payload).subscribe({
  //     next: (res) => {
  //       this.currentStep = res.status; // should become REJECTED
  //       this.requisitionForm.patchValue(res);
  //     },
  //     error: (err) => console.error(err)
  //   });
  // }
  rejectDialogVisible = false;
  rejectionComments = '';
  pendingRejectStep: 'HOD' | 'COO' | 'HR' | null = null;

  openRejectDialog(step: 'HOD' | 'COO' | 'HR') {
    this.pendingRejectStep = step;
    this.rejectDialogVisible = true;
  }

  confirmReject() {
    if (!this.pendingRejectStep) return;

    const approverName = localStorage.getItem('username') || 'Unknown';
    const now = new Date().toISOString();

    const payload = {
      step: this.pendingRejectStep,
      approverName,
      signature: '',
      comments: this.rejectionComments,
      reject: true,
      rejectedDate: now
    };

    this.requisitionService.updateStatus(this.requisitionId!, payload).subscribe({
      next: (res) => {
        this.currentStep = res.status;
        this.requisitionForm.patchValue(res);
        this.rejectDialogVisible = false;
        this.rejectionComments = '';
        this.pendingRejectStep = null;
      },
      error: (err) => console.error(err)
    });
  }


  // Helpers
  private getApproverName(step: 'RAISED' | 'HOD' | 'COO' | 'HR'): string {
    return this.requisitionForm.value[
      step === 'RAISED' ? 'raisedBy' :
        step === 'HOD' ? 'approvedByHoD' :
          step === 'COO' ? 'approvedBySMO' :
            'receivedByHR'
    ];
  }

  private getComments(step: 'RAISED' | 'HOD' | 'COO' | 'HR'): string {
    return this.requisitionForm.value[
      step === 'RAISED' ? 'raisedByComments' :
        step === 'HOD' ? 'approvedByHoDComments' :
          step === 'COO' ? 'approvedBySMOComments' :
            'receivedByHRComments'
    ];
  }

  getSignatureBase64(step: 'RAISED' | 'HOD' | 'COO' | 'HR'): string {
    switch (step) {
      case 'RAISED': return this.requisitionForm.value.raisedBySign;
      case 'HOD': return this.requisitionForm.value.hodSign;
      case 'COO': return this.requisitionForm.value.smoSign;
      case 'HR': return this.requisitionForm.value.hrSign;
    }
  }

  backToList() {
    this.closeForm.emit();
  }
  private loadSignatures(req: any) {
    setTimeout(() => {
      if (req.raisedBySign && this.raisedBySignaturePad) {
        this.raisedBySignaturePad.fromDataURL(req.raisedBySign);
      }
      if (req.hodSign && this.hodSignaturePad) {
        this.hodSignaturePad.fromDataURL(req.hodSign);
      }
      if (req.smoSign && this.smoSignaturePad) {
        this.smoSignaturePad.fromDataURL(req.smoSign);
      }
      if (req.hrSign && this.hrSignaturePad) {
        this.hrSignaturePad.fromDataURL(req.hrSign);
      }
    }, 0);
  }

  submitHRUseOnly() {
    const payload = {
      step: "HR_USE_ONLY",
      hrReferenceNo: this.requisitionForm.value.hrReferenceNo,
      salaryRange: this.requisitionForm.value.salaryRange,
      source: this.requisitionForm.value.source,
      actionTaken: this.requisitionForm.value.actionTaken,
      closedOn: this.requisitionForm.value.closedOn, // HR enters date here
    };

    this.requisitionService.updateStatus(this.requisitionId!, payload).subscribe({
      next: (res) => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'HR details updated successfully.' });
        this.currentStep = res.status; // will become CLOSED
        this.requisitionForm.patchValue(res);
      },
      error: (err) => {
        console.error(err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update HR details.' });
      }
    });
  }


}
