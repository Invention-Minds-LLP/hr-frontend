import { RouterOutlet } from '@angular/router';
import { Login } from './Login/login/login';
import { Component, inject } from '@angular/core';
import { PrimeNG } from 'primeng/config';
import { Navbar } from "./navbar/navbar";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Login, Navbar],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected title = 'hr-frontend';
  dark = false;

  toggleTheme() {
    document.documentElement.classList.toggle('app-dark', this.dark);
  }
}
