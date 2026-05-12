from django.core.management.base import BaseCommand

from apps.performance.services import execute_pending_jobs


class Command(BaseCommand):
    help = 'Run pending async jobs from AsyncJob table.'

    def add_arguments(self, parser):
        parser.add_argument('--limit', type=int, default=20)

    def handle(self, *args, **options):
        processed = execute_pending_jobs(limit=max(1, int(options['limit'])))
        self.stdout.write(self.style.SUCCESS(f'Processed jobs: {len(processed)}'))
        for item in processed:
            self.stdout.write(str(item))
