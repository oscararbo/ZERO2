import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export type NutritionInfo = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type Recipe = {
  id: number;
  title: string;
  image: string;
  ingredients: { name: string; amount: number; unit: string }[];
  instructions: string;
  servings: number;
  nutritionPerServing: NutritionInfo;
};

export type MealPlan = {
  date: string;
  meals: { name: string; time: string; nutrition: NutritionInfo }[];
};

export type MealRecommendation = {
  name: string;
  time: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipe: Recipe;
};

const MOCK_RECIPES: { [key: string]: Recipe } = {
  'grilled chicken breast': {
    id: 1,
    title: 'Grilled Chicken Breast',
    image: 'https://via.placeholder.com/400x300?text=Grilled+Chicken',
    ingredients: [
      { name: 'Chicken breast', amount: 200, unit: 'g' },
      { name: 'Olive oil', amount: 1, unit: 'tbsp' },
      { name: 'Salt', amount: 0.5, unit: 'tsp' },
      { name: 'Black pepper', amount: 0.25, unit: 'tsp' },
      { name: 'Garlic', amount: 2, unit: 'cloves' },
      { name: 'Lemon juice', amount: 1, unit: 'tbsp' },
    ],
    instructions:
      '1. Marinate chicken with olive oil, salt, pepper, garlic and lemon juice for 30 minutes\n2. Heat grill to medium-high heat\n3. Grill chicken for 6-8 minutes per side until internal temperature reaches 165°F\n4. Let rest for 5 minutes before serving',
    servings: 1,
    nutritionPerServing: {
      calories: 280,
      protein: 45,
      carbs: 2,
      fat: 10,
    },
  },
  'pasta carbonara': {
    id: 2,
    title: 'Pasta Carbonara',
    image: 'https://via.placeholder.com/400x300?text=Pasta+Carbonara',
    ingredients: [
      { name: 'Pasta', amount: 100, unit: 'g' },
      { name: 'Eggs', amount: 2, unit: 'whole' },
      { name: 'Bacon', amount: 50, unit: 'g' },
      { name: 'Parmesan cheese', amount: 30, unit: 'g' },
      { name: 'Black pepper', amount: 0.5, unit: 'tsp' },
      { name: 'Salt', amount: 0.5, unit: 'tsp' },
    ],
    instructions:
      '1. Cook pasta according to package directions\n2. Cook bacon until crispy\n3. Mix eggs and cheese\n4. Drain pasta and toss with bacon\n5. Combine egg mixture off heat\n6. Season with salt and pepper',
    servings: 1,
    nutritionPerServing: {
      calories: 520,
      protein: 32,
      carbs: 48,
      fat: 18,
    },
  },
  'salmon with vegetables': {
    id: 3,
    title: 'Baked Salmon with Vegetables',
    image: 'https://via.placeholder.com/400x300?text=Salmon+Vegetables',
    ingredients: [
      { name: 'Salmon fillet', amount: 150, unit: 'g' },
      { name: 'Broccoli', amount: 100, unit: 'g' },
      { name: 'Bell peppers', amount: 100, unit: 'g' },
      { name: 'Olive oil', amount: 1, unit: 'tbsp' },
      { name: 'Lemon', amount: 0.5, unit: 'whole' },
      { name: 'Herbs (dill)', amount: 1, unit: 'tsp' },
    ],
    instructions:
      '1. Preheat oven to 400°F\n2. Place salmon on baking sheet\n3. Arrange vegetables around salmon\n4. Drizzle with olive oil and lemon juice\n5. Season with salt, pepper and dill\n6. Bake for 15-18 minutes until salmon flakes easily',
    servings: 1,
    nutritionPerServing: {
      calories: 380,
      protein: 38,
      carbs: 12,
      fat: 18,
    },
  },
  'oatmeal with berries': {
    id: 4,
    title: 'Overnight Oats with Berries',
    image: 'https://via.placeholder.com/400x300?text=Oatmeal+Berries',
    ingredients: [
      { name: 'Oats', amount: 50, unit: 'g' },
      { name: 'Greek yogurt', amount: 100, unit: 'ml' },
      { name: 'Milk', amount: 100, unit: 'ml' },
      { name: 'Berries', amount: 80, unit: 'g' },
      { name: 'Honey', amount: 1, unit: 'tbsp' },
      { name: 'Almonds', amount: 15, unit: 'g' },
    ],
    instructions:
      '1. Mix oats, yogurt, and milk in a jar\n2. Stir well and cover\n3. Refrigerate overnight or at least 4 hours\n4. Top with berries and honey\n5. Add almonds and serve cold or heat if preferred',
    servings: 1,
    nutritionPerServing: {
      calories: 350,
      protein: 18,
      carbs: 45,
      fat: 9,
    },
  },
};

const MOCK_NUTRITION: { [key: string]: NutritionInfo } = {
  chicken: { calories: 280, protein: 45, carbs: 2, fat: 10 },
  beef: { calories: 320, protein: 42, carbs: 0, fat: 16 },
  fish: { calories: 280, protein: 40, carbs: 0, fat: 12 },
  rice: { calories: 206, protein: 4, carbs: 45, fat: 0 },
  pasta: { calories: 131, protein: 5, carbs: 25, fat: 1 },
  broccoli: { calories: 34, protein: 3, carbs: 7, fat: 0 },
  banana: { calories: 89, protein: 1, carbs: 23, fat: 0 },
  egg: { calories: 155, protein: 13, carbs: 1, fat: 11 },
  milk: { calories: 61, protein: 3, carbs: 5, fat: 3 },
  bread: { calories: 79, protein: 3, carbs: 14, fat: 1 },
  pizza: { calories: 285, protein: 12, carbs: 36, fat: 10 },
  burger: { calories: 354, protein: 17, carbs: 25, fat: 17 },
  salad: { calories: 155, protein: 8, carbs: 10, fat: 7 },
  soup: { calories: 120, protein: 5, carbs: 15, fat: 4 },
  sandwich: { calories: 298, protein: 15, carbs: 38, fat: 8 },
};

@Injectable({
  providedIn: 'root',
})
export class NutritionService {
  // API Key for Spoonacular (you can update this with your own)
  private apiKey = 'YOUR_SPOONACULAR_API_KEY';
  private apiUrl = 'https://spoonacular-api.p.rapidapi.com';

  constructor(private http: HttpClient) {}

  // Get nutrition info for a food item
  getNutritionInfo(foodName: string): Observable<NutritionInfo> {
    const lowerFoodName = foodName.toLowerCase().trim();

    // Check mock database first
    if (MOCK_NUTRITION[lowerFoodName]) {
      return of(MOCK_NUTRITION[lowerFoodName]);
    }

    // Try to find partial match
    for (const key in MOCK_NUTRITION) {
      if (lowerFoodName.includes(key) || key.includes(lowerFoodName)) {
        return of(MOCK_NUTRITION[key]);
      }
    }

    // If API key is set, try the real API
    if (this.apiKey !== 'YOUR_SPOONACULAR_API_KEY') {
      const url = `${this.apiUrl}/food/nutrients`;
      const params = {
        query: foodName,
      };

      return this.http
        .get<any>(url, {
          params,
          headers: {
            'X-RapidAPI-Key': this.apiKey,
            'X-RapidAPI-Host': 'spoonacular-api.p.rapidapi.com',
          },
        })
        .pipe(
          map((response) => ({
            calories: response.calories || 0,
            protein: response.nutrition?.macronutrients?.[0]?.value || 0,
            carbs: response.nutrition?.macronutrients?.[1]?.value || 0,
            fat: response.nutrition?.macronutrients?.[2]?.value || 0,
          })),
          catchError(() => of(this.getMockNutrition()))
        );
    }

    
    return of(this.getMockNutrition());
  }

  // Get recipe by name
  getRecipeByName(recipeName: string): Observable<Recipe | null> {
    const lowerRecipeName = recipeName.toLowerCase().trim();

    // Check mock database first
    if (MOCK_RECIPES[lowerRecipeName]) {
      return of(MOCK_RECIPES[lowerRecipeName]);
    }

    // Try to find partial match
    for (const key in MOCK_RECIPES) {
      if (lowerRecipeName.includes(key) || key.includes(lowerRecipeName)) {
        return of(MOCK_RECIPES[key]);
      }
    }

    // If API key is set, try the real API
    if (this.apiKey !== 'YOUR_SPOONACULAR_API_KEY') {
      const url = `${this.apiUrl}/recipes/complexSearch`;
      const params = {
        query: recipeName,
        number: 1,
        addRecipeInformation: true,
        addRecipeNutrition: true,
      };

      return this.http
        .get<any>(url, {
          params,
          headers: {
            'X-RapidAPI-Key': this.apiKey,
            'X-RapidAPI-Host': 'spoonacular-api.p.rapidapi.com',
          },
        })
        .pipe(
          map((response) => {
            if (response.results && response.results.length > 0) {
              const recipe = response.results[0];
              return {
                id: recipe.id,
                title: recipe.title,
                image: recipe.image,
                ingredients: this.parseIngredients(recipe.extendedIngredients || []),
                instructions: this.parseInstructions(recipe.analyzedInstructions),
                servings: recipe.servings || 4,
                nutritionPerServing: {
                  calories: (recipe.nutrition?.calories || 0) / (recipe.servings || 4),
                  protein:
                    this.getMacroValue(recipe.nutrition?.nutrients, 'Protein') /
                    (recipe.servings || 4),
                  carbs:
                    this.getMacroValue(recipe.nutrition?.nutrients, 'Carbohydrates') /
                    (recipe.servings || 4),
                  fat:
                    this.getMacroValue(recipe.nutrition?.nutrients, 'Fat') /
                    (recipe.servings || 4),
                },
              };
            }
            return null;
          }),
          catchError(() => of(null))
        );
    }

    return of(null);
  }

  // Mock data for development
  private getMockNutrition(): NutritionInfo {
    return {
      calories: 250,
      protein: 25,
      carbs: 30,
      fat: 8,
    };
  }

  private parseIngredients(
    ingredients: any[]
  ): { name: string; amount: number; unit: string }[] {
    return ingredients.map((ing) => ({
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
    }));
  }

  private parseInstructions(analyzedInstructions: any[]): string {
    if (!analyzedInstructions || analyzedInstructions.length === 0) {
      return 'No instructions available';
    }
    return analyzedInstructions[0].steps
      .map((step: any) => `${step.number}. ${step.step}`)
      .join('\n');
  }

  private getMacroValue(nutrients: any[], macroName: string): number {
    const macro = nutrients?.find((n) => n.name === macroName);
    return macro?.amount || 0;
  }

  // Get recommended meals based on fitness goal
  getMealRecommendations(goal: 'bulk' | 'cut' | 'maintain'): MealRecommendation[] {
    
    const bulkMeals: MealRecommendation[] = [
      {
        name: 'Oatmeal with Berries',
        time: '08:00',
        type: 'breakfast',
        recipe: MOCK_RECIPES['oatmeal with berries'],
      },
      {
        name: 'Pasta Carbonara',
        time: '12:00',
        type: 'lunch',
        recipe: MOCK_RECIPES['pasta carbonara'],
      },
      {
        name: 'Chicken Breast',
        time: '16:00',
        type: 'snack',
        recipe: MOCK_RECIPES['grilled chicken breast'],
      },
      {
        name: 'Salmon with Vegetables',
        time: '20:00',
        type: 'dinner',
        recipe: MOCK_RECIPES['salmon with vegetables'],
      },
    ];

    
    const cutMeals: MealRecommendation[] = [
      {
        name: 'Grilled Chicken Breast',
        time: '08:00',
        type: 'breakfast',
        recipe: MOCK_RECIPES['grilled chicken breast'],
      },
      {
        name: 'Salmon with Vegetables',
        time: '12:00',
        type: 'lunch',
        recipe: MOCK_RECIPES['salmon with vegetables'],
      },
      {
        name: 'Chicken Breast',
        time: '16:00',
        type: 'snack',
        recipe: MOCK_RECIPES['grilled chicken breast'],
      },
      {
        name: 'Pasta Carbonara',
        time: '20:00',
        type: 'dinner',
        recipe: MOCK_RECIPES['pasta carbonara'],
      },
    ];

    
    const maintainMeals: MealRecommendation[] = [
      {
        name: 'Oatmeal with Berries',
        time: '08:00',
        type: 'breakfast',
        recipe: MOCK_RECIPES['oatmeal with berries'],
      },
      {
        name: 'Grilled Chicken Breast',
        time: '12:00',
        type: 'lunch',
        recipe: MOCK_RECIPES['grilled chicken breast'],
      },
      {
        name: 'Salmon with Vegetables',
        time: '16:00',
        type: 'snack',
        recipe: MOCK_RECIPES['salmon with vegetables'],
      },
      {
        name: 'Pasta Carbonara',
        time: '20:00',
        type: 'dinner',
        recipe: MOCK_RECIPES['pasta carbonara'],
      },
    ];

    if (goal === 'bulk') return bulkMeals;
    if (goal === 'cut') return cutMeals;
    return maintainMeals;
  }
}
