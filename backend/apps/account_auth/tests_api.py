from django.contrib.auth.models import User
from rest_framework.test import APITestCase


class AccountAuthApiTests(APITestCase):
    def test_register_and_login(self):
        register_response = self.client.post(
            '/api/register/',
            {'username': 'auth_user', 'email': 'auth@example.com', 'password': 'password123'},
            format='json',
        )
        self.assertEqual(register_response.status_code, 201)
        self.assertTrue(register_response.data['ok'])
        self.assertEqual(register_response.data['data']['username'], 'auth_user')

        login_response = self.client.post(
            '/api/login/',
            {'username': 'auth_user', 'password': 'password123'},
            format='json',
        )
        self.assertEqual(login_response.status_code, 200)
        self.assertTrue(login_response.data['ok'])
        self.assertIn('access', login_response.data['data'])

    def test_register_rejects_short_password(self):
        response = self.client.post(
            '/api/register/',
            {'username': 'shortpwd', 'email': 'short@example.com', 'password': '123'},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data['ok'])
        self.assertEqual(response.data['message'], 'La contraseña debe tener al menos 8 caracteres.')

    def test_login_fails_with_invalid_credentials(self):
        User.objects.create_user(username='existing_user', password='valid_password123')

        response = self.client.post(
            '/api/login/',
            {'username': 'existing_user', 'password': 'wrong_password'},
            format='json',
        )

        self.assertEqual(response.status_code, 401)

