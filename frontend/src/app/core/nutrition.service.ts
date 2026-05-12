import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environments';

export type NutritionInfo = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type RecipeIngredient = {
  name: string;
  amount: number;
  unit: string;
};

export type Recipe = {
  id: number;
  title: string;
  image: string;
  ingredients: RecipeIngredient[];
  instructions: string;
  servings: number;
  nutritionPerServing: NutritionInfo;
};

export type MealRecommendation = {
  name: string;
  time: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipe: Recipe;
};

@Injectable({
  providedIn: 'root',
})
export class NutritionService {
  private apiBase = `${environment.apiUrl}/api`;
  private mealDbBase = 'https://www.themealdb.com/api/json/v1/1';
  private openFoodFactsBase = 'https://world.openfoodfacts.org/api/v2/search';

  constructor(private http: HttpClient) {}

  getNutritionInfo(foodName: string): Observable<NutritionInfo> {
    const params = {
      search_terms: foodName,
      page_size: '1',
      fields: 'nutriments',
      json: '1',
    };

    return this.http.get<any>(this.openFoodFactsBase, { params }).pipe(
      map((response) => {
        const product = response?.products?.[0];
        const n = product?.nutriments ?? {};
        return {
          calories: this.round(Number(n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0)),
          protein:  this.round(Number(n.proteins_100g ?? n.proteins ?? 0)),
          carbs:    this.round(Number(n.carbohydrates_100g ?? n.carbohydrates ?? 0)),
          fat:      this.round(Number(n.fat_100g ?? n.fat ?? 0)),
        };
      }),
      catchError(() => of({ calories: 0, protein: 0, carbs: 0, fat: 0 }))
    );
  }

  getRecipeByName(recipeName: string): Observable<Recipe | null> {
    const params = { s: recipeName };

    return this.http.get<any>(`${this.mealDbBase}/search.php`, { params }).pipe(
      switchMap((response) => {
        const meal = response?.meals?.[0];
        if (!meal) return of(null);

        const ingredients = this.parseMealDbIngredients(meal);
        const servings = Number(meal?.strServings) || 1;

        return this.estimateRecipeNutrition(ingredients, servings).pipe(
          map((nutritionPerServing) => ({
            id: Number(meal.idMeal),
            title: meal.strMeal,
            image: meal.strMealThumb,
            ingredients,
            instructions: (meal.strInstructions || 'No instructions available').trim(),
            servings,
            nutritionPerServing,
          }))
        );
      }),
      catchError(() => of(null))
    );
  }

  getMealRecommendations(goal: 'bulk' | 'cut' | 'maintain'): Observable<MealRecommendation[]> {
    return this.http
      .get<MealRecommendation[]>(`${this.apiBase}/meal-recommendations/`, {
        params: { goal },
      })
      .pipe(catchError(() => of([])));
  }

  private estimateRecipeNutrition(ingredients: RecipeIngredient[], servings: number): Observable<NutritionInfo> {
    const sampleIngredients = ingredients.slice(0, 3).map((ingredient) => ingredient.name);
    if (sampleIngredients.length === 0) {
      return of({ calories: 220, protein: 12, carbs: 20, fat: 9 });
    }

    return forkJoin(sampleIngredients.map((name) => this.getNutritionInfo(name))).pipe(
      map((items) => {
        const total = items.reduce(
          (acc, nutrition) => ({
            calories: acc.calories + nutrition.calories,
            protein: acc.protein + nutrition.protein,
            carbs: acc.carbs + nutrition.carbs,
            fat: acc.fat + nutrition.fat,
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );

        const divisor = Math.max(servings, 1);
        return {
          calories: this.round(total.calories / divisor),
          protein: this.round(total.protein / divisor),
          carbs: this.round(total.carbs / divisor),
          fat: this.round(total.fat / divisor),
        };
      }),
      catchError(() => of({ calories: 0, protein: 0, carbs: 0, fat: 0 }))
    );
  }

  private parseMealDbIngredients(meal: any): RecipeIngredient[] {
    const ingredients: RecipeIngredient[] = [];
    for (let i = 1; i <= 20; i++) {
      const name = (meal[`strIngredient${i}`] || '').trim();
      const measure = (meal[`strMeasure${i}`] || '').trim();
      if (!name) continue;

      const parsed = this.parseMeasure(measure);
      ingredients.push({
        name,
        amount: parsed.amount,
        unit: parsed.unit,
      });
    }
    return ingredients;
  }

  private parseMeasure(measure: string): { amount: number; unit: string } {
    if (!measure) return { amount: 1, unit: 'portion' };
    const numeric = measure.match(/[\d.]+/);
    const amount = numeric ? Number(numeric[0]) : 1;
    const unit = measure.replace(/[\d.]/g, '').trim() || 'portion';
    return { amount: this.round(amount), unit };
  }

  private round(value: number): number {
    return Math.round((value || 0) * 10) / 10;
  }
}
