#!/usr/bin/env python3
"""
Validate the local prose patch fixture used by /testnews/prose.

This is intentionally offline-only: it reads a checked-in JSON file and does not
call Blizzard, OpenAI, Supabase, or HearthstoneJSON.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


DEFAULT_FIXTURE_PATH = (
    Path(__file__).resolve().parents[1] / "app/testnews/_data/prosePatchFixture.json"
)

VALID_SOURCE_TYPES = {"blog", "forum"}
VALID_CHANGE_TYPES = {"added", "removed", "modified", "returned", "bug_fix", "other"}


def is_non_empty_string(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def validate_fixture(fixture: Any) -> list[str]:
    errors: list[str] = []

    if not isinstance(fixture, dict):
        return ["Fixture root must be an object."]

    for key in ["sourceUrl", "title", "summary", "generatedAt"]:
        if not is_non_empty_string(fixture.get(key)):
            errors.append(f"{key} must be a non-empty string.")

    payload = fixture.get("payload")
    if not isinstance(payload, dict):
        return errors + ["payload must be an object."]

    if payload.get("version") != 1:
        errors.append("payload.version must be 1.")

    if payload.get("sourceType") not in VALID_SOURCE_TYPES:
        errors.append("payload.sourceType must be blog or forum.")

    if payload.get("sourceUrl") != fixture.get("sourceUrl"):
        errors.append("payload.sourceUrl must match sourceUrl.")

    sections = payload.get("sections")
    if not isinstance(sections, list):
        return errors + ["payload.sections must be an array."]

    seen_section_ids: set[str] = set()
    seen_item_ids: set[str] = set()

    for section_index, section in enumerate(sections):
        section_path = f"payload.sections[{section_index}]"
        if not isinstance(section, dict):
            errors.append(f"{section_path} must be an object.")
            continue

        section_id = section.get("id")
        if not is_non_empty_string(section_id):
            errors.append(f"{section_path}.id must be a non-empty string.")
        elif section_id in seen_section_ids:
            errors.append(f"{section_path}.id is duplicated: {section_id}")
        else:
            seen_section_ids.add(section_id)

        if not is_non_empty_string(section.get("title")):
            errors.append(f"{section_path}.title must be a non-empty string.")

        items = section.get("items")
        if not isinstance(items, list):
            errors.append(f"{section_path}.items must be an array.")
            continue

        for item_index, item in enumerate(items):
            item_path = f"{section_path}.items[{item_index}]"
            if not isinstance(item, dict):
                errors.append(f"{item_path} must be an object.")
                continue

            item_id = item.get("id")
            if not is_non_empty_string(item_id):
                errors.append(f"{item_path}.id must be a non-empty string.")
            elif item_id in seen_item_ids:
                errors.append(f"{item_path}.id is duplicated: {item_id}")
            else:
                seen_item_ids.add(item_id)

            if not is_non_empty_string(item.get("entityName")):
                errors.append(f"{item_path}.entityName must be a non-empty string.")

            if item.get("changeType") not in VALID_CHANGE_TYPES:
                errors.append(f"{item_path}.changeType is invalid.")

            image_urls = item.get("imageUrls")
            if not isinstance(image_urls, list) or not all(
                is_non_empty_string(url) for url in image_urls
            ):
                errors.append(f"{item_path}.imageUrls must be an array of strings.")

            changes = item.get("changes")
            if not isinstance(changes, list) or not changes:
                errors.append(f"{item_path}.changes must be a non-empty array.")
                continue

            for change_index, change in enumerate(changes):
                change_path = f"{item_path}.changes[{change_index}]"
                if not isinstance(change, dict):
                    errors.append(f"{change_path} must be an object.")
                    continue
                if not is_non_empty_string(change.get("diff")):
                    errors.append(f"{change_path}.diff must be a non-empty string.")

    return errors


def summarize_fixture(fixture: dict[str, Any], errors: list[str]) -> None:
    payload = fixture.get("payload") if isinstance(fixture, dict) else {}
    sections = payload.get("sections") if isinstance(payload, dict) else []
    item_count = 0
    missing_images = 0

    if isinstance(sections, list):
        for section in sections:
            if not isinstance(section, dict):
                continue
            items = section.get("items")
            if not isinstance(items, list):
                continue
            item_count += len(items)
            missing_images += sum(
                1
                for item in items
                if isinstance(item, dict) and not item.get("imageUrls")
            )

    print(f"title: {fixture.get('title', '') if isinstance(fixture, dict) else ''}")
    print(f"source_url: {fixture.get('sourceUrl', '') if isinstance(fixture, dict) else ''}")
    print(f"section_count: {len(sections) if isinstance(sections, list) else 0}")
    print(f"item_count: {item_count}")
    print(f"items_missing_images: {missing_images}")
    print(f"validation_errors: {len(errors)}")

    for error in errors:
        print(f"- {error}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--fixture-path",
        type=Path,
        default=DEFAULT_FIXTURE_PATH,
        help="Path to the prose patch fixture JSON file.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    fixture = json.loads(args.fixture_path.read_text(encoding="utf-8"))
    errors = validate_fixture(fixture)
    summarize_fixture(fixture, errors)
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
