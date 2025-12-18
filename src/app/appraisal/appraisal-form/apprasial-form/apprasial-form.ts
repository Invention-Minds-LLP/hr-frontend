import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
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
import { MessageService } from 'primeng/api';

interface SelectOpton {
  name: string;
  value: string;
}

@Component({
  selector: 'app-apprasial-form',
  imports: [FormsModule, InputTextModule, FloatLabel, TextareaModule, ButtonModule, ReactiveFormsModule, CommonModule],
  templateUrl: './apprasial-form.html',
  styleUrl: './apprasial-form.css',
  providers: [MessageService]
})
export class ApprasialForm {

  @Input() selectedAppraisal: any;  // Data passed from parent
  @Output() formSubmitted = new EventEmitter<void>(); // Notify parent after save
  isLoading = false;

  appraisalForm!: FormGroup;
  role: string = 'Reporting Manager'

  constructor(private fb: FormBuilder, private appraisalService: Appraisal, private messageService: MessageService) { }

  ngOnInit() {
    this.initForm();
    this.setupAutoCalculation();
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
      desc: `Accuracy, neatness and thoroughness of work effort.<br /><br /> 
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
      desc: `Demonstrates the knowledge of fundamental methods and procedures of the job.<br /><br /> 
             • How often does employee have to be shown job procedures?<br />
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
      desc: `Ability to work well with co-workers and supervisors.<br /><br />  
             • How often does employee have to be shown job procedures?<br />
             • How does employee handle unexpected problems or breakdowns?<br />
             • Does employee retain knowledge of job or require substantial review?`,
      guide: `Above Average:  Very good team worker. Gets along well with most people. Cooperative and quick to offer help. Handles disagreement with restraint.<br />
              Average: Acceptable level of cooperation. Works willingly with others. Offers help to co-workers.<br />
              Below Average: Causes friction among workers. Responds negatively to disagreement or authority. Refuses to cooperate with or aid co-workers.`,
      ratingControl: 'teamworkRating',
      commentControl: 'teamworkComments'
    },
    {
      id: 4,
      title: 'Independence',
      desc: `Ability to work independently, be resourceful and display initiative.<br /><br /> 
      • Does employee perform functions not specifically given by superiors?<br />
      • Can employee be trusted to work without supervision?<br />
      • Is employee interested in acquiring new skills and knowledge?<br />
`,
      guide: `Above Average: Superior initiative and follow through. Does not require supervision and undertakes tasks on own. Actively seeks to acquire new skills and knowledge.<br />
              Average: Satisfactory initiative and follow through. Usually does not require supervision or have to be told to perform job functions. Reasonably willing to learn new tasks.<br />
              Below Average: Requires substantial supervision and direction to perform job tasks. Not interested in learning or performing any tasks but those required.`,
      ratingControl: 'independenceRating',
      commentControl: 'independenceComments'
    },
    {
      id: 5,
      title: 'Records and Reports',
      desc: `Ability to produce and maintain written job reports and records.<br /> <br />
      • Are written records/reports kept accurately and neatly?<br /> 
      • Does the employee complete written records/reports promptly and without direction?<br /> `,
      guide: `Above Average:Outstanding management of written records/reports. Completes records/reports accurately and on time. requires little or no supervision.<br />
              Average:Completes records/reports with satisfactory accuracy. Written records/reports are usually completed on time. <br />
              Below Average: Records/reports completed in sloppy fashion. Completes written records/reports in an untimely manner. Requires supervision to complete written tasks.`,
      ratingControl: 'recordsRating',
      commentControl: 'recordsComments'
    },
    {
      id: 6,
      title: 'Guest/Patient Service',
      desc: `Ability to deal with guests/customers in a polite and helpful manner.<br /> <br /> 
          • Does employee pay attention to guest concerns and seek positive resolution?<br /> 
          • Does employee display common courtesy and positive attitude to guests?<br /> `,
      guide: `Above Average: Treats guests with outstanding level of concern and helpfulness. Follows through on solving customer problems. Consistently courteous and helpful to guests/customers.<br />
              Average: Satisfactory skills in dealing with guests. Follows through on guest. problems to a satisfactory degree. Usually courteous and helpful to guests.<br />
              Below Average: Unsatisfactory treatment of guests. Displays rude and unhelpful. behavior to guests. Unconcerned with solving guest problems.
`,
      ratingControl: 'guestServiceRating',
      commentControl: 'guestServiceComments'
    },
    {
      id: 7,
      title: 'Safety',
      desc: `Ability to comply with precautions for safety of self and others. <br /> <br />
      • Is employee knowledgeable of safety policies and procedures?<br />
      • Does employee comply with established safety procedures?<br />`,
      guide: `Above Average: Completely knowledgeable of all existing safety policies and procedures. Highly concerned with safety of self and others. Takes all precautions and strictly complies with all safety procedures.<br />
              Average: Satisfactory level of safety knowledge.<br />
              Below Average: Unsatisfactory level of knowledge of safety of policies and procedures. Fails to take precautions and causes accidents or mishaps. Fails to follow safety procedures.`,
      ratingControl: 'safetyRating',
      commentControl: 'safetyComments'
    },
    {
      id: 8,
      title: 'Attendance',
      desc: `Regularity of attendance and absence for legitimate reasons. <br /> <br />
      • How regular is employee’s attendance?<br />
• When absent, does employee do everything possible to minimize disruption?<br />
• Does employee provide satisfactory reasons for absences?<br />
`,
      guide: `Above Average: Rarely absent and follows established absenteeism procedures. Takes extraordinary steps to minimize disruption and allow replacements to perform tasks. Absent only for legitimate reasons and provides notice when possible.<br />
              Average: Satisfactory attendance level. Usually follows established absenteeism procedures. Takes satisfactory steps to minimize disruption. Rarely absent for non-legitimate reasons and usually provides notice when possible.<br />
              Below Average: Frequently absent. Fails to adhere to absenteeism policies and procedures. Causes disruption by failure to take steps to allow replacements to perform tasks. Absent for non-legitimate reasons and fails to provide notice when reasonable.`,
      ratingControl: 'attendanceRating',
      commentControl: 'attendanceComments'
    },
    {
      id: 9,
      title: 'Leadership and Supervision (Management Only)',
      desc: `Ability to plan, organize and supervise so that jobs are completed.<br /><br />
      • Does manager delegate authority when reasonable?<br />
      • Does manager maintain effective working relationships with employees?<br />
      • Does manager plan and organize sufficiently to avoid crisis?<br />
`,
      guide: `Above Average: Superior level of planning and organization. Delegates and assigns all delegable tasks. Achieves outstanding results and maintains superior working relationship with employees. Rarely experiences crisis. <br />
              Average: Satisfactory planning and organization. Usually delegates and assigns tasks. Maintains effective working relationship with employees. Usually avoids crisis. <br />
              Below Average: Poor planning and organization. Fails to delegate tasks to subordinates. Fails to maintain satisfactory working relationships with employees. Frequently experiences crisis.`,
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
      designation: this.selectedAppraisal.designation.name,
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
    this.isLoading = true;

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
      this.appraisalService.saveManagerReview(payload).subscribe({
        next: () => {
          this.isLoading = false;
      
          // Optional success message
          this.messageService?.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Review saved successfully'
          });
      
          this.formSubmitted.emit();
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Error saving manager review:', err);
      
          // Optional error message
          this.messageService?.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.error?.message || 'Failed to save review. Try again.'
          });
        }
      });
    }
  }
  onCancel() {
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
  private setupAutoCalculation() {
    const ratingControls = [
      'qualityOfWorkRating',
      'knowledgeOfJobRating',
      'teamworkRating',
      'independenceRating',
      'recordsRating',
      'guestServiceRating',
      'safetyRating',
      'attendanceRating',
      'leadershipRating'
    ];
  
    // Watch all rating fields
    ratingControls.forEach(controlName => {
      const control = this.appraisalForm.get(controlName);
      if (control) {
        control.valueChanges.subscribe(() => this.updateOverallScore());
      }
    });
  }
  
  private updateOverallScore() {
    const ratingControls = [
      'qualityOfWorkRating',
      'knowledgeOfJobRating',
      'teamworkRating',
      'independenceRating',
      'recordsRating',
      'guestServiceRating',
      'safetyRating',
      'attendanceRating',
      'leadershipRating'
    ];
  
    let total = 0;
    let count = 0;
  
    ratingControls.forEach(field => {
      const value = parseFloat(this.appraisalForm.get(field)?.value);
      if (!isNaN(value)) {
        total += value;
        count++;
      }
    });
  
    const average = count > 0 ? total / count : 0;
  
    // Update the overall score (rounded to 2 decimals)
    this.appraisalForm.patchValue(
      { overallScore: parseFloat(average.toFixed(2)) },
      { emitEvent: false } // avoid infinite loops
    );
  }
  
}
