"""Find candidate charities in ProPublica's Nonprofit Explorer API.

Searches by cause keyword and state, keeps small 501(c)(3)s with a recent
990 on file, and prints records in the scraper's JSON shape so
import_candidates.py can turn them into a reviewable migration:

    python scripts/discover_propublica.py --states OH MI PA --per-cause 2 > propublica.json
    python scripts/import_candidates.py propublica.json

What ProPublica provides (from the IRS 990 extracts): name, EIN, city, state,
NTEE category, and per filing year total revenue, total expenses and
contributions, plus a link to the filed 990. It does NOT provide a website,
mission text, or the program / admin / fundraising split; those stay empty
until a reviewer (or a future 990 reader) adds them.

Data terms: https://www.propublica.org/about/propublica-data-terms-of-use
Anywhere these figures appear, cite ProPublica's Nonprofit Explorer.
"""

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
from time import sleep
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

API = "https://projects.propublica.org/nonprofits/api/v2"
ORG_PAGE = "https://projects.propublica.org/nonprofits/organizations/{ein}"
AGENT = "ClearCauseBot (student charity-matching prototype)"

# Cause -> (keyword searches, NTEE major-group letters that fit the cause).
CAUSES = {
    "hunger": (["food pantry", "food bank"], "K"),
    "housing": (["housing", "homeless shelter"], "L"),
    "kids": (["youth", "literacy", "after school"], "BOP"),
    "climate": (["watershed", "conservancy", "environmental"], "C"),
    "animals": (["animal rescue", "humane society"], "D"),
    "health": (["free clinic", "community health"], "EFG"),
    "arts": (["arts council", "community theatre"], "A"),
    "reuse": (["tool library", "recycling", "repair"], "C"),
}

# Short, factual labels for the NTEE codes we expect, used as a placeholder
# description until a reviewer writes a real one.
NTEE_LABELS = {
    "K30": "Food programs", "K31": "Food bank or pantry", "K34": "Congregate meals", "K35": "Soup kitchen",
    "K36": "Meals on wheels", "L20": "Housing development", "L21": "Public housing", "L22": "Senior housing",
    "L41": "Homeless shelter", "L80": "Housing support", "L81": "Home improvement and repairs",
    "B90": "Educational services", "B92": "Remedial reading and literacy", "O20": "Youth centers and clubs",
    "O50": "Youth development programs", "P30": "Children and youth services", "C30": "Natural resources conservation",
    "C32": "Water resources and wetlands", "C34": "Land resources conservation", "C27": "Recycling",
    "C20": "Pollution abatement", "C60": "Environmental education", "D20": "Animal protection and welfare",
    "D40": "Wildlife sanctuary", "E32": "Community health clinic", "E30": "Ambulatory health center",
    "A20": "Arts and culture", "A25": "Arts education", "A65": "Theater", "A90": "Arts service organization",
}


def get_json(path, params=None):
    url = f"{API}{path}" + (f"?{urlencode(params)}" if params else "")
    request = Request(url, headers={"User-Agent": AGENT, "Accept": "application/json"})
    for attempt in range(3):
        try:
            with urlopen(request, timeout=30) as response:
                return json.load(response)
        except HTTPError as error:
            if error.code == 404:
                return None
            if error.code in (429, 500, 502, 503) and attempt < 2:
                sleep(5 * (attempt + 1))
                continue
            raise
        except (URLError, TimeoutError, OSError) as error:
            # A dropped connection or DNS blip shouldn't lose a long run:
            # back off, and after three tries skip just this request.
            if attempt < 2:
                sleep(10 * (attempt + 1))
                continue
            print(f"skipped {url}: {error}", file=sys.stderr)
    return None


def latest_filing(filings, min_year):
    usable = [f for f in filings or [] if f.get("totfuncexpns") and f.get("tax_prd_yr", 0) >= min_year]
    return max(usable, key=lambda f: f["tax_prd_yr"], default=None)


def to_record(org, filings, cause):
    ein = str(org["ein"]).zfill(9)
    ntee = (org.get("ntee_code") or "").upper()
    label = NTEE_LABELS.get(ntee[:3])
    city = (org.get("city") or "").title() or None
    statements = []
    for f in sorted(filings, key=lambda f: f["tax_prd_yr"], reverse=True)[:3]:
        source = f.get("pdf_url") or ORG_PAGE.format(ein=ein)
        highlights = [
            {"metric": metric, "amount": f[key], "fiscalYear": f["tax_prd_yr"], "page": None}
            for metric, key in (("totalRevenue", "totrevenue"), ("totalExpenses", "totfuncexpns"))
            if f.get(key) is not None
        ]
        if highlights:
            statements.append({"url": source, "label": f"IRS Form 990, tax year {f['tax_prd_yr']}", "highlights": highlights})
    return {
        "name": " ".join(org["name"].split()),
        "ein": f"{ein[:2]}-{ein[2:]}",
        "description": f"{label} in {city}, {org['state']}." if label and city else None,
        "city": city,
        "region": org.get("state"),
        "country": "US",
        "causes": [cause],
        "sourceUrl": ORG_PAGE.format(ein=ein),
        "sourceName": "ProPublica Nonprofit Explorer (IRS Form 990 data)",
        "scrapedAt": datetime.now(timezone.utc).isoformat(),
        "financialLinks": [],
        "financialStatements": statements,
        "financialStatementErrors": [],
    }


def discover(states, per_cause, max_expenses, min_expenses, min_year, pause, checkpoint=None):
    records, seen = [], set()
    for cause, (keywords, letters) in CAUSES.items():
        for state in states:
            found = 0
            for keyword in keywords:
                if found >= per_cause:
                    break
                result = get_json("/search.json", {"q": keyword, "state[id]": state, "c_code[id]": 3})
                sleep(pause)
                for hit in (result or {}).get("organizations", []):
                    if found >= per_cause:
                        break
                    ein = hit["ein"]
                    ntee = (hit.get("ntee_code") or "").upper()
                    if ein in seen or not ntee or ntee[0] not in letters:
                        continue
                    seen.add(ein)
                    detail = get_json(f"/organizations/{ein}.json")
                    sleep(pause)
                    if not detail:
                        continue
                    filing = latest_filing(detail.get("filings_with_data"), min_year)
                    if not filing or not (min_expenses <= filing["totfuncexpns"] <= max_expenses):
                        continue
                    usable = [f for f in detail["filings_with_data"] if f.get("totfuncexpns") and f.get("tax_prd_yr", 0) >= min_year]
                    records.append(to_record(detail["organization"], usable, cause))
                    found += 1
                    if checkpoint:  # save as we go so an interrupted run keeps what it found
                        Path(checkpoint).write_text(json.dumps(records, indent=2), encoding="utf-8")
                    print(f"{cause:8} {state}  {detail['organization']['name']}", file=sys.stderr)
    return records


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--states", nargs="+", default=["OH", "MI", "PA", "NY", "CA", "TX"], help="Two-letter state codes")
    parser.add_argument("--per-cause", type=int, default=1, help="Charities per cause per state")
    parser.add_argument("--max-expenses", type=int, default=5_000_000, help="Skip charities spending more than this a year")
    parser.add_argument("--min-expenses", type=int, default=50_000, help="Skip charities spending less than this a year")
    parser.add_argument("--min-year", type=int, default=2021, help="Oldest acceptable filing year")
    parser.add_argument("--pause", type=float, default=1.0, help="Seconds between API requests")
    parser.add_argument("--out", help="Write results to this file, updated after each charity found (default: stdout at the end)")
    args = parser.parse_args(argv)

    records = discover(args.states, args.per_cause, args.max_expenses, args.min_expenses, args.min_year, args.pause, args.out)
    if not args.out:
        print(json.dumps(records, indent=2))
    print(f"Found {len(records)} candidates.", file=sys.stderr)
    return 0 if records else 1


if __name__ == "__main__":
    raise SystemExit(main())
