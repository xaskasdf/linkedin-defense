"""
LinkedIn Extension Data Poisoner
Sends realistic-looking fake extension detection data to LinkedIn's telemetry
endpoints, polluting their extension fingerprinting database with noise.

Reference: https://browsergate.eu/the-evidence-pack/

Usage:
    pip install requests
    python poisoner.py --cookie "li_at=YOUR_SESSION_COOKIE" --rounds 100
"""

import argparse
import json
import random
import string
import time
import sys
from urllib.parse import urljoin

import requests

# Real Chrome Web Store extension ID format: 32 lowercase alpha chars
def generate_extension_id():
    return "".join(random.choices(string.ascii_lowercase, k=32))


# Common extension resource paths that LinkedIn probes for
KNOWN_RESOURCE_PATHS = [
    "manifest.json",
    "popup.html",
    "popup.js",
    "background.js",
    "content.js",
    "assets/index.js",
    "icons/icon16.png",
    "icons/icon48.png",
    "icons/icon128.png",
    "css/content.css",
    "js/content-script.js",
    "img/logo.png",
    "options.html",
    "_metadata/verified_contents.json",
]

# Realistic file path patterns with hashes (like real bundled extensions)
def generate_resource_path():
    if random.random() < 0.3:
        hash_part = "".join(random.choices(string.ascii_letters + string.digits, k=8))
        return f"assets/index-{hash_part}.js"
    return random.choice(KNOWN_RESOURCE_PATHS)


# Generate a batch of fake "detected" extensions
def generate_fake_extensions(count):
    return [
        {"id": generate_extension_id(), "file": generate_resource_path()}
        for _ in range(count)
    ]


# Mimic LinkedIn's AedEvent payload
def build_aed_event(extensions):
    return {
        "eventName": "AedEvent",
        "eventBody": {
            "browserExtensionIds": [ext["id"] for ext in extensions],
            "detectionMethod": random.choice(["fetch", "dom_scan"]),
            "scanDurationMs": random.randint(200, 3000),
            "extensionCount": len(extensions),
        },
        "eventInfo": {
            "pageKey": "d_flagship3_profile",
            "trackingId": generate_tracking_id(),
        },
    }


# Mimic LinkedIn's SpectroscopyEvent payload
def build_spectroscopy_event(extensions):
    return {
        "eventName": "SpectroscopyEvent",
        "eventBody": {
            "detectedExtensions": [
                {"extensionId": ext["id"], "source": "dom_prefix_scan"}
                for ext in extensions
            ],
            "scanType": "passive",
            "documentNodeCount": random.randint(500, 5000),
        },
        "eventInfo": {
            "pageKey": "d_flagship3_feed",
            "trackingId": generate_tracking_id(),
        },
    }


def generate_tracking_id():
    parts = [
        "".join(random.choices(string.ascii_letters + string.digits, k=segment))
        for segment in [8, 4, 4, 4, 12]
    ]
    return "-".join(parts)


# Realistic browser fingerprint noise (APFC/DNA style)
def build_fingerprint_noise():
    return {
        "userAgent": random_user_agent(),
        "screenResolution": random.choice(
            ["1920x1080", "2560x1440", "1366x768", "3840x2160", "1440x900"]
        ),
        "colorDepth": random.choice([24, 32]),
        "timezone": random.choice(
            [
                "America/Santiago",
                "America/New_York",
                "Europe/London",
                "Asia/Tokyo",
                "America/Los_Angeles",
                "Europe/Berlin",
                "America/Sao_Paulo",
            ]
        ),
        "language": random.choice(
            ["es-CL", "en-US", "pt-BR", "de-DE", "ja-JP", "fr-FR", "en-GB"]
        ),
        "platform": "Win32",
        "hardwareConcurrency": random.choice([4, 8, 12, 16]),
        "deviceMemory": random.choice([4, 8, 16, 32]),
    }


def random_user_agent():
    chrome_version = random.randint(120, 135)
    build = random.randint(6000, 7000)
    patch = random.randint(0, 200)
    return (
        f"Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        f"AppleWebKit/537.36 (KHTML, like Gecko) "
        f"Chrome/{chrome_version}.0.{build}.{patch} Safari/537.36"
    )


LINKEDIN_TRACK_ENDPOINTS = [
    "https://www.linkedin.com/li/track",
    "https://www.linkedin.com/platform-telemetry/li/apfcDf",
]


def send_poisoned_data(session, extensions, endpoint, verbose=False):
    """Send a single batch of fake extension data."""
    # Randomly choose event type
    if random.random() < 0.5:
        event = build_aed_event(extensions)
    else:
        event = build_spectroscopy_event(extensions)

    # Add fingerprint noise
    event["eventBody"]["fingerprint"] = build_fingerprint_noise()

    headers = {
        "Content-Type": "application/json",
        "User-Agent": random_user_agent(),
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "X-Requested-With": "XMLHttpRequest",
        "X-Restli-Protocol-Version": "2.0.0",
        "Csrf-Token": session.cookies.get("JSESSIONID", "ajax:0000000000000000000"),
        "Referer": "https://www.linkedin.com/feed/",
        "Origin": "https://www.linkedin.com",
    }

    try:
        resp = session.post(endpoint, json=event, headers=headers, timeout=10)
        if verbose:
            print(
                f"  [{resp.status_code}] -> {endpoint} "
                f"({len(extensions)} fake extensions)"
            )
        return resp.status_code
    except requests.exceptions.RequestException as e:
        if verbose:
            print(f"  [ERROR] {e}")
        return None


def run_poisoner(cookie, rounds, batch_size, delay, verbose):
    session = requests.Session()

    # Set LinkedIn session cookie
    session.cookies.set("li_at", cookie, domain=".linkedin.com")

    # First, visit LinkedIn to get CSRF token and other session cookies
    print("[*] Initializing session...")
    try:
        init_resp = session.get(
            "https://www.linkedin.com/feed/",
            headers={"User-Agent": random_user_agent()},
            timeout=15,
        )
        print(f"[*] Session initialized (HTTP {init_resp.status_code})")
    except requests.exceptions.RequestException as e:
        print(f"[!] Could not initialize session: {e}")
        print("[*] Continuing anyway...")

    print(f"[*] Starting data poisoning: {rounds} rounds, {batch_size} extensions/batch")
    print(f"[*] Delay between rounds: {delay}s (randomized +/- 50%)")
    print()

    total_sent = 0
    errors = 0

    for i in range(1, rounds + 1):
        # Generate fresh fake extensions each round
        fake_exts = generate_fake_extensions(batch_size)
        endpoint = random.choice(LINKEDIN_TRACK_ENDPOINTS)

        print(f"[Round {i}/{rounds}] Sending {batch_size} fake extensions to {endpoint}")

        status = send_poisoned_data(session, fake_exts, endpoint, verbose)

        if status and 200 <= status < 400:
            total_sent += batch_size
        else:
            errors += 1

        # Randomized delay to look more organic
        actual_delay = delay * random.uniform(0.5, 1.5)
        time.sleep(actual_delay)

    print()
    print(f"[*] Done. Sent {total_sent} fake extension IDs across {rounds} rounds.")
    print(f"[*] Errors: {errors}")


def main():
    parser = argparse.ArgumentParser(
        description="LinkedIn Extension Data Poisoner - pollute their fingerprinting DB"
    )
    parser.add_argument(
        "--cookie",
        required=True,
        help='Your li_at session cookie (from browser DevTools > Application > Cookies)',
    )
    parser.add_argument(
        "--rounds", type=int, default=50, help="Number of rounds to send (default: 50)"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=30,
        help="Fake extensions per round (default: 30)",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=3.0,
        help="Base delay between rounds in seconds (default: 3.0)",
    )
    parser.add_argument(
        "--verbose", action="store_true", help="Show detailed request info"
    )

    args = parser.parse_args()
    run_poisoner(args.cookie, args.rounds, args.batch_size, args.delay, args.verbose)


if __name__ == "__main__":
    main()
