import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

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
  private mealDbBase = 'https://www.themealdb.com/api/json/v1/1';
  private openFoodFactsBase = 'https://world.openfoodfacts.org/cgi/search.pl';

  constructor(private http: HttpClient) {}

  getNutritionInfo(foodName: string): Observable<NutritionInfo> {
    const params = {
      search_terms: foodName,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: '1',
    };

    return this.http.get<any>(this.openFoodFactsBase, { params }).pipe(
      map((response) => {
        const product = response?.products?.[0];
        const nutriments = product?.nutriments ?? {};
        const calories = Number(nutriments['energy-kcal_100g'] ?? nutriments.energy_kcal_100g ?? 0);
        const protein = Number(nutriments.proteins_100g ?? 0);
        const carbs = Number(nutriments.carbohydrates_100g ?? 0);
        const fat = Number(nutriments.fat_100g ?? 0);

        if (!calories && !protein && !carbs && !fat) {
          return this.getFallbackNutrition(foodName);
        }

        return {
          calories: this.round(calories),
          protein: this.round(protein),
          carbs: this.round(carbs),
          fat: this.round(fat),
        };
      }),
      catchError(() => of(this.getFallbackNutrition(foodName)))
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
    const templatesByGoal: Record<string, { name: string; time: string; type: 'breakfast' | 'lunch' | 'dinner' | 'snack'; query: string }[]> = {
      bulk: [
        { name: 'Breakfast', time: '08:00', type: 'breakfast', query: 'Pancakes' },
        { name: 'Lunch', time: '12:30', type: 'lunch', query: 'Beef and Mustard Pie' },
        { name: 'Snack', time: '16:30', type: 'snack', query: 'Chicken Handi' },
        { name: 'Dinner', time: '20:00', type: 'dinner', query: 'Salmon Prawn Risotto' },
      ],
      cut: [
        { name: 'Breakfast', time: '08:00', type: 'breakfast', query: 'Fruit and Cream Cheese Breakfast Pastries' },
        { name: 'Lunch', time: '12:30', type: 'lunch', query: 'Grilled Portuguese sardines' },
        { name: 'Snack', time: '16:30', type: 'snack', query: 'Mediterranean Pasta Salad' },
        { name: 'Dinner', time: '20:00', type: 'dinner', query: 'Chicken Fajita Mac and Cheese' },
      ],
      maintain: [
        { name: 'Breakfast', time: '08:00', type: 'breakfast', query: 'French Omelette' },
        { name: 'Lunch', time: '12:30', type: 'lunch', query: 'Chicken Couscous' },
        { name: 'Snack', time: '16:30', type: 'snack', query: 'Tuna and Egg Briks' },
        { name: 'Dinner', time: '20:00', type: 'dinner', query: 'Baked salmon with fennel & tomatoes' },
      ],
    };

    const templates = templatesByGoal[goal] ?? templatesByGoal['maintain'];

    return forkJoin(templates.map((template) => this.getRecipeByName(template.query))).pipe(
      map((recipes) =>
        recipes
          .map((recipe, index) => {
            if (!recipe) return null;
            const template = templates[index];
            return {
              name: template.name,
              time: template.time,
              type: template.type,
              recipe,
            } as MealRecommendation;
          })
          .filter((item): item is MealRecommendation => item !== null)
      )
    );
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
      catchError(() => of({ calories: 260, protein: 14, carbs: 24, fat: 10 }))
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

  private getFallbackNutrition(foodName: string): NutritionInfo {
    const name = foodName.toLowerCase();
    if (name.includes('chicken') || name.includes('egg') || name.includes('tuna') || name.includes('salmon')) {
      return { calories: 190, protein: 24, carbs: 2, fat: 8 };
    }
    if (name.includes('rice') || name.includes('pasta') || name.includes('bread') || name.includes('potato')) {
      return { calories: 180, protein: 5, carbs: 34, fat: 2 };
    }
    return { calories: 140, protein: 6, carbs: 16, fat: 5 };
  }

  private round(value: number): number {
    return Math.round((value || 0) * 10) / 10;
  }
}
