import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ExerciseService, Exercise } from '../../../core/exercise.service';
import { ProfileService, FitnessGoal } from '../../../core/profile.service';

@Component({
  selector: 'app-sport',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './sport.html',
  styleUrls: ['./sport.scss'],
})
export class SportComponent implements OnInit {
  private exerciseService = inject(ExerciseService);
  private profileService = inject(ProfileService);
  private router = inject(Router);

  loading = signal(true);
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

  allExercises: { [key: string]: Exercise[] } = {};
  filteredExercises: Exercise[] = [];
  exerciseState: { [key: number]: any } = {};
  hasCompletedExercises = signal(false);

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
    this.exerciseState = {};
    this.loadExercises();
  }

  selectCategory(category: string) {
    this.selectedCategory.set(this.selectedCategory() === category ? null : category);
    this.filterExercises();
  }

  getExerciseState(exerciseId: number) {
    if (!this.exerciseState[exerciseId]) {
      const exercise = this.filteredExercises.find(e => e.id === exerciseId);
      this.exerciseState[exerciseId] = {
        sets: exercise?.default_sets || 3,
        reps: exercise?.default_reps || 10,
        completed: false,
      };
    }
    return this.exerciseState[exerciseId];
  }

  updateExerciseState(exerciseId: number, field: string, value: any) {
    const state = this.getExerciseState(exerciseId);
    if (field === 'completed') {
      state.completed = !!value;
    } else {
      state[field] = parseInt(value) || 0;
    }
  }

  private loadExercises() {
    this.loading.set(true);
    const location = this.currentLocation();
    const goal = this.fitnessGoal();
    this.exerciseService.getExercisesByLocation(location, goal).subscribe({
      next: (data) => {
        this.allExercises[location] = [];
        for (const key in data) {
          this.allExercises[location].push(...data[key].exercises);
        }
        this.filterExercises();
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  private filterExercises() {
    const location = this.currentLocation();
    let exercises = this.allExercises[location] || [];
    const category = this.selectedCategory();
    if (category) {
      exercises = exercises.filter(e => e.category === category);
    }
    this.filteredExercises = exercises;
  }

  saveSession() {
    const completedExercises = [];
    for (const id in this.exerciseState) {
      const state = this.exerciseState[id];
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
        alert('Workout saved.');
        this.exerciseState = {};
        this.hasCompletedExercises.set(false);
        this.router.navigateByUrl('/dashboard');
      },
      error: () => {
        alert('Error saving workout.');
      }
    });
  }
}
