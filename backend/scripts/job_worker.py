import argparse
import subprocess
import sys
import time
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description='Run ZERO async jobs on a loop.')
    parser.add_argument('--interval', type=int, default=300, help='Seconds between runs (default: 300)')
    parser.add_argument('--limit', type=int, default=20, help='Max jobs per run (default: 20)')
    args = parser.parse_args()

    backend_dir = Path(__file__).resolve().parents[1]
    manage_py = backend_dir / 'manage.py'

    while True:
        cmd = [sys.executable, str(manage_py), 'run_async_jobs', '--limit', str(max(1, args.limit))]
        subprocess.run(cmd, cwd=str(backend_dir), check=False)
        time.sleep(max(10, args.interval))


if __name__ == '__main__':
    raise SystemExit(main())
