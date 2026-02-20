from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta

from .models import Profile, Exercise, ExerciseSession, CompletedExercise
from .serializers import (
    ProfileSerializer,
    ExerciseSerializer,
    ExerciseSessionSerializer,
    ExerciseSessionDetailSerializer,
    CompletedExerciseSerializer,
)


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        email = request.data.get('email', '').strip()
        password = request.data.get('password', '').strip()

        if not username or not password:
            return Response({'detail': 'El usuario y la contraseña son requeridos.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({'detail': 'El usuario ya existe.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, email=email, password=password)
        Profile.objects.create(user=user, full_name=username)

        return Response({'id': user.id, 'username': user.username}, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '').strip()

        user = authenticate(username=username, password=password)
        if not user:
            return Response({'detail': 'Usuario o contraseña inválidos.'}, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)
        return Response(
            {'access': str(refresh.access_token), 'refresh': str(refresh)},
            status=status.HTTP_200_OK
        )


class ProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user, defaults={'full_name': request.user.username})
        return Response(ProfileSerializer(profile).data, status=status.HTTP_200_OK)

    def post(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user, defaults={'full_name': request.user.username})
        s = ProfileSerializer(profile, data=request.data, partial=True)
        if not s.is_valid():
            return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)
        s.save()
        return Response(s.data, status=status.HTTP_200_OK)

    def put(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user, defaults={'full_name': request.user.username})
        s = ProfileSerializer(profile, data=request.data, partial=True)
        if not s.is_valid():
            return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)
        s.save()
        return Response(s.data, status=status.HTTP_200_OK)


class ExerciseView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        location = request.query_params.get('location', None)
        category = request.query_params.get('category', None)

        exercises = Exercise.objects.all()

        if location:
            exercises = exercises.filter(location=location)
        if category:
            exercises = exercises.filter(category=category)

        serializer = ExerciseSerializer(exercises, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ExerciseSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = timezone.now().date()
        location = request.query_params.get('location', None)

        sessions = ExerciseSession.objects.filter(user=request.user)

        if location:
            sessions = sessions.filter(location=location)

        sessions = sessions[:7]

        serializer = ExerciseSessionSerializer(sessions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        location = request.data.get('location')
        exercises = request.data.get('exercises', [])

        if not location:
            return Response({'detail': 'La ubicación (location) es requerida.'}, status=status.HTTP_400_BAD_REQUEST)

        today = timezone.now().date()
        session, created = ExerciseSession.objects.get_or_create(
            user=request.user,
            date=today,
            location=location,
        )

        for exercise_data in exercises:
            exercise_id = exercise_data.get('exercise_id')
            sets_completed = exercise_data.get('sets_completed', 0)
            reps_per_set = exercise_data.get('reps_per_set', 0)
            notes = exercise_data.get('notes', '')

            try:
                exercise = Exercise.objects.get(id=exercise_id)
                CompletedExercise.objects.update_or_create(
                    session=session,
                    exercise=exercise,
                    defaults={
                        'sets_completed': sets_completed,
                        'reps_per_set': reps_per_set,
                        'notes': notes,
                    }
                )
            except Exercise.DoesNotExist:
                pass

        session.completed_exercises = session.exercises.count()
        session.save()

        serializer = ExerciseSessionDetailSerializer(session)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ExerciseSessionDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, session_id):
        try:
            session = ExerciseSession.objects.get(id=session_id, user=request.user)
            serializer = ExerciseSessionDetailSerializer(session)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except ExerciseSession.DoesNotExist:
            return Response({'detail': 'La sesión no fue encontrada.'}, status=status.HTTP_404_NOT_FOUND)


class CompletedExerciseView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        session_id = request.data.get('session_id')
        exercise_id = request.data.get('exercise_id')
        sets_completed = request.data.get('sets_completed', 0)
        reps_per_set = request.data.get('reps_per_set', 0)

        try:
            session = ExerciseSession.objects.get(id=session_id, user=request.user)
            exercise = Exercise.objects.get(id=exercise_id)

            completed, created = CompletedExercise.objects.update_or_create(
                session=session,
                exercise=exercise,
                defaults={
                    'sets_completed': sets_completed,
                    'reps_per_set': reps_per_set,
                }
            )

            session.completed_exercises = session.exercises.count()
            session.save()

            serializer = CompletedExerciseSerializer(completed)
            return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

        except (ExerciseSession.DoesNotExist, Exercise.DoesNotExist):
            return Response({'detail': 'La sesión o el ejercicio no fueron encontrados.'}, status=status.HTTP_404_NOT_FOUND)


class MainMenuExerciseView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, location):
        categories = [
            {'key': 'back', 'label': 'Back'},
            {'key': 'chest', 'label': 'Chest'},
            {'key': 'legs', 'label': 'Legs'},
            {'key': 'arms', 'label': 'Arms'},
            {'key': 'shoulders', 'label': 'Shoulders'},
            {'key': 'accessories', 'label': 'Accessories'},
        ]

        goal = request.query_params.get('goal', None)

        result = {}
        for cat_info in categories:
            exercises_query = Exercise.objects.filter(
                location=location,
                category=cat_info['key']
            )
            
            if goal:
                exercises_query = exercises_query.filter(goal__in=[goal, 'both'])
            
            result[cat_info['key']] = {
                'label': cat_info['label'],
                'exercises': ExerciseSerializer(exercises_query, many=True).data
            }

        return Response(result, status=status.HTTP_200_OK)


class ProgressStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        location = request.query_params.get('location', None)
        days_back = 7
        
        dates = []
        counts = []
        
        for i in range(days_back):
            date = timezone.now().date() - timedelta(days=(days_back - 1 - i))
            dates.append(date.strftime('%a'))
            
            sessions = ExerciseSession.objects.filter(
                user=request.user,
                date=date
            )
            
            if location:
                sessions = sessions.filter(location=location)
            
            count = sum(s.completed_exercises for s in sessions)
            counts.append(count)
        
        return Response({
            'labels': dates,
            'values': counts
        }, status=status.HTTP_200_OK)
