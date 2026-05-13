"""
WSGI config for config project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/wsgi/
"""

import os
from pathlib import Path

from django.core.management import call_command
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')


def _run_startup_migrations():
	if os.environ.get('ZERO_AUTO_MIGRATE_ON_STARTUP', 'true').lower() != 'true':
		return

	lock_file = None
	lock_path = Path(__file__).resolve().parent.parent / '.startup-migrate.lock'

	try:
		try:
			import fcntl
		except ImportError:
			fcntl = None

		lock_file = open(lock_path, 'w')
		if fcntl is not None:
			try:
				fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
			except OSError:
				return

		call_command('migrate', interactive=False, verbosity=0)
	except Exception:
		# Keep the service booting; a later request will still surface any issue.
		pass
	finally:
		if lock_file is not None:
			try:
				if 'fcntl' in locals() and fcntl is not None:
					fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)
			except Exception:
				pass
			lock_file.close()


_run_startup_migrations()

application = get_wsgi_application()
