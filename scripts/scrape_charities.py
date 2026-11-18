"""Collect review candidates from explicitly supplied charity website URLs."""

import argparse
from datetime import datetime, timezone
from heapq import heappop, heappush
from html.parser import HTMLParser
import json
import re
import sys
from time import monotonic, sleep
from urllib.error import HTTPError
from urllib.parse import unquote, urljoin, urlsplit, urlunsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
from urllib.robotparser import RobotFileParser

if __package__:
    from .financial_statements import read_highlights
else:
    from financial_statements import read_highlights


AGENT = "ClearCauseBot"
MAX_BYTES = 2 * 1024 * 1024
MAX_PDF_BYTES = 20 * 1024 * 1024
MAX_REPORT_PAGES = 8
MAX_REPORT_DEPTH = 3
MAX_STATEMENTS = 5
REDIRECTS = {301, 302, 303, 307, 308}
ORGANIZATION_TYPES = {"Organization", "NGO", "NonprofitOrganization", "CharitableOrganization"}
FINANCIAL_LINK = re.compile(
    r"\b(?:annual[\s_-]+reports?|(?:irs[\s_-]+)?form[\s_-]+990(?:[\s_-]?(?:ez|pf))?"
    r"|financials|financial[\s_-]+(?:statements?|reports?|information|results)"
    r"|audited[\s_-]+financials?|audit[\s_-]+reports?)\b",
    re.IGNORECASE,
)
REPORTS_PAGE = re.compile(r"\breports?[\s_&-]+(?:and[\s_-]+)?financials?\b", re.IGNORECASE)
STATEMENT_LINK = re.compile(
    r"\b(?:financial[\s_-]+statements?|audited[\s_-]+financials?|audit(?:ed)?[\s_-]+reports?)\b",
    re.IGNORECASE,
)
ABOUT_LINK = re.compile(r"^about(?:\s+(?:us|the\s+organization|our\s+organization))?$", re.I)


def clean_text(value):
    return " ".join(value.split()) if isinstance(value, str) else ""


def web_url(value):
    parts = urlsplit(value)
    if parts.scheme not in {"http", "https"} or not parts.hostname or parts.username is not None:
        raise ValueError("Expected an HTTP(S) URL without credentials")
    query = "&".join(
        part for part in parts.query.split("&")
        if not unquote(part.partition("=")[0]).lower().startswith("utm_")
        and unquote(part.partition("=")[0]).lower() not in {"sc_icid", "msockid", "fbclid", "gclid"}
    )
    return urlunsplit(parts._replace(path=parts.path or "/", query=query, fragment=""))


def financial_link(url, label):
    text = f"{label or ''} {unquote(urlsplit(url).path)}"
    return bool(FINANCIAL_LINK.search(text) or REPORTS_PAGE.search(text) or STATEMENT_LINK.search(text))


def about_link(url, label, source_url):
    parts = urlsplit(url)
    path = parts.path.strip("/").removesuffix(".html")
    same_host = parts.hostname.removeprefix("www.") == urlsplit(source_url).hostname.removeprefix("www.")
    return same_host and (ABOUT_LINK.fullmatch(label or "") or
                          ("/" not in path and re.fullmatch(r"about(?:[-_].+)?", path, re.I)))


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


class Fetcher:
    def __init__(self):
        self.opener = build_opener(NoRedirect())
        self.robots = {}
        self.last_request = None

    def fetch(self, url, *, check_robots=True, max_bytes=MAX_BYTES):
        for _ in range(6):
            delay = 1
            if check_robots:
                rules = self.robot_rules(url)
                if not rules.can_fetch(AGENT, url):
                    raise ValueError(f"robots.txt disallows {url}")
                delay = max(delay, rules.crawl_delay(AGENT) or 0)

            if self.last_request is not None:
                sleep(max(0, delay - (monotonic() - self.last_request)))
            self.last_request = monotonic()
            request = Request(url, headers={"User-Agent": f"{AGENT}/0.1"})
            try:
                with self.opener.open(request, timeout=10) as response:
                    body = response.read(max_bytes + 1)
                    if len(body) > max_bytes:
                        raise ValueError(f"Response exceeds {max_bytes // (1024 * 1024)} MiB")
                    return url, response.headers, body
            except HTTPError as error:
                with error:
                    target = error.headers.get("Location")
                    if error.code not in REDIRECTS or not target:
                        raise
                    url = web_url(urljoin(url, target))
        raise ValueError("Too many redirects")

    def robot_rules(self, url):
        robots_url = urljoin(url, "/robots.txt")
        if robots_url not in self.robots:
            rules = RobotFileParser(robots_url)
            try:
                _, _, body = self.fetch(robots_url, check_robots=False)
            except HTTPError as error:
                if error.code not in {404, 410}:
                    raise ValueError(f"Could not check {robots_url} (HTTP {error.code})") from error
                body = b""
            rules.parse(body.decode("utf-8-sig", errors="replace").splitlines())
            self.robots[robots_url] = rules
        return self.robots[robots_url]


class CharityPage(HTMLParser):
    def __init__(self):
        super().__init__()
        self.metadata = {}
        self.json_ld = []
        self.title = []
        self.links = []
        self.in_title = False
        self.script = None
        self.link = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "meta":
            key = (attrs.get("property") or attrs.get("name") or "").lower()
            value = clean_text(attrs.get("content"))
            if key and value:
                self.metadata.setdefault(key, value)
        elif tag == "script" and (attrs.get("type") or "").lower() == "application/ld+json":
            self.script = []
        elif tag == "title":
            self.in_title = True
        elif tag == "a" and attrs.get("href"):
            self.link = (attrs["href"], [attrs.get("aria-label") or attrs.get("title") or ""])

    def handle_data(self, data):
        if self.script is not None:
            self.script.append(data)
        elif self.in_title:
            self.title.append(data)
        elif self.link:
            self.link[1].append(data)

    def handle_endtag(self, tag):
        if tag == "script" and self.script is not None:
            try:
                self.json_ld.append(json.loads("".join(self.script)))
            except (ValueError, RecursionError):
                pass
            self.script = None
        elif tag == "title":
            self.in_title = False
        elif tag == "a" and self.link:
            href, parts = self.link
            self.links.append((href, clean_text(" ".join(parts))))
            self.link = None


def organization_nodes(value):
    if isinstance(value, list):
        for item in value:
            yield from organization_nodes(item)
    elif isinstance(value, dict):
        types = value.get("@type")
        for kind in types if isinstance(types, list) else [types]:
            if isinstance(kind, str) and kind.rsplit("/", 1)[-1] in ORGANIZATION_TYPES:
                yield value
                break
        yield from organization_nodes(value.get("@graph"))


def parse_html(html):
    page = CharityPage()
    page.feed(html)
    page.close()
    return page


def extract_charity(html, source_url):
    page = parse_html(html)
    organizations = list(organization_nodes(page.json_ld))
    organization = next((entry for entry in organizations if clean_text(entry.get("name"))), {})
    address = organization.get("address")
    address = address if isinstance(address, dict) else {}

    name = (clean_text(organization.get("name")) or page.metadata.get("og:site_name")
            or page.metadata.get("og:title") or clean_text("".join(page.title)))
    if not name:
        raise ValueError("No organization name or page title found")
    description = (clean_text(organization.get("description")) or page.metadata.get("og:description")
                   or page.metadata.get("description"))

    financial_links = {}
    for href, label in page.links:
        try:
            url = web_url(urljoin(source_url, href))
        except ValueError:
            continue
        if financial_link(url, label):
            financial_links.setdefault(url, {"url": url, "label": label or None})

    return {
        "name": name,
        "description": description or None,
        "city": clean_text(address.get("addressLocality")) or None,
        "region": clean_text(address.get("addressRegion")) or None,
        "country": clean_text(address.get("addressCountry")) or None,
        "sourceUrl": source_url,
        "scrapedAt": datetime.now(timezone.utc).isoformat(),
        "financialLinks": list(financial_links.values()),
    }


def is_pdf_url(url):
    return unquote(urlsplit(url).path).lower().endswith(".pdf")


def statement_year(entry):
    url, (label, _) = entry
    years = re.findall(r"(?:19|20)\d{2}", label or "")
    if not years:
        years = re.findall(r"(?:19|20)\d{2}", unquote(urlsplit(url).path).rsplit("/", 1)[-1])
    return max(map(int, years), default=0)


def discover_statements(fetcher, record, source_page=None):
    statements = {}
    financial_links = {link["url"]: link for link in record["financialLinks"]}
    pending = []
    visited = {record["sourceUrl"]}
    errors = []

    def enqueue(url, label, depth):
        is_financial = financial_link(url, label)
        if is_financial:
            financial_links.setdefault(url, {"url": url, "label": label or None})
        text = f"{label or ''} {unquote(urlsplit(url).path)}"
        if is_pdf_url(url):
            if STATEMENT_LINK.search(text):
                statements.setdefault(url, (label, None))
        elif url not in visited and depth <= MAX_REPORT_DEPTH:
            if is_financial or about_link(url, label, record["sourceUrl"]):
                heappush(pending, (0 if is_financial else 1, depth, url, label or ""))
                visited.add(url)

    for link in list(financial_links.values()):
        enqueue(link["url"], link["label"], 1)
    if source_page is not None:
        for href, label in source_page.links:
            try:
                enqueue(web_url(urljoin(record["sourceUrl"], href)), label, 1)
            except ValueError:
                continue

    pages_fetched = 0
    while pending and pages_fetched < MAX_REPORT_PAGES:
        priority, depth, url, label = heappop(pending)
        if priority > 0 and statements:
            break
        pages_fetched += 1
        try:
            final_url, headers, body = fetcher.fetch(url, max_bytes=MAX_PDF_BYTES)
            visited.add(final_url)
            if body.startswith(b"%PDF-"):
                statements[final_url] = (label, body)
                continue
            page = parse_html(decode_html(headers, body))
            for href, label in page.links:
                try:
                    enqueue(web_url(urljoin(final_url, href)), label, depth + 1)
                except ValueError:
                    continue
        except (ValueError, LookupError, OSError, RecursionError) as error:
            errors.append({"url": url, "error": str(error)})
    record["financialLinks"] = list(financial_links.values())
    # Prioritize recent reports even when a website lists its archive oldest first.
    return dict(sorted(statements.items(), key=statement_year, reverse=True)), errors


def decode_html(headers, body):
    if headers.get_content_type() not in {"text/html", "application/xhtml+xml"}:
        raise ValueError("Expected an HTML response")
    if len(body) > MAX_BYTES:
        raise ValueError("HTML response exceeds 2 MiB")
    return body.decode(headers.get_content_charset() or "utf-8-sig", errors="replace")


def collect_financial_statements(fetcher, record, source_page=None):
    statements, errors = discover_statements(fetcher, record, source_page)
    results = {}
    for url, (label, body) in list(statements.items())[:MAX_STATEMENTS]:
        final_url = url
        try:
            if body is None:
                final_url, _, body = fetcher.fetch(url, max_bytes=MAX_PDF_BYTES)
            if final_url in results:
                continue
            if not body.startswith(b"%PDF-"):
                raise ValueError("Expected a PDF response")
            warnings = []
            highlights = read_highlights(body, warnings=warnings)
            results[final_url] = {
                "url": final_url,
                "label": label,
                "status": "extracted" if highlights else "noSupportedFigures",
                "highlights": highlights,
            }
            if warnings:
                results[final_url]["warnings"] = warnings
        except (ValueError, OSError, RecursionError) as error:
            errors.append({"url": final_url, "error": str(error)})
    record["financialStatements"] = list(results.values())
    record["financialStatementErrors"] = errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("urls", nargs="+", metavar="URL", help="Public charity pages to fetch")
    args = parser.parse_args()

    fetcher = Fetcher()
    requested = set()
    records = {}
    had_errors = False
    for value in args.urls:
        try:
            url = web_url(value)
            if url in requested or url in records:
                continue
            requested.add(url)
            source_url, headers, body = fetcher.fetch(url)
            if source_url not in records:
                html = decode_html(headers, body)
                record = extract_charity(html, source_url)
                collect_financial_statements(fetcher, record, parse_html(html))
                records[source_url] = record
        except (ValueError, LookupError, OSError, RecursionError) as error:
            had_errors = True
            print(f"{value}: {error}", file=sys.stderr)

    print(json.dumps(list(records.values()), indent=2))
    return int(had_errors)


if __name__ == "__main__":
    raise SystemExit(main())
