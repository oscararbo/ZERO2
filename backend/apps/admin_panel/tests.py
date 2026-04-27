from datetime import timedelta

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from core_domain.models import Challenge, ChallengeParticipant, Exercise, ExerciseSession, JournalEntry, Profile


class AdminPanelApiTests(APITestCase):
    def authenticate(self, username='admin', is_staff=False):
        user = User.objects.create_user(username=username, password='password123', is_staff=is_staff)
        token = str(RefreshToken.for_user(user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        return user

    def test_admin_access_requires_staff_user(self):
        self.authenticate(username='regular_user', is_staff=False)
        response = self.client.get('/api/admin/access/')
        self.assertEqual(response.status_code, 403)

    def test_admin_access_ok_for_staff(self):
        self.authenticate(username='admin_user', is_staff=True)
        response = self.client.get('/api/admin/access/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['ok'])
        self.assertTrue(response.data['data']['is_admin'])

    def test_admin_stats_returns_expected_sections(self):
        admin = self.authenticate(username='admin_stats', is_staff=True)

        normal = User.objects.create_user(username='normal_stats', password='password123')
        Profile.objects.update_or_create(user=normal, defaults={'full_name': 'Normal User', 'sport': True})

        exercise = Exercise.objects.create(
            name='Push Up',
            description='Bodyweight',
            category='chest',
            location='home',
            goal='both',
            default_sets=3,
            default_reps=12,
        )
        session = ExerciseSession.objects.create(user=admin, location='gym', completed_exercises=1)
        session.exercises.create(exercise=exercise, sets_completed=3, reps_per_set=10)

        response = self.client.get('/api/admin/stats/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['ok'])
        self.assertIn('summary', response.data['data'])
        self.assertIn('distributions', response.data['data'])
        self.assertIn('trends', response.data['data'])
        self.assertIn('top_users', response.data['data'])
        self.assertIn('alerts', response.data['data'])
        self.assertIn('meta', response.data['data'])
        self.assertGreaterEqual(response.data['data']['summary']['users_total'], 2)
        self.assertGreaterEqual(response.data['data']['summary']['exercise_sessions_total'], 1)

    def test_admin_stats_accepts_days_filter(self):
        self.authenticate(username='admin_days', is_staff=True)
        response = self.client.get('/api/admin/stats/?days=7')

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['ok'])
        self.assertEqual(response.data['data']['meta']['range']['days'], 7)

    def test_admin_stats_ranking_and_csv_export(self):
        admin = self.authenticate(username='admin_rank', is_staff=True)
        user2 = User.objects.create_user(username='rank_user_2', password='password123')
        Profile.objects.create(user=user2, full_name='Rank User 2', sport=True)

        exercise = Exercise.objects.create(
            name='Squat',
            description='Leg movement',
            category='legs',
            location='gym',
            goal='both',
            default_sets=4,
            default_reps=8,
        )

        session_admin = ExerciseSession.objects.create(user=admin, location='gym', completed_exercises=3)
        session_admin.exercises.create(exercise=exercise, sets_completed=4, reps_per_set=8)

        session_user2 = ExerciseSession.objects.create(user=user2, location='gym', completed_exercises=1)
        session_user2.exercises.create(exercise=exercise, sets_completed=3, reps_per_set=10)

        JournalEntry.objects.create(user=admin, content='Admin journal')
        challenge = Challenge.objects.create(creator=admin, title='7 Day Challenge', category='sport')
        ChallengeParticipant.objects.create(
            challenge=challenge,
            user=admin,
            progress=100,
            completed=True,
            completed_at=timezone.now() - timedelta(days=1),
        )

        stats_response = self.client.get('/api/admin/stats/?days=30&top=5')
        self.assertEqual(stats_response.status_code, 200)
        self.assertTrue(stats_response.data['ok'])
        self.assertGreaterEqual(len(stats_response.data['data']['top_users']), 1)

        csv_response = self.client.get('/api/admin/stats/export/?days=30&top=5')
        self.assertEqual(csv_response.status_code, 200)
        self.assertIn('text/csv', csv_response['Content-Type'])
        self.assertIn('zero_admin_stats.csv', csv_response['Content-Disposition'])
