import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MyEmpLocations } from '../my-emp-locations/my-emp-locations';

@Component({
  selector: 'app-geo-tracking-overview',
  imports: [CommonModule, MyEmpLocations],
  templateUrl: './geo-tracking-overview.html',
  styleUrl: './geo-tracking-overview.css',
})
export class GeoTrackingOverview {
 active:string = 'list';
 roleId: number = Number(localStorage.getItem('roleId'))

   show(value: string){
    this.active = value;
    
  }
}
