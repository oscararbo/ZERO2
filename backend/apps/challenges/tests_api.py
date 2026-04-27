from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from core_domain.models import Challenge, ChallengeParticipant


class ChallengesApiTests(APITestCase):
    def setUp(self):
        self.creator = User.objects.create_user(username='challenge_creator', password='password123')
        self.member = User.objects.create_user(username='challenge_member', password='password123')

        self.challenge = Challenge.objects.create(
            creator=self.creator,
            title='Challenge Test',
            description='Test description',
            category='sport',
            duration_days=7,
            target_count=3,
        )
        ChallengeParticipant.objects.create(challenge=self.challenge, user=self.member)

        token = str(RefreshToken.for_user(self.member).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_progress_requires_payload_fields(self):
        response = self.client.put(
            f'/api/challenges/{self.challenge.id}/progress/',
            {},
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('errors', response.data)

    def test_progress_accepts_valid_progress(self):
        response = self.client.put(
            f'/api/challenges/{self.challenge.id}/progress/',
            {'progress': 80},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['ok'])
        self.assertEqual(response.data['data']['progress'], 80)

    def test_leaderboard_returns_paginated_payload(self):
        response = self.client.get(f'/api/challenges/{self.challenge.id}/leaderboard/?page=1&page_size=5')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['ok'])
        self.assertIn('items', response.data['data'])
        self.assertIn('has_next', response.data['data'])

