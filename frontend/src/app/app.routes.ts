import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home').then((m) => m.HomeComponent) },

  { path: 'login', loadComponent: () => import('./pages/login/login').then((m) => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./pages/register/register').then((m) => m.RegisterComponent) },
  {
    path: 'register-step2',
    loadComponent: () => import('./pages/register-step2/register-step2').then((m) => m.RegisterStep2Component),
    canActivate: [authGuard],
  },

  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardComponent),
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile').then((m) => m.ProfileComponent),
    canActivate: [authGuard],
  },
  {
    path: 'profile/edit',
    loadComponent: () => import('./pages/profile-edit/profile-edit').then((m) => m.ProfileEditComponent),
    canActivate: [authGuard],
  },


  {
    path: 'sport',
    loadComponent: () => import('./pages/focus/sport/sport').then((m) => m.SportComponent),
    canActivate: [authGuard],
  },
  {
    path: 'food',
    loadComponent: () => import('./pages/focus/food/food').then((m) => m.FoodComponent),
    canActivate: [authGuard],
  },
  {
    path: 'mindset',
    loadComponent: () => import('./pages/focus/mindset/mindset').then((m) => m.MindsetComponent),
    canActivate: [authGuard],
  },
  {
    path: 'growth',
    loadComponent: () => import('./pages/focus/growth/growth').then((m) => m.GrowthComponent),
    canActivate: [authGuard],
  },
  {
    path: 'challenges',
    loadComponent: () => import('./pages/focus/challenges/challenges').then((m) => m.ChallengesComponent),
    canActivate: [authGuard],
  },

  { path: '**', loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFoundComponent) }
];
