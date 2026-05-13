import random
from datetime import timedelta

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from core_domain.models import (
    Challenge,
    ChallengeParticipant,
    ChallengeUpdate,
    CompletedExercise,
    Exercise,
    ExerciseSession,
    InAppReminder,
    JournalEntry,
    MoodEntry,
    Profile,
    RecoveryLog,
    WearableSnapshot,
    UserBadge,
    UserTemplateVersion,
)
from apps.performance.services import build_weekly_plan


class Command(BaseCommand):
    help = "Seed the application with deterministic dummy data for local development."

    def add_arguments(self, parser):
        parser.add_argument("--users", type=int, default=24, help="Number of dummy users to create")
        parser.add_argument("--days", type=int, default=30, help="How many past days of activity to generate")
        parser.add_argument("--password", type=str, default="password123", help="Password used for dummy users")
        parser.add_argument("--reset", action="store_true", help="Delete existing non-admin application data first")
        parser.add_argument("--seed", type=int, default=2026, help="Random seed for deterministic generation")

    @transaction.atomic
    def handle(self, *args, **options):
        random.seed(options["seed"])

        users_to_create = max(1, int(options["users"]))
        days = max(7, int(options["days"]))
        password = options["password"]

        if options["reset"]:
            self._reset_application_data()

        exercises = self._ensure_exercises()
        admin_user = self._ensure_admin(password)
        prueba_user = self._ensure_prueba_user()
        users = self._ensure_dummy_users(users_to_create, password)
        all_users = [prueba_user] + users

        self._ensure_profiles(all_users)
        self._generate_mood_and_journal(all_users, days)
        self._generate_sessions(all_users, exercises, days)
        self._generate_performance_records(all_users, days)
        self._generate_challenges(all_users, days)
        self._generate_templates(all_users)
        self._generate_prueba_profile(prueba_user)
        self._generate_prueba_activity(prueba_user, exercises, max(days, 60))

        self.stdout.write(self.style.SUCCESS("Dummy data generation completed."))
        self.stdout.write(f"Admin user: {admin_user.username}")
        self.stdout.write(f"Special user: {prueba_user.username} / Prueba1")
        self.stdout.write(f"Users total: {User.objects.count()}")
        self.stdout.write(f"Profiles total: {Profile.objects.count()}")
        self.stdout.write(f"Exercises total: {Exercise.objects.count()}")
        self.stdout.write(f"Sessions total: {ExerciseSession.objects.count()}")
        self.stdout.write(f"Completed exercises total: {CompletedExercise.objects.count()}")
        self.stdout.write(f"Mood entries total: {MoodEntry.objects.count()}")
        self.stdout.write(f"Journal entries total: {JournalEntry.objects.count()}")
        self.stdout.write(f"Challenges total: {Challenge.objects.count()}")
        self.stdout.write(f"Participants total: {ChallengeParticipant.objects.count()}")
        self.stdout.write(f"Challenge updates total: {ChallengeUpdate.objects.count()}")
        self.stdout.write(f"Badges total: {UserBadge.objects.count()}")
        self.stdout.write(f"Reminders total: {InAppReminder.objects.count()}")

    def _reset_application_data(self):
        UserTemplateVersion.objects.all().delete()
        InAppReminder.objects.all().delete()
        UserBadge.objects.all().delete()
        ChallengeUpdate.objects.all().delete()
        ChallengeParticipant.objects.all().delete()
        Challenge.objects.all().delete()
        CompletedExercise.objects.all().delete()
        ExerciseSession.objects.all().delete()
        MoodEntry.objects.all().delete()
        JournalEntry.objects.all().delete()

        Profile.objects.exclude(user__is_superuser=True).delete()
        User.objects.filter(username__startswith="demo_user_").delete()
        User.objects.filter(username="Prueba").delete()

    def _ensure_admin(self, password):
        admin_user, created = User.objects.get_or_create(
            username="admin_demo",
            defaults={"email": "admin_demo@example.com", "is_staff": True, "is_superuser": True},
        )
        if created:
            admin_user.set_password(password)
            admin_user.save(update_fields=["password"])
        else:
            changed = False
            if not admin_user.is_staff:
                admin_user.is_staff = True
                changed = True
            if not admin_user.is_superuser:
                admin_user.is_superuser = True
                changed = True
            if changed:
                admin_user.save(update_fields=["is_staff", "is_superuser"])

        Profile.objects.get_or_create(
            user=admin_user,
            defaults={
                "full_name": "Admin Demo",
                "weekly_goal": 5,
                "fitness_goal": "maintain",
                "weight": 78,
                "height": 178,
                "macro_calories_target": 2500,
                "macro_protein_target": 170,
                "macro_carbs_target": 260,
                "macro_fat_target": 80,
                "sport": True,
                "food": True,
                "mindset": True,
                "growth": True,
                "challenges": True,
            },
        )
        return admin_user

    def _ensure_prueba_user(self):
        user, created = User.objects.get_or_create(
            username="Prueba",
            defaults={"email": "prueba@example.com", "is_active": True},
        )
        if created or not user.check_password("Prueba1"):
            user.set_password("Prueba1")
            user.is_staff = False
            user.is_superuser = False
            user.save(update_fields=["password", "is_staff", "is_superuser"])
        return user

    def _ensure_dummy_users(self, users_to_create, password):
        users = []

        for index in range(1, users_to_create + 1):
            username = f"demo_user_{index:02d}"
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": f"{username}@example.com",
                    "is_active": True,
                    "is_staff": index % 11 == 0,
                },
            )
            if created:
                user.set_password(password)
                user.save(update_fields=["password"])

            if user.is_staff != (index % 11 == 0):
                user.is_staff = index % 11 == 0
                user.save(update_fields=["is_staff"])

            users.append(user)

        return users

    def _ensure_profiles(self, users):
        for idx, user in enumerate(users, start=1):
            if user.username == "Prueba":
                goal = "maintain"
                defaults = {
                    "full_name": "Prueba",
                    "weekly_goal": 6,
                    "fitness_goal": goal,
                    "weight": 81,
                    "height": 179,
                    "macro_calories_target": 2550,
                    "macro_protein_target": 185,
                    "macro_carbs_target": 285,
                    "macro_fat_target": 78,
                    "sport": True,
                    "food": True,
                    "mindset": True,
                    "growth": True,
                    "challenges": True,
                }
            else:
                goal = ["bulk", "cut", "maintain"][idx % 3]
                defaults = {
                    "full_name": f"Demo User {idx:02d}",
                    "weekly_goal": random.randint(2, 6),
                    "fitness_goal": goal,
                    "weight": random.randint(60, 95),
                    "height": random.randint(160, 190),
                    "macro_calories_target": random.randint(1900, 3000),
                    "macro_protein_target": random.randint(120, 210),
                    "macro_carbs_target": random.randint(180, 340),
                    "macro_fat_target": random.randint(55, 95),
                    "sport": random.random() > 0.15,
                    "food": random.random() > 0.2,
                    "mindset": random.random() > 0.25,
                    "growth": random.random() > 0.3,
                    "challenges": random.random() > 0.1,
                }
            profile, _ = Profile.objects.get_or_create(
                user=user,
                defaults=defaults,
            )

            profile.full_name = profile.full_name or defaults["full_name"]
            profile.fitness_goal = goal
            profile.save()

    def _generate_performance_records(self, users, days):
        today = timezone.now().date()

        for user in users:
            for offset in range(days):
                day = today - timedelta(days=offset)

                sleep_hours = round(6.0 + ((offset + len(user.username)) % 6) * 0.45, 1)
                stress_level = 2 + ((offset + len(user.username)) % 7)
                soreness_level = 2 + ((offset * 2 + len(user.username)) % 7)
                resting_hr = 56 + ((offset + len(user.username)) % 18)
                steps = 4200 + (offset * 317) % 8800

                RecoveryLog.objects.update_or_create(
                    user=user,
                    date=day,
                    defaults={
                        "sleep_hours": sleep_hours,
                        "stress_level": min(10, stress_level),
                        "soreness_level": min(10, soreness_level),
                        "resting_heart_rate": resting_hr,
                        "steps": steps,
                        "recovery_score": max(0, min(100, int((sleep_hours / 8.0) * 45))),
                    },
                )

                WearableSnapshot.objects.update_or_create(
                    user=user,
                    provider="samsung_health",
                    date=day,
                    defaults={
                        "source": "seeded-performance",
                        "steps": steps,
                        "active_minutes": 18 + ((offset * 3) % 62),
                        "calories_burned": 280 + ((offset * 41) % 680),
                        "avg_heart_rate": 58 + ((offset * 5) % 42),
                        "raw_payload": {
                            "date": day.isoformat(),
                            "steps": steps,
                            "active_minutes": 18 + ((offset * 3) % 62),
                            "calories_burned": 280 + ((offset * 41) % 680),
                            "avg_heart_rate": 58 + ((offset * 5) % 42),
                            "source": "seeded-performance",
                        },
                    },
                )

    def _generate_prueba_profile(self, user):
        Profile.objects.update_or_create(
            user=user,
            defaults={
                "full_name": "Prueba",
                "weekly_goal": 7,
                "fitness_goal": "maintain",
                "weight": 84,
                "height": 181,
                "macro_calories_target": 2650,
                "macro_protein_target": 190,
                "macro_carbs_target": 300,
                "macro_fat_target": 82,
                "sport": True,
                "food": True,
                "mindset": True,
                "growth": True,
                "challenges": True,
            },
        )

        build_weekly_plan(user)

    def _generate_prueba_activity(self, user, exercises, days):
        today = timezone.now().date()
        cycling_exercises = list(exercises)

        date_field = ExerciseSession._meta.get_field("date")
        original_auto_now_add = date_field.auto_now_add
        date_field.auto_now_add = False

        try:
            for offset in range(days):
                day = today - timedelta(days=offset)
                mood_value = 3 + (offset % 8)

                MoodEntry.objects.update_or_create(
                    user=user,
                    date=day,
                    defaults={"value": min(10, mood_value)},
                )

                JournalEntry.objects.get_or_create(
                    user=user,
                    content=f"Prueba day {offset + 1}: training, recovery and wearable data reviewed.",
                )

                RecoveryLog.objects.update_or_create(
                    user=user,
                    date=day,
                    defaults={
                        "sleep_hours": round(5.5 + (offset % 6) * 0.6, 1),
                        "stress_level": 3 + (offset % 6),
                        "soreness_level": 2 + ((offset + 2) % 6),
                        "resting_heart_rate": 57 + ((offset * 2) % 18),
                        "steps": 6000 + (offset * 290) % 9000,
                        "recovery_score": 42 + (offset % 28),
                    },
                )

                WearableSnapshot.objects.update_or_create(
                    user=user,
                    provider="samsung_health",
                    date=day,
                    defaults={
                        "source": "prueba-seed",
                        "steps": 7000 + (offset * 333) % 11000,
                        "active_minutes": 25 + (offset % 55),
                        "calories_burned": 340 + (offset * 37) % 760,
                        "avg_heart_rate": 60 + (offset % 46),
                        "raw_payload": {
                            "date": day.isoformat(),
                            "steps": 7000 + (offset * 333) % 11000,
                            "active_minutes": 25 + (offset % 55),
                            "calories_burned": 340 + (offset * 37) % 760,
                            "avg_heart_rate": 60 + (offset % 46),
                            "source": "prueba-seed",
                        },
                    },
                )

                if offset % 2 == 0:
                    location = "gym" if offset % 4 == 0 else "home"
                    session, _ = ExerciseSession.objects.get_or_create(
                        user=user,
                        date=day,
                        location=location,
                        defaults={"completed_exercises": 4 + (offset % 3)},
                    )
                    for index in range(4):
                        exercise = cycling_exercises[(offset * 4 + index) % len(cycling_exercises)]
                        CompletedExercise.objects.get_or_create(
                            session=session,
                            exercise=exercise,
                            defaults={
                                "sets_completed": max(1, exercise.default_sets),
                                "reps_per_set": max(4, exercise.default_reps),
                                "notes": "Prueba seeded activity.",
                            },
                        )
        finally:
            date_field.auto_now_add = original_auto_now_add

    def _generate_mood_and_journal(self, users, days):
        today = timezone.now().date()
        journal_templates = [
            "Focused day with good training intensity.",
            "Energy was lower than expected, but I stayed consistent.",
            "Solid nutrition and hydration, felt strong.",
            "Good recovery and sleep, performance improved.",
            "Stress was high, but the routine helped stabilize mood.",
        ]

        for user in users:
            for offset in range(days):
                day = today - timedelta(days=offset)

                if random.random() < 0.75:
                    MoodEntry.objects.update_or_create(
                        user=user,
                        date=day,
                        defaults={"value": random.randint(4, 10)},
                    )

                if random.random() < 0.42:
                    entry = JournalEntry.objects.create(
                        user=user,
                        content=random.choice(journal_templates),
                    )
                    JournalEntry.objects.filter(pk=entry.pk).update(
                        created_at=timezone.make_aware(
                            timezone.datetime.combine(day, timezone.datetime.min.time())
                        ) + timedelta(hours=random.randint(7, 22), minutes=random.randint(0, 59))
                    )

    def _generate_sessions(self, users, exercises, days):
        today = timezone.now().date()

        date_field = ExerciseSession._meta.get_field("date")
        original_auto_now_add = date_field.auto_now_add
        date_field.auto_now_add = False

        try:
            for user in users:
                for offset in range(days):
                    day = today - timedelta(days=offset)
                    if random.random() > 0.58:
                        continue

                    location = random.choice(["home", "gym"])
                    session, created = ExerciseSession.objects.get_or_create(
                        user=user,
                        date=day,
                        location=location,
                        defaults={"completed_exercises": random.randint(1, 5)},
                    )

                    if not created:
                        session.completed_exercises = max(session.completed_exercises, random.randint(1, 5))
                        session.save(update_fields=["completed_exercises"])

                    exercise_pool = [ex for ex in exercises if ex.location == location]
                    if not exercise_pool:
                        exercise_pool = exercises

                    sample_size = min(len(exercise_pool), random.randint(1, 4))
                    sampled = random.sample(exercise_pool, sample_size)
                    for exercise in sampled:
                        CompletedExercise.objects.get_or_create(
                            session=session,
                            exercise=exercise,
                            defaults={
                                "sets_completed": max(1, exercise.default_sets + random.randint(-1, 1)),
                                "reps_per_set": max(4, exercise.default_reps + random.randint(-2, 2)),
                                "notes": "Great execution.",
                            },
                        )
        finally:
            date_field.auto_now_add = original_auto_now_add

    def _generate_challenges(self, users, days):
        categories = ["sport", "nutrition", "mindset", "growth", "general"]
        titles = [
            "Morning routine consistency",
            "No-sugar challenge",
            "10k steps daily",
            "Read 15 pages every day",
            "Hydration streak",
            "Core strength booster",
            "Sleep quality sprint",
            "Weekly reflection challenge",
        ]

        challenge_count = min(10, max(6, len(users) // 2))
        challenges = []

        for idx in range(challenge_count):
            creator = random.choice(users)
            challenge = Challenge.objects.create(
                creator=creator,
                title=f"{titles[idx % len(titles)]} #{idx + 1}",
                description="Auto-generated challenge for demo data.",
                category=categories[idx % len(categories)],
                duration_days=random.choice([7, 14, 21, 30]),
                target_count=random.randint(1, 12),
            )
            Challenge.objects.filter(pk=challenge.pk).update(
                created_at=timezone.now() - timedelta(days=random.randint(0, days))
            )
            challenges.append(challenge)

        badge_catalog = {
            "first_join": ("First Challenge Joined", "Joined your first challenge"),
            "consistent_3": ("3 Challenges Joined", "Joined at least 3 challenges"),
            "finisher_1": ("First Challenge Completed", "Completed your first challenge"),
        }

        for challenge in challenges:
            participant_count = random.randint(min(4, len(users)), min(len(users), 12))
            participants = random.sample(users, participant_count)

            for user in participants:
                joined_at = timezone.now() - timedelta(days=random.randint(0, max(1, days - 1)))
                progress = random.randint(0, 100)
                completed = progress >= 100 or random.random() > 0.72
                completed_at = joined_at + timedelta(days=random.randint(1, 10)) if completed else None

                participant, _ = ChallengeParticipant.objects.get_or_create(
                    challenge=challenge,
                    user=user,
                    defaults={
                        "progress": 100 if completed else progress,
                        "completed": completed,
                        "completed_at": completed_at,
                        "notes": "Generated participation data.",
                    },
                )

                ChallengeParticipant.objects.filter(pk=participant.pk).update(joined_at=joined_at)

                if random.random() > 0.45:
                    ChallengeUpdate.objects.create(
                        challenge=challenge,
                        user=user,
                        content="Great momentum this week, keep going!",
                    )

                if random.random() > 0.5:
                    InAppReminder.objects.create(
                        user=user,
                        challenge=challenge,
                        type=random.choice(["progress", "update", "badge"]),
                        message=f"Reminder for challenge: {challenge.title}",
                        metadata={"auto": True},
                    )

            for user in participants[:3]:
                for code, (title, description) in badge_catalog.items():
                    UserBadge.objects.get_or_create(
                        user=user,
                        code=code,
                        defaults={"title": title, "description": description},
                    )

    def _generate_templates(self, users):
        for user in users[: max(5, len(users) // 3)]:
            for kind, key, title in [
                ("challenge", "morning_routine", "Morning Routine"),
                ("growth", "weekly_review", "Weekly Review"),
            ]:
                UserTemplateVersion.objects.get_or_create(
                    user=user,
                    kind=kind,
                    template_key=key,
                    version=1,
                    defaults={
                        "title": title,
                        "payload": {"generated": True, "focus": kind},
                        "is_active": True,
                    },
                )

    def _ensure_exercises(self):
        exercise_seeds = [
            ("Push-ups", "chest", "home", "both", 4, 12),
            ("Bodyweight Squats", "legs", "home", "both", 4, 15),
            ("Resistance Band Rows", "back", "home", "both", 3, 12),
            ("Chair Dips", "arms", "home", "bulk", 3, 10),
            ("Pike Push-ups", "shoulders", "home", "bulk", 3, 8),
            ("Plank", "accessories", "home", "cut", 3, 45),
            ("Inverted Rows", "back", "home", "both", 3, 10),
            ("Superman Holds", "back", "home", "both", 3, 15),
            ("Doorway Rows", "back", "home", "both", 3, 12),
            ("Reverse Snow Angels", "back", "home", "cut", 3, 15),
            ("Towel Lat Pulldown", "back", "home", "both", 4, 10),
            ("Band Pull-Aparts", "back", "home", "cut", 3, 20),
            ("Incline Push-ups", "chest", "home", "both", 3, 12),
            ("Decline Push-ups", "chest", "home", "bulk", 3, 10),
            ("Diamond Push-ups", "chest", "home", "bulk", 3, 8),
            ("Archer Push-ups", "chest", "home", "bulk", 3, 6),
            ("Band Chest Press", "chest", "home", "both", 3, 12),
            ("Tempo Push-ups", "chest", "home", "cut", 4, 10),
            ("Split Squats", "legs", "home", "both", 3, 12),
            ("Bulgarian Split Squats", "legs", "home", "bulk", 3, 10),
            ("Lunges", "legs", "home", "both", 3, 14),
            ("Jump Squats", "legs", "home", "cut", 4, 12),
            ("Wall Sit", "legs", "home", "cut", 3, 60),
            ("Single-Leg Romanian Deadlift", "legs", "home", "both", 3, 10),
            ("Band Bicep Curls", "arms", "home", "both", 3, 12),
            ("Diamond Press", "arms", "home", "bulk", 3, 10),
            ("Close-Grip Push-ups", "arms", "home", "both", 3, 10),
            ("Chair Skull Crushers", "arms", "home", "bulk", 3, 12),
            ("Band Tricep Pushdown", "arms", "home", "both", 3, 12),
            ("Hammer Curls (Band)", "arms", "home", "both", 3, 12),
            ("Wall Handstand Hold", "shoulders", "home", "bulk", 4, 30),
            ("Band Shoulder Press", "shoulders", "home", "both", 3, 10),
            ("Band Lateral Raise", "shoulders", "home", "both", 3, 12),
            ("Front Raise (Band)", "shoulders", "home", "both", 3, 12),
            ("Pike Hold", "shoulders", "home", "cut", 3, 30),
            ("Wall Slides", "shoulders", "home", "cut", 3, 15),
            ("Dead Bug", "accessories", "home", "both", 3, 12),
            ("Bird Dog", "accessories", "home", "both", 3, 12),
            ("Side Plank", "accessories", "home", "cut", 3, 35),
            ("Mountain Climbers", "accessories", "home", "cut", 4, 30),
            ("Hollow Body Hold", "accessories", "home", "both", 3, 30),
            ("Glute Bridge", "accessories", "home", "both", 3, 15),
            ("Bench Press", "chest", "gym", "bulk", 4, 8),
            ("Barbell Squat", "legs", "gym", "bulk", 4, 6),
            ("Lat Pulldown", "back", "gym", "both", 3, 10),
            ("Cable Curl", "arms", "gym", "both", 3, 12),
            ("Shoulder Press", "shoulders", "gym", "both", 3, 10),
            ("Cable Crunch", "accessories", "gym", "cut", 3, 15),
            ("Deadlift", "back", "gym", "bulk", 4, 5),
            ("Barbell Row", "back", "gym", "bulk", 4, 8),
            ("Cable Row", "back", "gym", "both", 3, 10),
            ("T-Bar Row", "back", "gym", "bulk", 4, 8),
            ("Face Pull", "back", "gym", "both", 3, 14),
            ("Machine Row", "back", "gym", "both", 3, 12),
            ("Dumbbell Bench Press", "chest", "gym", "bulk", 4, 8),
            ("Incline Bench Press", "chest", "gym", "bulk", 4, 8),
            ("Decline Bench Press", "chest", "gym", "bulk", 3, 8),
            ("Cable Fly", "chest", "gym", "both", 3, 12),
            ("Machine Chest Press", "chest", "gym", "both", 3, 10),
            ("Pec Deck", "chest", "gym", "cut", 3, 15),
            ("Romanian Deadlift", "legs", "gym", "bulk", 4, 8),
            ("Hack Squat", "legs", "gym", "bulk", 4, 10),
            ("Leg Press", "legs", "gym", "both", 4, 12),
            ("Leg Extension", "legs", "gym", "both", 3, 12),
            ("Lying Leg Curl", "legs", "gym", "both", 3, 12),
            ("Walking Lunges", "legs", "gym", "cut", 3, 16),
            ("Barbell Curl", "arms", "gym", "bulk", 3, 10),
            ("Dumbbell Curl", "arms", "gym", "both", 3, 12),
            ("Preacher Curl", "arms", "gym", "bulk", 3, 10),
            ("Tricep Rope Pushdown", "arms", "gym", "both", 3, 12),
            ("Skull Crushers", "arms", "gym", "bulk", 3, 10),
            ("Cable Overhead Tricep Extension", "arms", "gym", "both", 3, 12),
            ("Seated Dumbbell Press", "shoulders", "gym", "bulk", 4, 8),
            ("Arnold Press", "shoulders", "gym", "bulk", 3, 10),
            ("Lateral Raise", "shoulders", "gym", "both", 3, 14),
            ("Rear Delt Fly", "shoulders", "gym", "both", 3, 15),
            ("Upright Row", "shoulders", "gym", "bulk", 3, 10),
            ("Machine Shoulder Press", "shoulders", "gym", "both", 3, 12),
            ("Ab Wheel Rollout", "accessories", "gym", "both", 3, 12),
            ("Hanging Leg Raise", "accessories", "gym", "cut", 3, 12),
            ("Farmer Carry", "accessories", "gym", "both", 4, 40),
            ("Back Extension", "accessories", "gym", "both", 3, 15),
            ("Russian Twist", "accessories", "gym", "cut", 3, 20),
            ("Sled Push", "accessories", "gym", "cut", 6, 20),
        ]

        created = []
        for name, category, location, goal, default_sets, default_reps in exercise_seeds:
            exercise, _ = Exercise.objects.get_or_create(
                name=name,
                location=location,
                defaults={
                    "category": category,
                    "goal": goal,
                    "default_sets": default_sets,
                    "default_reps": default_reps,
                },
            )
            created.append(exercise)

        return created
