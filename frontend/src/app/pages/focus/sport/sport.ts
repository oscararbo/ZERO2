import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ExerciseService, Exercise } from '../../../core/exercise.service';
import { ProfileService, FitnessGoal } from '../../../core/profile.service';
import { AppToastComponent } from '../../shared/components/toast/toast.component';
import { FocusHeaderComponent } from '../../shared/components/focus-header/focus-header.component';

@Component({
  selector: 'app-sport',
  standalone: true,
  imports: [CommonModule, FormsModule, AppToastComponent, FocusHeaderComponent],
  templateUrl: './sport.html',
  styleUrls: ['./sport.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SportComponent implements OnInit {
  private exerciseService = inject(ExerciseService);
  private profileService = inject(ProfileService);
  private router = inject(Router);

  loading = signal(true);
  toast = signal('');
  currentLocation = signal<'home' | 'gym'>('home');
  selectedCategory = signal<string | null>(null);
  fitnessGoal = signal<FitnessGoal>('bulk');

  categories = [
    { key: 'back', label: 'Back' },
    { key: 'chest', label: 'Chest' },
    { key: 'legs', label: 'Legs' },
    { key: 'arms', label: 'Arms' },
    { key: 'shoulders', label: 'Shoulders' },
    { key: 'accessories', label: 'Accessories' },
  ];

  allExercises = signal<Record<string, Exercise[]>>({});
  exerciseState = signal<Record<number, { sets: number; reps: number; completed: boolean }>>({});
  hasCompletedExercises = signal(false);

  readonly filteredExercises = computed(() => {
    const location = this.currentLocation();
    const category = this.selectedCategory();
    const source = this.allExercises()[location] ?? [];
    if (!category) return source;
    return source.filter((exercise) => exercise.category === category);
  });

  readonly exerciseRows = computed(() => {
    const stateMap = this.exerciseState();
    return this.filteredExercises().map((exercise) => {
      const state = stateMap[exercise.id] ?? {
        sets: exercise.default_sets || 3,
        reps: exercise.default_reps || 10,
        completed: false,
      };
      return { exercise, state };
    });
  });

  ngOnInit() {
    const profile = this.profileService.getLocal();
    if (profile?.fitness_goal) {
      this.fitnessGoal.set(profile.fitness_goal);
    }
    this.loadExercises();
  }

  setLocation(location: 'home' | 'gym') {
    this.currentLocation.set(location);
    this.selectedCategory.set(null);
    this.exerciseState.set({});
    this.loadExercises();
  }

  selectCategory(category: string) {
    this.selectedCategory.set(this.selectedCategory() === category ? null : category);
  }

  updateExerciseState(exerciseId: number, field: 'sets' | 'reps' | 'completed', value: any) {
    const current = this.exerciseState();
    const exercise = this.filteredExercises().find((e) => e.id === exerciseId);
    const state = current[exerciseId] ?? {
      sets: exercise?.default_sets || 3,
      reps: exercise?.default_reps || 10,
      completed: false,
    };

    if (field === 'completed') {
      state.completed = !!value;
    } else {
      state[field] = parseInt(value) || 0;
    }
    this.exerciseState.set({
      ...current,
      [exerciseId]: { ...state },
    });
    this.syncCompletedState();
  }

  private loadExercises() {
    this.loading.set(true);
    const location = this.currentLocation();
    const goal = this.fitnessGoal();
    this.exerciseService.getExercisesByLocation(location, goal).subscribe({
      next: (data) => {
        const next = [...(this.allExercises()[location] ?? [])];
        next.length = 0;
        for (const key in data) {
          next.push(...data[key].exercises);
        }
        this.allExercises.set({
          ...this.allExercises(),
          [location]: next,
        });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  saveSession() {
    const completedExercises = [];
    const stateMap = this.exerciseState();
    for (const id in stateMap) {
      const state = stateMap[id];
      if (state.completed) {
        completedExercises.push({
          exercise_id: parseInt(id),
          sets_completed: state.sets,
          reps_per_set: state.reps,
        });
      }
    }

    if (completedExercises.length === 0) return;

    const location = this.currentLocation();
    this.exerciseService.createSession({
      location,
      exercises: completedExercises,
    }).subscribe({
      next: () => {
        this.showToast('Workout saved.');
        this.exerciseState.set({});
        this.hasCompletedExercises.set(false);
        window.setTimeout(() => this.router.navigateByUrl('/dashboard'), 450);
      },
      error: () => {
        this.showToast('Unable to save workout.');
      }
    });
  }

  private syncCompletedState() {
    const hasCompleted = Object.values(this.exerciseState()).some((state) => state.completed);
    this.hasCompletedExercises.set(hasCompleted);
  }

  private showToast(message: string) {
    this.toast.set(message);
    window.setTimeout(() => {
      if (this.toast() === message) {
        this.toast.set('');
      }
    }, 2400);
  }

  trackByExerciseId(_index: number, row: { exercise: Exercise }): number {
    return row.exercise.id;
  }
}
