import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FoodComponent } from './food';
import { MealRecommendation, NutritionService } from '../../../core/nutrition.service';
import { ProfileService } from '../../../core/profile.service';

describe('FoodComponent', () => {
  let component: FoodComponent;
  let fixture: ComponentFixture<FoodComponent>;
  const mockMeals: MealRecommendation[] = [
    {
      name: 'Breakfast',
      time: '08:00',
      type: 'breakfast',
      recipe: {
        id: 1,
        title: 'Protein Oats',
        image: '',
        instructions: 'Mix and serve.',
        servings: 1,
        ingredients: [{ name: 'Oats', amount: 80, unit: 'g' }],
        nutritionPerServing: { calories: 420, protein: 28, carbs: 55, fat: 10 },
      },
    },
    {
      name: 'Lunch',
      time: '12:30',
      type: 'lunch',
      recipe: {
        id: 2,
        title: 'Chicken Rice Bowl',
        image: '',
        instructions: 'Cook and combine.',
        servings: 1,
        ingredients: [{ name: 'Chicken', amount: 180, unit: 'g' }],
        nutritionPerServing: { calories: 620, protein: 46, carbs: 60, fat: 18 },
      },
    },
    {
      name: 'Snack',
      time: '16:30',
      type: 'snack',
      recipe: {
        id: 3,
        title: 'Greek Yogurt Bowl',
        image: '',
        instructions: 'Serve chilled.',
        servings: 1,
        ingredients: [{ name: 'Yogurt', amount: 200, unit: 'g' }],
        nutritionPerServing: { calories: 310, protein: 22, carbs: 35, fat: 8 },
      },
    },
    {
      name: 'Dinner',
      time: '20:00',
      type: 'dinner',
      recipe: {
        id: 4,
        title: 'Salmon Potatoes',
        image: '',
        instructions: 'Bake and plate.',
        servings: 1,
        ingredients: [{ name: 'Salmon', amount: 170, unit: 'g' }],
        nutritionPerServing: { calories: 580, protein: 40, carbs: 42, fat: 24 },
      },
    },
  ];

  const nutritionServiceMock = {
    getMealRecommendations: () => of(mockMeals),
  };

  const profileServiceMock = {
    getLocal: () => ({
      full_name: 'Demo',
      weekly_goal: 4,
      fitness_goal: 'bulk' as const,
      weight: 75,
      height: 178,
      macro_calories_target: 2700,
      macro_protein_target: 180,
      macro_carbs_target: 320,
      macro_fat_target: 80,
      sport: true,
      food: true,
      mindset: true,
      growth: true,
      challenges: true,
    }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoodComponent],
      providers: [
        { provide: NutritionService, useValue: nutritionServiceMock },
        { provide: ProfileService, useValue: profileServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FoodComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with meal recommendations', () => {
    const meals = component.todaysMeals();
    expect(meals.length).toBe(4);
    const types = meals.map((m) => m.type);
    expect(types).toContain('breakfast');
    expect(types).toContain('lunch');
    expect(types).toContain('dinner');
    expect(types).toContain('snack');
  });

  it('should filter meals by type', () => {
    component.selectedMealView.set('breakfast');
    const filtered = component.filteredMeals();
    expect(filtered.every((m) => m.type === 'breakfast')).toBeTruthy();
  });

  it('should calculate total daily nutrition correctly', () => {
    const total = component.dailyNutrition();
    expect(total.calories).toBeGreaterThan(0);
    expect(total.protein).toBeGreaterThan(0);
  });

  it('should expose meal recommendations by goal from service', () => {
    const bulkMeals = component.todaysMeals();
    const service = TestBed.inject(NutritionService);
    const cutMeals$ = service.getMealRecommendations('cut');
    const maintainMeals$ = service.getMealRecommendations('maintain');

    expect(bulkMeals.length).toBe(4);
    expect(cutMeals$).toBeTruthy();
    expect(maintainMeals$).toBeTruthy();

    bulkMeals.forEach((meal) => {
      expect(meal.recipe.title).toBeTruthy();
      expect(meal.recipe.ingredients.length).toBeGreaterThan(0);
      expect(meal.recipe.nutritionPerServing.calories).toBeGreaterThan(0);
    });
  });
});
