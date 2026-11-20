
import json
import re
import time
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

BASE = "https://newsonair.gov.in"
SOURCES = {
    "NSD": BASE + "/bulletins-category/nsd-audio/?page={}",
    "RNU": BASE + "/bulletins-category/regional-audio/?page={}",
}

ARCHIVE = Path("archive.json")
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; TeluguAudioArchive/1.0)"
}
PAGES_PER_SOURCE = 3


def load_archive():
    if ARCHIVE.exists():
        try:
            data = json.loads(ARCHIVE.read_text(encoding="utf-8"))
            data.setdefault("items", [])
            data.setdefault("next_history_page", {"NSD": 4, "RNU": 4})
            return data
        except (ValueError, OSError):
            pass

    return {
        "items": [],
        "next_history_page": {"NSD": 4, "RNU": 4}
    }


def get_page(url):
    response = requests.get(
        url, headers=HEADERS, timeout=30
    )
    response.raise_for_status()
    return BeautifulSoup(response.text, "html.parser")


def extract_bulletins(soup, source, page_url):
    found = []

    for row in soup.select("tr"):
        cells = row.find_all(["td", "th"])
        if len(cells) < 2:
            continue

        text = " ".join(row.stripped_strings)

        # Keep Telugu entries only.
        if not re.search(r"\btelugu\b|తెలుగు", text, re.I):
            continue

        links = [
            urljoin(page_url, a.get("href", ""))
            for a in row.select("a[href]")
            if a.get("href")
        ]

        audio_url = ""

        # Direct audio links only; never download them.
        for link in links:
            if re.search(
                r"\.(mp3|m4a|aac|ogg|wav)(?:\?|$)",
                link,
                re.I
            ):
                audio_url = link
                break

        for tag in row.select("audio[src], audio source[src]"):
            audio_url = urljoin(
                page_url, tag.get("src", "")
            )
            if audio_url:
                break

        # Retain the original page as a fallback.
        source_url = links[0] if links else page_url

        title = cells[0].get_text(" ", strip=True)
        station = cells[0].get_text(" ", strip=True)
        date = ""
        clock = ""

        for cell in cells:
            value = cell.get_text(" ", strip=True)

            if re.search(r"\d{1,2}:\d{2}", value):
                clock = value

            if re.search(
                r"\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}",
                value
            ):
                date = value

        item = {
            "type": source,
            "title": title,
            "station": station,
            "language": "Telugu",
            "date": date,
            "time": clock,
            "audio_url": audio_url,
            "source_url": source_url,
        }

        found.append(item)

    return found


def main():
    archive = load_archive()

    known = {
        (
            x.get("type"),
            x.get("title"),
            x.get("date"),
            x.get("time"),
            x.get("source_url"),
        )
        for x in archive["items"]
    }

    added = 0

    for source, template in SOURCES.items():
        recent_pages = range(1, PAGES_PER_SOURCE + 1)

        history_page = archive["next_history_page"].get(
            source, 4
        )

        pages = list(recent_pages) + [history_page]

        for page in dict.fromkeys(pages):
            url = template.format(page)

            try:
                soup = get_page(url)
                entries = extract_bulletins(soup, source, url)

                for item in entries:
                    key = (
                        item["type"],
                        item["title"],
                        item["date"],
                        item["time"],
                        item["source_url"],
                    )

                    if key not in known:
                        archive["items"].append(item)
                        known.add(key)
                        added += 1

                print(
                    f"{source} page {page}: "
                    f"{len(entries)} Telugu entries"
                )

                time.sleep(2)

            except requests.RequestException as error:
                print(f"Could not read {url}: {error}")

        archive["next_history_page"][source] = history_page + 1

    archive["items"].sort(
        key=lambda x: (
            x.get("date", ""),
            x.get("time", "")
        ),
        reverse=True
    )

    ARCHIVE.write_text(
        json.dumps(
            archive,
            ensure_ascii=False,
            indent=2
        ),
        encoding="utf-8"
    )

    print(f"New entries: {added}")
    print(f"Total entries: {len(archive['items'])}")


if __name__ == "__main__":
    main()
