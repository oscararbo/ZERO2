import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { ExerciseService, Exercise, ExerciseVideo } from '../../../core/exercise.service';
import { ProfileService, FitnessGoal } from '../../../core/profile.service';
import { FocusPageHeaderComponent } from '../../shared/components/focus-page-header/focus-page-header';
import { PageStateComponent } from '../../shared/components/page-state/page-state';

@Component({
  selector: 'app-sport',
  standalone: true,
  imports: [CommonModule, FormsModule, ScrollingModule, FocusPageHeaderComponent, PageStateComponent],
  templateUrl: './sport.html',
  styleUrls: ['./sport.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SportComponent implements OnInit {
  private exerciseService = inject(ExerciseService);
  private profileService = inject(ProfileService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);

  loading = signal(true);
  toast = signal('');
  currentLocation = signal<'home' | 'gym'>('home');
  selectedCategory = signal<string | null>(null);
  searchQuery = signal('');
  viewMode = signal<'compact' | 'comfortable'>('compact');
  fitnessGoal = signal<FitnessGoal>('bulk');
  showArchivedSessions = signal(false);
  archivedSessionsCount = signal(0);

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
  videoSectionOpen = signal(false);
  activeVideo = signal<ExerciseVideo | null>(null);
  activeVideoSafeUrl = signal<SafeResourceUrl | null>(null);
  videoLoading = signal(false);

  readonly visibleCategories = computed(() => {
    const source = this.allExercises()[this.currentLocation()] ?? [];
    return this.categories.map((category) => ({
      ...category,
      count: source.filter((exercise) => exercise.category === category.key).length,
    }));
  });

  readonly filteredExercises = computed(() => {
    const location = this.currentLocation();
    const category = this.selectedCategory();
    const query = this.searchQuery().trim().toLowerCase();
    const source = this.allExercises()[location] ?? [];

    return source
      .filter((exercise) => !category || exercise.category === category)
      .filter((exercise) => {
        if (!query) return true;
        const searchable = `${exercise.name} ${exercise.description ?? ''} ${exercise.category}`.toLowerCase();
        return searchable.includes(query);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly emptyMessage = computed(() => {
    if (this.searchQuery().trim()) {
      return 'No exercises match your search. Try a different keyword.';
    }
    return 'No exercises found for this selection';
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

  readonly completedCount = computed(() => {
    return Object.values(this.exerciseState()).filter((state) => state.completed).length;
  });

  readonly viewportItemSize = computed(() => {
    // compact card ≈ 78px + 10px margin-bottom = 88px
    // comfortable card ≈ 124px (adds desc + extra padding) + 10px margin = 134px
    return this.viewMode() === 'compact' ? 88 : 134;
  });

  ngOnInit() {
    const profile = this.profileService.getLocal();
    if (profile?.fitness_goal) {
      this.fitnessGoal.set(profile.fitness_goal);
    }
    this.loadExercises();
    this.loadArchivedSessionsCount();
  }

  private loadArchivedSessionsCount() {
    this.exerciseService.getSessions(undefined, true).subscribe({
      next: (sessions) => {
        const archived = sessions.filter((s) => s.archived_at !== null).length;
        this.archivedSessionsCount.set(archived);
      },
      error: () => this.archivedSessionsCount.set(0),
    });
  }

  toggleShowArchivedSessions() {
    this.showArchivedSessions.set(!this.showArchivedSessions());
  }

  setLocation(location: 'home' | 'gym') {
    this.currentLocation.set(location);
    this.selectedCategory.set(null);
    this.searchQuery.set('');
    this.exerciseState.set({});
    this.loadExercises();
  }

  setSearchQuery(value: string) {
    this.searchQuery.set(value);
  }

  selectCategory(category: string) {
    this.selectedCategory.set(this.selectedCategory() === category ? null : category);
  }

  setViewMode(mode: 'compact' | 'comfortable') {
    this.viewMode.set(mode);
  }

  openExerciseVideo(exercise: Exercise) {
    this.videoSectionOpen.set(true);
    this.videoLoading.set(true);
    this.activeVideo.set(null);
    this.activeVideoSafeUrl.set(null);
    this.exerciseService
      .getExerciseVideo(exercise.id)
      .subscribe({
        next: (video) => {
          if (!video.embed_url && !video.url) {
            this.closeExerciseVideo();
            this.showToast(
              'No video available for this exercise.'
            );
            return;
          }
          this.activeVideo.set(video);
          this.activeVideoSafeUrl.set(
            video.embed_url
              ? this.sanitizer.bypassSecurityTrustResourceUrl(
                  video.embed_url
                )
              : null
          );
          this.videoLoading.set(false);
          if (!video.embed_url && video.url) {
            this.showToast(
              'No embed available — use the link below to watch on YouTube.'
            );
          }
        },
        error: () => {
          this.closeExerciseVideo();
          this.videoLoading.set(false);
          this.showToast(
            'No video found for this exercise.'
          );
        },
      });
  }

  closeExerciseVideo() {
    this.videoSectionOpen.set(false);
    this.activeVideo.set(null);
    this.activeVideoSafeUrl.set(null);
    this.videoLoading.set(false);
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
    this.exerciseService.getExercisesByLocation(location).subscribe({
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
        this.showToast('Failed to load exercises. Check your connection.');
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

  clearCompleted() {
    const current = this.exerciseState();
    const next: Record<number, { sets: number; reps: number; completed: boolean }> = {};
    for (const key in current) {
      next[Number(key)] = {
        ...current[Number(key)],
        completed: false,
      };
    }
    this.exerciseState.set(next);
    this.syncCompletedState();
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
