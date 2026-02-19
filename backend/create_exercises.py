import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import Exercise

Exercise.objects.all().delete()

# Ejercicios para CASA (HOME)
home_exercises = [
    # BACK
    {"name": "Inverted Rows", "category": "back", "location": "home", "goal": "both", "sets": 3, "reps": 8},
    {"name": "Resistance Band Rows", "category": "back", "location": "home", "goal": "both", "sets": 3, "reps": 10},
    {"name": "Pull-ups (Assisted)", "category": "back", "location": "home", "goal": "bulk", "sets": 4, "reps": 6},
    {"name": "Superman Holds", "category": "back", "location": "home", "goal": "both", "sets": 3, "reps": 12},
    
    # CHEST
    {"name": "Push-ups", "category": "chest", "location": "home", "goal": "both", "sets": 4, "reps": 10},
    {"name": "Incline Push-ups", "category": "chest", "location": "home", "goal": "both", "sets": 3, "reps": 8},
    {"name": "Diamond Push-ups", "category": "chest", "location": "home", "goal": "bulk", "sets": 3, "reps": 8},
    {"name": "Resistance Band Chest Press", "category": "chest", "location": "home", "goal": "both", "sets": 3, "reps": 12},
    
    # LEGS
    {"name": "Bodyweight Squats", "category": "legs", "location": "home", "goal": "both", "sets": 4, "reps": 15},
    {"name": "Jump Squats", "category": "legs", "location": "home", "goal": "cut", "sets": 3, "reps": 12},
    {"name": "Bulgarian Split Squats", "category": "legs", "location": "home", "goal": "bulk", "sets": 3, "reps": 8},
    {"name": "Lunges", "category": "legs", "location": "home", "goal": "both", "sets": 3, "reps": 10},
    
    # ARMS
    {"name": "Push-up to T", "category": "arms", "location": "home", "goal": "both", "sets": 3, "reps": 10},
    {"name": "Pike Push-ups", "category": "arms", "location": "home", "goal": "bulk", "sets": 3, "reps": 8},
    {"name": "Resistance Band Curls", "category": "arms", "location": "home", "goal": "both", "sets": 3, "reps": 12},
    {"name": "Dips (Chair)", "category": "arms", "location": "home", "goal": "bulk", "sets": 3, "reps": 8},
    
    # SHOULDERS
    {"name": "Pike Push-ups", "category": "shoulders", "location": "home", "goal": "bulk", "sets": 3, "reps": 8},
    {"name": "Resistance Band Shoulder Press", "category": "shoulders", "location": "home", "goal": "both", "sets": 3, "reps": 10},
    {"name": "Lateral Raises (Resistance Band)", "category": "shoulders", "location": "home", "goal": "both", "sets": 3, "reps": 12},
    {"name": "Plank to Downward Dog", "category": "shoulders", "location": "home", "goal": "both", "sets": 3, "reps": 10},
    
    # ACCESSORIES
    {"name": "Planks", "category": "accessories", "location": "home", "goal": "cut", "sets": 3, "reps": 30},
    {"name": "Dead Bugs", "category": "accessories", "location": "home", "goal": "both", "sets": 3, "reps": 12},
    {"name": "Bird Dogs", "category": "accessories", "location": "home", "goal": "both", "sets": 3, "reps": 10},
    {"name": "Glute Bridges", "category": "accessories", "location": "home", "goal": "both", "sets": 3, "reps": 15},
]

# Ejercicios para GYM
gym_exercises = [
    # BACK
    {"name": "Barbell Rows", "category": "back", "location": "gym", "goal": "bulk", "sets": 4, "reps": 6},
    {"name": "Pull-ups", "category": "back", "location": "gym", "goal": "bulk", "sets": 4, "reps": 8},
    {"name": "Lat Pulldowns", "category": "back", "location": "gym", "goal": "both", "sets": 3, "reps": 10},
    {"name": "Cable Rows", "category": "back", "location": "gym", "goal": "both", "sets": 3, "reps": 10},
    {"name": "Deadlifts", "category": "back", "location": "gym", "goal": "bulk", "sets": 3, "reps": 5},
    {"name": "Face Pulls", "category": "back", "location": "gym", "goal": "both", "sets": 3, "reps": 12},
    
    # CHEST
    {"name": "Barbell Bench Press", "category": "chest", "location": "gym", "goal": "bulk", "sets": 4, "reps": 6},
    {"name": "Dumbbell Bench Press", "category": "chest", "location": "gym", "goal": "bulk", "sets": 3, "reps": 8},
    {"name": "Incline Bench Press", "category": "chest", "location": "gym", "goal": "bulk", "sets": 3, "reps": 8},
    {"name": "Cable Flyes", "category": "chest", "location": "gym", "goal": "both", "sets": 3, "reps": 12},
    {"name": "Smith Machine Bench Press", "category": "chest", "location": "gym", "goal": "both", "sets": 3, "reps": 10},
    {"name": "Push-up Machine", "category": "chest", "location": "gym", "goal": "both", "sets": 3, "reps": 12},
    
    # LEGS
    {"name": "Barbell Squats", "category": "legs", "location": "gym", "goal": "bulk", "sets": 4, "reps": 6},
    {"name": "Leg Press", "category": "legs", "location": "gym", "goal": "both", "sets": 3, "reps": 10},
    {"name": "Leg Curls", "category": "legs", "location": "gym", "goal": "both", "sets": 3, "reps": 10},
    {"name": "Leg Extensions", "category": "legs", "location": "gym", "goal": "both", "sets": 3, "reps": 12},
    {"name": "Romanian Deadlifts", "category": "legs", "location": "gym", "goal": "bulk", "sets": 3, "reps": 8},
    {"name": "Hack Squats", "category": "legs", "location": "gym", "goal": "bulk", "sets": 3, "reps": 8},
    
    # ARMS
    {"name": "Barbell Curls", "category": "arms", "location": "gym", "goal": "bulk", "sets": 3, "reps": 8},
    {"name": "Dumbbell Curls", "category": "arms", "location": "gym", "goal": "bulk", "sets": 3, "reps": 10},
    {"name": "Close-grip Bench Press", "category": "arms", "location": "gym", "goal": "bulk", "sets": 3, "reps": 8},
    {"name": "Tricep Dips", "category": "arms", "location": "gym", "goal": "bulk", "sets": 3, "reps": 8},
    {"name": "Tricep Rope Extensions", "category": "arms", "location": "gym", "goal": "both", "sets": 3, "reps": 12},
    {"name": "Hammer Curls", "category": "arms", "location": "gym", "goal": "bulk", "sets": 3, "reps": 10},
    
    # SHOULDERS
    {"name": "Military Press", "category": "shoulders", "location": "gym", "goal": "bulk", "sets": 4, "reps": 6},
    {"name": "Shoulder Press Machine", "category": "shoulders", "location": "gym", "goal": "both", "sets": 3, "reps": 10},
    {"name": "Lateral Raises", "category": "shoulders", "location": "gym", "goal": "both", "sets": 3, "reps": 12},
    {"name": "Reverse Pec Deck", "category": "shoulders", "location": "gym", "goal": "both", "sets": 3, "reps": 12},
    {"name": "Upright Rows", "category": "shoulders", "location": "gym", "goal": "bulk", "sets": 3, "reps": 8},
    {"name": "Arnold Press", "category": "shoulders", "location": "gym", "goal": "bulk", "sets": 3, "reps": 8},
    
    # ACCESSORIES
    {"name": "Cable Crunches", "category": "accessories", "location": "gym", "goal": "cut", "sets": 3, "reps": 15},
    {"name": "Ab Wheel Rollouts", "category": "accessories", "location": "gym", "goal": "both", "sets": 3, "reps": 10},
    {"name": "Leg Raises", "category": "accessories", "location": "gym", "goal": "both", "sets": 3, "reps": 12},
    {"name": "Machine Leg Press (Glutes)", "category": "accessories", "location": "gym", "goal": "both", "sets": 3, "reps": 12},
    {"name": "Adductor Machine", "category": "accessories", "location": "gym", "goal": "both", "sets": 3, "reps": 12},
    {"name": "Abductor Machine", "category": "accessories", "location": "gym", "goal": "both", "sets": 3, "reps": 12},
]

# Crear ejercicios
all_exercises = home_exercises + gym_exercises

for ex_data in all_exercises:
    Exercise.objects.create(
        name=ex_data["name"],
        category=ex_data["category"],
        location=ex_data["location"],
        goal=ex_data["goal"],
        default_sets=ex_data["sets"],
        default_reps=ex_data["reps"]
    )

print(f" {len(all_exercises)} ejercicios creados exitosamente")
print(f"   - {len(home_exercises)} ejercicios para casa")
print(f"   - {len(gym_exercises)} ejercicios para gimnasio")
