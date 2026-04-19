from django.apps import AppConfig


class CoreDomainConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core_domain'
    # Keep legacy label so existing migrations/table names remain valid.
    label = 'accounts'
    verbose_name = 'Core Domain'
