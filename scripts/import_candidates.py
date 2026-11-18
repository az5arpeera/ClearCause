"""Turn scraper output into a reviewable Supabase migration.

The scraper (scrape_charities.py) prints review candidates as JSON. This script
converts that JSON into SQL that adds each charity as `pending` plus one
`charity_financials` row per fiscal year it read from a statement. Nothing is
public until an admin checks the figures against the cited pages, tags causes,
and sets `vetting_status = 'vetted'`; the web app then shows the charity, ranks
it in matches, and links every figure back to the statement page it came from.

    python scripts/scrape_charities.py https://example.org/ > candidates.json
    python scripts/import_candidates.py candidates.json
    supabase db push   # after reviewing the generated migration

Writing SQL instead of calling the API keeps the service-role key off
contributors' machines and leaves an audit trail in git.
"""

import argparse
from datetime import date
from decimal import Decimal
import json
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit, urlunsplit
import uuid

MIGRATIONS = Path(__file__).resolve().parent.parent / "supabase" / "migrations"

# Scraper metric -> charity_financials column. Earlier entries win for a column.
METRICS = {
    "total_revenue": ("totalSupportAndRevenue", "totalRevenue", "totalSupport"),
    "total_expenses": ("totalExpenses",),
    "program_expenses": ("programServiceExpenses",),
    "admin_expenses": ("managementAndGeneralExpenses",),
    "fundraising_expenses": ("fundraisingExpenses",),
}
COLUMNS = ("total_revenue", "total_expenses", "program_expenses", "admin_expenses", "fundraising_expenses")


def read_candidates(path):
    """Read scraper JSON, which PowerShell redirection may have saved as UTF-16."""
    raw = Path(path).read_bytes()
    if raw.startswith((b"\xff\xfe", b"\xfe\xff")):
        text = raw.decode("utf-16")
    else:
        text = raw.decode("utf-8-sig")
    data = json.loads(text)
    if not isinstance(data, list):
        raise ValueError("Expected a JSON list of scraper records")
    return data


def charity_id(source_url, ein=None):
    """A stable id per charity (its EIN when known, else its source page), so
    re-importing updates instead of duplicating."""
    if ein:
        return str(uuid.uuid5(uuid.NAMESPACE_URL, f"urn:ein:{re.sub(r'[^0-9]', '', ein)}"))
    return str(uuid.uuid5(uuid.NAMESPACE_URL, source_url))


def site_root(url):
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, "/", "", ""))


def sql_text(value):
    if value is None or value == "":
        return "null"
    return "'" + str(value).replace("'", "''") + "'"


def sql_number(value):
    if value is None:
        return "null"
    number = Decimal(str(value))
    if not number.is_finite():
        raise ValueError(f"Not a finite number: {value!r}")
    return format(number.quantize(Decimal("0.01")), "f")


def fiscal_years(record):
    """Collect one row per fiscal year from every extracted statement."""
    years = {}
    for statement in record.get("financialStatements") or []:
        url = statement.get("url")
        for item in statement.get("highlights") or []:
            year = item.get("fiscalYear")
            metric = item.get("metric")
            amount = item.get("amount")
            if not isinstance(year, int) or amount is None:
                continue
            row = years.setdefault(year, {"values": {}, "pages": {}})
            row["values"].setdefault(metric, Decimal(str(amount)))
            row["pages"].setdefault(metric, (url, item.get("page")))

    rows = []
    for year, row in sorted(years.items()):
        values, pages = row["values"], row["pages"]
        columns = {}
        cited = None
        for column, metrics in METRICS.items():
            metric = next((m for m in metrics if m in values), None)
            if metric is None:
                continue
            columns[column] = values[metric]
            if cited is None or column == "program_expenses":
                cited = pages[metric]
        if not columns:
            continue

        parts = [columns.get(c) for c in ("program_expenses", "admin_expenses", "fundraising_expenses")]
        if "total_expenses" not in columns and all(p is not None for p in parts):
            columns["total_expenses"] = sum(parts)
        total, program = columns.get("total_expenses"), columns.get("program_expenses")
        ratio = (program / total).quantize(Decimal("0.0001")) if total and program is not None and total > 0 else None
        if ratio is not None and not Decimal(0) <= ratio <= Decimal(1):
            ratio = None  # the figures disagree; leave the ratio for the reviewer

        url, page = cited
        source = f"{url}#page={page}" if url and isinstance(page, int) else url
        rows.append({"year": year, "columns": columns, "ratio": ratio, "source": source})
    return rows


def build_sql(records, today=None):
    today = today or date.today()
    lines = [
        "-- " + "=" * 76,
        f"-- Scraped charity candidates, imported {today.isoformat()}",
        "-- " + "-" * 76,
        "-- Generated by scripts/import_candidates.py from scraper output. Charities land",
        "-- as `pending` (hidden from the public by RLS). Before vetting, check each",
        "-- figure against its cited statement page (OCR figures especially), tag the",
        "-- charity's causes in charity_causes, then set vetting_status = 'vetted'.",
        "-- Re-running the import updates figures but never changes vetting status.",
        "-- " + "=" * 76,
        "",
    ]
    imported = 0
    for record in records:
        name = (record.get("name") or "").strip()
        source_url = record.get("sourceUrl")
        if not name or not source_url:
            print(f"Skipping a record without a name or source URL: {record!r:.80}", file=sys.stderr)
            continue
        ein = record.get("ein")
        cid = charity_id(source_url, ein)
        # Scraper records come from the charity's own site; directory records
        # (ProPublica) don't carry a website, so leave it for the reviewer.
        website = record.get("websiteUrl") or (None if ein else site_root(source_url))
        imported += 1
        lines += [
            f"-- {name} ({source_url})" + (f" via {record['sourceName']}" if record.get("sourceName") else ""),
            "insert into public.charities",
            "  (id, name, ein, description, website_url, location_city, location_region, country, vetting_status)",
            "values",
            f"  ({sql_text(cid)}, {sql_text(name)}, {sql_text(ein)}, {sql_text(record.get('description'))}, "
            f"{sql_text(website)},",
            f"   {sql_text(record.get('city'))}, {sql_text(record.get('region'))}, {sql_text(record.get('country'))}, 'pending')",
            "on conflict (id) do update set",
            "  name = excluded.name,",
            "  ein = coalesce(excluded.ein, public.charities.ein),"
            "  description = coalesce(excluded.description, public.charities.description),",
            "  website_url = coalesce(excluded.website_url, public.charities.website_url),",
            "  location_city = coalesce(excluded.location_city, public.charities.location_city),",
            "  location_region = coalesce(excluded.location_region, public.charities.location_region),",
            "  country = coalesce(excluded.country, public.charities.country),",
            "  updated_at = now();",
            "",
        ]
        causes = [c for c in record.get("causes") or [] if re.fullmatch(r"[a-z_]+", str(c))]
        if causes:
            slugs = ", ".join(sql_text(c) for c in causes)
            lines += [
                "insert into public.charity_causes (charity_id, cause_id)",
                f"select {sql_text(cid)}, id from public.causes where slug in ({slugs})",
                "on conflict do nothing;",
                "",
            ]
        for row in fiscal_years(record):
            values = [sql_number(row["columns"].get(c)) for c in COLUMNS]
            ratio = format(row["ratio"], "f") if row["ratio"] is not None else "null"
            scraped = sql_text(record.get("scrapedAt")) + "::timestamptz" if record.get("scrapedAt") else "now()"
            lines += [
                "insert into public.charity_financials",
                "  (charity_id, fiscal_year, " + ", ".join(COLUMNS) + ", program_expense_ratio, source_url, scraped_at)",
                "values",
                f"  ({sql_text(cid)}, {row['year']}, {', '.join(values)}, {ratio}, {sql_text(row['source'])}, {scraped})",
                "on conflict (charity_id, fiscal_year) do update set",
                *[f"  {c} = excluded.{c}," for c in COLUMNS],
                "  program_expense_ratio = excluded.program_expense_ratio,",
                "  source_url = excluded.source_url,",
                "  scraped_at = excluded.scraped_at;",
                "",
            ]
    return "\n".join(lines), imported


def next_migration_path(today=None):
    today = today or date.today()
    numbers = [int(m[1]) for p in MIGRATIONS.glob("*.sql") if (m := re.match(r"(\d{4})_", p.name))]
    return MIGRATIONS / f"{max(numbers, default=0) + 1:04d}_import_candidates_{today:%Y%m%d}.sql"


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("candidates", help="JSON printed by scrape_charities.py")
    parser.add_argument("--out", help="Where to write the SQL (default: the next supabase migration)")
    args = parser.parse_args(argv)

    sql, imported = build_sql(read_candidates(args.candidates))
    if not imported:
        print("No importable records found.", file=sys.stderr)
        return 1
    out = Path(args.out) if args.out else next_migration_path()
    out.write_text(sql, encoding="utf-8")
    print(f"Wrote {imported} charit{'y' if imported == 1 else 'ies'} to {out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
