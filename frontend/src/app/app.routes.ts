import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { adminGuard } from './core/admin.guard';
import { nonAdminGuard } from './core/non-admin.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home').then((m) => m.HomeComponent) },

  { path: 'login', loadComponent: () => import('./pages/login/login').then((m) => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./pages/register/register').then((m) => m.RegisterComponent) },
  {
    path: 'register-step2',
    loadComponent: () => import('./pages/register-step2/register-step2').then((m) => m.RegisterStep2Component),
    canActivate: [nonAdminGuard],
  },

  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardComponent),
    canActivate: [authGuard, nonAdminGuard],
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile').then((m) => m.ProfileComponent),
    canActivate: [authGuard, nonAdminGuard],
  },
  {
    path: 'profile/edit',
    loadComponent: () => import('./pages/profile-edit/profile-edit').then((m) => m.ProfileEditComponent),
    canActivate: [authGuard, nonAdminGuard],
  },

  {
    path: 'sport',
    loadComponent: () => import('./pages/focus/sport/sport').then((m) => m.SportComponent),
    canActivate: [authGuard, nonAdminGuard],
  },
  {
    path: 'food',
    loadComponent: () => import('./pages/focus/food/food').then((m) => m.FoodComponent),
    canActivate: [authGuard, nonAdminGuard],
  },
  {
    path: 'mindset',
    loadComponent: () => import('./pages/focus/mindset/mindset').then((m) => m.MindsetComponent),
    canActivate: [authGuard, nonAdminGuard],
  },
  {
    path: 'growth',
    loadComponent: () => import('./pages/focus/growth/growth').then((m) => m.GrowthComponent),
    canActivate: [authGuard, nonAdminGuard],
  },
  {
    path: 'challenges',
    loadComponent: () => import('./pages/focus/challenges/challenges').then((m) => m.ChallengesComponent),
    canActivate: [authGuard, nonAdminGuard],
  },
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/admin').then((m) => m.AdminComponent),
    canActivate: [authGuard, adminGuard],
  },

  { path: '**', loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFoundComponent) }
];
