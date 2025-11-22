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
import { AbstractControl } from '@angular/forms';
import { TextareaModule } from 'primeng/textarea';
import { DialogModule } from 'primeng/dialog';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';



@Component({
  selector: 'app-employee-form',
  imports: [CommonModule, ButtonModule, Select, InputTextModule, FileUploadModule, ReactiveFormsModule,
    StepsModule, DatePicker, FloatLabel, FormsModule, Checkbox, StepperModule, TextareaModule, DialogModule, ToastModule],
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
    { label: 'Suspended', value: 'SUSPENDED' },
    { label: 'Notice Period', value: 'NOTICE_PERIOD' },
    { label: 'Resigned', value: 'RESIGNED' }

  ];
  documentCategories = [
    { label: 'Identity Proof', value: 'IDENTITY' },
    { label: 'Educational Certificates', value: 'EDUCATION' },
    { label: 'Employment Contract', value: 'EMPLOYMENT_CONTRACT' },
    { label: 'Offer Letter', value: 'OFFER_LETTER' },
    { label: 'Experience Letters', value: 'EXPERIENCE' },
    { label: 'Certificates', value: 'CERTIFICATE' },
    { label: 'Financial Documents', value: 'FINANCIAL' }
  ];

  documentTypes = [
    { label: 'Aadhaar Card', value: 'AADHAAR', category: 'IDENTITY', mandatory: true },
    { label: 'Passport', value: 'PASSPORT', category: 'IDENTITY', mandatory: false },
    { label: 'PAN Card', value: 'PAN', category: 'IDENTITY', mandatory: true },
    { label: 'SSLC Certificate', value: 'SSLC', category: 'EDUCATION', mandatory: false },
    { label: 'PU Certificate', value: 'PU', category: 'EDUCATION', mandatory: false },
    { label: 'Degree Certificate', value: 'DEGREE', category: 'EDUCATION', mandatory: false },
    { label: 'Diploma Certificate', value: 'DIPLOMA', category: 'EDUCATION', mandatory: false },
    { label: 'Employment Contract', value: 'EMPLOYMENT_CONTRACT', category: 'EMPLOYMENT_CONTRACT', mandatory: true },
    { label: 'Offer Letter', value: 'OFFER_LETTER', category: 'OFFER_LETTER', mandatory: false },
    { label: 'Experience Letter', value: 'EXPERIENCE', category: 'EXPERIENCE', mandatory: false },
    // NEW: certificates
    { label: 'Registration Certificate', value: 'REGISTRATION_CERT', category: 'CERTIFICATE', mandatory: false },
    { label: 'Salary Certificate', value: 'SALARY_CERT', category: 'CERTIFICATE', mandatory: false },
    { label: 'Verification Certificate', value: 'VERIFICATION_CERT', category: 'CERTIFICATE', mandatory: false },
    { label: 'Bank Document', value: 'BANK', category: 'FINANCIAL', mandatory: false }
  ];

  qualificationTypes = [
    { label: 'SSLC', value: 'SSLC' },
    { label: 'PUC / 12th', value: 'PU' },
    { label: 'Diploma', value: 'DIPLOMA' },
    { label: 'Bachelor’s Degree', value: 'BACHELOR' },
    { label: 'Master’s Degree', value: 'MASTER' },
    { label: 'Doctorate (PhD)', value: 'PHD' },
    { label: 'Other', value: 'OTHER' }
  ];






  departments: any[] = [];
  branches: any[] = [];
  roles: any[] = [];
  shifts: any[] = [];
  filteredTypes: any[][] = []; // store filtered options per row
  patterns: any[] = []; // rotation patterns

  uploadedDocuments: any[] = [];
  photoUrl: string = '';
  uploadedDocsForm!: FormArray;
  completedSteps: boolean[] = [false, false, false, false];
  reportingManagers: any[] = [];
  bloodGroups = [
    { label: 'A+', value: 'A+' },
    { label: 'A-', value: 'A-' },
    { label: 'B+', value: 'B+' },
    { label: 'B-', value: 'B-' },
    { label: 'O+', value: 'O+' },
    { label: 'O-', value: 'O-' },
    { label: 'AB+', value: 'AB+' },
    { label: 'AB-', value: 'AB-' }
  ];

  today: any = new Date();






  constructor(private fb: FormBuilder,
    private employeeService: Employees,
    private departmentService: Departments,
    private branchService: Branches,
    private roleService: Roles,
    private shiftService: Shifts,
    private messageService: MessageService,
    private sanitizer: DomSanitizer) { }

  ngOnInit() {

    this.employeeForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      dob: ['', Validators.required],
      gender: ['', Validators.required],
      phone: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      photoUrl: [''],
      bloodGroup: ['', Validators.required],
      age: ['', Validators.required],

      employeeCode: [''],
      referenceCode: [''],
      designation: ['', Validators.required],
      departmentId: ['', Validators.required],
      branchId: ['', Validators.required],
      roleId: ['', Validators.required],
      dateOfJoining: ['', Validators.required],
      employmentType: ['PERMANENT', Validators.required],
      employeeType: ['CLINICAL', Validators.required],
      probationEndDate: [{ value: null, disabled: true }],
      employmentStatus: ['ACTIVE', Validators.required],
      reportingManager: ['', Validators.required],
      shiftId: [''],

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


      shiftMode: ['FIXED', Validators.required],   // NEW
      rotationPatternId: [''],                     // NEW for ROTATIONAL
      rotationStartDate: [''],                     // NEW
      shiftDate: ['']                              // keep (optional for fixed)

    });
    this.employeeForm.addControl('preEmploymentCheckDate', this.fb.control(null));
    this.employeeForm.addControl('height', this.fb.control(''));
    this.employeeForm.addControl('weight', this.fb.control(''));
    this.employeeForm.addControl('bmi', this.fb.control(''));
    this.employeeForm.addControl('bloodPressure', this.fb.control(''));
    this.employeeForm.addControl('bloodSugar', this.fb.control(''));
    this.employeeForm.addControl('cholesterol', this.fb.control(''));
    this.employeeForm.addControl('allergies', this.fb.control(''));
    this.employeeForm.addControl('chronicConditions', this.fb.control(''));
    this.employeeForm.addControl('smoking', this.fb.control(false));
    this.employeeForm.addControl('alcohol', this.fb.control(false));
    this.employeeForm.addControl('visionType', this.fb.control('NORMAL'));
    this.employeeForm.addControl('usesGlasses', this.fb.control(false));
    this.employeeForm.addControl('visionRemarks', this.fb.control(''));
    this.employeeForm.addControl('pastSurgeries', this.fb.control(''));
    this.employeeForm.addControl('preferredHospital', this.fb.control(''));
    this.employeeForm.addControl('primaryPhysician', this.fb.control(''));
    this.employeeForm.addControl('emergencyNotes', this.fb.control(''));
    this.employeeForm.addControl('hasDisability', this.fb.control(false));
    this.employeeForm.addControl('disabilityType', this.fb.control(''));
    this.employeeForm.addControl('disabilityDescription', this.fb.control(''));
    this.employeeForm.addControl('disabilityProofFile', this.fb.control(null));
    this.employeeForm.addControl('disabilityProofFileName', this.fb.control(''));
    this.employeeForm.addControl('disabilityProofUrl', this.fb.control(''));


    // Add new FormArrays
    this.employeeForm.addControl('healthIssues', this.fb.array([]));
    this.employeeForm.addControl('vaccinations', this.fb.array([]));

    // Auto-calc BMI
    this.employeeForm.get('weight')?.valueChanges.subscribe(() => this.updateBMI());
    this.employeeForm.get('height')?.valueChanges.subscribe(() => this.updateBMI());

    this.employeeForm.get('shiftMode')!.valueChanges.subscribe(mode => {
      this.applyShiftValidators(mode);
    });
    this.addQualification();
    this.addEmergencyContact();
    this.loadDropdownData();
    this.loadReportingManagers();
    this.uploadedDocsForm = this.fb.array([]);
    this.employeeForm.addControl('documents', this.uploadedDocsForm);
    this.addDocument();
    if (this.employeeData) {
      console.log(this.employeeData);
      this.patchForm(this.employeeData);
    }
    this.employeeForm.get('dob')?.valueChanges.subscribe(dob => {
      if (dob) {
        this.employeeForm.patchValue({
          age: this.calculateAge(new Date(dob))
        }, { emitEvent: false });
      }
    });
    this.employeeForm.get('employmentType')!.valueChanges.subscribe((val) => {
      const ctrl = this.employeeForm.get('probationEndDate')!;
      if (val === 'PROBATION') {
        ctrl.enable();
        ctrl.addValidators([Validators.required]);
      } else {
        ctrl.reset(null);
        ctrl.clearValidators();
        ctrl.disable();
      }
      ctrl.updateValueAndValidity({ emitEvent: false });
    });

    this.employeeForm.get('employeeType')?.valueChanges.subscribe(() => {
      this.getMandatoryDocs();
    });


  }
  // FormArray getters
  get healthIssues(): FormArray {
    return this.employeeForm.get('healthIssues') as FormArray;
  }
  get vaccinations(): FormArray {
    return this.employeeForm.get('vaccinations') as FormArray;
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

  // Add/Remove Health Issues
  addHealthIssue() {
    this.healthIssues.push(this.fb.group({
      condition: ['', Validators.required],
      checkupFrequency: ['3M', Validators.required],
      lastCheckupDate: [null]
    }));
  }
  removeHealthIssue(i: number) {
    this.healthIssues.removeAt(i);
  }

  // Dropdown for vaccine names
  availableVaccines = [
    { label: 'Hepatitis B', value: 'HEP_B' },
    { label: 'Tetanus', value: 'TETANUS' },
    { label: 'COVID-19', value: 'COVID19' },
    { label: 'Influenza (Flu)', value: 'FLU' },
    { label: 'MMR', value: 'MMR' },
    { label: 'Other', value: 'OTHER' }
  ];



  // Add Vaccination
  addVaccination() {
    this.vaccinations.push(
      this.fb.group({
        vaccineName: ['', Validators.required],
        vaccinated: [null, Validators.required],
        firstDose: [null],
        secondDose: [null],
        thirdDose: [null],
        boosterDose: [null],
        testDate: [null],
        titerLevel: [''],
        proofFile: [null],
        proofFileName: ['']
      })
    );
  }

  // Remove Vaccination
  removeVaccination(index: number) {
    this.vaccinations.removeAt(index);
  }

  // // Handle Proof Upload
  // onVaccineProofSelect(event: any, index: number) {
  //   const file = event.target.files[0];
  //   if (file) {
  //     this.vaccinations.at(index).patchValue({
  //       proofFile: file,
  //       proofFileName: file.name
  //     });
  //   }
  // }


  // BMI calculation
  updateBMI() {
    const weight = this.employeeForm.get('weight')?.value;
    const height = this.employeeForm.get('height')?.value;
    if (weight && height) {
      const bmi = (weight / ((height / 100) * (height / 100))).toFixed(1);
      this.employeeForm.patchValue({ bmi }, { emitEvent: false });
    }
  }

  // Optional: Calculate next checkup date
  calculateNextCheckup(issue: any): Date | null {
    if (!issue.lastCheckupDate) return null;
    const last = new Date(issue.lastCheckupDate);
    let months = issue.checkupFrequency === '2M' ? 2 : issue.checkupFrequency === '3M' ? 3 : 6;
    last.setMonth(last.getMonth() + months);
    return last;
  }


  loadReportingManagers() {
    this.employeeService.getEmployeesWithSpecificRoles().subscribe((data: any[]) => {
      this.reportingManagers = data.map(emp => ({
        label: `${emp.firstName} ${emp.lastName} - ${emp.employeeCode}`, // Name to show
        value: emp.id                               // ID to store
      }));
    });
  }

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
    this.shiftService.getRotationPatterns().subscribe(data => this.patterns = data); // NEW
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
        year: ['', Validators.required],
        grade: [''],
        degreeName: ['']
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
      const formData = new FormData();
      formData.append('file', file);
      this.employeeForm.patchValue({ photoUrl: file });
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
    if (!this.validateMandatoryDocs()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Missing Documents',
        detail: 'Please upload all mandatory documents before submitting.'
      });
      return;
    }


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
        shiftId, shiftDate, shiftMode, rotationPatternId, rotationStartDate,
        photoUrl,
        ...rest
      } = this.employeeForm.value;

      const payload = {
        ...rest,
        healthIssues: this.healthIssues.value.map((i: any) => ({
          ...i,
          nextCheckup: this.calculateNextCheckup(i)
        })),
        vaccinations: this.vaccinations.value.map((v: any) => ({
          vaccineName: v.vaccineName,
          vaccinated: v.vaccinated,
          firstDose: v.firstDose,
          secondDose: v.secondDose,
          thirdDose: v.thirdDose,
          boosterDose: v.boosterDose,
          testDate: v.testDate,
          titerLevel: v.titerLevel,
          proofFileName: v.proofFileName
          // you can also handle uploading v.proofFile separately via FormData
        })),
        disabilityProofFile: '',
        // documents: documentsPayload,
        addresses: [
          { type: 'PERMANENT', ...formValue.permanentAddress },
          { type: 'TEMPORARY', ...formValue.temporaryAddress }
        ],
        shiftMode,
        fixedShiftId: shiftMode === 'FIXED' ? shiftId : undefined,
        rotationPatternId: shiftMode === 'ROTATIONAL' ? rotationPatternId : undefined,
        rotationStartDate: shiftMode === 'ROTATIONAL' ? rotationStartDate : undefined
      };
      const formData = new FormData();
      formData.append('metadata', JSON.stringify(payload));

      // ✅ Add profile photo only if user selected a new one
      if (photoUrl instanceof File) {
        formData.append('photo', photoUrl);
      }

      console.log(payload)
      if (this.employeeData && this.employeeData.id) {
        // --- UPDATE MODE ---
        this.employeeService.updateEmployee(this.employeeData.id, payload).subscribe({
          next: (updatedEmployee: any) => {
            console.log('Employee updated:', updatedEmployee);
            if (this.vaccinations) {
              this.vaccinations.controls.forEach((vac, index) => {
                if (vac.value.proofFile instanceof File) {
                  this.employeeService.uploadVaccineProof(updatedEmployee.id, index, vac.value.proofFile)
                    .subscribe({
                      next: (res) => console.log('Vaccine proof uploaded:', res.fileUrl),
                      error: (err) => console.error('Error uploading proof:', err)
                    });
                }
              });
            }

            if (this.employeeForm.value.photoUrl instanceof File) {
              this.uploadProfilePhoto(updatedEmployee.id, this.employeeForm.value.photoUrl);
            }

            if( this.employeeForm.value.disabilityProofFile instanceof File){
              this.employeeService.uploadDisabilityProof(updatedEmployee.id, this.employeeForm.value.disabilityProofFile)
              .subscribe({
                next: (res :any) => {
                  this.employeeForm.patchValue({ disabilityProofUrl: res.fileUrl });
                  this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Disability proof uploaded successfully!'
                  });
                },
                error: () =>
                  this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to upload disability proof'
                  })
              });
            }


            if (this.haveDocumentsChanged(this.employeeData.documents, this.uploadedDocsForm.value)) {
              this.uploadEmployeeDocs(updatedEmployee.id);
            }

            if (
              shiftId &&
              (shiftId !== this.employeeData.latestShiftAssignment?.shiftId ||
                new Date().toISOString() !==
                new Date(this.employeeData.latestShiftAssignment?.date).toISOString())
            ) {
              this.assignEmployeeShift(updatedEmployee.id, shiftId);
            }


            // alert('Employee updated successfully!');
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Employee updated successfully!'
            })
            this.closeForm.emit(true);
          },
          error: () =>
            //  alert('Error updating employee')
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Error updating employee'
            })
        });
      }
      else {
        this.employeeService.createEmployee(payload).subscribe({
          next: (employee: any) => {

            if (this.employeeForm.value.photoUrl instanceof File) {
              this.uploadProfilePhoto(employee.id, this.employeeForm.value.photoUrl);
            }
            // Call document upload API after employee is successfully created
            this.uploadEmployeeDocs(employee.id);
            this.vaccinations.controls.forEach((vac, index) => {
              if (vac.value.proofFile instanceof File) {
                this.employeeService.uploadVaccineProof(employee.id, index, vac.value.proofFile)
                  .subscribe({
                    next: (res) => console.log(`Vaccine proof uploaded for index ${index}:`, res.fileUrl),
                    error: (err) => console.error('Error uploading vaccine proof:', err)
                  });
              }
            });

            if(this.employeeForm.value.disabilityProofFile instanceof File){
              this.employeeService.uploadDisabilityProof(employee.id, this.employeeForm.value.disabilityProofFile)
              .subscribe({
                next: (res:any) => {
                  this.employeeForm.patchValue({ disabilityProofUrl: res.fileUrl });
                  this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Disability proof uploaded successfully!'
                  });
                },
                error: () =>
                  this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to upload disability proof'
                  })
              });
            }
            // Assign shift
            if (shiftId) {
              this.assignEmployeeShift(employee.id, shiftId);
            }
            this.employeeForm.reset()
          },
          error: () =>
            // alert('Error creating employee')
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Error creating employee'
            })
        });
      }

    }
  }
  onVaccineProofSelect(event: any, index: number) {
    const file = event.target.files[0];
    if (file) {
      this.vaccinations.at(index).patchValue({
        proofFile: file,
        proofFileName: file.name
      });
    }
  }

  uploadVaccineProof(employeeId: string, vaccineIndex: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    // this.employeeService.uploadVaccineProof(Number(employeeId), vaccineIndex, formData)
    //   .subscribe({
    //     next: (res) => {
    //       this.vaccinations.at(vaccineIndex).patchValue({ proofUrl: res.fileUrl });
    //     },
    //     error: (err) => console.error('Error uploading proof:', err)
    //   });
  }

  uploadProfilePhoto(employeeId: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    this.employeeService.uploadEmployeePhoto(employeeId, formData).subscribe({
      next: (res: any) => {
        this.photoUrl = res.photoUrl; // set the new URL from backend
        this.employeeForm.patchValue({ photoUrl: res.photoUrl }); // update form
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Profile photo uploaded successfully!'
        });
      },
      error: () =>
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to upload profile photo'
        })
    });
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
  // validateMandatoryDocs(): boolean {
  //   const uploadedTypes = this.uploadedDocsForm.value.map((d: any) => d.type);
  //   const employeeType = this.employeeForm.get('employeeType')?.value;

  //   let mandatoryDocs: string[] = [];

  //   if (employeeType === 'CLINICAL') {
  //     mandatoryDocs = ['SALARY_CERT', 'VERIFICATION_CERT'];
  //   } else if (employeeType === 'NONCLINICAL') {
  //     mandatoryDocs = ['REGISTRATION_CERT'];
  //   }

  //   // Always required
  //   mandatoryDocs.push('AADHAAR', 'PAN');

  //   // Education requirement
  //   mandatoryDocs.push('SSLC', 'PU', 'DEGREE', 'DIPLOMA');

  //   const missingMandatory = mandatoryDocs.some(m => !uploadedTypes.includes(m));
  //   return !missingMandatory;
  // }
  // Return both required and missing docs
  getMandatoryDocs(): { required: string[], missing: string[] } {
    const uploadedDocs = this.uploadedDocsForm.value;
    const employeeType = this.employeeForm.get('employeeType')?.value;

    let mandatoryDocs: string[] = [];

    // Employee type specific
    if (employeeType === 'CLINICAL') {
      mandatoryDocs = ['REGISTRATION_CERT'];
      // mandatoryDocs = ['SALARY_CERT', 'VERIFICATION_CERT'];
    } else if (employeeType === 'NONCLINICAL') {
      // mandatoryDocs = ['REGISTRATION_CERT'];
      mandatoryDocs = ['SALARY_CERT', 'VERIFICATION_CERT'];
    }

    // Always required
    mandatoryDocs.push('AADHAAR', 'PAN', 'BANK');

    // 🔹 Only qualifications entered in Step 3
    (this.qualifications.value || []).forEach((q: any) => {
      switch (q.degree) {
        case 'SSLC': mandatoryDocs.push('SSLC'); break;
        case 'PU': mandatoryDocs.push('PU'); break;
        case 'DIPLOMA': mandatoryDocs.push('DIPLOMA'); break;
        case 'BACHELOR':
        case 'MASTER':
        case 'PHD': mandatoryDocs.push('DEGREE'); break;
      }
    });

    // Deduplicate in case multiple qualifications map to same doc
    mandatoryDocs = [...new Set(mandatoryDocs)];

    const missingMandatory = mandatoryDocs.filter(m => {
      const doc = uploadedDocs.find((d: any) => d.type === m);
      return !doc || (!doc.file && !doc.fileUrl);
    });

    return { required: mandatoryDocs, missing: missingMandatory };
  }


  validateMandatoryDocs(): boolean {
    return this.getMandatoryDocs().missing.length === 0;
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
        next: () =>
          // alert('Employee and documents uploaded successfully!'),
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Employee and documents uploaded successfully!'
          }),
        error: () =>
          //  alert('Documents upload failed')
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Documents upload failed'
          })
      });


  }
  assignEmployeeShift(employeeId: number, shiftId: number) {
    this.shiftService.assignShift({
      employeeId: employeeId,
      shiftId: shiftId,
      date: new Date(),
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
    // ——— shift setting (needs API to include EmployeeShiftSetting) ———
    const setting = data.EmployeeShiftSetting || null;
    const mode: 'FIXED' | 'ROTATIONAL' = setting?.mode ?? 'FIXED';
    console.log(mode)

    // If FIXED: prefer setting.fixedShiftId, else fall back to legacy employee.shiftId
    const fixedShiftFromSetting = setting?.fixedShiftId ?? null;
    const fixedShiftFallback = data.shiftId ?? null;

    // latest assignment date (may be missing)
    const latestAssignDate = data.latestShiftAssignment?.date
      ? new Date(data.latestShiftAssignment.date)
      : null;

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
      // shiftDate: data.latestShiftAssignment.date ? new Date(data.latestShiftAssignment.date) : null,
      sameAsPermanent: data.sameAsPermanent,
      bloodGroup: data.bloodGroup,
      age: data.age,
      reportingManager: data.reportingManager,
      employeeType: data.employeeType,
      shiftMode: mode,
      shiftId: mode === 'FIXED' ? (fixedShiftFromSetting ?? fixedShiftFallback) : null,
      rotationPatternId: mode === 'ROTATIONAL' ? setting?.rotationPatternId ?? null : null,
      rotationStartDate: mode === 'ROTATIONAL' && setting?.startDate ? new Date(setting.startDate) : null,
      shiftDate: latestAssignDate,
      preEmploymentCheckDate: data.preEmploymentCheckDate ? new Date(data.preEmploymentCheckDate) : null,
      height: data.height,
      weight: data.weight,
      bmi: data.bmi,
      bloodPressure: data.bloodPressure,
      bloodSugar: data.bloodSugar,
      cholesterol: data.cholesterol,
      allergies: data.allergies,
      chronicConditions: data.chronicConditions,
      smoking: data.smoking,
      alcohol: data.alcohol,
      visionType: data.visionType,
      usesGlasses: data.usesGlasses,
      visionRemarks: data.visionRemarks,
      pastSurgeries: data.pastSurgeries,
      preferredHospital: data.preferredHospital,
      primaryPhysician: data.primaryPhysician,
      emergencyNotes: data.emergencyNotes,
      hasDisability: data.hasDisability,
      disabilityType: data.disabilityType,
      disabilityDescription: data.disabilityDescription,
      disabilityProofFileName: data.disabilityProofFileName,
      disabilityProofUrl: data.disabilityProofUrl,

    });
    // 🔹 Patch health issues array
    this.healthIssues.clear();
    let parsedHealthIssues: any[] = [];
    try {
      parsedHealthIssues = typeof data.healthIssues === 'string'
        ? JSON.parse(data.healthIssues)
        : data.healthIssues || [];
    } catch {
      parsedHealthIssues = [];
    }

    parsedHealthIssues.forEach((h: any) => {
      this.healthIssues.push(
        this.fb.group({
          condition: [h.condition, Validators.required],
          checkupFrequency: [h.checkupFrequency, Validators.required],
          lastCheckupDate: h.lastCheckupDate ? new Date(h.lastCheckupDate) : null
        })
      );
    });

    // 🔹 Patch vaccinations array
    this.vaccinations.clear();
    let parsedVaccinations: any[] = [];
    try {
      parsedVaccinations = typeof data.vaccinations === 'string'
        ? JSON.parse(data.vaccinations)
        : data.vaccinations || [];
    } catch {
      parsedVaccinations = [];
    }

    parsedVaccinations.forEach((v: any) => {
      this.vaccinations.push(
        this.fb.group({
          vaccineName: [v.vaccineName, Validators.required],
          vaccinated: [v.vaccinated, Validators.required],
          firstDose: v.firstDose ? new Date(v.firstDose) : null,
          secondDose: v.secondDose ? new Date(v.secondDose) : null,
          thirdDose: v.thirdDose ? new Date(v.thirdDose) : null,
          boosterDose: v.boosterDose ? new Date(v.boosterDose) : null,
          testDate: v.testDate ? new Date(v.testDate) : null,
          titerLevel: v.titerLevel,
          proofFile: null,
          proofFileName: v.proofFileName || '',
          proofUrl: v.proofUrl || ''
        })
      );
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

    if(this.emergencyContacts.length === 0){
      this.addEmergencyContact();
    }

    // Patch qualifications
    this.qualifications.clear();
    data.qualifications?.forEach((q: any) => {
      this.qualifications.push(this.fb.group({
        degree: q.degree,
        institution: q.institution,
        year: q.year,
        grade: q.grade,
        degreeName: q.degreeName
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
    this.applyShiftValidators(mode);
    this.photoUrl = this.employeeForm.get('photoUrl')?.value || '';
  }
  private applyShiftValidators(mode: 'FIXED' | 'ROTATIONAL') {
    const shiftIdCtrl = this.employeeForm.get('shiftId')!;
    const patternCtrl = this.employeeForm.get('rotationPatternId')!;
    const startCtrl = this.employeeForm.get('rotationStartDate')!;

    if (mode === 'FIXED') {
      shiftIdCtrl.setValidators([Validators.required]);
      patternCtrl.clearValidators();
      startCtrl.clearValidators();
    } else {
      shiftIdCtrl.clearValidators();
      patternCtrl.setValidators([Validators.required]);
      startCtrl.setValidators([Validators.required]);
    }

    shiftIdCtrl.updateValueAndValidity();
    patternCtrl.updateValueAndValidity();
    startCtrl.updateValueAndValidity();
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


  invalid(control: AbstractControl | null): boolean {
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  showError(control: AbstractControl | null): boolean {
    return this.invalid(control);
  }
  calculateAge(dob: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }
  private isImageSrc(src: string): boolean {
    const s = (src || '').toLowerCase();
    return s.startsWith('data:image') ||
      s.endsWith('.png') || s.endsWith('.jpg') || s.endsWith('.jpeg') ||
      s.endsWith('.webp') || s.endsWith('.gif');
  }

  getDocPreview(index: number): { kind: 'image' | 'pdf' | 'file'; src: string } | null {
    const v = this.uploadedDocsForm.at(index)?.value as any;
    const src: string | null = v?.fileUrl || null;
    if (!src) return null;

    if (this.isImageSrc(src)) return { kind: 'image', src };

    const sl = src.toLowerCase();
    if (sl.startsWith('data:application/pdf') || sl.endsWith('.pdf')) {
      return { kind: 'pdf', src };
    }
    return { kind: 'file', src };
  }
  goToStep(stepNumber: number, activateCallback: (value: number) => void) {
    let controlsToValidate: string[] = [];

    if (stepNumber === 2) {
      // ✅ Step 1: Personal Info
      controlsToValidate = [
        'firstName', 'lastName', 'dob', 'gender',
        'email', 'phone', 'bloodGroup',
        'permanentAddress.line1', 'permanentAddress.city',
        'permanentAddress.state', 'permanentAddress.zipCode',
        'permanentAddress.country', 'employeeType'
      ];

      // 🔹 Emergency Contact must exist
      if (this.emergencyContacts.length === 0) {
        this.messageService.add({
          severity: 'error',
          summary: 'Validation Error',
          detail: 'Please add at least one emergency contact.'
        });
        return;
      }

      // Validate each contact
      this.emergencyContacts.controls.forEach((ec, index) => {
        ['name', 'phone', 'relationship'].forEach(field => {
          const ctrl = ec.get(field);
          ctrl?.markAsTouched();
          ctrl?.updateValueAndValidity();
          if (ctrl?.invalid) {
            this.messageService.add({
              severity: 'error',
              summary: 'Validation Error',
              detail: `Emergency Contact #${index + 1}: ${field} is required`
            });
          }
        });
      });

      const invalidEC = this.emergencyContacts.controls.some(ec => ec.invalid);
      if (invalidEC) return;
    }
    else if (stepNumber === 3) {
      // ✅ Step 2: Employment Info
      controlsToValidate = [
        'employeeCode', 'designation', 'dateOfJoining',
        'employmentType', 'employmentStatus',
        'departmentId', 'branchId', 'roleId', 'reportingManager'
      ];

      // Dynamic shift mode validation
      const shiftMode = this.employeeForm.get('shiftMode')?.value;
      if (shiftMode === 'FIXED') {
        controlsToValidate.push('shiftId');
      } else if (shiftMode === 'ROTATIONAL') {
        controlsToValidate.push('rotationPatternId', 'rotationStartDate');
      }
    } else if (stepNumber === 4) {
      // ✅ Step 3: Qualifications
      // validate at least one qualification
      const quals = this.qualifications.value || [];
      if (this.qualifications.length === 0) {
        this.messageService.add({
          severity: 'error',
          summary: 'Validation Error',
          detail: 'Please add at least one qualification.'
        });
        return;
      }

      // each qualification required fields
      this.qualifications.controls.forEach((q, index) => {
        ['degree', 'institution', 'year', 'grade'].forEach(field => {
          const ctrl = q.get(field);
          ctrl?.markAsTouched();
          ctrl?.updateValueAndValidity();
          if (ctrl?.invalid) {
            this.messageService.add({
              severity: 'error',
              summary: 'Validation Error',
              detail: `Qualification #${index + 1}: ${field} is required`
            });
          }
        });
      });

      const invalidQuals = this.qualifications.controls.some(q => q.invalid);
  if (invalidQuals) return;

  // 🔸 Custom rule:
  // If user selected any Bachelor/Master/Other but no SSLC and (no PU or no Diploma)
  const hasDegree = quals.some((q: any) =>
    ['BACHELOR', 'MASTER', 'OTHER', 'PHD'].includes(q.degree)
  );
  const hasSSLC = quals.some((q: any) => q.degree === 'SSLC');
  const hasPU = quals.some((q: any) => q.degree === 'PU');
  const hasDiploma = quals.some((q: any) => q.degree === 'DIPLOMA');

  if (hasDegree && (!hasSSLC || !(hasPU || hasDiploma))) {
    this.messageService.add({
      severity: 'error',
      summary: 'Missing Educational Levels',
      detail: 'Please add SSLC and either PU or Diploma qualification details before proceeding.'
    });
    return;
  }
    } else if (stepNumber === 5) {
      // ✅ Step 4: Documents
      if (!this.validateMandatoryDocs()) {
        this.messageService.add({
          severity: 'error',
          summary: 'Validation Error',
          detail: 'Please upload all mandatory documents before proceeding.'
        });
        return;
      }
    }

    // Mark selected controls as touched so errors show
    controlsToValidate.forEach(path => {
      const ctrl = this.employeeForm.get(path);
      ctrl?.markAsTouched();
      ctrl?.updateValueAndValidity();
    });

    // Check if valid
    const invalid = controlsToValidate.some(path => this.employeeForm.get(path)?.invalid);
    if (invalid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: `Please complete all required fields in Step ${stepNumber - 1}`
      });
      return;
    }

    // ✅ If valid, allow navigation
    activateCallback(stepNumber);
  }

  docDialogVisible = false;
  selectedDocUrl: string | null = null;
  safeDocUrl: SafeResourceUrl | null = null;


  openDocPopup(index: number) {
    const doc = this.uploadedDocsForm.at(index).value;
    let url = doc.fileUrl || null;
    console.log('Opening doc preview for URL:', url,doc);

    if (!url && doc.file) {
      // Local file not yet uploaded — create preview
      const reader = new FileReader();
      reader.onload = () => {
        this.selectedDocUrl = reader.result as string;
        this.safeDocUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.selectedDocUrl);
        this.docDialogVisible = true;
      };
      reader.readAsDataURL(doc.file);
      return;
    }

    if (url) {
      this.selectedDocUrl = url;
      this.safeDocUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      this.docDialogVisible = true;
    }
  }



  isImage(url: string): boolean {
    const lower = url.toLowerCase();
    return (
      lower.endsWith('.png') ||
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.gif') ||
      lower.endsWith('.webp')
    );
  }

  onDisabilityProofSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.employeeForm.patchValue({
        disabilityProofFile: file,
        disabilityProofFileName: file.name
      });
    }
  }


}


