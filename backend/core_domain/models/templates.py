from django.contrib.auth.models import User
from django.db import models


class UserTemplateVersion(models.Model):
    KIND_CHOICES = (
        ('challenge', 'Challenge'),
        ('growth', 'Growth'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='template_versions')
    kind = models.CharField(max_length=20, choices=KIND_CHOICES)
    template_key = models.CharField(max_length=80)
    title = models.CharField(max_length=120)
    payload = models.JSONField(default=dict)
    version = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['kind', 'template_key', '-version']
        unique_together = ('user', 'kind', 'template_key', 'version')

    def __str__(self):
        return f'{self.user.username} {self.kind}:{self.template_key} v{self.version}'
