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
import { ToggleSwitchModule } from 'primeng/toggleswitch';



@Component({
  selector: 'app-employee-form',
  imports: [CommonModule, ButtonModule, Select, InputTextModule, FileUploadModule, ReactiveFormsModule,
    StepsModule, DatePicker, FloatLabel, FormsModule, Checkbox, StepperModule, TextareaModule,
    DialogModule, ToastModule, ToggleSwitchModule],
  templateUrl: './employee-form.html',
  styleUrl: './employee-form.css',
  providers: [MessageService]
})
export class EmployeeForm {
  @Input() employeeData: any = null;
  @Output() closeForm = new EventEmitter<boolean>();

  @Input() isProfileView: boolean = false; // true when accessed via My Profile

  showSabbaticalDialog = false;
  sabbaticalForm!: FormGroup;
  loadingSabbatical = false;

  // private isInitialVaccinationAdded = false;


  employeeForm!: FormGroup;
  activeIndex = 0;
  isLoading = false;

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
    { label: 'Internship', value: 'INTERNSHIP' },
    { label: 'Trainee', value: 'TRAINEE' },
    { label: 'Doctor', value: 'DOCTOR' }
  ];

  employmentStatuses = [
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Terminated', value: 'TERMINATED' },
    { label: 'Suspended', value: 'SUSPENDED' },
    { label: 'Notice Period', value: 'NOTICE_PERIOD' },
    { label: 'Resigned', value: 'RESIGNED' },
    { label: 'Sabbatical', value: 'SABBATICAL' }

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
  designations: any[] = [];

  leaveAllocationForm!: FormGroup;
  incharges: any[] = [];
  currentSabbatical: any = null;


  // Check if a document of specific type is uploaded

  mandatoryDocStatus: {
    required: string[];
    missing: string[];
  } = {
      required: [],
      missing: []
    };

  hasDocument(type: string): boolean {
    return this.uploadedDocsForm.getRawValue()
      .some((d: any) => d.type === type);
  }

  setFilteredTypesForIndex(index: number, category: string) {
    this.filteredTypes[index] = this.documentTypes.filter(
      d => d.category === category
    );
  }

  private autoAddMissingDocuments(): void {
    const { missing } = this.getMandatoryDocs();

    missing.forEach(type => {
      // Skip if already exists
      if (this.hasDocument(type)) return;

      const meta = this.documentTypes.find(d => d.value === type);
      if (!meta) return;

      const group = this.createDocumentGroup();

      // Auto-fill category & type
      group.patchValue({
        category: meta.category,
        type: meta.value,

      });

      // Lock auto-filled fields
      group.get('category')?.disable({ emitEvent: false });
      group.get('type')?.disable({ emitEvent: false });

      // Add to form array
      this.uploadedDocsForm.push(group);

      // Maintain dropdown filtering
      const index = this.uploadedDocsForm.length - 1;
      this.filteredTypes[index] = this.documentTypes.filter(
        t => t.category === meta.category
      );
    });
  }




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
      // designation: ['', Validators.required],
      designationId: ['', Validators.required],

      departmentId: ['', Validators.required],
      branchId: ['', Validators.required],
      roleId: ['', Validators.required],
      dateOfJoining: ['', Validators.required],
      employmentType: ['PERMANENT', Validators.required],
      employeeType: ['CLINICAL', Validators.required],
      probationEndDate: [{ value: null, disabled: true }],
      employmentStatus: ['ACTIVE', Validators.required],
      reportingManager: ['', Validators.required],
      fixedShiftId: [''],
      inchargeId: [''],
      fatherName: [''],
      marital: [''],
      experienceType: [''],
      motherName: [''],
      alternatePhone: [''],
      uanNumber: [''],
      panNumber: [''],
      aadharNumber: [''],
      licenseNumber: [''],
      licenseRegDate: [null],
      licenseExpiryDate: [null],

      preEmploymentCheckDate: [null, Validators.required],

      emergencyContacts: this.fb.array([]),
      qualifications: this.fb.array([]),

      sameAsPermanent: [false],
      geoTrackingEnabled: [false],

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
      shiftDate: [''],                              // keep (optional for fixed)

    });
    this.sabbaticalForm = this.fb.group({
      startDate: [null, Validators.required],
      endDate: [null, Validators.required],
      reason: ['']
    });
    if (this.isProfileView) {
      // Disable Employment Info fields
      const employmentControls = [
        'employeeCode',
        'referenceCode',
        'designationId',
        'departmentId',
        'branchId',
        'roleId',
        'dateOfJoining',
        'employmentType',
        'employmentStatus',
        'reportingManager',
        'fixedShiftId',
        'inchargeId',
        'shiftMode',
        'rotationPatternId',
        'rotationStartDate',
        'shiftDate'
      ];

      employmentControls.forEach(control => {
        const ctrl = this.employeeForm.get(control);
        if (ctrl) {
          ctrl.disable({ emitEvent: false });
        }
      });
    }

    // this.employeeForm.addControl('preEmploymentCheckDate', this.fb.control(null));
    // this.employeeForm.get('preEmploymentCheckDate')
    //   ?.setValidators([Validators.required]);
    // this.employeeForm.get('preEmploymentCheckDate')
    //   ?.updateValueAndValidity();
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
    this.addVaccination(); // ✅ only first row gets Hepatitis B


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
    this.loadIncharges();
    this.uploadedDocsForm = this.fb.array([]);
    this.employeeForm.addControl('documents', this.uploadedDocsForm);
    // this.addDocument();
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
      this.autoAddMissingDocuments();
      this.mandatoryDocStatus = this.getMandatoryDocs();
    });

    this.employeeForm.get('experienceType')?.valueChanges.subscribe(() => {
      this.autoAddMissingDocuments();
      this.mandatoryDocStatus = this.getMandatoryDocs();
    });

    this.qualifications.valueChanges.subscribe(() => {
      this.autoAddMissingDocuments();
      this.mandatoryDocStatus = this.getMandatoryDocs();
    });

    setTimeout(() => {
      this.autoAddMissingDocuments();
      this.mandatoryDocStatus = this.getMandatoryDocs();
    });

    this.leaveAllocationForm = this.fb.group({
      employeeId: ['', Validators.required],
      year: [new Date().getFullYear(), Validators.required],

      leaves: this.fb.array([
        this.createLeaveRow('ANNUAL'),
        this.createLeaveRow('SICK')
      ]),

      permissions: this.fb.array([
        this.createPermissionRow('PERSONAL'),
        this.createPermissionRow('OFFICIAL')
      ])
    });

  }
  loadIncharges() {
    this.employeeService.getIncharges().subscribe(data => {
      this.incharges = data.map(emp => ({
        label: emp.label,
        value: emp.value
      }));
    });
  }


  createLeaveRow(type: string) {
    return this.fb.group({
      leaveType: [type],
      totalAllowed: [0, Validators.required],
      used: [0],
      remaining: [{ value: 0, disabled: true }]
    });
  }

  createPermissionRow(type: string) {
    return this.fb.group({
      permissionType: [type],
      totalAllowed: [0, Validators.required],
      used: [0],
      remaining: [{ value: 0, disabled: true }]
    });
  }

  get leaveRows(): FormArray {
    return this.leaveAllocationForm.get('leaves') as FormArray;
  }

  get permissionRows(): FormArray {
    return this.leaveAllocationForm.get('permissions') as FormArray;
  }
  calculateRemaining(row: AbstractControl) {
    const total = row.get('totalAllowed')?.value || 0;
    const used = row.get('used')?.value || 0;
    row.get('remaining')?.setValue(total - used, { emitEvent: false });
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
    const isFirst = this.vaccinations.length === 0;
    this.vaccinations.push(
      this.fb.group({
        vaccineName: [isFirst ? 'HEP_B' : null, Validators.required],
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
    // this.isInitialVaccinationAdded = true;
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
  generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }


  createDocumentGroup(): FormGroup<{
    id: FormControl<number | null>;
    fileKey: FormControl;
    category: FormControl<string | null>;
    type: FormControl<string | null>;
    issueDate: FormControl<Date | null>;
    expiryDate: FormControl<Date | null>;
    file: FormControl<File | null>;
    fileUrl: FormControl<string | null>;
  }> {
    return this.fb.group({
      id: this.fb.control<number | null>(null),
      fileKey: this.fb.control(this.generateUUID()),
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
    if (!category) return;

    this.setFilteredTypesForIndex(index, category);

    // reset type when category changes
    this.uploadedDocsForm.at(index).get('type')?.reset();
  }



  loadDropdownData() {
    this.departmentService.getDepartments().subscribe(data => this.departments = data);
    this.branchService.getBranches().subscribe(data => this.branches = data);
    this.roleService.getRoles().subscribe(data => this.roles = data);
    this.shiftService.getShiftTemplates().subscribe(data => this.shifts = data);
    this.shiftService.getRotationPatterns().subscribe(data => this.patterns = data); // NEW
    this.employeeService.getDesignations().subscribe(d => {
      this.designations = d;
    });
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
    const isFirst = this.qualifications.length === 0;
    this.qualifications.push(
      this.fb.group({
        degree: [isFirst ? 'SSLC' : null, Validators.required],
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
    // always allow click; if invalid show a helpful toast
    this.markAllTouched(this.employeeForm);

    // include your custom validations too
    const invalidPaths = this.collectInvalidPaths(this.employeeForm);

    const customProblems: string[] = [];

    if (!this.validateMandatoryDocs()) {
      const md = this.getMandatoryDocs();
      customProblems.push(`Missing mandatory documents: ${md.missing.join(', ')}`);
    }
    if (!this.validateHepBVaccination()) {
      customProblems.push('Hepatitis B vaccination details are required (vaccinated = Yes + first dose date).');
    }

    if (invalidPaths.length || customProblems.length) {
      // build readable list, grouped by step
      const items = invalidPaths.map(p => ({
        step: this.stepForPath(p),
        text: this.prettyLabel(p)
      }));

      const grouped = new Map<string, string[]>();
      items.forEach(i => {
        if (!grouped.has(i.step)) grouped.set(i.step, []);
        grouped.get(i.step)!.push(i.text);
      });

      // Limit spam: show top N, tell count
      const MAX = 10;
      const flatLines: string[] = [];

      grouped.forEach((fields, step) => {
        const uniq = Array.from(new Set(fields));
        flatLines.push(`${step}: ${uniq.join(', ')}`);
      });

      customProblems.forEach(p => flatLines.push(p));

      const totalCount = invalidPaths.length + customProblems.length;
      const preview = flatLines.slice(0, MAX).join(' | ');
      const more = flatLines.length > MAX ? ` (+${flatLines.length - MAX} more)` : '';

      this.messageService.add({
        severity: 'error',
        summary: 'Cannot submit',
        detail: `${preview}${more}`
      });

      // optional: jump user to the first invalid step
      const first = invalidPaths[0];
      if (first) {
        const step = this.stepForPath(first);
        if (step.startsWith('Step 1')) this.activeIndex = 0;
        else if (step.startsWith('Step 2')) this.activeIndex = 1;
        else if (step.startsWith('Step 3')) this.activeIndex = 2;
        else if (step.startsWith('Step 4')) this.activeIndex = 3;
      }

      return;
    }
    if (!this.validateMandatoryDocs()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Missing Documents',
        detail: 'Please upload all mandatory documents before submitting.'
      });
      return;
    }
    if (!this.validateHepBVaccination()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Vaccination Required',
        detail: 'Hepatitis B vaccination details are mandatory before submitting.'
      });
      return;
    }

    if (this.employeeForm.get('preEmploymentCheckDate')?.invalid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Pre-employment check date is mandatory.'
      });
      return;
    }

    this.isLoading = true;

    if (this.employeeForm.valid) {
      const formValue = this.employeeForm.getRawValue();
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
        fixedShiftId, shiftDate, shiftMode, rotationPatternId, rotationStartDate,
        photoUrl,
        preEmploymentCheckDate,
        inchargeId,
        ...rest
      } = this.employeeForm.getRawValue();

      console.log('Form Value:', this.employeeForm.value);

      const payload = {
        ...rest,
        preEmploymentCheckDate,   // ✅ ADD
        inchargeId: inchargeId ? Number(inchargeId) : null, // ✅ FIX
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
        fixedShiftId: shiftMode === 'FIXED' ? fixedShiftId : undefined,
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

            if (this.employeeForm.value.disabilityProofFile instanceof File) {
              this.employeeService.uploadDisabilityProof(updatedEmployee.id, this.employeeForm.value.disabilityProofFile)
                .subscribe({
                  next: (res: any) => {
                    this.employeeForm.patchValue({ disabilityProofUrl: res.fileUrl });
                    this.messageService.add({
                      severity: 'success',
                      summary: 'Success',
                      detail: 'Disability proof uploaded successfully!'
                    });
                  },
                  error: () => {
                    this.isLoading = false;
                    this.messageService.add({
                      severity: 'error',
                      summary: 'Error',
                      detail: 'Failed to upload disability proof'
                    })
                  }
                });
            }


            if (this.haveDocumentsChanged(this.employeeData.documents, this.uploadedDocsForm.value)) {
              this.uploadEmployeeDocs(updatedEmployee.id);
            }

            // if (
            //   shiftId &&
            //   (shiftId !== this.employeeData.latestShiftAssignment?.shiftId ||
            //     new Date().toISOString() !==
            //     new Date(this.employeeData.latestShiftAssignment?.date).toISOString())
            // ) {
            //   this.assignEmployeeShift(updatedEmployee.id, shiftId);
            // }


            // alert('Employee updated successfully!');
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Employee updated successfully!'
            })
            this.isLoading = false;
            this.closeForm.emit(true);
          },
          error: () =>
          //  alert('Error updating employee')
          {
            this.isLoading = false,
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to update employee'
              })
          }
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

            if (this.employeeForm.value.disabilityProofFile instanceof File) {
              this.employeeService.uploadDisabilityProof(employee.id, this.employeeForm.value.disabilityProofFile)
                .subscribe({
                  next: (res: any) => {
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
            // if (shiftId) {
            //   this.assignEmployeeShift(employee.id, shiftId);
            // }
            this.isLoading = false;
            this.closeForm.emit(true);
            this.employeeForm.reset()
          },
          error: () =>
          // alert('Error creating employee')
          {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Error creating employee'
            })
            this.isLoading = false;

          }
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
    const group = this.createDocumentGroup();
    this.uploadedDocsForm.push(group);

    const index = this.uploadedDocsForm.length - 1;

    // initialize empty dropdown
    this.filteredTypes[index] = [];
  }


  removeDocument(index: number) {
    const doc = this.uploadedDocsForm.at(index).value;

    // 🔥 Case 1: Existing document (already saved in DB)
    if (doc?.id) {
      this.employeeService.deleteEmployeeDocument(doc.id).subscribe({
        next: () => {
          this.uploadedDocsForm.removeAt(index);
          this.messageService.add({
            severity: 'success',
            summary: 'Deleted',
            detail: 'Document removed successfully'
          });
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to delete document'
          });
        }
      });
    }

    // 🟢 Case 2: New document (not yet uploaded)
    else {
      this.uploadedDocsForm.removeAt(index);
    }
  }



  // Filter types based on selected category
  getFilteredTypes(index: number) {
    const category = this.uploadedDocsForm.at(index).get('category')?.value;
    return this.documentTypes.filter(t => t.category === category);
  }

  // Handle file selection
  // onDocumentSelect(event: any, index: number) {
  //   const file = event.target.files[0];
  //   if (file) {
  //     const reader = new FileReader();
  //     reader.onload = () => {
  //       this.uploadedDocsForm.at(index).patchValue({
  //         file: file,
  //         fileUrl: reader.result
  //       });
  //     };
  //     reader.readAsDataURL(file);
  //   }
  // }
  onDocumentSelect(event: any, index: number) {
    const file = event.target.files[0];
    if (file) {
      this.uploadedDocsForm.at(index).patchValue({
        file
      });
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
    const uploadedDocs = this.uploadedDocsForm.getRawValue();
    const employeeType = this.employeeForm.get('employeeType')?.value;
    const experienceType = (this.employeeForm.get('experienceType')?.value || '').toUpperCase();

    let mandatoryDocs: string[] = [];

    // Employee type specific
    // if (employeeType === 'CLINICAL') {
    //   mandatoryDocs = ['REGISTRATION_CERT'];
    //   // mandatoryDocs = ['SALARY_CERT', 'VERIFICATION_CERT'];
    // } else if (employeeType === 'NONCLINICAL') {
    //   // mandatoryDocs = ['REGISTRATION_CERT'];
    //   mandatoryDocs = ['SALARY_CERT', 'VERIFICATION_CERT'];
    // }
    const isFresher = experienceType === 'FRESHER'
    console.log(isFresher)
    if (!isFresher) {
      if (employeeType === 'CLINICAL') {
        mandatoryDocs.push('REGISTRATION_CERT');
      } else if (employeeType === 'NONCLINICAL') {
        mandatoryDocs.push('SALARY_CERT', 'VERIFICATION_CERT'); // or EXPERIENCE_CERT if you use that
      }
    }

    // Always required
    mandatoryDocs.push('AADHAAR', 'PAN', 'BANK');

    // Only qualifications entered in Step 3
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

    // const missingMandatory = mandatoryDocs.filter(m => {
    //   const doc = uploadedDocs.find((d: any) => d.type === m);
    //   return !doc || (!doc.file && !doc.fileUrl);
    // });
    const missingMandatory = mandatoryDocs.filter(m => {
      const doc = uploadedDocs.find((d: any) => d.type === m);
      return !doc || (!doc.file && !doc.fileUrl);
    });


    return { required: mandatoryDocs, missing: missingMandatory };
  }


  validateMandatoryDocs(): boolean {
    return this.getMandatoryDocs().missing.length === 0;
  }

  // uploadEmployeeDocs(employeeId: number) {
  //   const formData = new FormData();

  //   // Metadata
  //   formData.append('metadata', JSON.stringify(this.uploadedDocsForm.value));



  //   // Files
  //   // this.uploadedDocsForm.controls.forEach((docGroup: any) => {
  //   //   formData.append('file', docGroup.value.file);
  //   // });
  //   this.uploadedDocsForm.controls.forEach((ctrl, index) => {
  //     if (ctrl.value.file instanceof File) {
  //       formData.append('file', ctrl.value.file);
  //       formData.append('fileIndex', index.toString());
  //     }
  //   });


  //   console.log(this.uploadedDocsForm)

  //   this.employeeService.uploadEmployeeDocuments(employeeId, this.uploadedDocsForm)
  //     .subscribe({
  //       next: () =>
  //         // alert('Employee and documents uploaded successfully!'),
  //         this.messageService.add({
  //           severity: 'success',
  //           summary: 'Success',
  //           detail: 'Employee and documents uploaded successfully!'
  //         }),
  //       error: () =>
  //         //  alert('Documents upload failed')
  //         this.messageService.add({
  //           severity: 'error',
  //           summary: 'Error',
  //           detail: 'Documents upload failed'
  //         })
  //     });


  // }
  uploadEmployeeDocs(employeeId: number) {
    const formData = new FormData();

    // Metadata
    formData.append(
      'metadata',
      JSON.stringify(
        // this.uploadedDocsForm.value.map((d: any) => ({
        //   id: d.id ?? null,
        //   fileKey: d.id ? `id:${d.id}` : d.fileKey,
        //   title: d.type,
        //   type: d.type,
        //   category: d.category,
        //   issueDate: d.issueDate,
        //   expiryDate: d.expiryDate
        // }))
        this.uploadedDocsForm.getRawValue()
          .filter((d: any) => d.file instanceof File || d.fileUrl)
          .map((d: any) => ({
            id: d.id ?? null,
            fileKey: d.id ? `id:${d.id}` : d.fileKey,
            title: d.type,
            type: d.type,
            category: d.category,
            issueDate: d.issueDate,
            expiryDate: d.expiryDate
          }))
      )
    );

    // Files
    // this.uploadedDocsForm.controls.forEach(ctrl => {
    //   if (ctrl.value.file instanceof File) {
    //     formData.append('file', ctrl.value.file);
    //     formData.append(
    //       'fileKey',
    //       ctrl.value.id ? `id:${ctrl.value.id}` : ctrl.value.fileKey
    //     );
    //   }
    // });
    this.uploadedDocsForm.controls.forEach(ctrl => {
      const v = ctrl.value;

      if (v.file instanceof File) {
        formData.append('file', v.file);
        formData.append(
          'fileKey',
          v.id ? `id:${v.id}` : v.fileKey
        );
      }
    });


    this.employeeService.uploadEmployeeDocuments(employeeId, formData).subscribe({
      next: () =>
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Documents uploaded successfully!'
        }),
      error: () =>
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Documents upload failed'
        })
    });
  }

  // assignEmployeeShift(employeeId: number, shiftId: number) {
  //   this.shiftService.assignShift({
  //     employeeId: employeeId,
  //     shiftId: shiftId,
  //     date: new Date(),
  //     acknowledged: false
  //   }).subscribe({
  //     next: () => console.log('Shift assigned successfully'),
  //     error: () => console.error('Failed to assign shift')
  //   });
  // }

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
    // const fixedShiftFallback = data.shiftId ?? null;

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
      designationId: data.designationId,
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
      fatherName: data.fatherName,
      motherName: data.motherName,
      alternatePhone: data.alternatePhone,
      uanNumber: data.uanNumber,
      panNumber: data.panNumber,
      aadharNumber: data.aadharNumber,
      licenseNumber: data.licenseNumber,
      licenseRegDate: data.licenseRegDate ? new Date(data.licenseRegDate) : null,
      licenseExpiryDate: data.licenseExpiryDate ? new Date(data.licenseExpiryDate) : null,
      marital: data.marital,
      experienceType: data.experienceType,
      shiftMode: mode,
      fixedShiftId:
        mode === 'FIXED'
          ? fixedShiftFromSetting
          : null,
      // shiftId: mode === 'FIXED' ? (fixedShiftFromSetting ?? fixedShiftFallback) : null,
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
      inchargeId: data.inchargeId ?? null

    });

    if (data.sabbaticals && data.sabbaticals.length > 0) {
      const active = data.sabbaticals.find((s: any) => s.status === 'ACTIVE');
      if (active) {
        this.currentSabbatical = active;

        this.sabbaticalForm.patchValue({
          startDate: new Date(active.startDate),
          endDate: new Date(active.endDate),
          reason: active.reason
        });
      }
    }

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

    if (parsedVaccinations.length > 0) {
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
    } else {
      // Case 2: NO data → default Hepatitis B
      this.addVaccination();
    }


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

    if (this.emergencyContacts.length === 0) {
      this.addEmergencyContact();
    }

    // Patch qualifications
    this.qualifications.clear();
    if (data.qualifications && data.qualifications.length > 0) {
      data.qualifications?.forEach((q: any) => {
        this.qualifications.push(this.fb.group({
          degree: q.degree,
          institution: q.institution,
          year: q.year,
          grade: q.grade,
          degreeName: q.degreeName
        }));
      });
    } else {
      // Case 2: employee has NO data → show default
      this.addQualification(); // SSLC
    }

    // Patch documents
    this.uploadedDocsForm.clear();
    data.documents?.forEach((doc: any, index: number) => {
      const docGroup = this.createDocumentGroup();
      docGroup.patchValue({
        id: doc.id,
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
    const shiftIdCtrl = this.employeeForm.get('fixedShiftId')!;
    const patternCtrl = this.employeeForm.get('rotationPatternId')!;
    const startCtrl = this.employeeForm.get('rotationStartDate')!;

    if (mode === 'FIXED') {
      shiftIdCtrl.setValidators([Validators.required]);
      patternCtrl.clearValidators();
      startCtrl.clearValidators();
    } else {
      shiftIdCtrl.clearValidators();
      // patternCtrl.setValidators([Validators.required]);
      // startCtrl.setValidators([Validators.required]);
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
        'employeeCode', 'designationId', 'dateOfJoining',
        'employmentType', 'employmentStatus',
        'departmentId', 'branchId', 'roleId', 'reportingManager'
      ];

      // Dynamic shift mode validation
      const shiftMode = this.employeeForm.get('shiftMode')?.value;
      if (shiftMode === 'FIXED') {
        controlsToValidate.push('fixedShiftId');
      }
      // else if (shiftMode === 'ROTATIONAL') {
      //   controlsToValidate.push('rotationPatternId', 'rotationStartDate');
      // }
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
    console.log('Opening doc preview for URL:', url, doc);

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
  private validateHepBVaccination(): boolean {
    const vaccinations = this.vaccinations.value || [];

    const hepB = vaccinations.find(
      (v: any) => v.vaccineName === 'HEP_B'
    );

    if (!hepB) return false;
    if (hepB.vaccinated !== true) return false;
    if (!hepB.firstDose) return false;

    return true;
  }

  createLeaveAllocation() {
    if (this.leaveAllocationForm.invalid) return;

    const v = this.leaveAllocationForm.value;

    const payload = {
      employeeId: v.employeeId,
      year: v.year,

      leaves: v.leaves.map((l: any) => ({
        leaveType: l.leaveType,
        totalAllowed: l.totalAllowed
      })),

      permissions: v.permissions.map((p: any) => ({
        permissionType: p.permissionType,
        totalAllowed: p.totalAllowed
      }))
    };

    // this.employeeService.createLeaveAllocation(payload).subscribe({
    //   next: () => {
    //     this.messageService.add({
    //       severity: 'success',
    //       summary: 'Success',
    //       detail: 'Leave allocation created successfully'
    //     });
    //     this.leaveAllocationForm.reset({ year: new Date().getFullYear() });
    //   },
    //   error: () => {
    //     this.messageService.add({
    //       severity: 'error',
    //       summary: 'Error',
    //       detail: 'Failed to create leave allocation'
    //     });
    //   }
    // });
  }
  saveSabbatical() {
    if (this.sabbaticalForm.invalid) return;

    this.loadingSabbatical = true;
    const data = this.sabbaticalForm.value;

    this.employeeService.startSabbatical(
      this.employeeData?.id,
      data
    ).subscribe({
      next: () => {
        this.showSabbaticalDialog = false;
        this.loadingSabbatical = false;

        // keep status as SABBATICAL
        this.employeeForm.patchValue({
          employmentStatus: 'SABBATICAL'
        }, { emitEvent: false });
      },
      error: (err) => {
        console.error(err);
        this.loadingSabbatical = false;
      }
    });
  }
  onEmploymentStatusChange(event: any) {
    const status = event.value;

    if (status === 'SABBATICAL') {
      this.openSabbaticalDialog(this.employeeData || this.employeeForm.value);
    }
  }
  cancelSabbatical() {
    this.showSabbaticalDialog = false;

    // revert status back to ACTIVE or previous value
    this.employeeForm.patchValue({
      employmentStatus: 'ACTIVE'
    }, { emitEvent: false });
  }

  openSabbaticalDialog(employee: any) {
    this.employeeData = employee;
    this.showSabbaticalDialog = true;

    this.sabbaticalForm.reset();
  }
  openExistingSabbatical() {
    if (this.currentSabbatical) {
      this.sabbaticalForm.patchValue({
        startDate: new Date(this.currentSabbatical.startDate),
        endDate: new Date(this.currentSabbatical.endDate),
        reason: this.currentSabbatical.reason
      });
      console
    }

    this.showSabbaticalDialog = true;
  }
  extendCurrentSabbatical() {
    if (!this.currentSabbatical) return;

    const endDate = this.sabbaticalForm.value.endDate;

    this.employeeService
      .extendSabbatical(this.currentSabbatical.id, endDate)
      .subscribe(() => {
        this.showSabbaticalDialog = false;
      });
  }
  endCurrentSabbatical() {
    if (!this.currentSabbatical) return;

    this.employeeService
      .endSabbatical(this.currentSabbatical.id)
      .subscribe(() => {
        this.employeeForm.patchValue({
          employmentStatus: 'ACTIVE'
        });

        this.currentSabbatical = null;
        this.showSabbaticalDialog = false;
      });
  }
  terminateCurrentSabbatical() {
    if (!this.currentSabbatical) return;

    this.employeeService
      .terminateFromSabbatical(this.currentSabbatical.id)
      .subscribe(() => {
        this.employeeForm.patchValue({
          employmentStatus: 'TERMINATED'
        });

        this.currentSabbatical = null;
        this.showSabbaticalDialog = false;
      });
  }
  private fieldLabels: Record<string, string> = {
    firstName: 'First Name',
    lastName: 'Last Name',
    dob: 'Date of Birth',
    gender: 'Gender',
    phone: 'Phone',
    email: 'Email',
    bloodGroup: 'Blood Group',
    age: 'Age',
    designationId: 'Designation',
    departmentId: 'Department',
    branchId: 'Branch',
    roleId: 'Role',
    dateOfJoining: 'Date of Joining',
    employmentType: 'Employment Type',
    employmentStatus: 'Employment Status',
    reportingManager: 'Reporting Manager',
    fixedShiftId: 'Fixed Shift',
    preEmploymentCheckDate: 'Pre-employment check date',

    'permanentAddress.line1': 'Permanent Address Line 1',
    'permanentAddress.city': 'Permanent Address City',
    'permanentAddress.state': 'Permanent Address State',
    'permanentAddress.zipCode': 'Permanent Address Zip Code',
    'permanentAddress.country': 'Permanent Address Country',
  };
  private markAllTouched(control: AbstractControl) {
    control.markAsTouched();
    control.updateValueAndValidity({ emitEvent: false });

    if (control instanceof FormGroup) {
      Object.values(control.controls).forEach(c => this.markAllTouched(c));
    } else if (control instanceof FormArray) {
      control.controls.forEach(c => this.markAllTouched(c));
    }
  }

  private collectInvalidPaths(control: AbstractControl, path = ''): string[] {
    const invalid: string[] = [];

    if (control instanceof FormGroup) {
      Object.keys(control.controls).forEach(key => {
        const child = control.controls[key];
        const childPath = path ? `${path}.${key}` : key;
        invalid.push(...this.collectInvalidPaths(child, childPath));
      });
    } else if (control instanceof FormArray) {
      control.controls.forEach((child, i) => {
        const childPath = `${path}[${i}]`;
        invalid.push(...this.collectInvalidPaths(child, childPath));
      });
    } else {
      if (control.invalid) invalid.push(path);
    }

    return invalid;
  }
  private stepForPath(path: string): string {
    // Step 1: Personal Info
    if (
      path.startsWith('firstName') || path.startsWith('lastName') || path.startsWith('dob') ||
      path.startsWith('gender') || path.startsWith('phone') || path.startsWith('email') ||
      path.startsWith('bloodGroup') || path.startsWith('age') || path.startsWith('employeeType') ||
      path.startsWith('permanentAddress') || path.startsWith('temporaryAddress') ||
      path.startsWith('emergencyContacts')
    ) return 'Step 1 (Personal Info)';

    // Step 2: Employment Info
    if (
      path.startsWith('employeeCode') || path.startsWith('referenceCode') ||
      path.startsWith('designationId') || path.startsWith('departmentId') ||
      path.startsWith('branchId') || path.startsWith('roleId') ||
      path.startsWith('dateOfJoining') || path.startsWith('employmentType') ||
      path.startsWith('employmentStatus') || path.startsWith('reportingManager') ||
      path.startsWith('probationEndDate') || path.startsWith('shiftMode') ||
      path.startsWith('fixedShiftId') || path.startsWith('rotationPatternId') ||
      path.startsWith('rotationStartDate') || path.startsWith('shiftDate') ||
      path.startsWith('inchargeId')
    ) return 'Step 2 (Employment Info)';

    // Step 3: Qualifications
    if (path.startsWith('qualifications')) return 'Step 3 (Qualifications)';

    // Step 4: Documents
    if (path.startsWith('documents')) return 'Step 4 (Documents)';

    // Step 5: Health & Wellness
    if (
      path.startsWith('preEmploymentCheckDate') ||
      path.startsWith('healthIssues') ||
      path.startsWith('vaccinations') ||
      path.startsWith('height') || path.startsWith('weight') || path.startsWith('bmi') ||
      path.startsWith('bloodPressure') || path.startsWith('bloodSugar') || path.startsWith('cholesterol') ||
      path.startsWith('allergies') || path.startsWith('chronicConditions') ||
      path.startsWith('smoking') || path.startsWith('alcohol') ||
      path.startsWith('visionType') || path.startsWith('usesGlasses') || path.startsWith('visionRemarks') ||
      path.startsWith('pastSurgeries') || path.startsWith('preferredHospital') ||
      path.startsWith('primaryPhysician') || path.startsWith('emergencyNotes') ||
      path.startsWith('hasDisability') || path.startsWith('disabilityType') ||
      path.startsWith('disabilityDescription') || path.startsWith('disabilityProofFile')
    ) return 'Step 5 (Health & Wellness)';

    return 'Form';
  }

  private prettyLabel(path: string): string {

    // Vaccinations
    if (path.startsWith('vaccinations')) {
      const index = path.match(/\[(\d+)\]/)?.[1];
      const field = path.split('.').pop();

      if (field === 'vaccinated')
        return `Vaccination ${Number(index) + 1}: Vaccinated?`;

      if (field === 'firstDose')
        return `Vaccination ${Number(index) + 1}: First Dose Date`;

      if (field === 'secondDose')
        return `Vaccination ${Number(index) + 1}: Second Dose Date`;

      return `Vaccination ${Number(index) + 1}`;
    }

    // Qualifications
    if (path.startsWith('qualifications')) {
      const index = path.match(/\[(\d+)\]/)?.[1];
      const field = path.split('.').pop();

      if (field === 'institution')
        return `Qualification ${Number(index) + 1}: Institution`;

      if (field === 'year')
        return `Qualification ${Number(index) + 1}: Year`;

      if (field === 'degree')
        return `Qualification ${Number(index) + 1}: Qualification Type`;

      return `Qualification ${Number(index) + 1}`;
    }

    // Emergency Contacts
    if (path.startsWith('emergencyContacts')) {
      const index = path.match(/\[(\d+)\]/)?.[1];
      const field = path.split('.').pop();

      if (field === 'name')
        return `Emergency Contact ${Number(index) + 1}: Name`;

      if (field === 'phone')
        return `Emergency Contact ${Number(index) + 1}: Phone`;

      if (field === 'relationship')
        return `Emergency Contact ${Number(index) + 1}: Relationship`;

      return `Emergency Contact ${Number(index) + 1}`;
    }

    // Documents
    if (path.startsWith('documents')) {
      const index = path.match(/\[(\d+)\]/)?.[1];
      const field = path.split('.').pop();

      if (field === 'file')
        return `Document ${Number(index) + 1}: File Upload`;

      if (field === 'category')
        return `Document ${Number(index) + 1}: Category`;

      if (field === 'type')
        return `Document ${Number(index) + 1}: Document Type`;

      return `Document ${Number(index) + 1}`;
    }

    // Simple fields
    const labels: any = {
      firstName: 'First Name',
      lastName: 'Last Name',
      dob: 'Date of Birth',
      gender: 'Gender',
      phone: 'Phone',
      email: 'Email',
      bloodGroup: 'Blood Group',
      designationId: 'Designation',
      departmentId: 'Department',
      branchId: 'Branch',
      roleId: 'Role',
      reportingManager: 'Reporting Manager',
      fixedShiftId: 'Shift Template',
      preEmploymentCheckDate: 'Pre-Employment Check Date'
    };

    return labels[path] || path;
  }
}


