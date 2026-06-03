#!/usr/bin/env python3
from __future__ import annotations

import html
import json
import os
import re
import sys
import time
import xml.etree.ElementTree as ET
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Iterable, Mapping
from urllib.parse import parse_qs, urljoin, urlparse

import requests


PUBLIC_SEED_DATA_DIR_REQUIRED_MESSAGE = (
    "Public seed data directory is required. Provide "
    "--data-dir=/absolute/or/relative/path or set PUBLIC_SEED_DATA_DIR."
)
DATA_DIR = Path.cwd()
SAST = timezone(timedelta(hours=2))
_today_sast = datetime.now(SAST)
WINDOW_START = _today_sast.replace(hour=0, minute=0, second=0, microsecond=0)
WINDOW_END = datetime(_today_sast.year, 12, 31, 23, 59, 59, 999000, tzinfo=SAST)
SEED_FILE_DEFAULTS = {
    "organizations.json": [],
    "organization-media.json": {},
    "events.json": [],
    "event-media.json": {},
}

SOURCE_PLATFORMS = {
    "Computicket",
    "Howler",
    "Joburg",
    "Quicket",
    "Ticketpro",
    "Webtickets",
    "WhatsOnInJoburg",
}

GAUTENG_POSITIVE_TOKENS = [
    "gauteng",
    "johannesburg",
    "joburg",
    "pretoria",
    "tshwane",
    "sandton",
    "rosebank",
    "midrand",
    "centurion",
    "kempton park",
    "boksburg",
    "benoni",
    "randburg",
    "roodepoort",
    "soweto",
    "vanderbijlpark",
    "vereeniging",
    "krugersdorp",
    "muldersdrift",
    "alberton",
    "germiston",
    "mamelodi",
    "soshanguve",
    "tembisa",
    "modderfontein",
    "waterkloof",
    "menlyn",
    "fourways",
    "parkview",
    "ekurhuleni",
    "mahube",
    "groenkloof",
    "east rand",
    "west rand",
    "vaal",
    "lethabong",
]

NON_GAUTENG_NEGATIVE_TOKENS = [
    "cape town",
    "western cape",
    "durban",
    "kwazulu-natal",
    "kzn",
    "polokwane",
    "limpopo",
    "bloemfontein",
    "free state",
    "gqeberha",
    "port elizabeth",
    "eastern cape",
    "stellenbosch",
    "paarl",
    "george",
    "mbombela",
    "nelspruit",
    "vryheid",
    "umhlanga",
    "ballito",
]

CATEGORY_MAP = {
    "active": ["Fitness & Wellness"],
    "afro pop": ["Live Music"],
    "amapiano": ["Live Music", "Nightlife & Parties"],
    "art": ["Arts & Theatre"],
    "arts": ["Arts & Theatre"],
    "ballet": ["Arts & Theatre"],
    "bash": ["Nightlife & Parties"],
    "beer": ["Food & Markets"],
    "bubbly": ["Food & Markets"],
    "business": ["Business & Entrepreneurship"],
    "charity": ["Community & Causes"],
    "choir": ["Arts & Theatre", "Live Music"],
    "club": ["Nightlife & Parties"],
    "coffee": ["Food & Markets"],
    "comedy": ["Comedy"],
    "conference": ["Conferences"],
    "cultural": ["Arts & Theatre"],
    "culture": ["Arts & Theatre"],
    "dance": ["Arts & Theatre", "Nightlife & Parties"],
    "dj": ["Live Music", "Nightlife & Parties"],
    "education": ["Workshops & Classes"],
    "expo": ["Conferences"],
    "faith": ["Faith & Spirituality"],
    "family": ["Family & Kids"],
    "festival": ["Live Music"],
    "fitness": ["Fitness & Wellness"],
    "food": ["Food & Markets"],
    "gospel": ["Faith & Spirituality", "Live Music"],
    "heritage": ["Arts & Theatre"],
    "house": ["Live Music", "Nightlife & Parties"],
    "jazz": ["Live Music"],
    "kids": ["Family & Kids"],
    "lifestyle": ["Networking & Socials"],
    "market": ["Food & Markets"],
    "masterclass": ["Workshops & Classes"],
    "music": ["Live Music"],
    "network": ["Networking & Socials"],
    "nightlife": ["Nightlife & Parties"],
    "oyster": ["Food & Markets"],
    "padel": ["Sports", "Fitness & Wellness"],
    "party": ["Nightlife & Parties"],
    "performance": ["Arts & Theatre"],
    "picnic": ["Food & Markets", "Networking & Socials"],
    "r&b": ["Live Music"],
    "rnb": ["Live Music"],
    "run": ["Fitness & Wellness"],
    "show": ["Arts & Theatre"],
    "social": ["Networking & Socials"],
    "soul": ["Live Music"],
    "sport": ["Sports"],
    "stand-up": ["Comedy"],
    "tech": ["Tech & Innovation"],
    "theatre": ["Arts & Theatre"],
    "walk": ["Fitness & Wellness", "Community & Causes"],
    "wellness": ["Fitness & Wellness"],
    "wine": ["Food & Markets"],
    "workshop": ["Workshops & Classes"],
    "worship": ["Faith & Spirituality"],
}

HOWLER_CATEGORY_MAP = {
    "nightlife": ["Nightlife & Parties"],
    "festival": ["Live Music"],
    "lifestyle": ["Networking & Socials"],
    "music": ["Live Music"],
    "active": ["Fitness & Wellness"],
    "sports": ["Sports"],
    "business": ["Business & Entrepreneurship"],
    "food": ["Food & Markets"],
    "comedy": ["Comedy"],
    "performance": ["Arts & Theatre"],
    "school": ["Family & Kids"],
    "online": ["Networking & Socials"],
}

WEBTICKETS_CATEGORY_MAP = {
    "music": ["Live Music"],
    "theatre": ["Arts & Theatre"],
    "comedy": ["Comedy"],
    "festival": ["Live Music"],
    "expo, workshops & speaking events": ["Conferences", "Workshops & Classes"],
    "community, charity & faith events": ["Community & Causes", "Faith & Spirituality"],
    "fitness classes": ["Fitness & Wellness"],
    "road running": ["Fitness & Wellness"],
    "walking events": ["Fitness & Wellness"],
    "spectator sport": ["Sports"],
    "lifestyle": ["Networking & Socials"],
    "ballet & dance": ["Arts & Theatre"],
}

TICKETPRO_URLS = [
    "https://shop.ticketpro.co.za/event/africa-aerospace-and-defence-aad-sw4qvn",
    "https://shop.ticketpro.co.za/event/the-society-axuc8y",
    "https://shop.ticketpro.co.za/event/zee-nation-fest-2evubl",
    "https://shop.ticketpro.co.za/event/groves-vineyards-2026-5dklhb",
]

COMPUTICKET_URLS = [
    "https://computicket.com/event/pitori-markets-mamelodi/01292c5c-6c6e-40cf-8202-facfd7945f6d",
    "https://computicket.com/event/the-yardii-pardii/989e8aa8-6602-4e12-9a11-075936626673",
    "https://computicket.com/event/sound-freqncy/68906c8f-fc04-46e7-a0d5-1aa6084a4358",
    "https://computicket.com/event/savannaconference/a721cd10-ce2d-4676-8b8a-3064dd39f0fb",
    "https://computicket.com/event/fxgang-fest/d6dab2cc-49ea-4c43-94da-3e7249bbe0dd",
    "https://computicket.com/event/1st-gospel-tour-with-geemaster/8bcb923a-3a1c-4aec-aa92-afbf656857a5",
]


def read_json(name: str):
    return json.loads(DATA_DIR.joinpath(name).read_text())


def write_json(name: str, value) -> None:
    DATA_DIR.joinpath(name).write_text(
        json.dumps(value, indent=2, ensure_ascii=False) + "\n"
    )


def resolve_public_seed_data_dir(
    data_dir: Path | None = None, *, env: Mapping[str, str] | None = None
) -> Path:
    if data_dir is not None:
        return data_dir.resolve()

    env_value = (env or os.environ).get("PUBLIC_SEED_DATA_DIR", "").strip()
    if env_value:
        return Path(env_value).expanduser().resolve()

    raise ValueError(PUBLIC_SEED_DATA_DIR_REQUIRED_MESSAGE)


def configure(
    *,
    data_dir: Path | None = None,
    window_start: datetime | None = None,
    window_end: datetime | None = None,
) -> None:
    global DATA_DIR, WINDOW_START, WINDOW_END

    if data_dir is not None:
        DATA_DIR = data_dir.resolve()
    if window_start is not None:
        WINDOW_START = window_start.astimezone(SAST)
    if window_end is not None:
        WINDOW_END = window_end.astimezone(SAST)


def ensure_seed_files_exist() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    for filename, default_value in SEED_FILE_DEFAULTS.items():
        path = DATA_DIR / filename
        if path.exists():
            continue
        path.write_text(json.dumps(default_value, indent=2, ensure_ascii=False) + "\n")


def normalize_space(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(value or "")).strip()


def slugify(value: str) -> str:
    value = normalize_space(value).lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "unknown"


def dedupe_ordered(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value not in seen:
            seen.add(value)
            result.append(value)
    return result


def parse_iso(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(SAST)


def within_window(starts_at: str) -> bool:
    start_dt = parse_iso(starts_at)
    return WINDOW_START <= start_dt <= WINDOW_END


def pick_zip(text: str) -> str:
    match = re.search(r"\b(\d{4})\b", text)
    return match.group(1) if match else "0001"


def detect_city(text: str) -> str:
    lowered = normalize_space(text).lower()
    city_map = [
        ("johannesburg", "Johannesburg"),
        ("joburg", "Johannesburg"),
        ("pretoria", "Pretoria"),
        ("sandton", "Sandton"),
        ("midrand", "Midrand"),
        ("centurion", "Centurion"),
        ("roodepoort", "Roodepoort"),
        ("randburg", "Randburg"),
        ("rosebank", "Johannesburg"),
        ("mamelodi", "Pretoria"),
        ("soshanguve", "Pretoria"),
        ("muldersdrift", "Krugersdorp"),
        ("modderfontein", "Lethabong"),
        ("vanderbijlpark", "Vanderbijlpark"),
        ("vereeniging", "Vereeniging"),
        ("krugersdorp", "Krugersdorp"),
        ("alberton", "Alberton"),
        ("kempton park", "Kempton Park"),
        ("boksburg", "Boksburg"),
        ("benoni", "Benoni"),
        ("germiston", "Germiston"),
        ("mahube", "Pretoria"),
        ("waterkloof", "Pretoria"),
        ("groenkloof", "Pretoria"),
        ("fourways", "Johannesburg"),
        ("parkview", "Johannesburg"),
        ("vaal", "Vanderbijlpark"),
    ]
    for token, city in city_map:
        if token in lowered:
            return city
    return "Johannesburg" if "gauteng" in lowered else "Pretoria"


def is_gauteng(text: str) -> bool:
    lowered = normalize_space(text).lower()
    if not lowered:
        return False
    if any(token in lowered for token in NON_GAUTENG_NEGATIVE_TOKENS):
        return False
    return any(token in lowered for token in GAUTENG_POSITIVE_TOKENS)


def clean_summary(value: str) -> str:
    value = normalize_space(value)
    value = re.sub(r"\s*Ticket Prices:.*$", "", value, flags=re.I)
    return value[:500].strip()


def normalize_media_url(value: str | None) -> str | None:
    if not value:
        return None

    normalized = html.unescape(value).strip()
    if normalized.startswith("//"):
        return f"https:{normalized}"
    return normalized


def infer_categories(text: str, source_hints: Iterable[str] = ()) -> list[str]:
    categories: list[str] = []

    for hint in source_hints:
        categories.extend(source_hints_map(hint))

    lowered = normalize_space(text).lower()
    for keyword, mapped in CATEGORY_MAP.items():
        if keyword in lowered:
            categories.extend(mapped)

    categories = [category for category in dedupe_ordered(categories) if category]
    return categories[:3] or ["Networking & Socials"]


def source_hints_map(label: str) -> list[str]:
    lowered = normalize_space(label).lower()
    if lowered in HOWLER_CATEGORY_MAP:
        return HOWLER_CATEGORY_MAP[lowered]
    if lowered in WEBTICKETS_CATEGORY_MAP:
        return WEBTICKETS_CATEGORY_MAP[lowered]
    return []


def canonical_signature(title: str, starts_at: str, venue_name: str) -> str:
    return "|".join(
        [
            slugify(title),
            parse_iso(starts_at).strftime("%Y-%m-%d"),
            slugify(venue_name),
        ]
    )


class Fetcher:
    def __init__(self) -> None:
        self.session = requests.Session()
        self.session.headers.update(
            {"User-Agent": "Mozilla/5.0 Gatherle Seed Harvester"}
        )

    def get(self, url: str) -> str:
        last_error: Exception | None = None
        for attempt in range(3):
            try:
                response = self.session.get(url, timeout=15)
                response.raise_for_status()
                return response.text
            except requests.RequestException as error:
                last_error = error
                if attempt < 2:
                    time.sleep(1.5 * (attempt + 1))
        raise RuntimeError(f"Failed to fetch {url}") from last_error


@dataclass
class HarvestedEvent:
    platform: str
    source_url: str
    external_id: str
    org_name: str
    title: str
    summary: str
    starts_at: str
    ends_at: str | None
    venue_name: str
    street: str
    city: str
    zip_code: str
    category_names: list[str]
    image_url: str | None
    org_image_url: str | None
    tags: dict


class SeedBuilder:
    def __init__(self) -> None:
        self.organizations = {
            entry["key"]: dict(entry) for entry in read_json("organizations.json")
        }
        self.organization_media_by_key = dict(read_json("organization-media.json"))
        base_events = read_json("events.json")
        self.events: list[dict] = []
        self.event_media_by_external_id: dict[str, str] = {}
        self.seen_signatures: set[str] = set()
        self.seen_source_urls: set[str] = set()

        base_media = dict(read_json("event-media.json"))
        for event in base_events:
            if not within_window(event["startsAt"]):
                continue
            if event["sourcePlatform"] not in SOURCE_PLATFORMS:
                continue
            self._store_event(dict(event), base_media.get(event["externalId"]))

    def _build_org(
        self,
        org_key: str,
        org_name: str,
        platform: str,
        category_names: list[str],
        org_image_url: str | None = None,
    ) -> None:
        if org_key in self.organizations:
            if org_image_url and org_key not in self.organization_media_by_key:
                normalized_org_image_url = normalize_media_url(org_image_url)
                if normalized_org_image_url:
                    self.organization_media_by_key[org_key] = normalized_org_image_url
            return
        primary_tag = slugify(category_names[0]) if category_names else "events"
        self.organizations[org_key] = {
            "key": org_key,
            "name": org_name,
            "description": f"Imported public host profile harvested from {platform} for Gauteng event discovery.",
            "tags": ["imported", "gauteng", primary_tag],
        }
        if org_image_url:
            normalized_org_image_url = normalize_media_url(org_image_url)
            if normalized_org_image_url:
                self.organization_media_by_key[org_key] = normalized_org_image_url

    def _store_event(self, event: dict, image_url: str | None) -> bool:
        signature = canonical_signature(
            event["title"], event["startsAt"], event["venueName"]
        )
        source_url = event["sourceUrl"]
        if signature in self.seen_signatures or source_url in self.seen_source_urls:
            return False
        self.seen_signatures.add(signature)
        self.seen_source_urls.add(source_url)
        self.events.append(event)
        normalized_image_url = normalize_media_url(image_url)
        if normalized_image_url:
            self.event_media_by_external_id[event["externalId"]] = normalized_image_url
        return True

    def add(self, harvested: HarvestedEvent) -> bool:
        if harvested.platform not in SOURCE_PLATFORMS:
            raise ValueError(f"Unsupported source platform: {harvested.platform}")
        if not within_window(harvested.starts_at):
            return False

        org_key = slugify(harvested.org_name)
        self._build_org(
            org_key,
            harvested.org_name,
            harvested.platform,
            harvested.category_names,
            harvested.org_image_url,
        )

        event = {
            "sourcePlatform": harvested.platform,
            "sourceUrl": harvested.source_url,
            "externalId": harvested.external_id,
            "orgKey": org_key,
            "title": harvested.title,
            "summary": harvested.summary,
            "startsAt": harvested.starts_at,
            "venueName": harvested.venue_name,
            "location": {
                "street": harvested.street,
                "city": harvested.city,
                "state": "Gauteng",
                "zipCode": harvested.zip_code,
                "country": "South Africa",
            },
            "categoryNames": harvested.category_names,
            "tags": harvested.tags,
        }
        if harvested.ends_at:
            event["endsAt"] = harvested.ends_at

        return self._store_event(event, harvested.image_url)

    def finalize(self) -> None:
        referenced_orgs = {event["orgKey"] for event in self.events}
        self.organizations = {
            key: value
            for key, value in self.organizations.items()
            if key in referenced_orgs
        }
        self.organization_media_by_key = {
            key: value
            for key, value in self.organization_media_by_key.items()
            if key in referenced_orgs
        }
        self.events.sort(key=lambda event: event["startsAt"])
        write_json("organizations.json", list(self.organizations.values()))
        write_json("organization-media.json", self.organization_media_by_key)
        write_json("events.json", self.events)
        write_json("event-media.json", self.event_media_by_external_id)


def parse_dt_local(date_text: str, time_text: str) -> str:
    normalized = normalize_space(date_text).replace("/", "-")
    for fmt in ("%d %b %Y %H:%M", "%d-%b-%Y %H:%M", "%d %B %Y %H:%M", "%d-%B-%Y %H:%M"):
        try:
            dt = datetime.strptime(f"{normalized} {time_text}", fmt).replace(
                tzinfo=SAST
            )
            return dt.isoformat()
        except ValueError:
            continue
    raise ValueError(f"Unsupported local datetime format: {date_text} {time_text}")


def add_hours(iso: str, hours: int) -> str:
    return (parse_iso(iso) + timedelta(hours=hours)).isoformat()


def strings_loosely_match(left: str, right: str) -> bool:
    left_slug = slugify(left)
    right_slug = slugify(right)
    return left_slug == right_slug or left_slug in right_slug or right_slug in left_slug


def resolve_howler_org_image_url(
    fetcher: Fetcher,
    event_html: str,
    org_name: str,
    source_url: str | None = None,
) -> str | None:
    if source_url:
        path = urlparse(source_url).path or ""
        if "/events/" not in path and "/categories/" not in path:
            title_match = re.search(
                r'<meta property="og:title" content="([^"]+)"', event_html
            )
            image_match = re.search(
                r'<meta property="og:image" content="([^"]+)"', event_html
            )
            page_title = normalize_space(title_match.group(1) if title_match else "")
            if (
                image_match
                and page_title
                and strings_loosely_match(page_title, org_name)
            ):
                return html.unescape(image_match.group(1))

    candidate_paths = dedupe_ordered(
        html.unescape(path)
        for path in re.findall(r'href="([^"]*?/organisers/\d+[^"]*)"', event_html, re.I)
    )

    for candidate_path in candidate_paths:
        candidate_url = urljoin("https://www.howler.co.za/", candidate_path)
        try:
            page = fetcher.get(candidate_url)
        except RuntimeError:
            continue

        title_match = re.search(r'<meta property="og:title" content="([^"]+)"', page)
        image_match = re.search(r'<meta property="og:image" content="([^"]+)"', page)
        if not image_match:
            continue
        page_title = normalize_space(title_match.group(1) if title_match else "")
        if page_title and not strings_loosely_match(page_title, org_name):
            continue
        return html.unescape(image_match.group(1))

    return None


def resolve_webtickets_org_image_url(
    event_html: str, client_name: str | None
) -> str | None:
    if not client_name:
        return None

    client_pattern = re.escape(client_name)
    panel_matches = dedupe_ordered(
        match
        for match in re.findall(
            rf'https://content\.webtickets\.co\.za/{client_pattern}/panel_[^"\')]+',
            event_html,
            re.I,
        )
    )
    if panel_matches:
        return panel_matches[0]

    banner_matches = dedupe_ordered(
        match
        for match in re.findall(
            rf'https://content\.webtickets\.co\.za/{client_pattern}/banner_[^"\')]+',
            event_html,
            re.I,
        )
    )
    if banner_matches:
        return banner_matches[0]

    return None


def harvest_howler(fetcher: Fetcher, builder: SeedBuilder) -> int:
    count = 0
    try:
        categories_html = fetcher.get("https://www.howler.co.za/categories")
    except RuntimeError:
        return 0
    category_pairs = re.findall(
        r'href="(/categories/\d+)".*?<div class="event-category-card__info__title">(.*?)</div>',
        categories_html,
        re.S,
    )

    for category_path, category_label in category_pairs:
        seen_page_links: set[str] = set()
        for page in range(1, 12):
            url = f"https://www.howler.co.za{category_path}"
            if page > 1:
                url += f"?page={page}"
            html_text = fetcher.get(url)
            cards = re.findall(
                r'<a class="upcoming-event-card listing-page__section__item" href="([^"]+)".*?'
                r'<div class="upcoming-event-card__title"><span>(.*?)</span></div>'
                r'<div class="upcoming-event-card__venue">(.*?)</div>'
                r'<div class="upcoming-event-card__date">(.*?)</div>',
                html_text,
                re.S,
            )
            if not cards:
                break

            page_added = False
            for raw_href, raw_title, raw_venue, _raw_date in cards:
                href = html.unescape(raw_href).replace("&amp;", "&")
                source_url = href.split("?")[0]
                if source_url in seen_page_links:
                    continue
                seen_page_links.add(source_url)
                try:
                    event_html = fetcher.get(source_url)
                except RuntimeError:
                    continue

                start_match = re.search(r'"startDate":"([^"]+)"', event_html)
                if not start_match:
                    continue
                end_match = re.search(r'"endDate":"([^"]+)"', event_html)
                location_match = re.search(
                    r'"location":\{"@type":"Place","name":"(.*?)","address":\{"@type":"PostalAddress","streetAddress":"(.*?)"\}\}',
                    event_html,
                )
                organizer_match = re.search(
                    r"ALL EVENTS BY THIS ORGANISER.*?<h4[^>]*>(.*?)</h4>",
                    event_html,
                    re.S,
                )
                image_match = re.search(
                    r'<meta property="og:image" content="([^"]+)"', event_html
                )
                desc_match = re.search(
                    r'<meta property="og:description" content="([^"]+)"', event_html
                )

                venue_name = normalize_space(
                    location_match.group(1) if location_match else raw_venue
                )
                street = normalize_space(
                    location_match.group(2) if location_match else raw_venue
                )
                address_probe = " ".join([venue_name, street])
                if not is_gauteng(address_probe):
                    continue

                starts_at = start_match.group(1)
                org_name = normalize_space(
                    organizer_match.group(1)
                    if organizer_match
                    else "Howler Marketplace"
                )
                categories = infer_categories(
                    " ".join(
                        [
                            category_label,
                            raw_title,
                            desc_match.group(1) if desc_match else "",
                        ]
                    ),
                    [category_label],
                )
                harvested = HarvestedEvent(
                    platform="Howler",
                    source_url=source_url,
                    external_id=f"howler-{slugify(urlparse(source_url).path.strip('/'))}",
                    org_name=org_name,
                    title=normalize_space(raw_title),
                    summary=clean_summary(
                        desc_match.group(1) if desc_match else raw_title
                    ),
                    starts_at=starts_at,
                    ends_at=end_match.group(1) if end_match else None,
                    venue_name=venue_name,
                    street=street,
                    city=detect_city(address_probe),
                    zip_code=pick_zip(address_probe),
                    category_names=categories,
                    image_url=html.unescape(image_match.group(1))
                    if image_match
                    else None,
                    org_image_url=resolve_howler_org_image_url(
                        fetcher, event_html, org_name, source_url
                    ),
                    tags={
                        "sourceCategory": normalize_space(category_label),
                    },
                )
                if builder.add(harvested):
                    page_added = True
                    count += 1
            if not page_added and page > 2:
                break
    return count


def harvest_webtickets(fetcher: Fetcher, builder: SeedBuilder) -> int:
    count = 0
    home = fetcher.get("https://www.webtickets.co.za/")
    category_candidates: list[str] = []
    seen_category_urls: set[str] = set()
    for path, raw_label in re.findall(
        r'<a[^>]+href="([^"]*category\.aspx\?itemid=[^"]*location=0[^"]*)"[^>]*>(.*?)</a>',
        home,
        re.S,
    ):
        label = normalize_space(re.sub(r"<[^>]+>", " ", raw_label))
        if not label or label in {"Home", "Browse", "See More", "Events", "Featured"}:
            continue
        category_url = (
            f"https://www.webtickets.co.za/v2/{html.unescape(path).lstrip('/')}"
        )
        if category_url in seen_category_urls:
            continue
        seen_category_urls.add(category_url)
        category_candidates.append(f"{label}|{category_url}")

    category_pairs = dedupe_ordered(category_candidates)
    seen_event_urls: set[str] = set()

    for index, pair in enumerate(category_pairs, start=1):
        category_label, category_url = pair.split("|", 1)
        print(
            f"Webtickets category {index}/{len(category_pairs)}: {category_label}",
            flush=True,
        )
        page_numbers = sorted(
            {
                int(page)
                for page in re.findall(
                    rf"itemid={re.escape(parse_qs(urlparse(category_url).query)['itemid'][0])}&amp;location=0&amp;when=anytime&amp;page=(\d+)",
                    fetcher.get(category_url),
                )
            }
            | {1}
        )

        for page_number in page_numbers:
            paged_url = (
                category_url
                if page_number == 1
                else f"{category_url}&page={page_number}"
            )
            category_html = fetcher.get(paged_url)
            event_urls = sorted(
                set(
                    urljoin("https://www.webtickets.co.za/v2/", href)
                    for href in re.findall(
                        r'href="(event\.aspx\?itemid=\d+)"', category_html
                    )
                )
            )
            for source_url in event_urls:
                if source_url in seen_event_urls:
                    continue
                seen_event_urls.add(source_url)
                try:
                    event_html = fetcher.get(source_url)
                except RuntimeError:
                    continue
                title_match = re.search(
                    r'<h2 id="EventPanel_lblTitleHeader"[^>]*>(.*?)</h2>', event_html
                )
                summary_match = re.search(
                    r'<meta name="description" content="([^"]+)"', event_html
                )
                subtitle_match = re.search(
                    r'id="EventPanel_lblSubTitle">from (\d{2} \w{3} \d{4}) (\d{2}:\d{2})',
                    event_html,
                )
                venue_match = re.search(
                    r'EventPanel_tbxVenue"[^>]*>(.*?)</span>', event_html
                )
                image_match = re.search(
                    r'<meta id="ogImage" property="og:image" content="([^"]+)"',
                    event_html,
                )
                client_match = re.search(
                    r'<meta name="client" content="([^"]+)"', event_html
                )
                itemid = parse_qs(urlparse(source_url).query).get("itemid", [""])[0]

                if not title_match or not venue_match or not itemid:
                    continue

                performance_rows = re.findall(
                    r"onclick=setPerformance\(\d+,0,'([^']+)'\).*?<span class=ec-description>(.*?)</span>",
                    event_html,
                    re.S,
                )
                if subtitle_match:
                    try:
                        starts_at = parse_dt_local(
                            subtitle_match.group(1), subtitle_match.group(2)
                        )
                    except ValueError:
                        continue
                elif performance_rows:
                    date_text = performance_rows[0][0]
                    times = re.findall(r"(\d{2}:\d{2})", performance_rows[0][1])
                    if not times:
                        continue
                    try:
                        starts_at = parse_dt_local(date_text, times[0])
                    except ValueError:
                        continue
                else:
                    continue

                end_time = None
                if performance_rows:
                    times = re.findall(r"(\d{2}:\d{2})", performance_rows[0][1])
                    if len(times) > 1:
                        end_time = times[-1]

                venue_name = normalize_space(venue_match.group(1))
                venue_probe = " ".join(
                    [venue_name, summary_match.group(1) if summary_match else ""]
                )
                if not is_gauteng(venue_probe):
                    continue

                if end_time:
                    date_text = performance_rows[0][0]
                    try:
                        ends_at = parse_dt_local(date_text, end_time)
                    except ValueError:
                        ends_at = add_hours(starts_at, 4)
                    if parse_iso(ends_at) <= parse_iso(starts_at):
                        ends_at = add_hours(starts_at, 4)
                else:
                    ends_at = add_hours(starts_at, 3)

                categories = infer_categories(
                    " ".join(
                        [
                            category_label,
                            title_match.group(1),
                            summary_match.group(1) if summary_match else "",
                        ]
                    ),
                    [category_label],
                )

                client_name = (
                    normalize_space(client_match.group(1)) if client_match else None
                )
                harvested = HarvestedEvent(
                    platform="Webtickets",
                    source_url=source_url,
                    external_id=f"webtickets-{itemid}",
                    org_name=client_name or "Webtickets Marketplace",
                    title=normalize_space(title_match.group(1)),
                    summary=clean_summary(
                        summary_match.group(1)
                        if summary_match
                        else title_match.group(1)
                    ),
                    starts_at=starts_at,
                    ends_at=ends_at,
                    venue_name=venue_name,
                    street=venue_name,
                    city=detect_city(venue_name),
                    zip_code=pick_zip(venue_probe),
                    category_names=categories,
                    image_url=html.unescape(image_match.group(1))
                    if image_match
                    else None,
                    org_image_url=resolve_webtickets_org_image_url(
                        event_html, client_name
                    ),
                    tags={"sourceCategory": normalize_space(category_label)},
                )
                if builder.add(harvested):
                    count += 1
    return count


def harvest_ticketpro(fetcher: Fetcher, builder: SeedBuilder) -> int:
    count = 0
    for source_url in TICKETPRO_URLS:
        page = fetcher.get(source_url)
        match = re.search(
            r'<script type="application/ld\+json">(.*?)</script>', page, re.S
        )
        if not match:
            continue
        data = json.loads(match.group(1))
        address = data.get("location", {}).get("address", {})
        address_probe = " ".join(
            filter(
                None,
                [
                    address.get("streetAddress"),
                    address.get("addressLocality"),
                    address.get("addressRegion"),
                    address.get("postalCode"),
                ],
            )
        )
        if not is_gauteng(address_probe):
            continue
        starts_at = data.get("startDate")
        if not starts_at:
            continue
        categories = infer_categories(
            " ".join([data.get("name", ""), data.get("description", "")])
        )
        harvested = HarvestedEvent(
            platform="Ticketpro",
            source_url=source_url,
            external_id=f"ticketpro-{slugify(urlparse(source_url).path.split('/')[-1])}",
            org_name=normalize_space(
                data.get("organizer", {}).get("name") or "Ticketpro Marketplace"
            ),
            title=normalize_space(data.get("name", "")),
            summary=clean_summary(data.get("description", "")),
            starts_at=starts_at,
            ends_at=data.get("endDate"),
            venue_name=normalize_space(data.get("location", {}).get("name", "")),
            street=normalize_space(
                address.get("streetAddress", "")
                or data.get("location", {}).get("name", "")
            ),
            city=normalize_space(
                address.get("addressLocality", "") or detect_city(address_probe)
            ),
            zip_code=normalize_space(
                address.get("postalCode", "") or pick_zip(address_probe)
            ),
            category_names=categories,
            image_url=data.get("image"),
            org_image_url=data.get("image"),
            tags={},
        )
        if builder.add(harvested):
            count += 1
    return count


def harvest_computicket(fetcher: Fetcher, builder: SeedBuilder) -> int:
    count = 0
    for source_url in COMPUTICKET_URLS:
        page = fetcher.get(source_url)
        block_match = re.search(
            r'&quot;startDate&quot;:&quot;([^"]+)&quot;.*?&quot;endDate&quot;:&quot;([^"]+)&quot;.*?&quot;location&quot;:\[\{.*?&quot;name&quot;:&quot;(.*?)&quot;,&quot;address&quot;:\{.*?&quot;streetAddress&quot;:&quot;(.*?)&quot;,&quot;addressLocality&quot;:&quot;(.*?)&quot;.*?&quot;image&quot;:&quot;(.*?)&quot;',
            page,
            re.S,
        )
        title_match = re.search(r'<meta property="og:title" content="([^"]+)"', page)
        desc_match = re.search(
            r'<meta property="og:description" content="([^"]+)"', page
        )

        if not block_match or not title_match:
            continue

        starts_at = html.unescape(block_match.group(1))
        ends_at = html.unescape(block_match.group(2))
        venue_name = normalize_space(block_match.group(3))
        street = normalize_space(block_match.group(4))
        city = normalize_space(block_match.group(5))
        address_probe = " ".join([street, city])
        if not is_gauteng(address_probe):
            continue

        title = normalize_space(
            title_match.group(1).replace(" at ", " | ").split("| Computicket")[0]
        )
        categories = infer_categories(
            " ".join([title, desc_match.group(1) if desc_match else ""])
        )
        external_id = source_url.rstrip("/").split("/")[-1]

        harvested = HarvestedEvent(
            platform="Computicket",
            source_url=source_url,
            external_id=f"computicket-{external_id}",
            org_name="Computicket Marketplace",
            title=title,
            summary=clean_summary(desc_match.group(1) if desc_match else title),
            starts_at=starts_at,
            ends_at=ends_at,
            venue_name=venue_name,
            street=street,
            city=city or detect_city(address_probe),
            zip_code=pick_zip(address_probe),
            category_names=categories,
            image_url=html.unescape(block_match.group(6)),
            org_image_url="https://content.computicket.com/wl/uploads/ctknewlogo_2227c0ca2c.png",
            tags={},
        )
        if builder.add(harvested):
            count += 1
    return count


def harvest_joburg(fetcher: Fetcher, builder: SeedBuilder) -> int:
    count = 0
    sitemap = fetcher.get("https://joburg.co.za/sitemap/events")
    root = ET.fromstring(sitemap)
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    urls = [node.text for node in root.findall("sm:url/sm:loc", ns) if node.text]

    for source_url in urls:
        page = fetcher.get(source_url)
        start_match = re.search(r'startDate\\?":\\?"([^"]+)', page)
        end_match = re.search(r'endDate\\?":\\?"([^"]+)', page)
        title_match = re.search(
            r'<meta property="og:title" content="([^"]+?) \| Joburg\.co\.za', page
        )
        desc_match = re.search(
            r'<meta property="og:description" content="([^"]+)"', page
        )
        image_match = re.search(r'<meta property="og:image" content="([^"]+)"', page)
        venue_match = re.search(
            r"at ([A-Z][^.,]+)",
            html.unescape(desc_match.group(1)) if desc_match else "",
        )
        categories_match = re.findall(r'"categories":\[(.*?)\],"listing"', page)

        if not start_match or not title_match:
            continue

        starts_at = html.unescape(start_match.group(1)).rstrip("\\")
        ends_at = html.unescape(end_match.group(1)).rstrip("\\") if end_match else None
        title = normalize_space(title_match.group(1))
        desc_text = clean_summary(desc_match.group(1) if desc_match else title)
        venue_name = normalize_space(
            venue_match.group(1) if venue_match else "Johannesburg"
        )
        combined = " ".join([title, venue_name, desc_text])

        raw_categories = []
        if categories_match:
            raw_categories = re.findall(r'"name":"([^"]+)"', categories_match[0])

        categories = infer_categories(
            " ".join([combined] + raw_categories), raw_categories
        )
        harvested = HarvestedEvent(
            platform="Joburg",
            source_url=source_url,
            external_id=f"joburg-{slugify(urlparse(source_url).path.strip('/'))}",
            org_name="Joburg.co.za",
            title=title,
            summary=desc_text,
            starts_at=starts_at,
            ends_at=ends_at,
            venue_name=venue_name,
            street=venue_name,
            city=detect_city(combined),
            zip_code=pick_zip(combined),
            category_names=categories,
            image_url=html.unescape(image_match.group(1)) if image_match else None,
            org_image_url="https://storage.googleapis.com/velocity-cms-prod-media/media/default/logo/jhb-color_AkFsUGx.png",
            tags={},
        )
        if builder.add(harvested):
            count += 1
    return count


HARVESTERS = {
    "Howler": harvest_howler,
    "Webtickets": harvest_webtickets,
    "Ticketpro": harvest_ticketpro,
    "Computicket": harvest_computicket,
    "Joburg": harvest_joburg,
}


def harvest_public_seed(
    *,
    data_dir: Path | None = None,
    window_start: datetime | None = None,
    window_end: datetime | None = None,
    sources: Iterable[str] | None = None,
) -> dict[str, object]:
    resolved_data_dir = resolve_public_seed_data_dir(data_dir)
    configure(
        data_dir=resolved_data_dir,
        window_start=window_start,
        window_end=window_end,
    )
    ensure_seed_files_exist()
    fetcher = Fetcher()
    builder = SeedBuilder()
    added_by_source = Counter()
    failed_sources: dict[str, str] = {}
    selected_sources = list(sources) if sources else list(HARVESTERS.keys())

    for name in selected_sources:
        if name not in HARVESTERS:
            raise ValueError(f"Unsupported source: {name}")
        harvester = HARVESTERS[name]
        started = time.time()
        try:
            added = harvester(fetcher, builder)
            added_by_source[name] += added
            print(
                f"{name}: added {added} events in {time.time() - started:.1f}s",
                flush=True,
            )
        except Exception as error:
            failed_sources[name] = str(error)
            print(
                f"{name}: failed after {time.time() - started:.1f}s ({error})",
                flush=True,
            )

    builder.finalize()

    events = read_json("events.json")
    print("final events", len(events), flush=True)
    print(
        "platform mix", Counter(event["sourcePlatform"] for event in events), flush=True
    )
    print("added by source", dict(added_by_source), flush=True)
    return {
        "final_events": len(events),
        "platform_mix": Counter(event["sourcePlatform"] for event in events),
        "added_by_source": dict(added_by_source),
        "failed_sources": failed_sources,
        "data_dir": str(DATA_DIR),
        "window_start": WINDOW_START.isoformat(),
        "window_end": WINDOW_END.isoformat(),
    }


def main() -> int:
    harvest_public_seed()
    return 0


if __name__ == "__main__":
    sys.exit(main())
