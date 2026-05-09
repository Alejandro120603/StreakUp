"""
Quotes service — proxies ZenQuotes random quote API.
"""
import json
import urllib.request
import urllib.error
from flask import current_app


class QuoteUnavailableError(RuntimeError):
    """ZenQuotes API unreachable or returned unusable data."""


def fetch_random_quote() -> dict:
    """Return {"quote": str, "author": str} from ZenQuotes. Raises QuoteUnavailableError on failure."""
    url = "https://zenquotes.io/api/random"
    req = urllib.request.Request(url, headers={"User-Agent": "StreakUp/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
        quote = data[0]["q"].strip()
        author = data[0]["a"].strip()
        if not quote or not author:
            raise QuoteUnavailableError("Empty quote or author from ZenQuotes")
        return {"quote": quote, "author": author}
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, IndexError, KeyError) as exc:
        current_app.logger.warning("ZenQuotes unavailable: %s", exc)
        raise QuoteUnavailableError(str(exc)) from exc
