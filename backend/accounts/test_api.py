from django.contrib.auth.models import User
from django.test import override_settings
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Exercise


@override_settings(SECURE_SSL_REDIRECT=False)
class AccountsAPITest(APITestCase):
    def create_token(self, user):
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)

    def test_register_and_login(self):
        url = '/api/accounts/register/'
        data = {'username': 'testuser', 'password': 'pass1234', 'email': 'a@b.c'}
        r = self.client.post(url, data, format='json', follow=True)
        self.assertEqual(r.status_code, 201)

        # Login
        login_url = '/api/accounts/login/'
        r2 = self.client.post(
            login_url, {'username': 'testuser', 'password': 'pass1234'}, format='json', follow=True
        )
        self.assertEqual(r2.status_code, 200)
        self.assertIn('access', r2.data)

    def test_profile_get_and_update(self):
        user = User.objects.create_user('puser', password='pwd')
        token = self.create_token(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        # GET profile (should create default)
        r = self.client.get('/api/accounts/profile/', follow=True)
        self.assertEqual(r.status_code, 200)
        self.assertIn('weekly_goal', r.data)

        # Update profile
        r2 = self.client.post('/api/accounts/profile/', {'weekly_goal': 5}, format='json', follow=True)
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r2.data.get('weekly_goal'), 5)

    def test_exercises_list_and_session_create(self):
        # create exercise
        ex = Exercise.objects.create(
            name='Push Up',
            category='chest',
            location='home',
            goal='both',
            default_sets=3,
            default_reps=12,
        )

        # list exercises
        r = self.client.get('/api/accounts/exercises/', follow=True)
        self.assertEqual(r.status_code, 200)
        self.assertTrue(any(item['name'] == 'Push Up' for item in r.data))

        # create session (requires auth)
        user = User.objects.create_user('suser', password='pwd')
        token = self.create_token(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        payload = {'location': 'home', 'exercises': [{'exercise_id': ex.id, 'sets_completed': 3, 'reps_per_set': 10}]}
        r2 = self.client.post('/api/accounts/sessions/', payload, format='json', follow=True)
        self.assertEqual(r2.status_code, 201)
        self.assertIn('exercises', r2.data)
