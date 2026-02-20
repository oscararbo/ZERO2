import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProfileService, Profile, FitnessGoal } from '../../core/profile.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss'],
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private profiles = inject(ProfileService);

  msg = signal('');
  loading = signal(false);
  loadingProfile = signal(true);

  form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    weeklyGoal: [3, [Validators.required, Validators.min(1), Validators.max(14)]],
    fitnessGoal: ['bulk' as FitnessGoal, [Validators.required]],
    weight: [0, [Validators.required, Validators.min(30), Validators.max(300)]],
    height: [0, [Validators.required, Validators.min(100), Validators.max(250)]],
    interests: this.fb.nonNullable.group({
      sport: [false],
      food: [false],
      mindset: [false],
      growth: [false],
      challenges: [false],
    }),
  });

  ngOnInit() {
    const local = this.profiles.getLocal();
    if (local) this.patchFormFromDto(local);

    this.profiles.getProfile().subscribe({
      next: (p) => {
        this.patchFormFromDto(p);
        this.loadingProfile.set(false);
      },
      error: () => {
        this.loadingProfile.set(false);
      },
    });
  }

  save() {
    this.msg.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.msg.set('Revisa los campos.');
      return;
    }

    this.loading.set(true);
    const dto = this.buildDto();

    this.profiles.saveProfile(dto).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl('/dashboard');
      },
      error: () => {
        this.loading.set(false);
        this.profiles.setLocal(dto);
        this.router.navigateByUrl('/dashboard');
      },
    });
  }

  private patchFormFromDto(dto: Profile) {
    this.form.patchValue({
      fullName: dto.full_name ?? '',
      weeklyGoal: dto.weekly_goal ?? 3,
      fitnessGoal: (dto.fitness_goal ?? 'bulk') as FitnessGoal,
      weight: dto.weight ?? 0,
      height: dto.height ?? 0,
      interests: {
        sport: !!dto.sport,
        food: !!dto.food,
        mindset: !!dto.mindset,
        growth: !!dto.growth,
        challenges: !!dto.challenges,
      },
    });
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
}
