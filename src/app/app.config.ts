import { ApplicationConfig, importProvidersFrom, inject, provideAppInitializer, provideBrowserGlobalErrorListeners, provideZoneChangeDetection  } from '@angular/core';
import { provideHttpClient,  withInterceptors , withFetch } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Lara from '@primeuix/themes/lara';
import { AuthInterceptor } from './auth.interceptor';
import { CalendarModule, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { provideAnimations } from '@angular/platform-browser/animations';

import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { routes } from './app.routes';
import { AuthSession } from './services/auth/auth-session';
import { PermissionService } from './services/auth/permission.service';
import { firstValueFrom, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withFetch(),
      withInterceptors([AuthInterceptor])
    ),
    // The access token is in-memory only, so a page reload starts with nothing.
    // Trade the httpOnly refresh cookie for a fresh token BEFORE the router
    // runs, otherwise authGuard would bounce every reload to /login. Failure is
    // expected and fine — it just means there's no live session.
    //
    // Permissions load in the same gate, chained AFTER the refresh because the
    // request needs the fresh token. Doing it here means permissionGuard and
    // the navbar can both read the set synchronously.
    provideAppInitializer(() => {
      const auth = inject(AuthSession);
      const perms = inject(PermissionService);
      if (auth.isCandidate()) return;   // candidates use the legacy stored token
      return firstValueFrom(
        auth.refresh().pipe(
          catchError(() => of(null)),
          switchMap((res: any) => (res?.token ? perms.load() : of(null))),
          catchError(() => of(null)),
        ),
      );
    }),
    provideAnimations(),
    providePrimeNG({
      theme: {
        preset: Lara,
        options: {
          darkModeSelector: '.app-dark'
        }
      }
    })
    ,MessageService,
    importProvidersFrom([ToastModule],
      CalendarModule.forRoot({
        provide: DateAdapter,
        useFactory: adapterFactory
      })
    )

  ]
};
