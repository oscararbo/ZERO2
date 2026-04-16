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

    def test_profile_put_update(self):
        user = User.objects.create_user('profileput', password='pwd')
        token = self.create_token(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        payload = {
            'full_name': 'Profile Put User',
            'weekly_goal': 4,
            'fitness_goal': 'maintain',
            'weight': 74,
            'height': 178,
            'sport': True,
            'food': True,
            'mindset': False,
            'growth': True,
            'challenges': True,
        }
        r = self.client.put('/api/accounts/profile/', payload, format='json', follow=True)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data.get('full_name'), 'Profile Put User')
        self.assertEqual(r.data.get('weekly_goal'), 4)
        self.assertTrue(r.data.get('challenges'))

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

    def test_challenges_lifecycle(self):
        owner = User.objects.create_user('challenge_owner', password='pwd')
        participant = User.objects.create_user('challenge_user', password='pwd')

        owner_token = self.create_token(owner)
        participant_token = self.create_token(participant)

        # Owner creates challenge
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {owner_token}')
        challenge_payload = {
            'title': '7 days run streak',
            'description': 'Run every day for a week',
            'category': 'sport',
            'duration_days': 7,
            'target_count': 7,
        }
        create_r = self.client.post('/api/accounts/challenges/', challenge_payload, format='json', follow=True)
        self.assertEqual(create_r.status_code, 201)
        challenge_id = create_r.data['id']

        # Owner cannot join own challenge
        owner_join = self.client.post(f'/api/accounts/challenges/{challenge_id}/join/', {}, format='json', follow=True)
        self.assertEqual(owner_join.status_code, 400)

        # Participant joins challenge
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {participant_token}')
        join_r = self.client.post(f'/api/accounts/challenges/{challenge_id}/join/', {}, format='json', follow=True)
        self.assertIn(join_r.status_code, [200, 201])
        self.assertEqual(join_r.data.get('progress'), 0)

        # Participant updates progress to completion
        progress_r = self.client.put(
            f'/api/accounts/challenges/{challenge_id}/progress/',
            {'progress': 100, 'notes': 'Done all 7 days'},
            format='json',
            follow=True,
        )
        self.assertEqual(progress_r.status_code, 200)
        self.assertEqual(progress_r.data.get('progress'), 100)
        self.assertTrue(progress_r.data.get('completed'))

        # Participant sees joined challenge in list
        list_r = self.client.get('/api/accounts/challenges/', follow=True)
        self.assertEqual(list_r.status_code, 200)
        self.assertTrue(any(item['id'] == challenge_id for item in list_r.data))

        # Participant leaves challenge
        leave_r = self.client.delete(f'/api/accounts/challenges/{challenge_id}/join/', follow=True)
        self.assertEqual(leave_r.status_code, 204)

        # Participant cannot delete challenge they do not own
        not_owner_delete = self.client.delete(f'/api/accounts/challenges/{challenge_id}/', follow=True)
        self.assertEqual(not_owner_delete.status_code, 403)

        # Owner deletes challenge
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {owner_token}')
        owner_delete = self.client.delete(f'/api/accounts/challenges/{challenge_id}/', follow=True)
        self.assertEqual(owner_delete.status_code, 204)

    def test_challenge_extras_endpoints(self):
        owner = User.objects.create_user('owner_extra', password='pwd')
        participant = User.objects.create_user('participant_extra', password='pwd')

        owner_token = self.create_token(owner)
        participant_token = self.create_token(participant)

        # Create challenge as owner
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {owner_token}')
        create_r = self.client.post('/api/accounts/challenges/', {
            'title': 'Leaderboard test challenge',
            'description': 'Test challenge extras',
            'category': 'mindset',
            'duration_days': 10,
            'target_count': 3,
        }, format='json', follow=True)
        self.assertEqual(create_r.status_code, 201)
        challenge_id = create_r.data['id']

        # Participant joins and updates progress
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {participant_token}')
        join_r = self.client.post(f'/api/accounts/challenges/{challenge_id}/join/', {}, format='json', follow=True)
        self.assertIn(join_r.status_code, [200, 201])

        progress_r = self.client.put(
            f'/api/accounts/challenges/{challenge_id}/progress/',
            {'progress': 60, 'notes': 'On track'},
            format='json',
            follow=True,
        )
        self.assertEqual(progress_r.status_code, 200)

        # Leaderboard endpoint
        leaderboard_r = self.client.get(f'/api/accounts/challenges/{challenge_id}/leaderboard/', follow=True)
        self.assertEqual(leaderboard_r.status_code, 200)
        self.assertIn('items', leaderboard_r.data)
        self.assertIn('has_next', leaderboard_r.data)
        self.assertTrue(any(item['username'] == 'participant_extra' for item in leaderboard_r.data['items']))

        # Post update endpoint
        update_r = self.client.post(
            f'/api/accounts/challenges/{challenge_id}/updates/',
            {'content': 'First community update'},
            format='json',
            follow=True,
        )
        self.assertEqual(update_r.status_code, 201)

        updates_list_r = self.client.get(f'/api/accounts/challenges/{challenge_id}/updates/', follow=True)
        self.assertEqual(updates_list_r.status_code, 200)
        self.assertIn('items', updates_list_r.data)
        self.assertIn('has_next', updates_list_r.data)
        self.assertGreaterEqual(len(updates_list_r.data['items']), 1)

        # Analytics endpoint
        analytics_r = self.client.get('/api/accounts/challenges/analytics/', follow=True)
        self.assertEqual(analytics_r.status_code, 200)
        self.assertIn('total_joined', analytics_r.data)

        # Badges endpoint
        badges_r = self.client.get('/api/accounts/badges/', follow=True)
        self.assertEqual(badges_r.status_code, 200)
        self.assertGreaterEqual(len(badges_r.data), 1)

        # Reminders endpoint (may include progress and update reminders)
        reminders_r = self.client.get('/api/accounts/reminders/', follow=True)
        self.assertEqual(reminders_r.status_code, 200)
        self.assertIn('items', reminders_r.data)
        self.assertIn('unread_count', reminders_r.data)
        self.assertIn('has_next', reminders_r.data)
