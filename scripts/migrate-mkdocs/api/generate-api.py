"""Genera Markdown de referencia de API con griffe2md para los `::: identificador` de mkdocstrings.

Uso (desde un venv con `griffe2md` instalado):

    python generate-api.py --search-path <repo>/src --docs <repo>/docs --out api.json

Escribe un JSON `{ "identificador": "markdown" }`. Las opciones imitan las de mkdocstrings del
proyecto original; griffe analiza el código de forma estática, sin importarlo.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import griffe
from griffe2md import render_object_docs

DIRECTIVE = re.compile(r"^:::\s+([A-Za-z_][\w.]*)\s*$", re.MULTILINE)

CONFIG = {
    "docstring_style": None,
    "show_root_heading": True,
    "show_root_full_path": False,
    "show_root_members_full_path": False,
    "show_object_full_path": False,
    "show_signature_annotations": True,
    "separate_signature": True,
    "show_if_no_docstring": False,
    "members_order": "source",
    "filters": ["!^_"],
    "heading_level": 3,
    "merge_init_into_class": True,
}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--search-path", required=True)
    parser.add_argument("--docs", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    identifiers = sorted(
        {m for f in Path(args.docs).rglob("*.md") for m in DIRECTIVE.findall(f.read_text("utf-8"))}
    )
    roots = sorted({i.split(".")[0] for i in identifiers})
    loader = griffe.GriffeLoader(search_paths=[args.search_path], docstring_parser=None)
    packages = {root: loader.load(root) for root in roots}
    loader.resolve_aliases()

    result: dict[str, str] = {}
    failed: list[str] = []
    for identifier in identifiers:
        root, _, rest = identifier.partition(".")
        try:
            obj = packages[root][rest] if rest else packages[root]
            result[identifier] = render_object_docs(obj, CONFIG).strip()
        except Exception as error:  # noqa: BLE001 - se informa y se sigue
            failed.append(f"{identifier}: {error!r}")

    Path(args.out).write_text(json.dumps(result, indent=1, ensure_ascii=False), "utf-8")
    print(f"{len(result)} rendered, {len(failed)} failed of {len(identifiers)}", file=sys.stderr)
    for line in failed:
        print("FAILED", line, file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
