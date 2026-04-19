from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken


class MindsetApiTests(APITestCase):
    def setUp(self):
        user = User.objects.create_user(username='mindset_user', password='password123')
        token = str(RefreshToken.for_user(user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_mood_rejects_out_of_range_value(self):
        response = self.client.post('/api/mood/', {'value': 6}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('errors', response.data)
        self.assertIn('value', response.data['errors'])

    def test_mood_list_rejects_invalid_days(self):
        response = self.client.get('/api/mood/?days=200')
        self.assertEqual(response.status_code, 400)
        self.assertIn('errors', response.data)
        self.assertIn('days', response.data['errors'])

    def test_templates_create_and_list(self):
        create_response = self.client.post(
            '/api/templates/',
            {
                'kind': 'growth',
                'template_key': 'daily-reflection',
                'title': 'Daily Reflection',
                'payload': {'prompt': 'Write 1 reflection line'},
            },
            format='json',
        )
        self.assertEqual(create_response.status_code, 201)
        self.assertTrue(create_response.data['ok'])

        list_response = self.client.get('/api/templates/?kind=growth')
        self.assertEqual(list_response.status_code, 200)
        self.assertTrue(list_response.data['ok'])
        self.assertEqual(len(list_response.data['data']), 1)

