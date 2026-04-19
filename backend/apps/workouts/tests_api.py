from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from core_domain.models import Exercise


class WorkoutsApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='workout_user', password='password123')
        token = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        self.exercise = Exercise.objects.create(
            name='Push Up',
            category='chest',
            location='home',
            goal='both',
            default_sets=3,
            default_reps=12,
        )

    def test_create_session_requires_location(self):
        response = self.client.post('/api/sessions/', {'exercises': []}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('errors', response.data)
        self.assertIn('location', response.data['errors'])

    def test_create_session_with_exercises(self):
        payload = {
            'location': 'home',
            'exercises': [
                {
                    'exercise_id': self.exercise.id,
                    'sets_completed': 3,
                    'reps_per_set': 10,
                }
            ],
        }
        response = self.client.post('/api/sessions/', payload, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data['ok'])
        self.assertEqual(response.data['data']['location'], 'home')
        self.assertGreaterEqual(len(response.data['data']['exercises']), 1)

    def test_completed_exercise_requires_ids(self):
        response = self.client.post('/api/completed/', {'sets_completed': 2}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('errors', response.data)
        self.assertIn('session_id', response.data['errors'])
        self.assertIn('exercise_id', response.data['errors'])

