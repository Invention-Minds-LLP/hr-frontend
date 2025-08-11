import { Component } from '@angular/core';
import { EmployeeForm } from '../../employee/employee-form/employee-form';
import { Employees } from '../../services/employees/employees';

@Component({
  selector: 'app-profile',
  imports: [EmployeeForm],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile {
  employeeId: string = '';
  employeeData: any = null;

  constructor(private employeeService: Employees){}


  ngOnInit(){
    this.employeeId = localStorage.getItem('empId') || '';

    this.employeeService.getEmployeeById(parseInt(this.employeeId)).subscribe({
      next: (emp) => (this.employeeData = emp),
      error: (err) => console.error('Failed to load employee', err)

    })
  }

}
