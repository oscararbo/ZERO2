from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0007_challengeupdate_inappreminder_userbadge'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='macro_calories_target',
            field=models.FloatField(default=0, help_text='Daily calorie target'),
        ),
        migrations.AddField(
            model_name='profile',
            name='macro_carbs_target',
            field=models.FloatField(default=0, help_text='Daily carbs target in grams'),
        ),
        migrations.AddField(
            model_name='profile',
            name='macro_fat_target',
            field=models.FloatField(default=0, help_text='Daily fat target in grams'),
        ),
        migrations.AddField(
            model_name='profile',
            name='macro_protein_target',
            field=models.FloatField(default=0, help_text='Daily protein target in grams'),
        ),
        migrations.CreateModel(
            name='MoodEntry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('value', models.IntegerField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=models.CASCADE, related_name='mood_entries', to='auth.user')),
            ],
            options={
                'ordering': ['-date', '-updated_at'],
                'unique_together': {('user', 'date')},
            },
        ),
        migrations.CreateModel(
            name='UserTemplateVersion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('kind', models.CharField(choices=[('challenge', 'Challenge'), ('growth', 'Growth')], max_length=20)),
                ('template_key', models.CharField(max_length=80)),
                ('title', models.CharField(max_length=120)),
                ('payload', models.JSONField(default=dict)),
                ('version', models.IntegerField(default=1)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=models.CASCADE, related_name='template_versions', to='auth.user')),
            ],
            options={
                'ordering': ['kind', 'template_key', '-version'],
                'unique_together': {('user', 'kind', 'template_key', 'version')},
            },
        ),
    ]
