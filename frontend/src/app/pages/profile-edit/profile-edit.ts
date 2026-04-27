import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { extractApiErrorMessage } from '../../core/api-envelope';
import { ProfileService, Profile, FitnessGoal } from '../../core/profile.service';
import { PageTopHeaderComponent } from '../shared/components/page-top-header/page-top-header';
import { UiSelectComponent, UiSelectOption } from '../shared/components/ui-select/ui-select.component';

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageTopHeaderComponent, UiSelectComponent],
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
  private initialSnapshot = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    weeklyGoal: [3, [Validators.required, Validators.min(1), Validators.max(14)]],
    fitnessGoal: ['bulk' as FitnessGoal, [Validators.required]],
    weight: [0, [Validators.required, Validators.min(30), Validators.max(300)]],
    height: [0, [Validators.required, Validators.min(100), Validators.max(250)]],
    macroCaloriesTarget: [0, [Validators.min(0), Validators.max(10000)]],
    macroProteinTarget: [0, [Validators.min(0), Validators.max(1000)]],
    macroCarbsTarget: [0, [Validators.min(0), Validators.max(1500)]],
    macroFatTarget: [0, [Validators.min(0), Validators.max(500)]],
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

  readonly fitnessGoalOptions: UiSelectOption[] = [
    { value: 'bulk', label: 'Muscle Gain (Bulk)' },
    { value: 'cut', label: 'Definition (Cut)' },
    { value: 'maintain', label: 'Maintain' },
  ];

  readonly messageIsError = computed(() => {
    const text = this.msg().toLowerCase();
    return text.includes('could not') || text.includes('error');
  });

  ngOnInit() {
    this.loadingProfile.set(true);
    const local = this.profiles.getLocal(10 * 60 * 1000);
    if (local) {
      this.patchFormFromDto(local);
      this.loadingProfile.set(false);
      return;
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
      this.msg.set('Please complete all fields correctly.');
      return;
    }

    const dto = this.buildDto();

    if (this.isUnchanged(dto)) {
      this.msg.set('There are no changes to save.');
      return;
    }

    this.loading.set(true);
    this.profiles.setLocal(dto);

    this.profiles.saveProfile(dto).subscribe({
      next: (saved) => {
        this.loading.set(false);
        this.msg.set('Profile updated successfully.');
        this.profiles.setLocal(saved);
        this.setInitialSnapshot(saved);
        this.form.markAsPristine();
        setTimeout(() => this.router.navigateByUrl('/profile'), 1000);
      },
      error: (err) => {
        this.loading.set(false);
        this.msg.set(extractApiErrorMessage(err, 'Could not save profile.'));
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
      macroCaloriesTarget: dto.macro_calories_target ?? 0,
      macroProteinTarget: dto.macro_protein_target ?? 0,
      macroCarbsTarget: dto.macro_carbs_target ?? 0,
      macroFatTarget: dto.macro_fat_target ?? 0,
      interests: {
        sport: !!dto.sport,
        food: !!dto.food,
        mindset: !!dto.mindset,
        growth: !!dto.growth,
        challenges: !!dto.challenges,
      },
    });
    this.setInitialSnapshot(dto);
    this.form.markAsPristine();
  }

  private buildDto(): Profile {
    const v = this.form.getRawValue();
    return {
      full_name: v.fullName,
      weekly_goal: v.weeklyGoal,
      fitness_goal: v.fitnessGoal,
      weight: v.weight,
      height: v.height,
      macro_calories_target: v.macroCaloriesTarget,
      macro_protein_target: v.macroProteinTarget,
      macro_carbs_target: v.macroCarbsTarget,
      macro_fat_target: v.macroFatTarget,
      sport: v.interests.sport,
      food: v.interests.food,
      mindset: v.interests.mindset,
      growth: v.interests.growth,
      challenges: v.interests.challenges,
    };
  }

  private isUnchanged(dto: Profile): boolean {
    const initial = this.initialSnapshot();
    if (!initial) return false;
    return JSON.stringify(dto) === initial;
  }

  private setInitialSnapshot(dto: Profile): void {
    this.initialSnapshot.set(JSON.stringify(dto));
  }
}
