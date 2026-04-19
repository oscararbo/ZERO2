import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { AuthLayoutComponent } from '../shared/components/auth-layout/auth-layout';
import { extractApiErrorMessage } from '../../core/api-envelope';
import { UiSelectComponent, UiSelectOption } from '../shared/components/ui-select/ui-select.component';

export type FitnessGoal = 'bulk' | 'cut' | 'maintain';

@Component({
  selector: 'app-register-step2',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AuthLayoutComponent, UiSelectComponent],
  templateUrl: './register-step2.html',
  styleUrls: ['./register-step2.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterStep2Component {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private auth = inject(AuthService);

  msg = signal('');
  loading = signal(false);

  readonly interestsList = [
    { key: 'sport', label: 'Sport' },
    { key: 'food', label: 'Food' },
    { key: 'mindset', label: 'Mindset' },
    { key: 'growth', label: 'Growth' },
    { key: 'challenges', label: 'Challenges' },
  ] as const;

  readonly fitnessGoalOptions: UiSelectOption[] = [
    { value: 'bulk', label: 'Muscle Gain' },
    { value: 'cut', label: 'Definition' },
    { value: 'maintain', label: 'Maintain' },
  ];

  trackByInterestKey(_index: number, interest: (typeof this.interestsList)[number]): string {
    return interest.key;
  }

  // All fields empty by default — no pre-fill from previous profile
  form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    weeklyGoal: [null as unknown as number, [Validators.required, Validators.min(1), Validators.max(14)]],
    fitnessGoal: ['' as FitnessGoal, [Validators.required]],
    weight: [null as unknown as number, [Validators.required, Validators.min(30), Validators.max(300)]],
    height: [null as unknown as number, [Validators.required, Validators.min(100), Validators.max(250)]],
    interests: this.fb.nonNullable.group({
      sport: [false],
      food: [false],
      mindset: [false],
      growth: [false],
      challenges: [false],
    }),
  });

  constructor() {
    // Redirect to register if step 1 data is missing
    const step1 = this.getStep1Data();
    if (!step1) {
      this.router.navigateByUrl('/register');
    }
  }

  private getStep1Data(): { username: string; email: string; password: string } | null {
    try {
      const raw = localStorage.getItem('zero_reg_step1');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  submit() {
    this.msg.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.msg.set('Please complete all required fields.');
      return;
    }

    const interests = this.form.controls.interests.getRawValue();
    const hasAtLeastOneFocus = Object.values(interests).some(Boolean);
    if (!hasAtLeastOneFocus) {
      this.msg.set('Select at least one focus area.');
      return;
    }

    const step1 = this.getStep1Data();
    if (!step1) {
      this.msg.set('Session expired. Please start registration again.');
      this.router.navigateByUrl('/register');
      return;
    }

    const v = this.form.getRawValue();

    const payload: Record<string, unknown> = {
      // Step 1 data
      username: step1.username,
      email: step1.email,
      password: step1.password,
      // Step 2 data
      full_name: v.fullName,
      weekly_goal: v.weeklyGoal,
      fitness_goal: v.fitnessGoal,
      weight: v.weight,
      height: v.height,
      macro_calories_target: 0,
      macro_protein_target: 0,
      macro_carbs_target: 0,
      macro_fat_target: 0,
      sport: interests.sport,
      food: interests.food,
      mindset: interests.mindset,
      growth: interests.growth,
      challenges: interests.challenges,
    };

    this.loading.set(true);

    this.auth.register(payload).subscribe({
      next: (res) => {
        this.loading.set(false);
        // Clean up step 1 temporary data
        localStorage.removeItem('zero_reg_step1');
        // Set session with tokens returned by register
        this.auth.setSession(res.access, res.refresh, res.username);
        this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        this.loading.set(false);
        this.msg.set(extractApiErrorMessage(err, 'Could not create account. Please try again.'));
      },
    });
  }
}
