import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { APP_CONFIG, defaultAppConfig } from './core/config/app-config.token';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    /**
     * Ici l'ordre compte errorInterceptor doit envelopper
     * authInterceptor pour intercepter aussi le 401 que
     * authInterceptor léve lui-meme
    */
    provideHttpClient(withInterceptors([errorInterceptor, authInterceptor])),
    { provide: APP_CONFIG, useValue: defaultAppConfig }
  ]
};
