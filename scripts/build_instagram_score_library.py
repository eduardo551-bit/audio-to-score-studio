from __future__ import annotations

import json
import re
import shutil
import unicodedata
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from PIL import Image
from pillow_heif import register_heif_opener


register_heif_opener()


SOURCE_MANIFEST = Path("downloads/instagram/partituraspagodeesamba/manifest.json")
SOURCE_DIR = SOURCE_MANIFEST.parent
OUTPUT_DIR = Path("public/score-library")
OUTPUT_CATALOG = OUTPUT_DIR / "catalog.json"
IGNORED_TAGS = {
    "partituraspagodeesamba",
    "partiturapagodeesamba",
    "arranjo",
}


def repair_text(value: str) -> str:
    if not value:
        return ""
    fixed = value
    for _ in range(2):
        if any(token in fixed for token in ("Ã", "Â", "â", "ð")):
            try:
                fixed = fixed.encode("cp1252").decode("utf-8")
                continue
            except (UnicodeEncodeError, UnicodeDecodeError):
                break
        break
    return fixed.replace("\r", "").strip()


def slugify(value: str) -> str:
    normalized = (
        unicodedata.normalize("NFKD", value)
        .encode("ascii", "ignore")
        .decode("ascii")
        .lower()
    )
    slug = re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")
    return slug or "sem-nome"


def title_case_tag(text: str) -> str:
    return " ".join(part.capitalize() for part in text.split())


def humanize_tag(tag: str) -> str:
    cleaned = tag.strip().lower().replace(".", " ").replace("_", " ")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    replacements = [
        ("ogrupo ", "O Grupo "),
        ("grupo ", "Grupo "),
        ("turma ", "Turma "),
        ("os ", "Os "),
        ("as ", "As "),
        ("o ", "O "),
        ("a ", "A "),
    ]
    for source, target in replacements:
        if cleaned.startswith(source):
            return target + title_case_tag(cleaned[len(source) :])
    return title_case_tag(cleaned)


def extract_hashtags(text: str) -> list[str]:
    tags = re.findall(r"#([a-z0-9_\.]+)", text.lower())
    return [tag for tag in tags if tag not in IGNORED_TAGS]


def extract_arrangement(text: str) -> str | None:
    for pattern in [
        r"(?:produção e )?arranjo\s*:\s*([@\w\.]+)",
        r"arranjo\s*-\s*([@\w\.]+)",
    ]:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return None


def extract_title(text: str) -> str:
    match = re.search(r"m[úu]sica\s*-\s*[\"“”']\s*(.+?)\s*[\"“”']", text, flags=re.IGNORECASE)
    if match:
        return re.sub(r"\s+", " ", match.group(1)).strip(" -")

    match = re.search(r"m[úu]sica\s*-\s*(.+)", text, flags=re.IGNORECASE)
    if match:
        raw = match.group(1).split("\n", 1)[0]
        raw = re.sub(r"#\w[\w\.]*", "", raw)
        return re.sub(r"\s+", " ", raw).strip(" -\"'")

    return "Sem título"


def parse_caption(caption: str) -> dict[str, Any]:
    repaired = repair_text(caption)
    title = extract_title(repaired)
    hashtags = extract_hashtags(repaired)

    primary_artist_tag = hashtags[0] if hashtags else "desconhecido"
    collaborators = hashtags[1:] if len(hashtags) > 1 else []
    arrangement = extract_arrangement(repaired)

    return {
        "caption": repaired,
        "title": title,
        "primary_artist_tag": primary_artist_tag,
        "primary_artist_label": humanize_tag(primary_artist_tag),
        "collaborator_tags": collaborators,
        "collaborator_labels": [humanize_tag(tag) for tag in collaborators],
        "arrangement": arrangement,
    }


def load_manifest() -> dict[str, Any]:
    return json.loads(SOURCE_MANIFEST.read_text(encoding="utf-8"))


def convert_or_copy(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    if source.suffix.lower() == ".heic":
        with Image.open(source) as image:
            converted = image.convert("RGB")
            converted.save(destination, format="JPEG", quality=92, optimize=True)
    else:
        shutil.copy2(source, destination)


def build_catalog() -> dict[str, Any]:
    manifest = load_manifest()
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in manifest["items"]:
        grouped[item["code"]].append(item)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    entries: list[dict[str, Any]] = []

    for post_number, code in enumerate(sorted(grouped, key=lambda key: grouped[key][0]["post_index"]), start=1):
        pages = sorted(grouped[code], key=lambda item: item["image_index"])
        first = pages[0]
        parsed = parse_caption(first.get("caption", ""))
        title_slug = slugify(parsed["title"])
        artist_slug = slugify(parsed["primary_artist_tag"])
        entry_folder = OUTPUT_DIR / artist_slug / f"{title_slug}-{code.lower()}"

        saved_pages: list[str] = []
        for page in pages:
            source = SOURCE_DIR / page["filename"]
            extension = ".jpg" if source.suffix.lower() == ".heic" else source.suffix.lower()
            destination = entry_folder / f"pagina-{page['image_index']:02d}{extension}"
            convert_or_copy(source, destination)
            public_relative = destination.relative_to("public")
            saved_pages.append("/" + public_relative.as_posix())

        taken_at = int(first.get("taken_at", 0) or 0)
        entries.append(
            {
                "id": code,
                "order": post_number,
                "title": parsed["title"],
                "titleSlug": title_slug,
                "artistTag": parsed["primary_artist_tag"],
                "artistLabel": parsed["primary_artist_label"],
                "collaboratorTags": parsed["collaborator_tags"],
                "collaboratorLabels": parsed["collaborator_labels"],
                "arrangement": parsed["arrangement"],
                "caption": parsed["caption"],
                "postUrl": first["post_url"],
                "pageCount": len(saved_pages),
                "pages": saved_pages,
                "takenAt": taken_at,
                "takenAtIso": datetime.fromtimestamp(taken_at, tz=timezone.utc).isoformat() if taken_at else None,
                "searchText": " ".join(
                    [
                        parsed["title"],
                        parsed["primary_artist_tag"],
                        parsed["primary_artist_label"],
                        *parsed["collaborator_tags"],
                        *parsed["collaborator_labels"],
                    ]
                ).lower(),
            }
        )

    artists: list[dict[str, Any]] = []
    artist_groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for entry in entries:
        artist_groups[entry["artistTag"]].append(entry)

    for tag, artist_entries in sorted(artist_groups.items(), key=lambda item: humanize_tag(item[0])):
        artists.append(
            {
                "tag": tag,
                "label": humanize_tag(tag),
                "count": len(artist_entries),
            }
        )

    catalog = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "profile": "partituraspagodeesamba",
        "entryCount": len(entries),
        "pageCount": sum(entry["pageCount"] for entry in entries),
        "artists": artists,
        "entries": entries,
    }
    OUTPUT_CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")
    return catalog


def main() -> None:
    catalog = build_catalog()
    print(
        json.dumps(
            {
                "catalog": str(OUTPUT_CATALOG.resolve()),
                "entries": catalog["entryCount"],
                "pages": catalog["pageCount"],
                "artists": len(catalog["artists"]),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
