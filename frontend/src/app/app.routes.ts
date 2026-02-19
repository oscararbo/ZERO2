import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

import { HomeComponent } from './pages/home/home';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';
import { RegisterStep2Component } from './pages/register-step2/register-step2';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { ProfileEditComponent } from './pages/profile-edit/profile-edit';

import { SportComponent } from './pages/focus/sport/sport';
import { FoodComponent } from './pages/focus/food/food';
import { MindsetComponent } from './pages/focus/mindset/mindset';
import { GrowthComponent } from './pages/focus/growth/growth';
import { ChallengesComponent } from './pages/focus/challenges/challenges';

export const routes: Routes = [
  { path: '', component: HomeComponent },

  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'register-step2', component: RegisterStep2Component, canActivate: [authGuard] },

  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'profile/edit', component: ProfileEditComponent, canActivate: [authGuard] },


  { path: 'sport', component: SportComponent, canActivate: [authGuard] },
  { path: 'food', component: FoodComponent, canActivate: [authGuard] },
  { path: 'mindset', component: MindsetComponent, canActivate: [authGuard] },
  { path: 'growth', component: GrowthComponent, canActivate: [authGuard] },
  { path: 'challenges', component: ChallengesComponent, canActivate: [authGuard] },

  { path: '**', redirectTo: '' }
];
