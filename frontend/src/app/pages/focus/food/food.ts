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
  usingMockMeals = signal(false);
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

  readonly macroCalories = computed(() => {
    const daily = this.dailyNutrition();
    const protein = Math.round(daily.protein * 4);
    const carbs = Math.round(daily.carbs * 4);
    const fat = Math.round(daily.fat * 9);
    return {
      protein,
      carbs,
      fat,
      total: protein + carbs + fat,
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

  readonly remainingTargets = computed(() => {
    const totals = this.dailyNutrition();
    const targets = this.macroTargets();

    const remaining = (target: number, current: number) => {
      if (!target || target <= 0) return null;
      return Math.round((target - current) * 10) / 10;
    };

    return {
      calories: remaining(targets.calories, totals.calories),
      protein: remaining(targets.protein, totals.protein),
      carbs: remaining(targets.carbs, totals.carbs),
      fat: remaining(targets.fat, totals.fat),
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
    this.usingMockMeals.set(false);
    this.nutritionService.getMealRecommendations(this.fitnessGoal()).subscribe({
      next: (meals) => {
        if (meals.length > 0) {
          this.todaysMeals.set(meals);
          this.usingMockMeals.set(false);
        } else {
          this.todaysMeals.set(this.buildMockMeals(this.fitnessGoal()));
          this.usingMockMeals.set(true);
        }
        this.loadingMeals.set(false);
      },
      error: () => {
        this.todaysMeals.set(this.buildMockMeals(this.fitnessGoal()));
        this.usingMockMeals.set(true);
        this.loadingMeals.set(false);
      },
    });
  }

  private buildMockMeals(goal: FitnessGoal): MealRecommendation[] {
    const byGoal: Record<FitnessGoal, MealRecommendation[]> = {
      bulk: [
        {
          name: 'Breakfast',
          time: '08:00',
          type: 'breakfast',
          recipe: {
            id: 91001,
            title: 'Overnight Oats + Greek Yogurt',
            image: '',
            ingredients: [
              { name: 'oats', amount: 80, unit: 'g' },
              { name: 'greek yogurt', amount: 180, unit: 'g' },
              { name: 'banana', amount: 1, unit: 'unit' },
            ],
            instructions: 'Mix oats with yogurt and sliced banana. Leave in fridge overnight.',
            servings: 1,
            nutritionPerServing: { calories: 640, protein: 35, carbs: 88, fat: 14 },
          },
        },
        {
          name: 'Lunch',
          time: '13:00',
          type: 'lunch',
          recipe: {
            id: 91002,
            title: 'Chicken Rice Bowl',
            image: '',
            ingredients: [
              { name: 'chicken breast', amount: 220, unit: 'g' },
              { name: 'rice', amount: 140, unit: 'g cooked' },
              { name: 'olive oil', amount: 8, unit: 'ml' },
            ],
            instructions: 'Cook chicken and rice. Add oil and season to taste.',
            servings: 1,
            nutritionPerServing: { calories: 760, protein: 52, carbs: 74, fat: 22 },
          },
        },
        {
          name: 'Snack',
          time: '17:00',
          type: 'snack',
          recipe: {
            id: 91003,
            title: 'Protein Shake + Nuts',
            image: '',
            ingredients: [
              { name: 'whey protein', amount: 35, unit: 'g' },
              { name: 'milk', amount: 250, unit: 'ml' },
              { name: 'mixed nuts', amount: 30, unit: 'g' },
            ],
            instructions: 'Blend whey with milk. Eat nuts on the side.',
            servings: 1,
            nutritionPerServing: { calories: 430, protein: 36, carbs: 18, fat: 24 },
          },
        },
        {
          name: 'Dinner',
          time: '20:30',
          type: 'dinner',
          recipe: {
            id: 91004,
            title: 'Salmon + Potato + Veggies',
            image: '',
            ingredients: [
              { name: 'salmon', amount: 180, unit: 'g' },
              { name: 'potato', amount: 260, unit: 'g' },
              { name: 'broccoli', amount: 120, unit: 'g' },
            ],
            instructions: 'Bake salmon and potatoes. Steam broccoli.',
            servings: 1,
            nutritionPerServing: { calories: 690, protein: 45, carbs: 58, fat: 29 },
          },
        },
      ],
      cut: [
        {
          name: 'Breakfast',
          time: '08:00',
          type: 'breakfast',
          recipe: {
            id: 92001,
            title: 'Egg Whites + Toast',
            image: '',
            ingredients: [
              { name: 'egg whites', amount: 220, unit: 'g' },
              { name: 'whole egg', amount: 1, unit: 'unit' },
              { name: 'whole-grain toast', amount: 1, unit: 'slice' },
            ],
            instructions: 'Scramble egg whites and whole egg. Serve with toast.',
            servings: 1,
            nutritionPerServing: { calories: 350, protein: 33, carbs: 23, fat: 12 },
          },
        },
        {
          name: 'Lunch',
          time: '13:00',
          type: 'lunch',
          recipe: {
            id: 92002,
            title: 'Lean Chicken Salad',
            image: '',
            ingredients: [
              { name: 'chicken breast', amount: 180, unit: 'g' },
              { name: 'mixed greens', amount: 120, unit: 'g' },
              { name: 'olive oil', amount: 6, unit: 'ml' },
            ],
            instructions: 'Grill chicken. Combine with greens and olive oil.',
            servings: 1,
            nutritionPerServing: { calories: 470, protein: 44, carbs: 15, fat: 24 },
          },
        },
        {
          name: 'Snack',
          time: '17:00',
          type: 'snack',
          recipe: {
            id: 92003,
            title: 'Skyr + Berries',
            image: '',
            ingredients: [
              { name: 'skyr', amount: 180, unit: 'g' },
              { name: 'berries', amount: 90, unit: 'g' },
            ],
            instructions: 'Mix skyr and berries in a bowl.',
            servings: 1,
            nutritionPerServing: { calories: 190, protein: 20, carbs: 20, fat: 2 },
          },
        },
        {
          name: 'Dinner',
          time: '20:30',
          type: 'dinner',
          recipe: {
            id: 92004,
            title: 'White Fish + Vegetables',
            image: '',
            ingredients: [
              { name: 'white fish', amount: 200, unit: 'g' },
              { name: 'zucchini', amount: 150, unit: 'g' },
              { name: 'sweet potato', amount: 160, unit: 'g' },
            ],
            instructions: 'Bake fish and sweet potato. Saute zucchini.',
            servings: 1,
            nutritionPerServing: { calories: 480, protein: 42, carbs: 38, fat: 13 },
          },
        },
      ],
      maintain: [
        {
          name: 'Breakfast',
          time: '08:00',
          type: 'breakfast',
          recipe: {
            id: 93001,
            title: 'Yogurt Bowl + Fruit',
            image: '',
            ingredients: [
              { name: 'greek yogurt', amount: 170, unit: 'g' },
              { name: 'granola', amount: 45, unit: 'g' },
              { name: 'mixed fruit', amount: 120, unit: 'g' },
            ],
            instructions: 'Combine yogurt, granola and fruit.',
            servings: 1,
            nutritionPerServing: { calories: 430, protein: 24, carbs: 52, fat: 14 },
          },
        },
        {
          name: 'Lunch',
          time: '13:00',
          type: 'lunch',
          recipe: {
            id: 93002,
            title: 'Turkey Wrap + Salad',
            image: '',
            ingredients: [
              { name: 'whole wrap', amount: 1, unit: 'unit' },
              { name: 'turkey', amount: 140, unit: 'g' },
              { name: 'lettuce', amount: 80, unit: 'g' },
            ],
            instructions: 'Fill wrap with turkey and lettuce. Serve with side salad.',
            servings: 1,
            nutritionPerServing: { calories: 560, protein: 36, carbs: 48, fat: 22 },
          },
        },
        {
          name: 'Snack',
          time: '17:00',
          type: 'snack',
          recipe: {
            id: 93003,
            title: 'Cottage Cheese + Toast',
            image: '',
            ingredients: [
              { name: 'cottage cheese', amount: 150, unit: 'g' },
              { name: 'toast', amount: 1, unit: 'slice' },
            ],
            instructions: 'Serve cottage cheese with toast.',
            servings: 1,
            nutritionPerServing: { calories: 260, protein: 21, carbs: 21, fat: 8 },
          },
        },
        {
          name: 'Dinner',
          time: '20:30',
          type: 'dinner',
          recipe: {
            id: 93004,
            title: 'Rice + Chicken + Veg',
            image: '',
            ingredients: [
              { name: 'rice', amount: 120, unit: 'g cooked' },
              { name: 'chicken thigh', amount: 160, unit: 'g' },
              { name: 'mixed vegetables', amount: 150, unit: 'g' },
            ],
            instructions: 'Cook rice and chicken. Add vegetables.',
            servings: 1,
            nutritionPerServing: { calories: 630, protein: 39, carbs: 59, fat: 24 },
          },
        },
      ],
    };

    return byGoal[goal] ?? byGoal.maintain;
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
