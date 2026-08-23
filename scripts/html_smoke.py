"""
Structural smoke check for the packaged site/index.html.

Used by .github/workflows/pages.yml to catch regressions in the
Positron installer shell after the brand-logo class was removed.

Exits 0 when every sentinel class is present exactly once and the
document is non-trivial. Exits 1 with a clear diagnostic otherwise.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


SENTINELS: dict[str, int] = {
    "brand-mark": 1,
    "status-bar": 1,
    "main-grid": 1,
    "rail": 1,
    "kpi-grid": 2,
    "flash-hero": 1,
    "step-panel": 5,
}


def main() -> int:
    parser = argparse.ArgumentParser(description="Structural smoke check for dist/index.html")
    parser.add_argument("--path", default="dist/index.html", help="HTML file to inspect")
    args = parser.parse_args()

    target = Path(args.path)
    if not target.exists():
        print(f"FAIL: {target} not found")
        return 1

    html = target.read_text(encoding="utf-8")

    if len(html) < 4000:
        print(f"FAIL: index.html too small ({len(html)} bytes) — likely truncated")
        return 1

    failures: list[str] = []
    for cls, expected in SENTINELS.items():
        token_open = f'class="{cls} '
        token_exact = f'class="{cls}"'
        seen = html.count(token_open) + html.count(token_exact)
        if seen != expected:
            failures.append(f"{cls}: expected {expected}, found {seen}")

    if failures:
        print("Structural smoke check failed:")
        for f in failures:
            print(f"  - {f}")
        return 1

    print(f"OK: {target} passes structural check ({len(html)} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
