import { Component, Input, Output, EventEmitter,OnChanges, SimpleChanges } from '@angular/core';
import { InputTextModule } from 'primeng/inputtext';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { FloatLabel } from 'primeng/floatlabel';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Appraisal } from '../../../services/appraisal/appraisal';
import { CommonModule } from '@angular/common';

interface SelectOpton {
  name: string;
  value: string;
}

@Component({
  selector: 'app-apprasial-form',
  imports: [FormsModule, InputTextModule, FloatLabel, TextareaModule, ButtonModule, ReactiveFormsModule,CommonModule],
  templateUrl: './apprasial-form.html',
  styleUrl: './apprasial-form.css'
})
export class ApprasialForm {

  @Input() selectedAppraisal: any;  // Data passed from parent
  @Output() formSubmitted = new EventEmitter<void>(); // Notify parent after save


  appraisalForm!: FormGroup;
  role: string = 'Reporting Manager'

  constructor(private fb: FormBuilder, private appraisalService: Appraisal) {}

  ngOnInit() {
    this.initForm()
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedAppraisal'] && this.selectedAppraisal) {
      if (!this.appraisalForm) {
        this.initForm();
      }
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => this.patchEmployeeData(), 0);
    }
  }
  
  sections = [
    {
      id: 1,
      title: 'Quality of Work',
      desc: `Accuracy, neatness and thoroughness of work effort.<br />
             • How frequent are mistakes or errors?<br />
             • How consistent is the accuracy and thoroughness of work?`,
      guide: `Above Average: Produces outstanding, neat and accurate work. Work must seldom be checked by others. Errors are rare and minor.<br />
              Average: Average accuracy and neatness for qualified employees. Occasional errors. Reasonably conscientious about checking work and preventing errors.<br />
              Below Average: Poor accuracy and neatness. Frequent errors and/or errors of substantial magnitude. Work must be checked by others. Employee shows little concern with quality of work.`,
      ratingControl: 'qualityOfWorkRating',
      commentControl: 'qualityOfWorkComments'
    },
    {
      id: 2,
      title: 'Knowledge of Job',
      desc: `Demonstrates the knowledge of fundamental methods and procedures of the job.<br />
             • How often does employee have to be shown job procedures??<br />
             • How does employee handle unexpected problems or breakdowns?<br />
             • Does employee retain knowledge of job or require substantial review?`,
      guide: `Above Average: Possesses broad and detailed knowledge of all aspects of the job. Rarely needs to ask for job information.<br />
              Average: Adequate knowledge of phases of work. Possesses knowledge necessary to perform duties. Does not need substantial guidance or direction.<br />
              Below Average: Insufficient knowledge of job duties. Has difficulty performing job tasks without substantial guidance and direction.`,
      ratingControl: 'knowledgeOfJobRating',
      commentControl: 'knowledgeOfJobComments'
    },
    {
      id: 3,
      title: 'Teamwork',
      desc: `Ability to work well with co-workers and supervisors.`,
      guide: `Above Average: Very cooperative, handles disagreement well.<br />
              Average: Works willingly with others.<br />
              Below Average: Causes friction, resists authority.`,
      ratingControl: 'teamworkRating',
      commentControl: 'teamworkComments'
    },
    {
      id: 4,
      title: 'Independence',
      desc: `Ability to work independently, be resourceful and display initiative.`,
      guide: `Above Average: Works independently, seeks new skills.<br />
              Average: Satisfactory initiative, usually works without supervision.<br />
              Below Average: Requires substantial supervision.`,
      ratingControl: 'independenceRating',
      commentControl: 'independenceComments'
    },
    {
      id: 5,
      title: 'Records and Reports',
      desc: `Ability to produce and maintain written job reports and records.`,
      guide: `Above Average: Outstanding record management, accurate & on time.<br />
              Average: Satisfactory records, usually on time.<br />
              Below Average: Sloppy, inaccurate or untimely.`,
      ratingControl: 'recordsRating',
      commentControl: 'recordsComments'
    },
    {
      id: 6,
      title: 'Guest/Patient Service',
      desc: `Ability to deal with guests/customers in a polite and helpful manner.`,
      guide: `Above Average: Outstanding concern and helpfulness.<br />
              Average: Satisfactory guest handling.<br />
              Below Average: Unsatisfactory, rude or unhelpful.`,
      ratingControl: 'guestServiceRating',
      commentControl: 'guestServiceComments'
    },
    {
      id: 7,
      title: 'Safety',
      desc: `Ability to comply with precautions for safety of self and others.`,
      guide: `Above Average: Highly knowledgeable & safety-conscious.<br />
              Average: Satisfactory level of safety knowledge.<br />
              Below Average: Unsafe, fails to follow safety procedures.`,
      ratingControl: 'safetyRating',
      commentControl: 'safetyComments'
    },
    {
      id: 8,
      title: 'Attendance',
      desc: `Regularity of attendance and absence for legitimate reasons.`,
      guide: `Above Average: Rarely absent, minimizes disruption.<br />
              Average: Satisfactory attendance, usually follows procedure.<br />
              Below Average: Frequent, disruptive absences.`,
      ratingControl: 'attendanceRating',
      commentControl: 'attendanceComments'
    },
    {
      id: 9,
      title: 'Leadership and Supervision (Management Only)',
      desc: `Ability to plan, organize and supervise so that jobs are completed.`,
      guide: `Above Average: Excellent planning, delegation & results.<br />
              Average: Satisfactory delegation and planning.<br />
              Below Average: Poor planning, frequent crises.`,
      ratingControl: 'leadershipRating',
      commentControl: 'leadershipComments'
    }
  ];
  
  

  initForm() {
    this.appraisalForm = this.fb.group({
      fullName: [''],
      employeeCode: [''],
      department: [''],
      designation: [''],
      dateOfJoining: [''],
      cycle: [''],
      managerName: [''],
      // Section Ratings + Comments
      qualityOfWorkRating: ['', [Validators.min(0), Validators.max(10)]],
      qualityOfWorkComments: [''],

      knowledgeOfJobRating: ['', [Validators.min(0), Validators.max(10)]],
      knowledgeOfJobComments: [''],

      teamworkRating: ['', [Validators.min(0), Validators.max(10)]],
      teamworkComments: [''],

      independenceRating: ['', [Validators.min(0), Validators.max(10)]],
      independenceComments: [''],

      recordsRating: ['', [Validators.min(0), Validators.max(10)]],
      recordsComments: [''],

      guestServiceRating: ['', [Validators.min(0), Validators.max(10)]],
      guestServiceComments: [''],

      safetyRating: ['', [Validators.min(0), Validators.max(10)]],
      safetyComments: [''],

      attendanceRating: ['', [Validators.min(0), Validators.max(10)]],
      attendanceComments: [''],

      leadershipRating: ['', [Validators.min(0), Validators.max(10)]],
      leadershipComments: [''],
    
      // Overall score also limited to 10
      overallScore: ['', [Validators.required, Validators.min(0), Validators.max(10)]],
      comments: [''],
      recommendations: [''],
      finalDecision: ['', Validators.required],
      finalComments: ['']
    });
  }

  patchEmployeeData() {
    if (!this.appraisalForm || !this.selectedAppraisal) return;

    this.appraisalForm.patchValue({
      fullName: this.selectedAppraisal.fullName,
      employeeCode: this.selectedAppraisal.employeeCode,
      department: this.selectedAppraisal.departmentName,
      designation: this.selectedAppraisal.designation,
      dateOfJoining: this.selectedAppraisal.dateOfJoining
        ? new Date(this.selectedAppraisal.dateOfJoining).toLocaleDateString()
        : 'N/A',
      cycle: this.selectedAppraisal.cycle,
      managerName: this.selectedAppraisal.managerName
    });

    if (this.selectedAppraisal.managerReview) {
      const review = this.selectedAppraisal.managerReview;
      this.appraisalForm.patchValue({
        qualityOfWorkRating: review.qualityOfWorkRating?.toString() || '',
        qualityOfWorkComments: review.qualityOfWorkComments || '',

        knowledgeOfJobRating: review.knowledgeOfJobRating?.toString() || '',
        knowledgeOfJobComments: review.knowledgeOfJobComments || '',

        teamworkRating: review.teamworkRating?.toString() || '',
        teamworkComments: review.teamworkComments || '',

        independenceRating: review.independenceRating?.toString() || '',
        independenceComments: review.independenceComments || '',

        recordsRating: review.recordsRating?.toString() || '',
        recordsComments: review.recordsComments || '',

        guestServiceRating: review.guestServiceRating?.toString() || '',
        guestServiceComments: review.guestServiceComments || '',

        safetyRating: review.safetyRating?.toString() || '',
        safetyComments: review.safetyComments || '',

        attendanceRating: review.attendanceRating?.toString() || '',
        attendanceComments: review.attendanceComments || '',

        leadershipRating: review.leadershipRating?.toString() || '',
        leadershipComments: review.leadershipComments || '',

        overallScore: review.overallScore?.toString() || '',
        comments: review.comments || '',
        recommendations: review.recommendations || '',
        finalDecision: this.selectedAppraisal.finalDecision || '',
        finalComments: this.selectedAppraisal.finalComments || ''
      });
    }
  }

  // ================= SUBMIT =================
  onSubmit() {
    const invalidFields = this.getInvalidFields(this.appraisalForm);
    console.log('Invalid fields:', invalidFields);

    if (this.appraisalForm.valid) {
      const rawValues = this.appraisalForm.getRawValue();

      // Convert numeric fields to numbers
      const numericFields = [
        'qualityOfWorkRating',
        'knowledgeOfJobRating',
        'teamworkRating',
        'independenceRating',
        'recordsRating',
        'guestServiceRating',
        'safetyRating',
        'attendanceRating',
        'leadershipRating',
        'overallScore'
      ];
      numericFields.forEach(field => {
        if (rawValues[field] !== '' && rawValues[field] !== null) {
          rawValues[field] = parseFloat(rawValues[field]);
        }
      });

      const payload = {
        appraisalId: this.selectedAppraisal.id,
        ...rawValues
      };

      console.log('Payload:', payload);

      this.appraisalService.saveManagerReview(payload).subscribe(() => {
        this.formSubmitted.emit();
      });
    }
  }
  onCancel(){
    this.appraisalForm.reset()
    this.formSubmitted.emit();
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
