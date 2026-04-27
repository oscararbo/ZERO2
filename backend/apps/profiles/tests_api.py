from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from core_domain.models import Profile


class ProfilesApiTests(APITestCase):
    def authenticate(self, username='profile_user'):
        user = User.objects.create_user(username=username, password='password123')
        token = str(RefreshToken.for_user(user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        return user

    def test_profile_get_creates_default_profile(self):
        self.authenticate()

        response = self.client.get('/api/profile/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['ok'])
        self.assertIn('weekly_goal', response.data['data'])

    def test_profile_put_updates_metrics(self):
        self.authenticate(username='profile_put')

        payload = {
            'weekly_goal': 6,
            'fitness_goal': 'bulk',
            'macro_calories_target': 2800,
            'macro_protein_target': 190,
        }
        response = self.client.put('/api/profile/', payload, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['ok'])
        self.assertEqual(response.data['data']['weekly_goal'], 6)
        self.assertEqual(response.data['data']['fitness_goal'], 'bulk')

    def test_meta_endpoint_is_public(self):
        response = self.client.get('/api/meta/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['ok'])
        self.assertIn('choices', response.data['data'])
        self.assertIn('exercise_categories', response.data['data']['choices'])

    def test_profile_insights_returns_cards(self):
        user = self.authenticate(username='profile_insights')
        Profile.objects.update_or_create(
            user=user,
            defaults={
                'full_name': 'Insights User',
                'weekly_goal': 4,
                'fitness_goal': 'maintain',
                'sport': True,
                'mindset': True,
            },
        )

        response = self.client.get('/api/profile/insights/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['ok'])
        self.assertIn('cards', response.data['data'])
        self.assertGreaterEqual(len(response.data['data']['cards']), 1)

        keys = {item['key'] for item in response.data['data']['cards']}
        self.assertIn('sport', keys)
        self.assertIn('mindset', keys)

