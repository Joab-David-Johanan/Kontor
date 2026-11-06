"""Write the OpenAPI schema to a file, without starting a server or a database.

    uv run python -m core.export_openapi openapi.json

The frontend generates its TypeScript types from this file (npm run gen:api),
and CI fails if the committed file is out of date.
"""

import json
import sys
from pathlib import Path

from main import app


def main() -> None:
    target = Path(sys.argv[1] if len(sys.argv) > 1 else "openapi.json")
    content = json.dumps(app.openapi(), indent=2, ensure_ascii=False) + "\n"
    # LF line endings on every OS, because CI compares this file byte for byte.
    target.write_text(content, encoding="utf-8", newline="\n")
    print(f"Wrote {target}")


if __name__ == "__main__":
    main()
