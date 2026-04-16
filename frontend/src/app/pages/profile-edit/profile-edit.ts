import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ProfileService, Profile, FitnessGoal } from '../../core/profile.service';

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile-edit.html',
  styleUrls: ['./profile-edit.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private profiles = inject(ProfileService);
  private router = inject(Router);

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

  readonly fullNameControl = this.form.controls.fullName;
  readonly weeklyGoalControl = this.form.controls.weeklyGoal;
  readonly weightControl = this.form.controls.weight;
  readonly heightControl = this.form.controls.height;
  readonly fitnessGoalControl = this.form.controls.fitnessGoal;

  readonly messageIsError = computed(() => {
    const text = this.msg().toLowerCase();
    return text.includes('no se pudo') || text.includes('could not') || text.includes('error');
  });

  ngOnInit() {
    this.loadingProfile.set(true);
    const local = this.profiles.getLocal();
    if (local) {
      this.patchFormFromDto(local);
    }

    this.profiles.getProfile().subscribe({
      next: (p) => {
        this.patchFormFromDto(p);
        this.loadingProfile.set(false);
      },
      error: () => {
        this.loadingProfile.set(false);
      }
    });
  }

  save() {
    this.msg.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.msg.set('Completa todos los campos correctamente.');
      return;
    }

    this.loading.set(true);
    const dto = this.buildDto();
    this.profiles.setLocal(dto);

    this.profiles.saveProfile(dto).subscribe({
      next: (saved) => {
        this.loading.set(false);
        this.msg.set('Perfil actualizado exitosamente.');
        this.profiles.setLocal(saved);
        setTimeout(() => this.router.navigateByUrl('/dashboard'), 1000);
      },
      error: (err) => {
        this.loading.set(false);
        const errorMsg = err?.error?.detail || 'No se pudo guardar el perfil.';
        this.msg.set(errorMsg);
      }
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
