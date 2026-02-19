import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { NutritionService, Recipe, MealRecommendation } from '../../../core/nutrition.service';
import { ProfileService, FitnessGoal } from '../../../core/profile.service';

@Component({
  selector: 'app-food',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, HttpClientModule],
  templateUrl: './food.html',
  styleUrls: ['./food.scss'],
  providers: [NutritionService],
})
export class FoodComponent implements OnInit {
  private nutritionService = inject(NutritionService);
  private profileService = inject(ProfileService);

  todaysMeals = signal<MealRecommendation[]>([]);
  fitnessGoal = signal<FitnessGoal>('bulk');

  selectedMealView = signal<'all' | 'breakfast' | 'lunch' | 'dinner' | 'snack'>('all');

  ngOnInit(): void {
    const profile = this.profileService.getLocal();
    if (profile?.fitness_goal) {
      this.fitnessGoal.set(profile.fitness_goal);
    }
    this.loadMealRecommendations();
  }

  loadMealRecommendations(): void {
    this.todaysMeals.set(this.nutritionService.getMealRecommendations(this.fitnessGoal()));
  }

  getFilteredMeals(): MealRecommendation[] {
    if (this.selectedMealView() === 'all') {
      return this.todaysMeals();
    }
    return this.todaysMeals().filter(meal => meal.type === this.selectedMealView());
  }

  getTotalDailyNutrition() {
    const total = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    };

    this.getFilteredMeals().forEach((meal) => {
      if (meal.recipe.nutritionPerServing) {
        total.calories += meal.recipe.nutritionPerServing.calories;
        total.protein += meal.recipe.nutritionPerServing.protein;
        total.carbs += meal.recipe.nutritionPerServing.carbs;
        total.fat += meal.recipe.nutritionPerServing.fat;
      }
    });

    return total;
  }
}
