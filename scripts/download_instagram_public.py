from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import requests


BASE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/135.0.0.0 Safari/537.36"
    ),
    "X-IG-App-ID": "936619743392459",
    "Accept": "*/*",
}


def build_session() -> requests.Session:
    session = requests.Session()
    session.trust_env = False
    session.headers.update(BASE_HEADERS)
    return session


def request_json(
    session: requests.Session, url: str, *, params: dict[str, Any] | None = None
) -> dict[str, Any]:
    last_error: Exception | None = None
    for attempt in range(5):
        try:
            response = session.get(url, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
            if data.get("status") == "fail":
                raise RuntimeError(data.get("message", "Instagram request failed"))
            return data
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            time.sleep(3 * (attempt + 1))
    raise RuntimeError(f"Request failed for {url}: {last_error}") from last_error


def choose_image_candidate(media: dict[str, Any]) -> tuple[str, str]:
    candidates = media.get("image_versions2", {}).get("candidates", [])
    if not candidates:
        url = media.get("display_uri")
        if not url:
            raise ValueError("No image URL found")
    else:
        url = max(candidates, key=lambda item: item.get("width", 0)).get("url", "")
        if not url:
            raise ValueError("Invalid image candidate")

    path = urlparse(url).path.lower()
    if path.endswith(".heic"):
        ext = ".heic"
    elif path.endswith(".png"):
        ext = ".png"
    else:
        ext = ".jpg"
    return url, ext


def iter_post_images(item: dict[str, Any]) -> list[tuple[str, str, int]]:
    code = item["code"]
    images: list[tuple[str, str, int]] = []
    media_type = item.get("media_type")

    if media_type == 1:
        url, ext = choose_image_candidate(item)
        images.append((url, ext, 1))
    elif media_type == 8:
        for index, media in enumerate(item.get("carousel_media", []), start=1):
            if media.get("media_type") != 1:
                continue
            url, ext = choose_image_candidate(media)
            images.append((url, ext, index))

    return [(code, *image) for image in images]


def download_file(
    session: requests.Session, url: str, destination: Path, *, referer: str
) -> None:
    last_error: Exception | None = None
    for attempt in range(5):
        try:
            with session.get(
                url,
                headers={"Referer": referer},
                timeout=60,
                stream=True,
            ) as response:
                response.raise_for_status()
                destination.parent.mkdir(parents=True, exist_ok=True)
                with destination.open("wb") as output:
                    for chunk in response.iter_content(chunk_size=1024 * 64):
                        if chunk:
                            output.write(chunk)
            return
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            if destination.exists():
                destination.unlink()
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"Download failed for {url}: {last_error}") from last_error


def fetch_all_posts(session: requests.Session, username: str) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    next_max_id: str | None = None

    while True:
        params: dict[str, Any] = {"count": 12}
        if next_max_id:
            params["max_id"] = next_max_id

        data = request_json(
            session,
            f"https://www.instagram.com/api/v1/feed/user/{username}/username/",
            params=params,
        )
        page_items = data.get("items", [])
        if not page_items:
            break

        items.extend(page_items)
        print(f"Fetched {len(items)} posts so far...")

        if not data.get("more_available"):
            break

        next_max_id = data.get("next_max_id")
        if not next_max_id:
            break
        time.sleep(1.5)

    return items


def main() -> None:
    username = "partituraspagodeesamba"
    output_dir = Path("downloads") / "instagram" / username
    output_dir.mkdir(parents=True, exist_ok=True)

    session = build_session()
    profile_url = f"https://www.instagram.com/{username}/"
    session.headers["Referer"] = profile_url

    posts = fetch_all_posts(session, username)
    manifest: list[dict[str, Any]] = []
    downloaded = 0

    for item_index, item in enumerate(posts, start=1):
        code = item["code"]
        taken_at = item.get("taken_at", 0)
        caption = ""
        caption_obj = item.get("caption")
        if isinstance(caption_obj, dict):
            caption = caption_obj.get("text", "")

        images = iter_post_images(item)
        if not images:
            continue

        for _, url, ext, image_index in images:
            suffix = f"_{image_index:02d}" if len(images) > 1 else ""
            filename = f"{item_index:03d}_{taken_at}_{code}{suffix}{ext}"
            destination = output_dir / filename
            if not destination.exists():
                download_file(session, url, destination, referer=profile_url)
                downloaded += 1
                time.sleep(0.4)

            manifest.append(
                {
                    "post_index": item_index,
                    "code": code,
                    "taken_at": taken_at,
                    "image_index": image_index,
                    "filename": filename,
                    "caption": caption,
                    "post_url": f"{profile_url}p/{code}/",
                }
            )

    manifest_path = output_dir / "manifest.json"
    manifest_path.write_text(
        json.dumps(
            {
                "username": username,
                "post_count": len(posts),
                "downloaded_images": downloaded,
                "saved_files": len(manifest),
                "items": manifest,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print(
        json.dumps(
            {
                "username": username,
                "post_count": len(posts),
                "new_files_downloaded": downloaded,
                "saved_entries": len(manifest),
                "output_dir": str(output_dir.resolve()),
                "manifest": str(manifest_path.resolve()),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
