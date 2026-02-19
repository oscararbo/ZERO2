import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProfileService, ProfileDTO, FitnessGoal } from '../../core/profile.service';

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
    const local = this.profiles.getLocal();
    if (local) this.form.patchValue(local as any);

    this.profiles.getProfile().subscribe({
      next: (p) => {
        this.form.patchValue(p as any);
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
    const dto = this.form.getRawValue() as ProfileDTO;

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
}
