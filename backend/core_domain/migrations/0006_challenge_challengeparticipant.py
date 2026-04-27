# Generated manually

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_journalentry'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Challenge',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=120)),
                ('description', models.TextField(blank=True, null=True)),
                ('category', models.CharField(
                    choices=[
                        ('sport', 'Sport'),
                        ('nutrition', 'Nutrition'),
                        ('mindset', 'Mindset'),
                        ('growth', 'Growth'),
                        ('general', 'General'),
                    ],
                    default='general',
                    max_length=15,
                )),
                ('duration_days', models.IntegerField(default=7)),
                ('target_count', models.IntegerField(default=1, help_text='Target number of completions')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('creator', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='created_challenges',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='ChallengeParticipant',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('joined_at', models.DateTimeField(auto_now_add=True)),
                ('progress', models.IntegerField(default=0, help_text='Progress 0-100')),
                ('completed', models.BooleanField(default=False)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('notes', models.TextField(blank=True, null=True)),
                ('challenge', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='participants',
                    to='accounts.challenge',
                )),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='challenge_participations',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['-joined_at'],
                'unique_together': {('challenge', 'user')},
            },
        ),
    ]
