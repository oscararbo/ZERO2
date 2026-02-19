import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ProfileService, ProfileDTO, FitnessGoal } from '../../core/profile.service';

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile-edit.html',
  styleUrls: ['./profile-edit.scss'],
})
export class ProfileEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private profiles = inject(ProfileService);
  private router = inject(Router);

  msg = signal('');
  loading = signal(false);
  loadingProfile = signal(true);

  form = this.fb.nonNullable.group({
    full_name: ['', [Validators.required, Validators.minLength(2)]],
    weekly_goal: [3, [Validators.required, Validators.min(1), Validators.max(14)]],
    fitness_goal: ['bulk' as FitnessGoal, [Validators.required]],
    weight: [0, [Validators.required, Validators.min(30), Validators.max(300)]],
    height: [0, [Validators.required, Validators.min(100), Validators.max(250)]],
    sport: [false],
    food: [false],
    mindset: [false],
    growth: [false],
    challenges: [false],
  });

  ngOnInit() {
    this.loadingProfile.set(true);
    const local = this.profiles.getLocal();
    if (local) {
      this.form.patchValue(local);
    }

    this.profiles.getProfile().subscribe({
      next: (p) => {
        this.form.patchValue(p);
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
    const dto: ProfileDTO = this.form.getRawValue();
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
}
