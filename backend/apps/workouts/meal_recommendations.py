import json
import random
import re
from dataclasses import dataclass
from typing import Any
from urllib.parse import quote
from urllib.request import Request, urlopen


MEALDB_BASE = 'https://www.themealdb.com/api/json/v1/1/search.php?s='


@dataclass(frozen=True)
class MealTemplate:
    name: str
    time: str
    type: str
    queries: tuple[str, ...]


MEAL_TEMPLATES_BY_GOAL: dict[str, tuple[MealTemplate, ...]] = {
    'bulk': (
        MealTemplate('Breakfast', '08:00', 'breakfast', ('Oatmeal', 'Pancakes', 'French Omelette', 'Apple Frangipan Tart')),
        MealTemplate('Lunch', '12:30', 'lunch', ('Chicken Handi', 'Beef and Mustard Pie', 'Chicken Couscous', 'Kapsalon')),
        MealTemplate('Snack', '16:30', 'snack', ('Mediterranean Pasta Salad', 'Corba', 'Tuna and Egg Briks', 'Fish Soup (Ukha)')),
        MealTemplate('Dinner', '20:00', 'dinner', ('Salmon Prawn Risotto', 'Baked salmon with fennel & tomatoes', 'Kedgeree', 'Grilled Portuguese sardines')),
    ),
    'cut': (
        MealTemplate('Breakfast', '08:00', 'breakfast', ('French Omelette', 'Mushroom & Chestnut Rotolo', 'Fruit and Cream Cheese Breakfast Pastries', 'Baingan Bharta')),
        MealTemplate('Lunch', '12:30', 'lunch', ('Grilled Portuguese sardines', 'Chicken Couscous', 'Mediterranean Pasta Salad', 'Kung Pao Chicken')),
        MealTemplate('Snack', '16:30', 'snack', ('Corba', 'Leblebi Soup', 'Fish Soup (Ukha)', 'Tuna Nicoise')),
        MealTemplate('Dinner', '20:00', 'dinner', ('Baked salmon with fennel & tomatoes', 'Prawn and Avocado Salad', 'Chicken Alfredo Primavera', 'Roasted Eggplant With Tahini, Pine Nuts, and Lentils')),
    ),
    'maintain': (
        MealTemplate('Breakfast', '08:00', 'breakfast', ('French Omelette', 'Pancakes', 'Apple & Blackberry Crumble', 'Bread and Butter Pudding')),
        MealTemplate('Lunch', '12:30', 'lunch', ('Chicken Couscous', 'Mediterranean Pasta Salad', 'Kapsalon', 'Fish pie')),
        MealTemplate('Snack', '16:30', 'snack', ('Corba', 'Leblebi Soup', 'Tuna and Egg Briks', 'Stuffed Bell Peppers with Quinoa and Black Beans')),
        MealTemplate('Dinner', '20:00', 'dinner', ('Baked salmon with fennel & tomatoes', 'Beef and Mustard Pie', 'Salmon Prawn Risotto', 'Poutine')),
    ),
}


def build_meal_recommendations(goal: str) -> list[dict[str, Any]]:
    selected_goal = goal if goal in MEAL_TEMPLATES_BY_GOAL else 'maintain'
    templates = MEAL_TEMPLATES_BY_GOAL[selected_goal]

    recommendations: list[dict[str, Any]] = []
    for template in templates:
        meal = _pick_meal_from_queries(template.queries)
        if not meal:
            continue

        ingredients = _parse_ingredients(meal)
        servings = max(int(_coerce_number(meal.get('strServings', 1), fallback=1)), 1)
        nutrition = _estimate_nutrition(ingredients, selected_goal, template.type)

        recommendations.append(
            {
                'name': template.name,
                'time': template.time,
                'type': template.type,
                'recipe': {
                    'id': int(_coerce_number(meal.get('idMeal', 0), fallback=0)),
                    'title': meal.get('strMeal', template.name),
                    'image': meal.get('strMealThumb', ''),
                    'ingredients': ingredients,
                    'instructions': (meal.get('strInstructions') or 'No instructions available').strip(),
                    'servings': servings,
                    'nutritionPerServing': nutrition,
                },
            }
        )

    return recommendations


def _pick_meal_from_queries(queries: tuple[str, ...]) -> dict[str, Any] | None:
    shuffled = list(queries)
    random.shuffle(shuffled)
    for query in shuffled:
        meal = _fetch_meal_by_query(query)
        if meal:
            return meal
    return None


def _fetch_meal_by_query(query: str) -> dict[str, Any] | None:
    url = f"{MEALDB_BASE}{quote(query)}"
    request = Request(url, headers={'User-Agent': 'ZERO/1.0'})
    try:
        with urlopen(request, timeout=8) as response:
            payload = json.loads(response.read().decode('utf-8'))
    except Exception:
        return None

    meals = payload.get('meals') or []
    if not meals:
        return None
    return meals[0]


def _parse_ingredients(meal: dict[str, Any]) -> list[dict[str, Any]]:
    ingredients: list[dict[str, Any]] = []
    for i in range(1, 21):
        name = str(meal.get(f'strIngredient{i}', '')).strip()
        measure = str(meal.get(f'strMeasure{i}', '')).strip()
        if not name:
            continue

        amount, unit = _parse_measure(measure)
        ingredients.append({'name': name, 'amount': amount, 'unit': unit})

    return ingredients


def _parse_measure(measure: str) -> tuple[float, str]:
    if not measure:
        return 1.0, 'portion'

    fraction_match = re.search(r'(\d+)\s*/\s*(\d+)', measure)
    if fraction_match:
        numerator = float(fraction_match.group(1))
        denominator = float(fraction_match.group(2)) or 1.0
        amount = numerator / denominator
    else:
        number_match = re.search(r'\d+(?:\.\d+)?', measure)
        amount = float(number_match.group(0)) if number_match else 1.0

    unit = re.sub(r'[\d\s./]+', ' ', measure).strip() or 'portion'
    return round(amount, 2), unit


def _estimate_nutrition(ingredients: list[dict[str, Any]], goal: str, meal_type: str) -> dict[str, float]:
    baseline = {
        'bulk': {
            'breakfast': {'protein': 45, 'carbs': 95, 'fat': 28},
            'lunch': {'protein': 55, 'carbs': 105, 'fat': 32},
            'snack': {'protein': 28, 'carbs': 45, 'fat': 15},
            'dinner': {'protein': 60, 'carbs': 95, 'fat': 30},
        },
        'cut': {
            'breakfast': {'protein': 35, 'carbs': 55, 'fat': 18},
            'lunch': {'protein': 45, 'carbs': 60, 'fat': 20},
            'snack': {'protein': 24, 'carbs': 30, 'fat': 11},
            'dinner': {'protein': 48, 'carbs': 50, 'fat': 18},
        },
        'maintain': {
            'breakfast': {'protein': 38, 'carbs': 70, 'fat': 20},
            'lunch': {'protein': 48, 'carbs': 75, 'fat': 24},
            'snack': {'protein': 24, 'carbs': 35, 'fat': 12},
            'dinner': {'protein': 52, 'carbs': 70, 'fat': 24},
        },
    }

    profile = baseline.get(goal, baseline['maintain']).get(meal_type, baseline['maintain']['lunch']).copy()

    protein_keywords = ('chicken', 'beef', 'pork', 'salmon', 'tuna', 'egg', 'yogurt', 'cheese', 'lamb', 'prawn', 'shrimp', 'fish', 'turkey')
    carb_keywords = ('rice', 'pasta', 'potato', 'oat', 'bread', 'noodle', 'quinoa', 'bean', 'lentil', 'banana', 'flour')
    fat_keywords = ('oil', 'butter', 'cream', 'avocado', 'nuts', 'peanut', 'coconut')

    for ingredient in ingredients[:8]:
        name = str(ingredient.get('name', '')).lower()
        if any(keyword in name for keyword in protein_keywords):
            profile['protein'] += 1.4
        if any(keyword in name for keyword in carb_keywords):
            profile['carbs'] += 1.8
        if any(keyword in name for keyword in fat_keywords):
            profile['fat'] += 0.9

    protein = round(profile['protein'], 1)
    carbs = round(profile['carbs'], 1)
    fat = round(profile['fat'], 1)
    calories = round((protein * 4) + (carbs * 4) + (fat * 9), 1)

    return {
        'calories': calories,
        'protein': protein,
        'carbs': carbs,
        'fat': fat,
    }


def _coerce_number(value: Any, fallback: int | float = 0) -> float:
    try:
        return float(value)
    except Exception:
        return float(fallback)
