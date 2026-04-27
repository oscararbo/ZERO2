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
        url = '/api/register/'
        data = {'username': 'testuser', 'password': 'pass1234', 'email': 'a@b.c'}
        r = self.client.post(url, data, format='json', follow=True)
        self.assertEqual(r.status_code, 201)
        self.assertTrue(r.data['ok'])

        # Login
        login_url = '/api/login/'
        r2 = self.client.post(
            login_url, {'username': 'testuser', 'password': 'pass1234'}, format='json', follow=True
        )
        self.assertEqual(r2.status_code, 200)
        self.assertTrue(r2.data['ok'])
        self.assertIn('access', r2.data['data'])

    def test_public_health_and_meta_endpoints(self):
        health_r = self.client.get('/api/health/', follow=True)
        self.assertEqual(health_r.status_code, 200)
        self.assertTrue(health_r.data['ok'])
        self.assertEqual(health_r.data['data'].get('status'), 'ok')
        self.assertIn('version', health_r.data['data'])

        meta_r = self.client.get('/api/meta/', follow=True)
        self.assertEqual(meta_r.status_code, 200)
        self.assertTrue(meta_r.data['ok'])
        self.assertIn('api', meta_r.data['data'])
        self.assertIn('choices', meta_r.data['data'])
        self.assertIn('exercise_categories', meta_r.data['data']['choices'])

        self.assertIsInstance(meta_r.data['data']['choices']['exercise_categories'], list)
        self.assertGreaterEqual(len(meta_r.data['data']['choices']['exercise_categories']), 1)
        first_category = meta_r.data['data']['choices']['exercise_categories'][0]
        self.assertIn('value', first_category)
        self.assertIn('label', first_category)

        self.assertIn('limits', meta_r.data['data'])
        limits = meta_r.data['data']['limits']
        self.assertEqual(limits.get('mood_days_min'), 1)
        self.assertEqual(limits.get('mood_days_max'), 90)
        self.assertEqual(limits.get('weekly_goal_min'), 1)
        self.assertEqual(limits.get('weekly_goal_max'), 14)

    def test_profile_get_and_update(self):
        user = User.objects.create_user('puser', password='pwd')
        token = self.create_token(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        # GET profile (should create default)
        r = self.client.get('/api/profile/', follow=True)
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['ok'])
        self.assertIn('weekly_goal', r.data['data'])

        # Update profile
        r2 = self.client.post('/api/profile/', {'weekly_goal': 5}, format='json', follow=True)
        self.assertEqual(r2.status_code, 200)
        self.assertTrue(r2.data['ok'])
        self.assertEqual(r2.data['data'].get('weekly_goal'), 5)

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
            'macro_calories_target': 2400,
            'macro_protein_target': 180,
            'macro_carbs_target': 260,
            'macro_fat_target': 70,
            'sport': True,
            'food': True,
            'mindset': False,
            'growth': True,
            'challenges': True,
        }
        r = self.client.put('/api/profile/', payload, format='json', follow=True)
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['ok'])
        self.assertEqual(r.data['data'].get('full_name'), 'Profile Put User')
        self.assertEqual(r.data['data'].get('weekly_goal'), 4)
        self.assertTrue(r.data['data'].get('challenges'))
        self.assertEqual(r.data['data'].get('macro_calories_target'), 2400)
        self.assertEqual(r.data['data'].get('macro_protein_target'), 180)

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

        user = User.objects.create_user('suser', password='pwd')
        token = self.create_token(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        # list exercises
        r = self.client.get('/api/exercises/', follow=True)
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['ok'])
        self.assertTrue(any(item['name'] == 'Push Up' for item in r.data['data']))

        # create session (requires auth)
        payload = {'location': 'home', 'exercises': [{'exercise_id': ex.id, 'sets_completed': 3, 'reps_per_set': 10}]}
        r2 = self.client.post('/api/sessions/', payload, format='json', follow=True)
        self.assertEqual(r2.status_code, 201)
        self.assertTrue(r2.data['ok'])
        self.assertIn('exercises', r2.data['data'])

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
        create_r = self.client.post('/api/challenges/', challenge_payload, format='json', follow=True)
        self.assertEqual(create_r.status_code, 201)
        self.assertTrue(create_r.data['ok'])
        challenge_id = create_r.data['data']['id']

        # Owner cannot join own challenge
        owner_join = self.client.post(f'/api/challenges/{challenge_id}/join/', {}, format='json', follow=True)
        self.assertEqual(owner_join.status_code, 400)

        # Participant joins challenge
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {participant_token}')
        join_r = self.client.post(f'/api/challenges/{challenge_id}/join/', {}, format='json', follow=True)
        self.assertIn(join_r.status_code, [200, 201])
        self.assertTrue(join_r.data['ok'])
        self.assertEqual(join_r.data['data'].get('progress'), 0)

        # Participant updates progress to completion
        progress_r = self.client.put(
            f'/api/challenges/{challenge_id}/progress/',
            {'progress': 100, 'notes': 'Done all 7 days'},
            format='json',
            follow=True,
        )
        self.assertEqual(progress_r.status_code, 200)
        self.assertTrue(progress_r.data['ok'])
        self.assertEqual(progress_r.data['data'].get('progress'), 100)
        self.assertTrue(progress_r.data['data'].get('completed'))

        # Participant sees joined challenge in list
        list_r = self.client.get('/api/challenges/', follow=True)
        self.assertEqual(list_r.status_code, 200)
        self.assertTrue(list_r.data['ok'])
        self.assertTrue(any(item['id'] == challenge_id for item in list_r.data['data']))

        # Participant leaves challenge
        leave_r = self.client.delete(f'/api/challenges/{challenge_id}/join/', follow=True)
        self.assertEqual(leave_r.status_code, 200)
        self.assertTrue(leave_r.data['ok'])

        # Participant cannot delete challenge they do not own
        not_owner_delete = self.client.delete(f'/api/challenges/{challenge_id}/', follow=True)
        self.assertEqual(not_owner_delete.status_code, 403)

        # Owner deletes challenge
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {owner_token}')
        owner_delete = self.client.delete(f'/api/challenges/{challenge_id}/', follow=True)
        self.assertEqual(owner_delete.status_code, 200)
        self.assertTrue(owner_delete.data['ok'])

    def test_challenge_extras_endpoints(self):
        owner = User.objects.create_user('owner_extra', password='pwd')
        participant = User.objects.create_user('participant_extra', password='pwd')

        owner_token = self.create_token(owner)
        participant_token = self.create_token(participant)

        # Create challenge as owner
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {owner_token}')
        create_r = self.client.post('/api/challenges/', {
            'title': 'Leaderboard test challenge',
            'description': 'Test challenge extras',
            'category': 'mindset',
            'duration_days': 10,
            'target_count': 3,
        }, format='json', follow=True)
        self.assertEqual(create_r.status_code, 201)
        self.assertTrue(create_r.data['ok'])
        challenge_id = create_r.data['data']['id']

        # Participant joins and updates progress
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {participant_token}')
        join_r = self.client.post(f'/api/challenges/{challenge_id}/join/', {}, format='json', follow=True)
        self.assertIn(join_r.status_code, [200, 201])

        progress_r = self.client.put(
            f'/api/challenges/{challenge_id}/progress/',
            {'progress': 60, 'notes': 'On track'},
            format='json',
            follow=True,
        )
        self.assertEqual(progress_r.status_code, 200)

        # Leaderboard endpoint
        leaderboard_r = self.client.get(f'/api/challenges/{challenge_id}/leaderboard/', follow=True)
        self.assertEqual(leaderboard_r.status_code, 200)
        self.assertTrue(leaderboard_r.data['ok'])
        self.assertIn('items', leaderboard_r.data['data'])
        self.assertIn('has_next', leaderboard_r.data['data'])
        self.assertTrue(any(item['username'] == 'participant_extra' for item in leaderboard_r.data['data']['items']))

        # Post update endpoint
        update_r = self.client.post(
            f'/api/challenges/{challenge_id}/updates/',
            {'content': 'First community update'},
            format='json',
            follow=True,
        )
        self.assertEqual(update_r.status_code, 201)
        self.assertTrue(update_r.data['ok'])

        updates_list_r = self.client.get(f'/api/challenges/{challenge_id}/updates/', follow=True)
        self.assertEqual(updates_list_r.status_code, 200)
        self.assertTrue(updates_list_r.data['ok'])
        self.assertIn('items', updates_list_r.data['data'])
        self.assertIn('has_next', updates_list_r.data['data'])
        self.assertGreaterEqual(len(updates_list_r.data['data']['items']), 1)

        # Analytics endpoint
        analytics_r = self.client.get('/api/challenges/analytics/', follow=True)
        self.assertEqual(analytics_r.status_code, 200)
        self.assertTrue(analytics_r.data['ok'])
        self.assertIn('total_joined', analytics_r.data['data'])

        # Badges endpoint
        badges_r = self.client.get('/api/badges/', follow=True)
        self.assertEqual(badges_r.status_code, 200)
        self.assertTrue(badges_r.data['ok'])
        self.assertGreaterEqual(len(badges_r.data['data']), 1)

        # Reminders endpoint (may include progress and update reminders)
        reminders_r = self.client.get('/api/reminders/', follow=True)
        self.assertEqual(reminders_r.status_code, 200)
        self.assertTrue(reminders_r.data['ok'])
        self.assertIn('items', reminders_r.data['data'])
        self.assertIn('unread_count', reminders_r.data['data'])
        self.assertIn('has_next', reminders_r.data['data'])

    def test_mood_and_templates_endpoints(self):
        user = User.objects.create_user('mood_tpl_user', password='pwd')
        token = self.create_token(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        mood_r = self.client.post('/api/mood/', {'value': 4}, format='json', follow=True)
        self.assertEqual(mood_r.status_code, 200)
        self.assertTrue(mood_r.data['ok'])
        self.assertEqual(mood_r.data['data'].get('value'), 4)

        mood_list = self.client.get('/api/mood/?days=14', follow=True)
        self.assertEqual(mood_list.status_code, 200)
        self.assertTrue(mood_list.data['ok'])
        self.assertGreaterEqual(len(mood_list.data['data']), 1)

        template_1 = self.client.post('/api/templates/', {
            'kind': 'growth',
            'template_key': 'daily-reflection',
            'title': 'Daily Reflection',
            'payload': {'title': 'Write one reflection line'},
        }, format='json', follow=True)
        self.assertEqual(template_1.status_code, 201)
        self.assertTrue(template_1.data['ok'])
        self.assertEqual(template_1.data['data'].get('version'), 1)

        template_2 = self.client.post('/api/templates/', {
            'kind': 'growth',
            'template_key': 'daily-reflection',
            'title': 'Daily Reflection',
            'payload': {'title': 'Write two reflection lines'},
        }, format='json', follow=True)
        self.assertEqual(template_2.status_code, 201)
        self.assertTrue(template_2.data['ok'])
        self.assertEqual(template_2.data['data'].get('version'), 2)

        list_templates = self.client.get('/api/templates/?kind=growth', follow=True)
        self.assertEqual(list_templates.status_code, 200)
        self.assertTrue(list_templates.data['ok'])
        self.assertEqual(len(list_templates.data['data']), 1)
        self.assertEqual(list_templates.data['data'][0].get('version'), 2)

        template_history = self.client.get('/api/templates/growth/daily-reflection/', follow=True)
        self.assertEqual(template_history.status_code, 200)
        self.assertTrue(template_history.data['ok'])
        self.assertGreaterEqual(len(template_history.data['data']), 2)

