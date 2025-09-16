import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Resignation } from '../../services/resignation/resignation';
import { CommonModule } from '@angular/common';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { RadioButtonModule } from 'primeng/radiobutton';
import { CardModule } from 'primeng/card';
import { AccordionModule, AccordionPanel } from 'primeng/accordion';
import { RatingModule } from 'primeng/rating';
import { SelectButtonModule } from 'primeng/selectbutton';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DatePicker } from "primeng/datepicker";
import { FloatLabelModule } from 'primeng/floatlabel';
import { DividerModule } from 'primeng/divider';

@Component({
  selector: 'app-exit-interview',
  imports: [CommonModule, ReactiveFormsModule, SelectModule, CheckboxModule, ButtonModule, RadioButtonModule,
    CardModule, AccordionPanel, AccordionModule, RatingModule, SelectButtonModule, TextareaModule, InputTextModule, DatePicker, FormsModule, FloatLabelModule, DividerModule],
  templateUrl: './exit-interview.html',
  styleUrl: './exit-interview.css'
})
export class ExitInterview {
  @Input() formData: any;
  @Output() closeForm = new EventEmitter<void>();
  form!: FormGroup;


  constructor(private fb: FormBuilder, private exitService: Resignation) { }

  // ===== Options for SelectButtons =====
  academicOptions = [
    { label: 'Nursing', value: 'nursing' },
    { label: 'Diploma', value: 'diploma' },
    { label: 'BE', value: 'be' },
    { label: 'MBA', value: 'mba' }
  ];

  vacancyOptions = [
    { label: 'Newspaper', value: 'newspaper' },
    { label: 'Website', value: 'website' },
    { label: 'Referral', value: 'referral' },
    { label: 'Oral', value: 'oral' }
  ];

  recruitmentOptions = [
    { label: 'Walk-in', value: 'walkIn' },
    { label: 'PSC', value: 'psc' },
    { label: 'Compassionate', value: 'compassionate' }
  ];

  demotivatingOptions = [
    { label: 'Unionism', value: 'unionism' },
    { label: 'Leadership', value: 'leadership' },
    { label: 'Non-competence', value: 'nonCompetence' },
    { label: 'Excess manpower', value: 'excessManpower' },
    { label: 'Uncoordination', value: 'uncoordination' }
  ];

  // ===== Fields for ratings =====
  jobOpinionFields = [
    { label: 'Orientation', key: 'orientation' },
    { label: 'Working Hours', key: 'workingConditions' },
    { label: 'Infrastructure', key: 'infrastructure' },
    { label: 'Training', key: 'training' },
    { label: 'Peers/Subordinates', key: 'peers' },
    { label: 'Team Work', key: 'teamwork' },
    { label: 'Policies', key: 'policies' },
    { label: 'Communication (Dept)', key: 'communicationDept' },
    { label: 'Communication (Top-down)', key: 'communicationTop' }
  ];

  superiorOpinionFields = [
    { label: 'Fair Treatment', key: 'fairTreatment' },
    { label: 'Recognition', key: 'recognition' },
    { label: 'Resolves Complaints', key: 'resolvesComplaints' },
    { label: 'Consistent Policy', key: 'consistentPolicy' },
    { label: 'Clear Instructions', key: 'clearInstructions' },
    { label: 'Teamwork', key: 'teamwork' }
  ];

  companyOpinionFields = [
    { label: 'Salary', key: 'salary' },
    { label: 'Growth', key: 'growth' },
    { label: 'Appraisal', key: 'appraisal' },
    { label: 'Policies', key: 'policies' }
  ];
  leaveFactorsList = [
    { key: 'jobSecurity', label: 'Job Security' },
    { key: 'financialFreedom', label: 'Financial Freedom' },
    { key: 'firmReputation', label: 'Reputation of the Firm' },
    { key: 'workStress', label: 'Work Load / Stress' },
    { key: 'peerRelationship', label: 'Peer/Supervisor relationship' },
    { key: 'healthReasons', label: 'Health reasons' },
    { key: 'careerGrowth', label: 'Secured a Better Position / Career growth' },
    { key: 'familyReasons', label: 'Personal / Family reasons' },
  ];

  dissatisfactionList = [
    { key: 'workProfile', label: 'Type of work / profile' },
    { key: 'workingConditions', label: 'Working conditions / environment' },
    { key: 'salary', label: 'Salary / Benefits' },
    { key: 'supervision', label: 'Supervision' },
    { key: 'peerRelations', label: 'Relationship with peers' },
    { key: 'recognition', label: 'Recognition / acceptance of work' }
  ];


  ngOnInit() {
    this.form = this.fb.group({
      employeeId: ['', Validators.required],
      interviewedBy: ['', Validators.required],
      interviewDate: [null, Validators.required],
      resignationId: [1],

      nextOrgName: ['', Validators.required],
      nextOrgPosition: ['', Validators.required],
      nextOrgCategory: ['', Validators.required],
      nextOrgLocation: ['', Validators.required],
      nextOrgIndustry: ['', Validators.required],

      academicQualification: [[], Validators.required],
      academicQualificationOthers: [''],

      vacancySource: [[], Validators.required],
      recruitmentMode: [[], Validators.required],
      recruitmentModeOthers: [''],

      reasonForLeaving: ['', Validators.required],
      triggerReason: ['', Validators.required],
      mostSatisfying: ['', Validators.required],
      leastSatisfying: ['', Validators.required],
      supportReceived: ['', Validators.required],
      newJobOffers: ['', Validators.required],
      expectationsMet: ['', Validators.required],
      skillUtilization: ['', Validators.required],

      // ✅ Add missing groups here
      influencedFactors: this.fb.group({
        jobSecurity: ['', Validators.required],
        financialFreedom: ['', Validators.required],
        firmReputation: ['', Validators.required],
        workStress: ['', Validators.required],
        peerRelationship: ['', Validators.required],
        healthReasons: ['', Validators.required],
        careerGrowth: ['', Validators.required],
        familyReasons: ['', Validators.required],
        others: ['', Validators.required]
      }),

      dissatisfaction: this.fb.group({
        workProfile: ['', Validators.required],
        workingConditions: ['', Validators.required],
        salary: ['', Validators.required],
        supervision: ['', Validators.required],
        peerRelations: ['', Validators.required],
        recognition: ['', Validators.required],
        others: ['', Validators.required]
      }),

      jobOpinion: this.fb.group({
        orientation: [0, this.ratingRequired],
        workingConditions: [0, this.ratingRequired],
        infrastructure: [0, this.ratingRequired],
        training: [0, this.ratingRequired],
        peers: [0, this.ratingRequired],
        teamwork: [0, this.ratingRequired],
        policies: [0, this.ratingRequired],
        communicationDept: [0, this.ratingRequired],
        communicationTop: [0, this.ratingRequired],
      }),

      attitudeSuperiors: this.fb.group({
        fairTreatment: [0, this.ratingRequired],
        recognition: [0, this.ratingRequired],
        resolvesComplaints: [0, this.ratingRequired],
        consistentPolicy: [0, this.ratingRequired],
        clearInstructions: [0, this.ratingRequired],
        teamwork: [0, this.ratingRequired],
      }),

      companyOpinion: this.fb.group({
        salary: [0, this.ratingRequired],
        growth: [0, this.ratingRequired],
        appraisal: [0, this.ratingRequired],
        policies: [0, this.ratingRequired],
      }),

      exitReasons: this.fb.group({
        reasonForLeaving: ['', Validators.required],
        triggerReason: ['', Validators.required],
        mostSatisfying: ['', Validators.required],
        leastSatisfying: ['', Validators.required],
        supportReceived: ['', Validators.required],
        newJobOffers: ['', Validators.required],
      }),

      newJobSalaryComparison: ['', Validators.required],
      discrimination: [false, Validators.requiredTrue],

      likedMost: ['',Validators.required],
      stayEncouragement: ['',Validators.required],
      recommendCompany: [false,Validators.required],
      recommendReason: ['',Validators.required],

      demotivating: [[],Validators.required],
      demotivatingOthers: [''],
    });
    setTimeout(() => {
      if (this.formData) {
        const parsedData = {
          ...this.formData,
          academicQualification: this.formData.academicQualification
            ? JSON.parse(this.formData.academicQualification)
            : [],
          vacancySource: this.formData.vacancySource
            ? JSON.parse(this.formData.vacancySource)
            : [],
          recruitmentMode: this.formData.recruitmentMode
            ? JSON.parse(this.formData.recruitmentMode)
            : [],
          demotivating: this.formData.demotivating
            ? JSON.parse(this.formData.demotivating)
            : [],
          jobOpinion: this.formData.jobOpinion
            ? JSON.parse(this.formData.jobOpinion)
            : {},
          attitudeSuperiors: this.formData.attitudeSuperiors
            ? JSON.parse(this.formData.attitudeSuperiors)
            : {},
          companyOpinion: this.formData.companyOpinion
            ? JSON.parse(this.formData.companyOpinion)
            : {},
          influencedFactors: this.formData.influencedFactors
            ? JSON.parse(this.formData.influencedFactors)
            : {},
          dissatisfaction: this.formData.dissatisfaction
            ? JSON.parse(this.formData.dissatisfaction)
            : {},
          interviewDate: this.formData.interviewDate
            ? new Date(this.formData.interviewDate)
            : null,
        };
    
        this.form.patchValue(parsedData);
        console.log("✅ Form patched:", parsedData);
      }
    });
    
  }

  submitted = false;

  onSubmit() {
    this.submitted = true
    if (this.form.valid) {
      this.exitService.submit(this.form.value).subscribe(() => {
        alert('Exit Interview saved successfully!');
        // this.form.reset();
        this.submitted = false;
      });
      console.log(this.form.value);
    } else {
      console.log(this.form .errors, this.form)
      this.form.markAllAsTouched()
    }
  }
  // ngOnChanges(changes: SimpleChanges) {
  //   console.log(this.formData)
  //   if (changes['formData'] && this.formData && this.form) {
  //     this.form.patchValue(this.formData);
  //   }
  // }

  ratingRequired(control: AbstractControl): ValidationErrors | null {
    return control.value && control.value > 0 ? null : { required: true }
  }
}
