from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from datetime import timedelta
from core_domain.models import ExerciseSession


class Command(BaseCommand):
    help = 'Archive exercise sessions older than N days (default: 30). Archived sessions are hidden from main list.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Archive sessions older than this many days (default: 30)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be archived without making changes',
        )
        parser.add_argument(
            '--user',
            type=str,
            help='Archive only sessions for a specific user (username)',
        )

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        username = options.get('user')

        cutoff_date = timezone.now() - timedelta(days=days)

        # Build query
        query = ExerciseSession.objects.filter(
            date__lte=cutoff_date.date(),
            archived_at__isnull=True
        )

        if username:
            query = query.filter(user__username=username)

        count = query.count()

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'[DRY RUN] Would archive {count} session(s) older than {days} days'
                )
            )
        else:
            query.update(archived_at=timezone.now())
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully archived {count} session(s) older than {days} days'
                )
            )
