import { Routes } from '@angular/router';
import { authGuard } from './core/guard/auth-guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/home/home').then(c => c.Home)},
  { path: 'login', loadComponent: () => import('./features/auth/pages/login/login').then(c => c.Login)},
  { path: 'register', loadComponent: () => import('./features/auth/pages/register/register').then(c => c.Register)},
  { path: 'verify-email', loadComponent: () => import('./features/auth/pages/verify-email/verify-email').then(c => c.VerifyEmail)},
  { path: 'forgot-password', loadComponent: () => import('./features/auth/pages/forgot-password/forgot-password').then(c => c.ForgotPassword)},
  { path: 'reset-password', loadComponent: () => import('./features/auth/pages/reset-password/reset-password').then(c => c.ResetPassword)},

  // MES PROJETS : les projets que j'ai créés + leurs tâches (CRUD sur des pages séparées)
  { path: 'projects',
    canActivateChild: [authGuard],
    children: [
      { path: '', loadComponent: () => import('./features/projects/pages/project-list/project-list').then(c => c.ProjectList)},
      { path: 'new', loadComponent: () => import('./features/projects/pages/project-form/project-form').then(c => c.ProjectForm)},
      { path: ':id', loadComponent: () => import('./features/projects/pages/project-detail/project-detail').then(c => c.ProjectDetail)},
      { path: ':id/tasks/new', loadComponent: () => import('./features/tasks/pages/task-form-page/task-form-page').then(c => c.TaskFormPage)},
      { path: ':id/tasks/:taskId/edit', loadComponent: () => import('./features/tasks/pages/task-form-page/task-form-page').then(c => c.TaskFormPage)},
    ]
  },

  // MES ASSIGNATIONS : les projets où l'on m'a assigné des tâches (lecture seule + commentaires)
  { path: 'assignments',
    canActivateChild: [authGuard],
    children: [
      { path: '', loadComponent: () => import('./features/assignments/pages/assignment-list/assignment-list').then(c => c.AssignmentList)},
      { path: ':id', loadComponent: () => import('./features/assignments/pages/assignment-detail/assignment-detail').then(c => c.AssignmentDetail)},
    ]
  },

  { path: '**', redirectTo: ''}
];
