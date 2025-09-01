import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges  } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
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

@Component({
  selector: 'app-exit-interview',
  imports: [CommonModule, ReactiveFormsModule, SelectModule, CheckboxModule, ButtonModule, RadioButtonModule,
    CardModule, AccordionPanel, AccordionModule, RatingModule, SelectButtonModule, TextareaModule, InputTextModule, DatePicker,FormsModule, FloatLabelModule],
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
      employeeId: [''],
      interviewedBy: [''],
      interviewDate: [null],
      resignationId:[1],
  
      nextOrgName: [''],
      nextOrgPosition: [''],
      nextOrgCategory: [''],
      nextOrgLocation: [''],
      nextOrgIndustry: [''],
  
      academicQualification: [[]],
      academicQualificationOthers: [''],
  
      vacancySource: [[]],
      recruitmentMode: [[]],
      recruitmentModeOthers: [''],
  
      reasonForLeaving: [''],
      triggerReason: [''],
      mostSatisfying: [''],
      leastSatisfying: [''],
      supportReceived: [''],
      newJobOffers: [''],
      expectationsMet: [''],
      skillUtilization: [''],
  
      // ✅ Add missing groups here
      influencedFactors: this.fb.group({
        jobSecurity: [''],
        financialFreedom: [''],
        firmReputation: [''],
        workStress: [''],
        peerRelationship: [''],
        healthReasons: [''],
        careerGrowth: [''],
        familyReasons: [''],
        others: ['']
      }),
  
      dissatisfaction: this.fb.group({
        workProfile: [''],
        workingConditions: [''],
        salary: [''],
        supervision: [''],
        peerRelations: [''],
        recognition: [''],
        others: ['']
      }),
  
      jobOpinion: this.fb.group({
        orientation: [0],
        workingConditions: [0],
        infrastructure: [0],
        training: [0],
        peers: [0],
        teamwork: [0],
        policies: [0],
        communicationDept: [0],
        communicationTop: [0],
      }),
  
      attitudeSuperiors: this.fb.group({
        fairTreatment: [0],
        recognition: [0],
        resolvesComplaints: [0],
        consistentPolicy: [0],
        clearInstructions: [0],
        teamwork: [0],
      }),
  
      companyOpinion: this.fb.group({
        salary: [0],
        growth: [0],
        appraisal: [0],
        policies: [0],
      }),
  
      newJobSalaryComparison: [''],
      discrimination: [false],
  
      likedMost: [''],
      stayEncouragement: [''],
      recommendCompany: [false],
      recommendReason: [''],
  
      demotivating: [[]],
      demotivatingOthers: [''],
    });
  }
  

  onSubmit() {
    if (this.form.valid) {
      this.exitService.submit(this.form.value).subscribe(() => {
        alert('Exit Interview saved successfully!');
        this.form.reset();
      });
      console.log(this.form.value);
    }
  }
  ngOnChanges(changes: SimpleChanges) {
    console.log(this.formData)
    if (changes['formData'] && this.formData) {
      this.form.patchValue(this.formData);
    }
  }
}
