import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ProfileService, Profile, FitnessGoal } from '../../core/profile.service';

@Component({
  selector: 'app-register-step2',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register-step2.html',
  styleUrls: ['./register-step2.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterStep2Component {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private auth = inject(AuthService);
  private profiles = inject(ProfileService);

  msg = signal('');
  loading = signal(false);

  readonly interestsList = [
    { key: 'sport', label: 'Sport' },
    { key: 'food', label: 'Food' },
    { key: 'mindset', label: 'Mindset' },
    { key: 'growth', label: 'Growth' },
    { key: 'challenges', label: 'Challenges' },
  ] as const;

  trackByInterestKey(_index: number, interest: (typeof this.interestsList)[number]): string {
    return interest.key;
  }

  form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    weeklyGoal: [4, [Validators.required, Validators.min(1), Validators.max(14)]],
    fitnessGoal: ['bulk' as FitnessGoal, [Validators.required]],
    weight: [0, [Validators.required, Validators.min(30), Validators.max(300)]],
    height: [0, [Validators.required, Validators.min(100), Validators.max(250)]],
    interests: this.fb.nonNullable.group({
      sport: [true],
      food: [false],
      mindset: [false],
      growth: [true],
      challenges: [false],
    }),
  });

  constructor() {
    if (!this.auth.isLogged()) {
      this.router.navigateByUrl('/login');
      return;
    }

    const local = this.profiles.getLocal();

    if (local) {
      this.form.patchValue({
        fullName: local.full_name ?? '',
        weeklyGoal: local.weekly_goal ?? 4,
        fitnessGoal: (local.fitness_goal ?? 'bulk') as FitnessGoal,
        weight: local.weight ?? 0,
        height: local.height ?? 0,
        interests: {
          sport: !!local.sport,
          food: !!local.food,
          mindset: !!local.mindset,
          growth: !!local.growth,
          challenges: !!local.challenges,
        },
      });
    }
  }

  private buildDto(): Profile {
    const v = this.form.getRawValue();

    return {
      full_name: v.fullName,
      weekly_goal: v.weeklyGoal,
      fitness_goal: v.fitnessGoal,
      weight: v.weight,
      height: v.height,
      sport: v.interests.sport,
      food: v.interests.food,
      mindset: v.interests.mindset,
      growth: v.interests.growth,
      challenges: v.interests.challenges,
    };
  }

  submit() {
    this.msg.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.msg.set('Completa los campos.');
      return;
    }

    this.loading.set(true);
    const dto = this.buildDto();

    this.profiles.setLocal(dto);

    this.profiles.saveProfile(dto).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl('/dashboard');
      },
      error: () => {
        this.loading.set(false);
        this.router.navigateByUrl('/dashboard');
      },
    });
  }
}
