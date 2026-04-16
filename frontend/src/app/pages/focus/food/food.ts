import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NutritionService, Recipe, MealRecommendation } from '../../../core/nutrition.service';
import { ProfileService, FitnessGoal } from '../../../core/profile.service';
import { FocusHeaderComponent } from '../../shared/components/focus-header/focus-header.component';

@Component({
  selector: 'app-food',
  standalone: true,
  imports: [CommonModule, FormsModule, FocusHeaderComponent],
  templateUrl: './food.html',
  styleUrls: ['./food.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FoodComponent implements OnInit {
  private nutritionService = inject(NutritionService);
  private profileService = inject(ProfileService);

  todaysMeals = signal<MealRecommendation[]>([]);
  loadingMeals = signal(false);
  mealError = signal('');
  fitnessGoal = signal<FitnessGoal>('bulk');

  selectedMealView = signal<'all' | 'breakfast' | 'lunch' | 'dinner' | 'snack'>('all');

  readonly filteredMeals = computed(() => {
    const selected = this.selectedMealView();
    if (selected === 'all') {
      return this.todaysMeals();
    }
    return this.todaysMeals().filter((meal) => meal.type === selected);
  });

  readonly displayMeals = computed(() =>
    this.filteredMeals().map((meal) => {
      const nutrition = meal.recipe.nutritionPerServing;
      const calories = Math.max(nutrition.calories || 0, 1);
      return {
        ...meal,
        macroPercentages: {
          protein: this.toPercent((nutrition.protein * 4) / calories),
          carbs: this.toPercent((nutrition.carbs * 4) / calories),
          fat: this.toPercent((nutrition.fat * 9) / calories),
        },
      };
    })
  );

  readonly hasMeals = computed(() => this.displayMeals().length > 0);

  readonly dailyNutrition = computed(() => {
    return this.displayMeals().reduce(
      (total, meal) => {
        total.calories += meal.recipe.nutritionPerServing.calories;
        total.protein += meal.recipe.nutritionPerServing.protein;
        total.carbs += meal.recipe.nutritionPerServing.carbs;
        total.fat += meal.recipe.nutritionPerServing.fat;
        return total;
      },
      {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      }
    );
  });

  ngOnInit(): void {
    const profile = this.profileService.getLocal();
    if (profile?.fitness_goal) {
      this.fitnessGoal.set(profile.fitness_goal);
    }
    this.loadMealRecommendations();
  }

  loadMealRecommendations(): void {
    this.loadingMeals.set(true);
    this.mealError.set('');
    this.nutritionService.getMealRecommendations(this.fitnessGoal()).subscribe({
      next: (meals) => {
        this.todaysMeals.set(meals);
        this.loadingMeals.set(false);
      },
      error: () => {
        this.loadingMeals.set(false);
        this.mealError.set('Could not load meals from food API.');
      },
    });
  }

  private toPercent(value: number): number {
    const normalized = Number.isFinite(value) ? value : 0;
    return Math.max(0, Math.min(100, normalized * 100));
  }

  trackByMealId(_index: number, meal: MealRecommendation): number {
    return meal.recipe.id;
  }

  trackByIngredient(index: number): number {
    return index;
  }
}
