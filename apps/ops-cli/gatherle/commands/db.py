import uuid
import re
import sys
from datetime import datetime, timezone

import click
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

from gatherle.config import get_mongo_url

# ---------------------------------------------------------------------------
# Seed data – mirrors apps/api/lib/mongodb/mockData/eventCategory.ts
# ---------------------------------------------------------------------------

EVENT_CATEGORIES = [
    {"name": "Concerts",           "iconName": "MusicalNoteIcon",            "description": "Live music performances and festivals",              "color": "#FF69B4"},
    {"name": "Nightlife",          "iconName": "SparklesIcon",               "description": "Clubbing, parties, and nightlife events",            "color": "#8B008B"},
    {"name": "Workshops",          "iconName": "WrenchIcon",                 "description": "Hands-on learning sessions and skill-building",      "color": "#FF8C00"},
    {"name": "Conferences",        "iconName": "PresentationChartBarIcon",   "description": "Professional and industry gatherings",              "color": "#4682B4"},
    {"name": "Networking",         "iconName": "UserGroupIcon",              "description": "Meetups and professional connections",              "color": "#1E90FF"},
    {"name": "Food & Drink",       "iconName": "CakeIcon",                   "description": "Food festivals, tastings, and pop-ups",             "color": "#DA70D6"},
    {"name": "Fitness",            "iconName": "DumbbellIcon",               "description": "Fitness bootcamps, classes, and challenges",        "color": "#32CD32"},
    {"name": "Health & Wellness",  "iconName": "HeartIcon",                  "description": "Wellness events, retreats, and mental health",      "color": "#FF6347"},
    {"name": "Sports",             "iconName": "TrophyIcon",                 "description": "Live games, tournaments, and viewing parties",      "color": "#20B2AA"},
    {"name": "Arts & Culture",     "iconName": "PaintBrushIcon",             "description": "Exhibitions, theatre, and creative showcases",      "color": "#FFC0CB"},
    {"name": "Technology",         "iconName": "CpuChipIcon",                "description": "Tech expos, product launches, and meetups",         "color": "#00BFFF"},
    {"name": "Startup & Business", "iconName": "BriefcaseIcon",              "description": "Entrepreneurship and business strategy events",     "color": "#006400"},
    {"name": "Education",          "iconName": "AcademicCapIcon",            "description": "Lectures, classes, and academic events",            "color": "#9370DB"},
    {"name": "Travel & Adventure", "iconName": "GlobeAmericasIcon",          "description": "Outdoor trips, excursions, and travel meetups",     "color": "#32CD32"},
    {"name": "Family & Kids",      "iconName": "BabyIcon",                   "description": "Kid-friendly and family-oriented events",           "color": "#FFDAB9"},
    {"name": "Gaming",             "iconName": "GameControllerIcon",         "description": "Tournaments, streams, and eSports events",          "color": "#9932CC"},
    {"name": "Fashion & Beauty",   "iconName": "ScissorsIcon",               "description": "Fashion shows, beauty expos, and styling events",   "color": "#FF1493"},
    {"name": "Film & Media",       "iconName": "VideoCameraIcon",            "description": "Film screenings and media-related events",          "color": "#A52A2A"},
    {"name": "Charity & Causes",   "iconName": "HandRaisedIcon",             "description": "Fundraisers and non-profit events",                 "color": "#800000"},
    {"name": "Religious & Spiritual", "iconName": "LightBulbIcon",           "description": "Faith-based and spiritual gatherings",              "color": "#6B8E23"},
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _slugify(name: str) -> str:
    """Convert a category name to a URL-safe slug."""
    slug = name.lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


def _connect(mongo_url: str) -> MongoClient:
    try:
        client = MongoClient(mongo_url, serverSelectionTimeoutMS=5000)
        client.admin.command("ping")
        return client
    except ConnectionFailure as exc:
        click.echo(click.style(f"  ✗ Could not connect to MongoDB: {exc}", fg="red"), err=True)
        sys.exit(1)


def _db_name_from_url(mongo_url: str) -> str:
    """Extract database name from a MongoDB connection string."""
    # e.g. mongodb://localhost:27017/gatherle  →  gatherle
    # mongodb+srv://user:pass@host/dbname?options  →  dbname
    match = re.search(r"/([^/?]+)(\?|$)", mongo_url.split("@")[-1])
    if match:
        return match.group(1)
    return "gatherle"


# ---------------------------------------------------------------------------
# Command group
# ---------------------------------------------------------------------------

@click.group()
def db():
    """Database operations (seed, migrate, etc.)"""


# ---------------------------------------------------------------------------
# seed
# ---------------------------------------------------------------------------

@db.command()
@click.option(
    "--drop",
    is_flag=True,
    default=False,
    help="Drop existing collections before seeding.",
)
@click.option(
    "--mongo-url",
    envvar="MONGO_DB_URL",
    default=None,
    help="MongoDB connection string. Falls back to MONGO_DB_URL env var / .env file.",
)
def seed(drop, mongo_url):
    """Seed the database with reference data (event categories, etc.)."""

    resolved_url = mongo_url or get_mongo_url()
    if not resolved_url:
        click.echo(
            click.style(
                "  ✗ No MongoDB URL provided. Set MONGO_DB_URL in your .env file or pass --mongo-url.",
                fg="red",
            ),
            err=True,
        )
        sys.exit(1)

    click.echo(click.style("Connecting to MongoDB...", fg="cyan"))
    client = _connect(resolved_url)
    db_name = _db_name_from_url(resolved_url)
    database = client[db_name]

    click.echo(click.style(f"  Connected  →  {db_name}", fg="green"))

    collection = database["eventcategories"]

    if drop:
        collection.drop()
        click.echo(click.style("  Dropped existing eventcategories collection.", fg="yellow"))

    # ------------------------------------------------------------------
    # Seed event categories (upsert by slug — idempotent by default)
    # ------------------------------------------------------------------
    click.echo(click.style("\nSeeding event categories...", fg="cyan"))

    now = datetime.now(timezone.utc)
    inserted = 0
    skipped = 0

    for cat in EVENT_CATEGORIES:
        slug = _slugify(cat["name"])
        existing = collection.find_one({"slug": slug})

        if existing:
            skipped += 1
            click.echo(f"  ↷  {cat['name']!r:30s} (already exists, skipped)")
            continue

        doc = {
            "eventCategoryId": str(uuid.uuid4()),
            "slug": slug,
            "name": cat["name"],
            "iconName": cat["iconName"],
            "description": cat["description"],
            "color": cat.get("color"),
            "createdAt": now,
            "updatedAt": now,
        }
        collection.insert_one(doc)
        inserted += 1
        click.echo(f"  ✓  {cat['name']!r:30s} (inserted)")

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    click.echo(
        click.style(
            f"\nDone — {inserted} inserted, {skipped} skipped.",
            fg="green" if inserted > 0 else "yellow",
            bold=True,
        )
    )

    client.close()
