/**
 * Cloud Space - Angular Frontend
 * ================================
 * Main entry point for the Angular application.
 * 
 * @author College Project
 */

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
    .catch((err) => console.error(err));
