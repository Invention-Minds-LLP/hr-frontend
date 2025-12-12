import { RouterOutlet } from '@angular/router';
import { Login } from './Login/login/login';
import { Component, inject } from '@angular/core';
import { PrimeNG } from 'primeng/config';
import { Navbar } from "./navbar/navbar";
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { AnnouncementPopup } from "./announcements/announcement-popup/announcement-popup";
import { Announcement, Announcements } from './services/announcement/announcements';
import { InactivityService } from './services/inactivity.service';
import { AcknowledgePopup } from './grievance/acknowledge-popup/acknowledge-popup';
import { Grievance } from './services/grievance/grievance';
import * as XLSX from 'xlsx';
import { Chart } from 'chart.js/auto';
import 'chartjs-adapter-date-fns';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Login, Navbar, CommonModule, ToastModule, AnnouncementPopup, AcknowledgePopup],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {

  constructor(private router: Router,private svc: Announcements, private inactivityService: InactivityService, private ackService: Grievance) { }
  protected title = 'hr-frontend';

  dark = false;
  popupVisible = false;
  pendingComplaint: any = null;
  allPending: any[] = [];
  employeeId: number = Number(localStorage.getItem('empId'));
  role: string = localStorage.getItem('role') || '';

  toggleTheme() {
    document.documentElement.classList.toggle('app-dark', this.dark);
  }

  isLoginRoute(): boolean {
    return this.router.url === '/login'; // Adjust this if your login route is different
  }
  isTestRoute(): boolean {
    return this.router.url.includes('/take-test'); // Adjust this if your login route is different
  }
  hideNavbar(): boolean {
    const url = this.router.url;

    // hide if login route
    if (url.includes('/login')) return true;

    // hide if take-test route
    if (url.includes('/take-test')) return true;

    return false;
  }

  ngOnInit() {
    this.role = this.role.toUpperCase();
    console.log('User Role:', this.role);
    if(this.role === 'HR' || this.role === 'HR MANAGER'){
      this.loadPendingComplaints();
    }
  }
  loadPendingComplaints() {
    const employeeId = localStorage.getItem('empId');
    this.ackService.getUnacknowledged(Number(employeeId)).subscribe({
      next: (res) => {
        this.allPending = [
          ...res.grievances.map(g => ({ ...g, type: 'GRIEVANCE' })),
          ...res.poshCases.map(p => ({ ...p, type: 'POSH' })),
        ];
        console.log('Pending Complaints:', this.allPending);
        this.showNextPopup();
      },
      error: (err) => console.error(err),
    });
  }

  showNextPopup() {
    if (this.allPending.length > 0) {
      this.pendingComplaint = this.allPending.shift();
      console.log('Showing popup for:', this.pendingComplaint);
      this.popupVisible = true;
    } else {
      this.popupVisible = false;
      this.pendingComplaint = null;
    }
  }

  onPopupClosed(acknowledged: boolean) {
    this.popupVisible = false;
    if (acknowledged) {
      setTimeout(() => this.showNextPopup(), 400); // brief pause before next popup
    }
  }
  isCandidateTestsRoute(): boolean {
    return this.router.url.startsWith('/candidate-tests');
  }
  pastData: any[] = [];
  forecastData: any[] = [];
  chart!: Chart;

  // Load past 1-year data
  loadPastData(event: any) {
    const file = event.target.files[0];
    this.readExcel(file, (data) => {
      this.pastData = data;
      this.tryPlot();
    });
  }

  // Load next-30-day forecast data
  loadForecastData(event: any) {
    const file = event.target.files[0];
    this.readExcel(file, (data) => {
      this.forecastData = data;
      this.tryPlot();
    });
  }

  // Excel Reader
  readExcel(file: File, callback: (data: any[]) => void) {
    let fileReader = new FileReader();
    fileReader.readAsBinaryString(file);

    fileReader.onload = () => {
      const workbook = XLSX.read(fileReader.result, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const json = XLSX.utils.sheet_to_json(sheet);
      callback(json);
    };
  }
  tryPlot() {
    console.log("PAST DATA ROW 1:", this.pastData[0]);
    console.log("FORECAST DATA ROW 1:", this.forecastData[0]);
  
    if (this.pastData.length === 0 || this.forecastData.length === 0) return;
  
    // Convert date column correctly
    const pastDates = this.pastData.map(d =>
      this.excelSerialToJSDate(d['Date'])
    );
  
    const futureDates = this.forecastData.map(d =>
      this.excelSerialToJSDate(d['Date'])
    );
  
    // Correct column names from your logs
    const pastOPD = this.pastData.map(d => d['OPD_Count']);
    const pastIPD = this.pastData.map(d => d['IPD_Count']);
  
    const futureOPD = this.forecastData.map(d => d['Forecast_OPD']);
    const futureIPD = this.forecastData.map(d => d['Forecast_IPD']);
  
    console.log("PAST OPD:", pastOPD);
    console.log("FUTURE OPD:", futureOPD);
  
    const allDates = [...pastDates, ...futureDates];
  
    if (this.chart) this.chart.destroy();
  
    this.chart = new Chart("opdIpdChart", {
      type: 'line',
      data: {
        labels: allDates,
        datasets: [
          {
            label: "Past OPD",
            data: pastOPD,
            borderColor: "blue",
            tension: 0.3
          },
          {
            label: "Past IPD",
            data: pastIPD,
            borderColor: "green",
            tension: 0.3
          },
          {
            label: "Forecast OPD",
            data: [...new Array(pastOPD.length).fill(null), ...futureOPD],
            borderColor: "red",
            borderDash: [5, 5],
            tension: 0.3
          },
          {
            label: "Forecast IPD",
            data: [...new Array(pastIPD.length).fill(null), ...futureIPD],
            borderColor: "orange",
            borderDash: [5, 5],
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          x: {
            type: 'time',
            time: { unit: 'day', tooltipFormat: 'dd/MM/yyyy' }
          }
        },
        plugins: {
          legend: { position: "bottom" }
        }
      }
    });
  }
  
  

  excelSerialToJSDate(serial: number) {
    return new Date((serial - 25569) * 86400 * 1000);
  }
  
  
}
