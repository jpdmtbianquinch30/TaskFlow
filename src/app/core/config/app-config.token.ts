import { InjectionToken } from "@angular/core";

export interface AppConfig {
  appName: string;
  apiBaseUrl: string;
  defaultPageSize: number;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('app.config');

export const defaultAppConfig: AppConfig = {
  appName: 'TaskFlow',
  apiBaseUrl : '/api',
  defaultPageSize: 10
}
