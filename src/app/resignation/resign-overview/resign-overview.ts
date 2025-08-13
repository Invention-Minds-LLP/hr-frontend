import { Component } from '@angular/core';
import { ResignationForm } from "../resignation-form/resignation-form";
import { ResignationList } from "../resignation-list/resignation-list";
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-resign-overview',
  imports: [ResignationForm, ResignationList, CommonModule],
  templateUrl: './resign-overview.html',
  styleUrl: './resign-overview.css'
})
export class ResignOverview {
  active:string = 'list';
  
  show(value: string){
    this.active = value;
  }
}
