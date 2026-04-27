import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NutritionService, Recipe, MealRecommendation } from '../../../core/nutrition.service';
import { ProfileService, FitnessGoal } from '../../../core/profile.service';
import { FocusPageHeaderComponent } from '../../shared/components/focus-page-header/focus-page-header';
import { PageStateComponent } from '../../shared/components/page-state/page-state';

@Component({
  selector: 'app-food',
  standalone: true,
  imports: [CommonModule, FormsModule, FocusPageHeaderComponent, PageStateComponent],
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
  macroTargets = signal({ calories: 0, protein: 0, carbs: 0, fat: 0 });

  selectedMealView = signal<'all' | 'breakfast' | 'lunch' | 'dinner' | 'snack'>('all');

  readonly goalGuidance = computed(() => {
    const goal = this.fitnessGoal();
    if (goal === 'bulk') {
      return {
        title: 'Muscle Gain Strategy',
        guidance: 'Prioritize protein quality, pre/post workout carbs and a small calorie surplus.',
        calories: '2,600 - 3,100',
        protein: '1.8 - 2.2 g/kg',
      };
    }
    if (goal === 'cut') {
      return {
        title: 'Definition Strategy',
        guidance: 'Keep protein high, distribute carbs around training and maintain a controlled deficit.',
        calories: '1,900 - 2,400',
        protein: '2.0 - 2.4 g/kg',
      };
    }
    return {
      title: 'Maintenance Strategy',
      guidance: 'Sustain body composition with balanced macros and meal consistency.',
      calories: '2,200 - 2,700',
      protein: '1.6 - 2.0 g/kg',
    };
  });

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

  readonly macroDistribution = computed(() => {
    const daily = this.dailyNutrition();
    const caloriesFromMacros = (daily.protein * 4) + (daily.carbs * 4) + (daily.fat * 9);
    if (caloriesFromMacros <= 0) {
      return { protein: 0, carbs: 0, fat: 0 };
    }

    return {
      protein: this.toPercent((daily.protein * 4) / caloriesFromMacros),
      carbs: this.toPercent((daily.carbs * 4) / caloriesFromMacros),
      fat: this.toPercent((daily.fat * 9) / caloriesFromMacros),
    };
  });

  readonly shoppingList = computed(() => {
    const bucket = new Map<string, { name: string; unit: string; amount: number }>();

    for (const meal of this.displayMeals()) {
      for (const ingredient of meal.recipe.ingredients) {
        const key = `${ingredient.name.toLowerCase()}__${ingredient.unit.toLowerCase()}`;
        const current = bucket.get(key);
        if (current) {
          current.amount += ingredient.amount;
        } else {
          bucket.set(key, {
            name: ingredient.name,
            unit: ingredient.unit,
            amount: ingredient.amount,
          });
        }
      }
    }

    return Array.from(bucket.values()).sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly targetProgress = computed(() => {
    const totals = this.dailyNutrition();
    const targets = this.macroTargets();

    const ratio = (value: number, target: number) => {
      if (!target || target <= 0) return null;
      return Math.min(200, Math.round((value / target) * 100));
    };

    return {
      calories: ratio(totals.calories, targets.calories),
      protein: ratio(totals.protein, targets.protein),
      carbs: ratio(totals.carbs, targets.carbs),
      fat: ratio(totals.fat, targets.fat),
    };
  });

  readonly hasMacroTargets = computed(() => {
    const t = this.macroTargets();
    return t.calories > 0 || t.protein > 0 || t.carbs > 0 || t.fat > 0;
  });

  ngOnInit(): void {
    const profile = this.profileService.getLocal();
    if (profile?.fitness_goal) {
      this.fitnessGoal.set(profile.fitness_goal);
    }
    if (profile) {
      this.macroTargets.set({
        calories: profile.macro_calories_target ?? 0,
        protein: profile.macro_protein_target ?? 0,
        carbs: profile.macro_carbs_target ?? 0,
        fat: profile.macro_fat_target ?? 0,
      });
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
