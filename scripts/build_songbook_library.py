from __future__ import annotations

import json
import re
import unicodedata
from datetime import datetime, timezone
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import fitz
from pypdf import PdfReader


PASSWORD = "eduardogcarvalho@outlook.com"
DOWNLOADS_DIR = Path(r"C:\Users\elida\Downloads")
OUTPUT_PATH = Path("public/songbook/catalog.json")

PDF_VARIANTS = {
    "simplificada": next(DOWNLOADS_DIR.glob("*Simplificado*.pdf")),
    "completa": next(DOWNLOADS_DIR.glob("*Completo*.pdf")),
}

HEADER_RE = re.compile(r"^\s*CLAUDIO CAPACLE\s+\d+\s*$", flags=re.IGNORECASE)
CONTACT_PATTERNS = (
    "Claudio Capacle",
    "www.claudiocapacle.com",
    "@claudiocapacle",
    "Licensed to ",
)
CHORD_RE = re.compile(
    r"\b([A-G](?:#|b)?(?:maj7|m7\(b5\)|m7|m6|m9|m|sus2|sus4|sus|dim|aug|add9|7M|6/9|7/9|7|6|9)?(?:/[A-G](?:#|b)?)?)\b"
)


@dataclass
class TocSong:
    title: str
    artist: str
    page_start: int
    page_end: int
    block: str


def slugify(value: str) -> str:
    normalized = (
        unicodedata.normalize("NFKD", value)
        .encode("ascii", "ignore")
        .decode("ascii")
        .lower()
    )
    return re.sub(r"[^a-z0-9]+", "-", normalized).strip("-") or "item"


def repair_text(value: str) -> str:
    fixed = value or ""
    for _ in range(2):
        if any(token in fixed for token in ("Ã", "Â", "â", "ð")):
            try:
                fixed = fixed.encode("cp1252").decode("utf-8")
                continue
            except (UnicodeEncodeError, UnicodeDecodeError):
                break
        break
    return fixed


def normalize_spaces(value: str) -> str:
    return re.sub(r"[ \t]+", " ", value).strip()


def normalize_dash(value: str) -> str:
    return value.replace("–", "-").replace("—", "-")


def normalize_artist_key(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", repair_text(value))
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"[^a-z0-9]+", "", ascii_text)


def preferred_label(labels: list[str], fallback: str) -> str:
    non_empty = [label for label in labels if label]
    if not non_empty:
        return fallback
    ranked = sorted(
        non_empty,
        key=lambda label: (
            " " not in label,
            label.lower() == label,
            len(label),
        ),
        reverse=True,
    )
    return ranked[0]


def split_title_artist(raw: str) -> tuple[str, str]:
    normalized = normalize_spaces(repair_text(normalize_dash(raw)))
    normalized = re.sub(r"\s*-\s*(SIMPLIFICADA|COMPLETA)\s*$", "", normalized, flags=re.IGNORECASE)
    match = re.match(r"^(.*?)\s*-\s*(.+)$", normalized)
    if match:
        title = normalize_spaces(match.group(1))
        artist = normalize_spaces(match.group(2))
        if artist.lower() in {"simplificada", "completa"}:
            artist = ""
        return title, artist
    return normalized, ""


def extract_toc(path: Path) -> list[TocSong]:
    doc = fitz.open(str(path))
    if doc.needs_pass:
        doc.authenticate(PASSWORD)

    toc = doc.get_toc(simple=True)
    songs: list[TocSong] = []
    current_block = "Sem bloco"

    for index, (_, title, page) in enumerate(toc):
        if title.lower().startswith("bloco "):
            current_block = normalize_spaces(title)
            continue

        next_page = doc.page_count + 1
        for _, next_title, next_toc_page in toc[index + 1 :]:
            if next_toc_page > page:
                next_page = next_toc_page
                break

        song_title, artist = split_title_artist(title)
        songs.append(
            TocSong(
                title=song_title,
                artist=artist,
                page_start=page,
                page_end=next_page - 1,
                block=current_block,
            )
        )
    return songs


def read_pages(path: Path, page_start: int, page_end: int) -> str:
    reader = PdfReader(str(path))
    if reader.is_encrypted:
        reader.decrypt(PASSWORD)

    parts: list[str] = []
    for page_number in range(page_start - 1, page_end):
        text = reader.pages[page_number].extract_text() or ""
        parts.append(text)
    return "\n".join(parts)


def clean_text(raw_text: str, title: str, artist: str, mode_label: str) -> str:
    lines = [normalize_spaces(line) for line in normalize_dash(raw_text).splitlines()]
    cleaned: list[str] = []
    header_labels = {normalize_spaces(title), normalize_spaces(f"{title} - {artist}"), f"({mode_label})"}

    for line in lines:
        if not line:
            cleaned.append("")
            continue
        if HEADER_RE.match(line):
            continue
        if any(token in line for token in CONTACT_PATTERNS):
            continue
        if line in header_labels:
            continue
        if re.fullmatch(r"\d+", line):
            continue
        cleaned.append(line)

    text = "\n".join(cleaned)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text


def infer_key(text: str) -> str | None:
    match = CHORD_RE.search(text)
    if not match:
        return None
    token = match.group(1)
    root_match = re.match(r"^([A-G](?:#|b)?)(m(?!aj)|maj7|7M)?", token)
    if not root_match:
        return None
    root = root_match.group(1)
    quality = root_match.group(2)
    if quality and quality.startswith("m"):
        return f"{root}m"
    return root


def build_catalog() -> dict[str, Any]:
    variants: dict[str, dict[str, Any]] = {}

    for variant, path in PDF_VARIANTS.items():
        toc_songs = extract_toc(path)
        variant_entries: list[dict[str, Any]] = []
        for song in toc_songs:
            raw_text = read_pages(path, song.page_start, song.page_end)
            mode_label = "SIMPLIFICADA" if variant == "simplificada" else "COMPLETA"
            text = clean_text(raw_text, song.title, song.artist, mode_label)
            variant_entries.append(
                {
                    "title": song.title,
                    "artist": song.artist,
                    "block": song.block,
                    "pageStart": song.page_start,
                    "pageEnd": song.page_end,
                    "text": text,
                    "key": infer_key(text),
                    "sourcePdf": path.name,
                }
            )
        variants[variant] = {"path": path.name, "songs": variant_entries}

    grouped: dict[str, dict[str, Any]] = {}
    all_artists: set[str] = set()
    all_keys: set[str] = set()

    for variant, payload in variants.items():
        for song in payload["songs"]:
            group_key = f"{slugify(song['artist'] or 'sem-artista')}::{slugify(song['title'])}"
            entry = grouped.setdefault(
                group_key,
                {
                    "id": group_key,
                    "title": song["title"],
                    "artist": song["artist"],
                    "block": song["block"],
                    "key": song["key"],
                    "versions": {},
                    "searchText": "",
                },
            )
            entry["versions"][variant] = {
                "text": song["text"],
                "pageStart": song["pageStart"],
                "pageEnd": song["pageEnd"],
                "sourcePdf": song["sourcePdf"],
            }
            if not entry.get("key") and song["key"]:
                entry["key"] = song["key"]
            if not entry.get("artist") and song["artist"]:
                entry["artist"] = song["artist"]
            if not entry.get("block") and song["block"]:
                entry["block"] = song["block"]

    artist_variants: dict[str, list[str]] = {}
    for entry in grouped.values():
        artist_key = normalize_artist_key(entry["artist"] or "sem-artista")
        artist_variants.setdefault(artist_key, []).append(entry["artist"])

    artist_display: dict[str, str] = {
        key: preferred_label(labels, "Sem artista")
        for key, labels in artist_variants.items()
    }

    entries = list(grouped.values())
    for entry in entries:
        artist_key = normalize_artist_key(entry["artist"] or "sem-artista")
        entry["artist"] = artist_display[artist_key]

    entries.sort(key=lambda item: (item["artist"], item["title"]))
    for entry in entries:
        artist = entry["artist"] or "Sem artista"
        key = entry["key"] or "Sem tom"
        all_artists.add(artist)
        all_keys.add(key)
        entry["availableVersions"] = sorted(entry["versions"].keys())
        entry["searchText"] = " ".join(
            [
                entry["title"],
                artist,
                key,
                entry["block"] or "",
            ]
        ).lower()

    catalog = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "songCount": len(entries),
        "artists": sorted(all_artists),
        "keys": sorted(all_keys, key=lambda item: (item == "Sem tom", item)),
        "entries": entries,
    }
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")
    return catalog


def main() -> None:
    catalog = build_catalog()
    print(
        json.dumps(
            {
                "catalog": str(OUTPUT_PATH.resolve()),
                "songs": catalog["songCount"],
                "artists": len(catalog["artists"]),
                "keys": len(catalog["keys"]),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
