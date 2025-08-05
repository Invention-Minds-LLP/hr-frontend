import { Component, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, FormControl } from '@angular/forms';
import { Employees } from '../../services/employees/employees';
import { Departments } from '../../services/departments/departments';
import { Branches } from '../../services/branches/branches';
import { Roles } from '../../services/roles/roles';
import { CommonModule } from '@angular/common';
import { DatePickerModule, DatePicker } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { FileUploadModule } from 'primeng/fileupload';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { StepsModule } from 'primeng/steps';
import { FloatLabel } from 'primeng/floatlabel';
import { NgModule } from '@angular/core';
import { Checkbox } from 'primeng/checkbox';
import { StepperModule } from 'primeng/stepper';
import { Shifts } from '../../services/shifts/shifts';


@Component({
  selector: 'app-employee-form',
  imports: [CommonModule, ButtonModule, Select, InputTextModule, FileUploadModule, ToastModule, ReactiveFormsModule, StepsModule, DatePicker, FloatLabel, FormsModule, Checkbox, StepperModule],
  templateUrl: './employee-form.html',
  styleUrl: './employee-form.css'
})
export class EmployeeForm {
  @Input() employeeData: any = null;
  @Output() closeForm = new EventEmitter<boolean>();

  employeeForm!: FormGroup;
  activeIndex = 0;

  steps = [
    { label: 'Personal Info' },
    { label: 'Employment Info' },
    { label: 'Qualifications' },
    { label: 'Documents' }
  ];

  genders = [
    { label: 'Male', value: 'MALE' },
    { label: 'Female', value: 'FEMALE' },
    { label: 'Other', value: 'OTHER' }
  ];

  employmentTypes = [
    { label: 'Permanent', value: 'PERMANENT' },
    { label: 'Contract', value: 'CONTRACT' },
    { label: 'Probation', value: 'PROBATION' },
    { label: 'Internship', value: 'INTERNSHIP' }
  ];

  employmentStatuses = [
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Terminated', value: 'TERMINATED' },
    { label: 'Suspended', value: 'SUSPENDED' }
  ];
  documentCategories = [
    { label: 'Identity Proof', value: 'IDENTITY' },
    { label: 'Educational Certificates', value: 'EDUCATION' },
    { label: 'Employment Contract', value: 'EMPLOYMENT_CONTRACT' },
    { label: 'Offer Letter', value: 'OFFER_LETTER' },
    { label: 'Experience Letters', value: 'EXPERIENCE' }
  ];

  documentTypes = [
    { label: 'Aadhaar Card', value: 'AADHAAR', category: 'IDENTITY', mandatory: true },
    { label: 'Passport', value: 'PASSPORT', category: 'IDENTITY', mandatory: false },
    { label: 'PAN Card', value: 'PAN', category: 'IDENTITY', mandatory: true },
    { label: 'Degree Certificate', value: 'DEGREE', category: 'EDUCATION', mandatory: false },
    { label: 'Employment Contract', value: 'EMPLOYMENT_CONTRACT', category: 'EMPLOYMENT_CONTRACT', mandatory: true },
    { label: 'Offer Letter', value: 'OFFER_LETTER', category: 'OFFER_LETTER', mandatory: false },
    { label: 'Experience Letter', value: 'EXPERIENCE', category: 'EXPERIENCE', mandatory: false }
  ];





  departments: any[] = [];
  branches: any[] = [];
  roles: any[] = [];
  shifts: any[] = [];
  filteredTypes: any[][] = []; // store filtered options per row

  uploadedDocuments: any[] = [];
  photoUrl: string = '';
  uploadedDocsForm!: FormArray;
  completedSteps: boolean[] = [false, false, false, false];




  constructor(private fb: FormBuilder,
    private employeeService: Employees,
    private departmentService: Departments,
    private branchService: Branches,
    private roleService: Roles,
    private shiftService: Shifts) { }

  ngOnInit() {

    this.employeeForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      dob: ['', Validators.required],
      gender: ['', Validators.required],
      phone: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      photoUrl: [''],

      employeeCode: ['', Validators.required],
      referenceCode: [''],
      designation: ['', Validators.required],
      departmentId: ['', Validators.required],
      branchId: ['', Validators.required],
      roleId: ['', Validators.required],
      dateOfJoining: ['', Validators.required],
      employmentType: ['PERMANENT', Validators.required],
      probationEndDate: [''],
      employmentStatus: ['ACTIVE', Validators.required],
      reportingManager: ['', Validators.required],

      emergencyContacts: this.fb.array([]),
      qualifications: this.fb.array([]),

      sameAsPermanent: [false],

      permanentAddress: this.fb.group({
        line1: ['', Validators.required],
        line2: [''],
        city: ['', Validators.required],
        state: ['', Validators.required],
        zipCode: ['', Validators.required],
        country: ['', Validators.required]
      }),

      temporaryAddress: this.fb.group({
        line1: [''],
        line2: [''],
        city: [''],
        state: [''],
        zipCode: [''],
        country: ['']
      }),

      shiftId: [''],
      shiftDate: ['']
    });
    this.addQualification();
    this.addEmergencyContact();
    this.loadDropdownData();
    this.uploadedDocsForm = this.fb.array([]);
    this.employeeForm.addControl('documents', this.uploadedDocsForm);
    this.addDocument();
    if (this.employeeData) {
      this.patchForm(this.employeeData);
    }

  }
  sameAsPermanent = false;

  copyPermanentAddress() {
    const sameAsPermanent = this.employeeForm.get('sameAsPermanent')?.value;
    if (sameAsPermanent) {
      this.employeeForm.get('temporaryAddress')?.patchValue(
        this.employeeForm.get('permanentAddress')?.value
      );
    } else {
      this.employeeForm.get('temporaryAddress')?.reset();
    }
  }

  // createDocumentGroup() {
  //   return this.fb.group({
  //     category: ['', Validators.required],
  //     type: ['', Validators.required],
  //     issueDate: [null],
  //     expiryDate: [null],
  //     file: [null, Validators.required],
  //     fileUrl: ['']
  //   });
  // }

  createDocumentGroup(): FormGroup<{
    category: FormControl<string | null>;
    type: FormControl<string | null>;
    issueDate: FormControl<Date | null>;
    expiryDate: FormControl<Date | null>;
    file: FormControl<File | null>;
    fileUrl: FormControl<string | null>;
  }> {
    return this.fb.group({
      category: this.fb.control<string | null>(null, Validators.required),
      type: this.fb.control<string | null>(null, Validators.required),
      issueDate: this.fb.control<Date | null>(null),
      expiryDate: this.fb.control<Date | null>(null),
      file: this.fb.control<File | null>(null, Validators.required),
      fileUrl: this.fb.control<string | null>(null)
    });
  }




  filterDocumentTypes(index: number) {
    const category = this.uploadedDocsForm.at(index).get('category')?.value;
    this.filteredTypes[index] = this.documentTypes.filter(t => t.category === category);
  }

  loadDropdownData() {
    this.departmentService.getDepartments().subscribe(data => this.departments = data);
    this.branchService.getBranches().subscribe(data => this.branches = data);
    this.roleService.getRoles().subscribe(data => this.roles = data);
    this.shiftService.getShiftTemplates().subscribe(data => this.shifts = data);
  }

  get emergencyContacts(): FormArray {
    return this.employeeForm.get('emergencyContacts') as FormArray;
  }

  get qualifications(): FormArray {
    return this.employeeForm.get('qualifications') as FormArray;
  }

  addEmergencyContact() {
    this.emergencyContacts.push(
      this.fb.group({
        name: ['', Validators.required],
        phone: ['', Validators.required],
        relationship: ['', Validators.required]
      })
    );
  }

  removeEmergencyContact(index: number) {
    this.emergencyContacts.removeAt(index);
  }

  addQualification() {
    this.qualifications.push(
      this.fb.group({
        degree: ['', Validators.required],
        institution: ['', Validators.required],
        year: ['', Validators.required]
      })
    );
  }

  removeQualification(index: number) {
    this.qualifications.removeAt(index);
  }

  // File Upload Handlers
  customPhotoUpload(event: any) {
    // Simulate upload to backend and get URL
    this.photoUrl = 'uploaded/photo/path.jpg';
    this.employeeForm.patchValue({ photoUrl: this.photoUrl });
  }
  onProfileSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.photoUrl = e.target.result; // Show preview
      };
      reader.readAsDataURL(file);

      // TODO: Send file to backend if needed
    }
  }

  removeProfilePhoto() {
    this.photoUrl = '';
  }
  onDocumentsUpload(event: any) {
    // Simulate upload to backend
    this.uploadedDocuments = event.files.map((f: File) => ({
      title: f.name,
      type: 'General',
      fileUrl: `uploads/${f.name}`
    }));
  }

  nextStep() {
    if (this.activeIndex < this.steps.length - 1) {
      this.completedSteps[this.activeIndex] = true;
      this.activeIndex++;
    }
  }

  prevStep() {
    if (this.activeIndex > 0) {
      this.activeIndex--;
    }
  }

  onSubmit() {
    const invalidFields = this.getInvalidFields(this.employeeForm);
    console.log('Invalid fields:', invalidFields);

    if (this.employeeForm.valid) {
      const formValue = this.employeeForm.value;
      const documentsPayload = this.uploadedDocsForm.value.map((doc: any) => ({
        title: doc.type,              // Using type as title (you can add separate title field if needed)
        type: doc.type,
        category: doc.category,
        issueDate: doc.issueDate ? doc.issueDate : null,
        expiryDate: doc.expiryDate ? doc.expiryDate : null,
        fileUrl: doc.fileUrl          // This will be Base64 or backend uploaded URL
      }));
      const {
        permanentAddress,
        temporaryAddress,
        documents,
        shiftId,
        shiftDate,
        ...rest
      } = this.employeeForm.value;

      const payload = {
        ...rest,
        // documents: documentsPayload,
        addresses: [
          { type: 'PERMANENT', ...formValue.permanentAddress },
          { type: 'TEMPORARY', ...formValue.temporaryAddress }
        ]
      };

      console.log(payload)
      if (this.employeeData && this.employeeData.id) {
        // --- UPDATE MODE ---
        this.employeeService.updateEmployee(this.employeeData.id, payload).subscribe({
          next: (updatedEmployee: any) => {
            console.log('Employee updated:', updatedEmployee);

            if (this.haveDocumentsChanged(this.employeeData.documents, this.uploadedDocsForm.value)) {
              this.uploadEmployeeDocs(updatedEmployee.id);
            }

            if (
              shiftId &&
              shiftDate &&
              (shiftId !== this.employeeData.latestShiftAssignment?.shiftId ||
                new Date(shiftDate).toISOString() !==
                new Date(this.employeeData.latestShiftAssignment?.date).toISOString())
            ) {
              this.assignEmployeeShift(updatedEmployee.id, shiftId, shiftDate);
            }


            alert('Employee updated successfully!');
            this.closeForm.emit(true);
          },
          error: () => alert('Error updating employee')
        });
      }
      else {
        this.employeeService.createEmployee(payload).subscribe({
          next: (employee: any) => {
            // Call document upload API after employee is successfully created
            this.uploadEmployeeDocs(employee.id);
            // Assign shift
            if (shiftId && shiftDate) {
              this.assignEmployeeShift(employee.id, shiftId, shiftDate);
            }
            this.employeeForm.reset()
          },
          error: () => alert('Error creating employee')
        });
      }

    }
  }
  addDocument() {
    this.uploadedDocsForm.push(this.createDocumentGroup());
  }

  removeDocument(index: number) {
    this.uploadedDocsForm.removeAt(index);
  }

  // Filter types based on selected category
  getFilteredTypes(index: number) {
    const category = this.uploadedDocsForm.at(index).get('category')?.value;
    return this.documentTypes.filter(t => t.category === category);
  }

  // Handle file selection
  onDocumentSelect(event: any, index: number) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.uploadedDocsForm.at(index).patchValue({
          file: file,
          fileUrl: reader.result
        });
      };
      reader.readAsDataURL(file);
    }
  }

  // Validate mandatory docs before submit
  validateMandatoryDocs(): boolean {
    const uploadedTypes = this.uploadedDocsForm.value.map((d: any) => d.type);
    const missingMandatory = this.documentTypes
      .filter(d => d.mandatory)
      .some(m => !uploadedTypes.includes(m.value));
    return !missingMandatory;
  }
  uploadEmployeeDocs(employeeId: number) {
    const formData = new FormData();

    // Metadata
    formData.append('metadata', JSON.stringify(this.uploadedDocsForm.value));

    // Files
    this.uploadedDocsForm.controls.forEach((docGroup: any) => {
      formData.append('file', docGroup.value.file);
    });

    this.employeeService.uploadEmployeeDocuments(employeeId, this.uploadedDocsForm)
      .subscribe({
        next: () => alert('Employee and documents uploaded successfully!'),
        error: () => alert('Documents upload failed')
      });


  }
  assignEmployeeShift(employeeId: number, shiftId: number, shiftDate: string) {
    this.shiftService.assignShift({
      employeeId: employeeId,
      shiftId: shiftId,
      date: shiftDate,
      acknowledged: false
    }).subscribe({
      next: () => console.log('Shift assigned successfully'),
      error: () => console.error('Failed to assign shift')
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['employeeData'] && this.employeeData && this.employeeForm) {
      this.patchForm(this.employeeData);
    }
  }
  patchForm(data: any) {
    if (!data) return;

    // Patch main fields
    this.employeeForm.patchValue({
      firstName: data.firstName,
      lastName: data.lastName,
      dob: data.dob ? new Date(data.dob) : null,
      gender: data.gender,
      phone: data.phone,
      email: data.email,
      photoUrl: data.photoUrl,
      employeeCode: data.employeeCode,
      referenceCode: data.referenceCode,
      designation: data.designation,
      departmentId: data.departmentId,
      branchId: data.branchId,
      roleId: data.roleId,
      dateOfJoining: data.dateOfJoining ? new Date(data.dateOfJoining) : null,
      employmentType: data.employmentType,
      probationEndDate: data.probationEndDate ? new Date(data.probationEndDate) : null,
      employmentStatus: data.employmentStatus,
      shiftId: data.shiftId,
      shiftDate: data.latestShiftAssignment.date ? new Date(data.latestShiftAssignment.date) : null,
      sameAsPermanent: data.sameAsPermanent
    });

    // Patch addresses
    const permanent = data.Address?.find((a: any) => a.type === 'PERMANENT');
    const temporary = data.Address?.find((a: any) => a.type === 'TEMPORARY');

    if (permanent) {
      this.employeeForm.get('permanentAddress')?.patchValue(permanent);
    }
    if (temporary) {
      this.employeeForm.get('temporaryAddress')?.patchValue(temporary);
    }

    // Patch emergency contacts
    this.emergencyContacts.clear();
    data.emergencyContacts?.forEach((ec: any) => {
      this.emergencyContacts.push(this.fb.group({
        name: ec.name,
        phone: ec.phone,
        relationship: ec.relationship
      }));
    });

    // Patch qualifications
    this.qualifications.clear();
    data.qualifications?.forEach((q: any) => {
      this.qualifications.push(this.fb.group({
        degree: q.degree,
        institution: q.institution,
        year: q.year
      }));
    });

    // Patch documents
    this.uploadedDocsForm.clear();
    data.documents?.forEach((doc: any, index: number) => {
      const docGroup = this.createDocumentGroup();
      docGroup.patchValue({
        category: doc.category,
        type: doc.type, // must match documentTypes `value`
        issueDate: doc.issueDate ? new Date(doc.issueDate) : null,
        expiryDate: doc.expiryDate ? new Date(doc.expiryDate) : null,
        fileUrl: doc.fileUrl
      });
      if (doc.fileUrl) {
        docGroup.get('file')?.clearValidators();
        docGroup.get('file')?.updateValueAndValidity();
      }
      this.filteredTypes[index] = this.documentTypes.filter(t => t.category === doc.category);
      this.uploadedDocsForm.push(docGroup);
    });
  }

  onCancel() {
    this.closeForm.emit(false);
  }
  haveDocumentsChanged(originalDocs: any[], newDocs: any[]): boolean {
    if (!originalDocs) return newDocs.length > 0;
    if (originalDocs.length !== newDocs.length) return true;

    return newDocs.some((doc, index) => {
      const original = originalDocs[index];
      return (
        doc.type !== original.type ||
        doc.category !== original.category ||
        doc.issueDate?.toString() !== original.issueDate ||
        doc.expiryDate?.toString() !== original.expiryDate ||
        doc.fileUrl !== original.fileUrl
      );
    });
  }
  getInvalidFields(formGroup: FormGroup, parentKey = ''): string[] {
    const invalidFields: string[] = [];

    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      const fullKey = parentKey ? `${parentKey}.${key}` : key;

      if (control instanceof FormGroup) {
        invalidFields.push(...this.getInvalidFields(control, fullKey));
      } else if (control instanceof FormArray) {
        control.controls.forEach((fg, index) => {
          invalidFields.push(...this.getInvalidFields(fg as FormGroup, `${fullKey}[${index}]`));
        });
      } else if (control?.invalid) {
        invalidFields.push(fullKey);
      }
    });

    return invalidFields;
  }

}


