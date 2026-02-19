import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FoodComponent } from './food';
import { NutritionService } from '../../../core/nutrition.service';
import { ProfileService } from '../../../core/profile.service';

describe('FoodComponent', () => {
  let component: FoodComponent;
  let fixture: ComponentFixture<FoodComponent>;
  let nutritionService: NutritionService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoodComponent, HttpClientTestingModule],
      providers: [NutritionService, ProfileService],
    }).compileComponents();

    fixture = TestBed.createComponent(FoodComponent);
    component = fixture.componentInstance;
    nutritionService = TestBed.inject(NutritionService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with meal recommendations', () => {
    expect(component.todaysMeals.length).toBe(4);
    const types = component.todaysMeals.map(m => m.type);
    expect(types).toContain('breakfast');
    expect(types).toContain('lunch');
    expect(types).toContain('dinner');
    expect(types).toContain('snack');
  });

  it('should filter meals by type', () => {
    component.selectedMealView = 'breakfast';
    const filtered = component.getFilteredMeals();
    expect(filtered.every(m => m.type === 'breakfast')).toBeTruthy();
  });

  it('should calculate total daily nutrition correctly', () => {
    const total = component.getTotalDailyNutrition();
    expect(total.calories).toBeGreaterThan(0);
    expect(total.protein).toBeGreaterThan(0);
  });

  it('should get meal recommendations based on fitness goal', () => {
    const bulkMeals = nutritionService.getMealRecommendations('bulk');
    const cutMeals = nutritionService.getMealRecommendations('cut');
    const maintainMeals = nutritionService.getMealRecommendations('maintain');
    
    expect(bulkMeals.length).toBe(4);
    expect(cutMeals.length).toBe(4);
    expect(maintainMeals.length).toBe(4);
    
    bulkMeals.forEach(meal => {
      expect(meal.recipe.title).toBeTruthy();
      expect(meal.recipe.ingredients.length).toBeGreaterThan(0);
      expect(meal.recipe.nutritionPerServing.calories).toBeGreaterThan(0);
    });
  });
});
