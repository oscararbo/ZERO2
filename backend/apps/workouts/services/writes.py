from django.db import IntegrityError
from django.utils import timezone

from core_domain.models import CompletedExercise, Exercise, ExerciseSession
from common.services.results import failure, success


def get_or_create_session(user, location):
    today = timezone.now().date()
    try:
        session, _ = ExerciseSession.objects.get_or_create(
            user=user,
            date=today,
            location=location,
        )
    except IntegrityError:
        # Race condition: another request created the session between our
        # SELECT and INSERT. Fall back to a plain GET.
        session = ExerciseSession.objects.get(
            user=user,
            date=today,
            location=location,
        )
    return session


def upsert_session_exercises(session, exercises_payload):
    for exercise_data in exercises_payload:
        exercise_id = exercise_data.get('exercise_id')
        sets_completed = exercise_data.get('sets_completed', 0)
        reps_per_set = exercise_data.get('reps_per_set', 0)
        notes = exercise_data.get('notes', '')

        try:
            exercise = Exercise.objects.get(id=exercise_id)
        except Exercise.DoesNotExist:
            continue

        CompletedExercise.objects.update_or_create(
            session=session,
            exercise=exercise,
            defaults={
                'sets_completed': sets_completed,
                'reps_per_set': reps_per_set,
                'notes': notes,
            },
        )

    session.completed_exercises = session.exercises.count()
    session.save()
    return success(session, code=201)


def upsert_completed_exercise_for_session(session, exercise_id, sets_completed, reps_per_set):
    try:
        exercise = Exercise.objects.get(id=exercise_id)
    except Exercise.DoesNotExist:
        return failure('La sesión o el ejercicio no fueron encontrados.', code=404)

    completed, created = CompletedExercise.objects.update_or_create(
        session=session,
        exercise=exercise,
        defaults={
            'sets_completed': sets_completed,
            'reps_per_set': reps_per_set,
        },
    )

    session.completed_exercises = session.exercises.count()
    session.save()
    return success({'completed': completed, 'created': created}, code=201 if created else 200)
