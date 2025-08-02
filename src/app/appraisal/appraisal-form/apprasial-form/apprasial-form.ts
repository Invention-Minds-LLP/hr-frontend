import { Component } from '@angular/core';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { FloatLabel } from 'primeng/floatlabel';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { label } from '@primeuix/themes/aura/metergroup';
import { value } from '@primeuix/themes/aura/knob';

interface SelectOpton {
  name: string;
  value: string;
}

@Component({
  selector: 'app-apprasial-form',
  imports: [FormsModule, InputTextModule, FloatLabel, Select, DatePicker, TextareaModule, ButtonModule],
  templateUrl: './apprasial-form.html',
  styleUrl: './apprasial-form.css'
})
export class ApprasialForm {

  departments = [
    { name: 'HR Executive', value: 'hr_executive' },
    { name: 'Recruiter', value: 'recruiter' },
    { name: 'HR Manager', value: 'hr_manager' }
  ]

  designation = [
    { name: 'HR Executive', value: 'hr_executive' },
    { name: 'Recruiter', value: 'recruiter' },
    { name: 'HR Manager', value: 'hr_manager' }
  ]

}
