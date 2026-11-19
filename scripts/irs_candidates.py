"""Find small charities in IRS data, then run the team's website scraper on them.

1. The IRS Exempt Organizations register (EO BMF, one CSV per state) gives
   every tax-exempt organization's state, NTEE code and revenue. We keep
   small 501(c)(3) public charities whose NTEE code maps to a Clear Cause
   cause.
2. The IRS Form 990 e-file index says which archive holds each charity's
   latest return. Archives allow ranged downloads, so only the needed
   returns are fetched (one small request each), never the whole archive.
3. Each return gives the name, city, mission, website, revenue, expenses
   and, on a full Form 990, the program / management / fundraising split.
4. Where the return lists a website, scrape_charities.py looks for audited
   statements there; those figures win over the return for the same year.
5. Sites in the team's own list (--websites) are scraped too.

Output is JSON in the scraper's format (plus `ein` and `causes`), ready for
import_candidates.py. Everything is imported as pending for review.
"""

import argparse
import csv
import hashlib
import io
import json
import re
import struct
import sys
from collections import defaultdict
from datetime import datetime, timezone
from time import monotonic, sleep
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from xml.etree import ElementTree
import zipfile

AGENT = "ClearCauseBot (student charity-matching prototype)"
BMF_URL = "https://www.irs.gov/pub/irs-soi/eo_{state}.csv"
EFILE_BASE = "https://apps.irs.gov/pub/epostcard/990/xml/{year}"
IRS_PAGE = "https://apps.irs.gov/app/eos/details/?ein={ein}"
NS = {"irs": "http://www.irs.gov/efile"}

STATES = (
    "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ "
    "NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY"
).split()

# NTEE prefixes for each Clear Cause cause. Longest prefix wins, so C27
# (recycling) is reuse while the rest of C is climate.
NTEE_CAUSES = {
    "K3": "hunger", "K30": "hunger", "K31": "hunger", "K34": "hunger", "K35": "hunger", "K36": "hunger",
    "L": "housing",
    "B2": "kids", "O": "kids", "P30": "kids", "P31": "kids", "P32": "kids", "P33": "kids",
    "C": "climate",
    "C27": "reuse",
    "D": "animals",
    "E": "health", "F": "health", "G": "health",
    "A": "arts",
}
NTEE_LABELS = {
    "hunger": "Food program", "housing": "Housing organization", "kids": "Youth and education program",
    "climate": "Environmental organization", "reuse": "Recycling and reuse program",
    "animals": "Animal welfare organization", "health": "Community health organization",
    "arts": "Arts and culture organization",
}
# EO BMF FOUNDATION codes for private foundations (we only list public charities).
PRIVATE_FOUNDATION = {"02", "03", "04"}


def cause_for(ntee):
    """The Clear Cause cause slug for an NTEE code, or None."""
    code = (ntee or "").strip().upper()
    for length in (3, 2, 1):
        if code[:length] in NTEE_CAUSES:
            return NTEE_CAUSES[code[:length]]
    return None


def keep_bmf_row(row, min_revenue, max_revenue):
    """Small, active 501(c)(3) public charities in a cause we cover."""
    if row.get("SUBSECTION") != "03" or row.get("FOUNDATION") in PRIVATE_FOUNDATION:
        return False
    if row.get("STATUS") not in ("01", "1"):
        return False
    try:
        revenue = int(row.get("REVENUE_AMT") or "")
    except ValueError:
        return False
    return min_revenue <= revenue <= max_revenue and cause_for(row.get("NTEE_CD")) is not None


def order_key(ein):
    """A stable shuffle, so each weekly run picks up the next charities rather
    than always the same alphabetical first few."""
    return hashlib.sha256(ein.encode()).hexdigest()


def get(url, attempts=3):
    for attempt in range(attempts):
        try:
            return urlopen(Request(url, headers={"User-Agent": AGENT}), timeout=120)
        except HTTPError as error:
            if error.code == 404:
                return None
            if attempt == attempts - 1:
                raise
        except (URLError, TimeoutError, OSError):
            if attempt == attempts - 1:
                raise
        sleep(10 * (attempt + 1))
    return None


def read_bmf(states, min_revenue, max_revenue, log):
    """EIN -> register row for the charities we might list."""
    found = {}
    for state in states:
        response = get(BMF_URL.format(state=state.lower()))
        if response is None:
            log(f"no IRS register file for {state}")
            continue
        with response:
            rows = csv.DictReader(io.TextIOWrapper(response, encoding="latin-1", newline=""))
            kept = 0
            for row in rows:
                if keep_bmf_row(row, min_revenue, max_revenue):
                    found[row["EIN"].zfill(9)] = row
                    kept += 1
        log(f"{state}: {kept} small charities in our causes")
    return found


def read_index(years, eins, log):
    """EIN -> latest e-filed Form 990 or 990-EZ (object id and archive)."""
    latest = {}
    for year in years:
        response = get(f"{EFILE_BASE.format(year=year)}/index_{year}.csv")
        if response is None:
            log(f"no e-file index for {year}")
            continue
        with response:
            for row in csv.DictReader(io.TextIOWrapper(response, encoding="utf-8", errors="replace", newline="")):
                ein = (row.get("EIN") or "").zfill(9)
                if ein not in eins or row.get("RETURN_TYPE") not in ("990", "990EZ"):
                    continue
                batch = row.get("XML_BATCH_ID") or ""
                if not batch:
                    continue
                current = latest.get(ein)
                period = row.get("TAX_PERIOD") or ""
                if current is None or period > current["period"]:
                    latest[ein] = {"period": period, "type": row["RETURN_TYPE"], "object_id": row["OBJECT_ID"],
                                   "batch": batch, "year": year}
        log(f"e-file index {year}: {len(latest)} charities with a return so far")
    return latest


class RangeFile(io.RawIOBase):
    """A remote file read with HTTP range requests, so zipfile can pull one
    return out of a large IRS archive without downloading all of it."""

    def __init__(self, url):
        self.url, self.pos = url, 0
        request = Request(url, method="HEAD", headers={"User-Agent": AGENT})
        with urlopen(request, timeout=60) as response:  # raises HTTPError 404 for a missing part
            self.size = int(response.headers["Content-Length"])

    def readable(self):
        return True

    def seekable(self):
        return True

    def tell(self):
        return self.pos

    def seek(self, offset, whence=0):
        base = {0: 0, 1: self.pos, 2: self.size}[whence]
        self.pos = base + offset
        return self.pos

    def readinto(self, buffer):
        if self.pos >= self.size or not len(buffer):
            return 0
        end = min(self.size, self.pos + len(buffer)) - 1
        request = Request(self.url, headers={"User-Agent": AGENT, "Range": f"bytes={self.pos}-{end}"})
        for attempt in range(3):
            try:
                with urlopen(request, timeout=120) as response:
                    data = response.read()
                break
            except (URLError, TimeoutError, OSError):
                if attempt == 2:
                    raise
                sleep(5 * (attempt + 1))
        buffer[: len(data)] = data
        self.pos += len(data)
        return len(data)


def text(root, path):
    node = root.find(path, NS)
    return " ".join(node.text.split()) if node is not None and node.text else None


def amount(root, path):
    value = text(root, path)
    try:
        return int(value) if value is not None else None
    except ValueError:
        return None


def tidy(value, limit=None):
    """IRS text is often ALL CAPS; make it readable."""
    if not value:
        return None
    value = " ".join(value.split())
    if value.isupper():
        value = value.capitalize() if limit else value.title()
    if limit and len(value) > limit:
        value = value[: limit].rsplit(" ", 1)[0].rstrip(",;:") + "…"
    return value


def website(value):
    if not value or value.strip().upper() in {"N/A", "NA", "NONE", "0"}:
        return None
    value = value.strip().lower()
    if not re.match(r"^(https?://)?[a-z0-9.-]+\.[a-z]{2,}(/.*)?$", value):
        return None
    return value if value.startswith("http") else f"https://{value}"


def parse_return(xml_bytes):
    """Pull the fields we list from one Form 990 / 990-EZ e-file return."""
    root = ElementTree.fromstring(xml_bytes)
    header = "irs:ReturnHeader"
    filer = f"{header}/irs:Filer"
    form = root.find("irs:ReturnData/irs:IRS990", NS)
    ez = root.find("irs:ReturnData/irs:IRS990EZ", NS)
    data = form if form is not None else ez
    if data is None:
        return None
    year = amount(root, f"{header}/irs:TaxYr")
    result = {
        "name": tidy(" ".join(filter(None, (
            text(root, f"{filer}/irs:BusinessName/irs:BusinessNameLine1Txt"),
            text(root, f"{filer}/irs:BusinessName/irs:BusinessNameLine2Txt"),
        )))),
        "city": tidy(text(root, f"{filer}/irs:USAddress/irs:CityNm")),
        "state": text(root, f"{filer}/irs:USAddress/irs:StateAbbreviationCd"),
        "taxYear": year,
        "website": website(text(data, "irs:WebsiteAddressTxt")),
        "mission": tidy(
            text(data, "irs:ActivityOrMissionDesc") or text(data, "irs:MissionDesc") or text(data, "irs:PrimaryExemptPurposeTxt"),
            limit=280,
        ),
        "formType": "990" if form is not None else "990-EZ",
    }
    if form is not None:
        group = "irs:TotalFunctionalExpensesGrp"
        result.update({
            "totalRevenue": amount(form, "irs:CYTotalRevenueAmt"),
            "totalExpenses": amount(form, "irs:CYTotalExpensesAmt") or amount(form, f"{group}/irs:TotalAmt"),
            "programServiceExpenses": amount(form, f"{group}/irs:ProgramServicesAmt"),
            "managementAndGeneralExpenses": amount(form, f"{group}/irs:ManagementAndGeneralAmt"),
            "fundraisingExpenses": amount(form, f"{group}/irs:FundraisingAmt"),
        })
    else:
        result.update({"totalRevenue": amount(ez, "irs:TotalRevenueAmt"), "totalExpenses": amount(ez, "irs:TotalExpensesAmt")})
    return result


METRICS = ("totalRevenue", "totalExpenses", "programServiceExpenses", "managementAndGeneralExpenses", "fundraisingExpenses")


def to_record(ein, bmf_row, filing):
    """A record in the scraper's format, citing the IRS's own page for the charity."""
    cause = cause_for(bmf_row.get("NTEE_CD"))
    city = filing.get("city") or tidy(bmf_row.get("CITY"))
    state = filing.get("state") or bmf_row.get("STATE")
    year = filing.get("taxYear")
    highlights = [
        {"metric": metric, "amount": filing[metric], "fiscalYear": year, "page": None}
        for metric in METRICS
        if isinstance(year, int) and filing.get(metric) is not None
    ]
    source = IRS_PAGE.format(ein=ein)
    label = NTEE_LABELS.get(cause, "Charity")
    return {
        "name": filing.get("name") or tidy(bmf_row.get("NAME")),
        "ein": f"{ein[:2]}-{ein[2:]}",
        "description": filing.get("mission") or (f"{label} in {city}, {state}." if city and state else None),
        "city": city,
        "region": state,
        "country": "US",
        "causes": [cause] if cause else [],
        "websiteUrl": filing.get("website"),
        "sourceUrl": source,
        "sourceName": f"IRS Form {filing.get('formType', '990')} e-file data",
        "scrapedAt": datetime.now(timezone.utc).isoformat(),
        "financialLinks": [],
        "financialStatements": (
            [{"url": source, "label": f"IRS Form {filing.get('formType', '990')}, tax year {year}", "highlights": highlights}]
            if highlights else []
        ),
        "financialStatementErrors": [],
    }


def pick(bmf, filings, skip_eins, per_state_cause):
    """Up to N per state and cause, full Form 990 filers first (they report
    the program split), in a stable shuffled order."""
    groups = defaultdict(list)
    for ein, filing in filings.items():
        if ein in skip_eins:
            continue
        row = bmf[ein]
        groups[(row["STATE"], cause_for(row.get("NTEE_CD")))].append(ein)
    chosen = []
    for key in sorted(groups):
        eins = sorted(groups[key], key=lambda e: (filings[e]["type"] != "990", order_key(e)))
        chosen.extend(eins[:per_state_cause])
    return chosen


DEFLATE64 = 9


def read_member(archive, name):
    """Read one return. A few IRS archives use Deflate64, which Python's
    zipfile can't decompress; those need the optional `inflate64` package."""
    info = archive.getinfo(name)
    if info.compress_type != DEFLATE64:
        return archive.read(name)
    try:
        import inflate64
    except ImportError as error:
        raise NotImplementedError("Deflate64 archive; install inflate64 to read it") from error
    fp = archive.fp
    fp.seek(info.header_offset)
    header = fp.read(30)
    name_length, extra_length = struct.unpack("<HH", header[26:30])
    fp.seek(info.header_offset + 30 + name_length + extra_length)
    return inflate64.Inflater().inflate(fp.read(info.compress_size))


def next_part(batch):
    """2025_TEOS_XML_05A -> 2025_TEOS_XML_05B. The index names only a month's
    first archive, but big months are split across several parts."""
    if not batch or not batch[-1].isalpha() or batch[-1].upper() >= "H":
        return None
    return batch[:-1] + chr(ord(batch[-1].upper()) + 1)


def fetch_returns(chosen, filings, log):
    """Read each chosen return from its archive, one archive at a time. A
    return missing from the named archive is looked for in the next part."""
    queue = defaultdict(list)
    for ein in chosen:
        queue[(filings[ein]["year"], filings[ein]["batch"])].append(ein)
    results = {}
    while queue:
        (year, batch), eins = min(queue.items())
        del queue[(year, batch)]
        url = f"{EFILE_BASE.format(year=year)}/{batch}.zip"
        try:
            archive = zipfile.ZipFile(io.BufferedReader(RangeFile(url), buffer_size=1 << 16))
        except HTTPError as error:
            if error.code != 404:
                log(f"skipped archive {batch}: {error}")
            continue  # no further parts
        except (OSError, zipfile.BadZipFile, KeyError) as error:
            log(f"skipped archive {batch}: {error}")
            continue
        members = {name.split("/")[-1].split("_")[0]: name for name in archive.namelist()}
        missing = []
        for ein in eins:
            member = members.get(filings[ein]["object_id"])
            if not member:
                missing.append(ein)
                continue
            try:
                parsed = parse_return(read_member(archive, member))
            except NotImplementedError as error:
                log(f"skipped archive {batch}: {error}")
                break
            except (OSError, ElementTree.ParseError, zipfile.BadZipFile) as error:
                log(f"skipped return for {ein}: {error}")
                continue
            if parsed:
                results[ein] = parsed
        found = sum(e in results for e in eins)
        log(f"archive {batch}: read {found} of {len(eins) - len(missing)} returns here")
        if missing and next_part(batch):
            queue[(year, next_part(batch))].extend(missing)
    return results


def scrape_sites(records_by_url, deadline, log):
    """Run the team's scraper on each site until the time budget runs out.
    Returns url -> scraper record (or None when the site couldn't be read)."""
    if __package__:
        from . import scrape_charities as scraper
    else:
        import scrape_charities as scraper
    fetcher = scraper.Fetcher()
    results = {}
    for url in records_by_url:
        if monotonic() > deadline:
            log(f"scrape time budget reached; {len(records_by_url) - len(results)} sites left for next run")
            break
        try:
            source_url, headers, body = fetcher.fetch(scraper.web_url(url))
            html = scraper.decode_html(headers, body)
            record = scraper.extract_charity(html, source_url)
            scraper.collect_financial_statements(fetcher, record, scraper.parse_html(html))
            results[url] = record
            found = sum(bool(s.get("highlights")) for s in record.get("financialStatements") or [])
            log(f"scraped {url}: {found} statement(s) with figures")
        except Exception as error:  # one bad site must never stop the run
            results[url] = None
            log(f"could not scrape {url}: {error}")
    return results


def read_lines(path):
    if not path:
        return []
    with open(path, encoding="utf-8") as handle:
        return [line.strip() for line in handle if line.strip() and not line.lstrip().startswith("#")]


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--states", nargs="+", default=STATES, help="Two-letter state codes (default: all)")
    parser.add_argument("--per-state-cause", type=int, default=2, help="New charities per state and cause per run")
    parser.add_argument("--min-revenue", type=int, default=50_000)
    parser.add_argument("--max-revenue", type=int, default=5_000_000)
    parser.add_argument("--years", nargs="+", type=int, help="E-file index years (default: this year and the two before)")
    parser.add_argument("--skip-eins", help="File of EINs already in the database, one per line")
    parser.add_argument("--websites", help="The team's list of charity websites to scrape, one per line")
    parser.add_argument("--skip-websites", help="File of websites already in the database, one per line")
    parser.add_argument("--scrape-minutes", type=float, default=60, help="Time budget for website scraping")
    parser.add_argument("--no-scrape", action="store_true", help="Use IRS returns only")
    parser.add_argument("--out", required=True, help="Where to write the JSON (updated as it goes)")
    args = parser.parse_args(argv)

    started = monotonic()
    log = lambda message: print(message, file=sys.stderr, flush=True)  # noqa: E731
    this_year = datetime.now(timezone.utc).year
    years = args.years or [this_year, this_year - 1, this_year - 2]
    skip_eins = {e.replace("-", "").strip().zfill(9) for e in read_lines(args.skip_eins)}
    skip_sites = {s.rstrip("/").lower() for s in read_lines(args.skip_websites)}

    def save(records):
        with open(args.out, "w", encoding="utf-8") as handle:
            json.dump(records, handle, indent=2)

    bmf = read_bmf(args.states, args.min_revenue, args.max_revenue, log)
    filings = read_index(years, set(bmf) - skip_eins, log)
    chosen = pick(bmf, filings, skip_eins, args.per_state_cause)
    log(f"chose {len(chosen)} charities to read")
    returns = fetch_returns(chosen, filings, log)
    records = [to_record(ein, bmf[ein], returns[ein]) for ein in chosen if ein in returns]
    save(records)

    # The team's own list, minus sites we already have.
    listed = [u for u in read_lines(args.websites) if u.rstrip("/").lower() not in skip_sites]
    if not args.no_scrape:
        deadline = started + args.scrape_minutes * 60
        # Team list first (someone asked for these), then IRS-listed websites.
        targets = {url: None for url in listed}
        for record in records:
            if record.get("websiteUrl"):
                targets.setdefault(record["websiteUrl"], record)
        scraped = scrape_sites(targets, deadline, log)
        for url, scraper_record in scraped.items():
            if not scraper_record:
                continue
            irs_record = targets.get(url)
            if irs_record is None:
                records.append(scraper_record)  # a team-listed site with no IRS match
            else:
                # Audited statements first so their figures win for the same year.
                irs_record["financialStatements"] = (
                    [s for s in scraper_record.get("financialStatements") or [] if s.get("highlights")]
                    + irs_record["financialStatements"]
                )
                irs_record["financialLinks"] = scraper_record.get("financialLinks") or []
        save(records)
    log(f"Found {len(records)} candidates.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
