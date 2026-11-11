"""Extract labeled totals from text-based nonprofit financial statements."""

from decimal import Decimal
from io import BytesIO
import re


MAX_PDF_PAGES = 30
YEAR = r"(?:19|20)\d{2}"
ACTIVITIES = re.compile(r"(?:consolidated |combined )?statements? of (?:financial )?activities", re.I)
POSITION = re.compile(r"(?:consolidated |combined )?(?:statements? of financial position|balance sheets?)", re.I)
PERIOD = re.compile(
    rf"(?:year(?:s)? ended |as of )?[a-z]+\s+\d{{1,2}},?\s+({YEAR})\b", re.I
)
NUMBER = r"(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?"
AMOUNT = re.compile(rf"-?{NUMBER}|\({NUMBER}\)|[-\u2013\u2014]")
ACTIVITY_ROWS = {
    "total support and revenue": "totalSupportAndRevenue",
    "total revenue and support": "totalSupportAndRevenue",
    "total revenues and support": "totalSupportAndRevenue",
    "total revenue": "totalRevenue",
    "total revenues": "totalRevenue",
    "contributions": "contributions",
    "program services": "programServiceExpenses",
    "program expenses": "programServiceExpenses",
    "program services expenses": "programServiceExpenses",
    "total program services": "programServiceExpenses",
    "management and general": "managementAndGeneralExpenses",
    "management and general expenses": "managementAndGeneralExpenses",
    "fundraising": "fundraisingExpenses",
    "fundraising expenses": "fundraisingExpenses",
    "total expenses": "totalExpenses",
    "change in net assets": "changeInNetAssets",
    "net assets, end of year": "endingNetAssets",
    "net assets at end of year": "endingNetAssets",
}
POSITION_ROWS = {
    "total assets": "totalAssets",
    "total liabilities": "totalLiabilities",
    "total net assets": "endingNetAssets",
}


def parse_amount(token):
    if token in {"-", "\u2013", "\u2014"}:
        return Decimal(0)
    return Decimal(token.replace(",", "").replace("(", "-").replace(")", ""))


def extract_page_highlights(text, page_number):
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    heading_index = next(
        (i for i, line in enumerate(lines[:10]) if ACTIVITIES.fullmatch(line) or POSITION.fullmatch(line)),
        None,
    )
    if heading_index is None:
        return
    is_activities = bool(ACTIVITIES.fullmatch(lines[heading_index]))
    period = next((match for line in lines[heading_index + 1:heading_index + 7]
                   if (match := PERIOD.match(line))), None)
    if period is None:
        return
    fiscal_year = int(period[1])

    header = " ".join(" ".join(line.split()) for line in lines[heading_index + 1:heading_index + 10])
    scale = 1
    if re.search(r"\bin (?:[a-z]+ )?thousands\b|\b000s omitted\b", header, re.I):
        scale = 1000
    elif re.search(r"\bin (?:[a-z]+ )?millions\b", header, re.I):
        scale = 1000000
    column_years = next(
        (line.split() for line in lines if re.fullmatch(rf"{YEAR}\s+{YEAR}", line)),
        [],
    )
    donor_columns = bool(re.search(r"withoutdonorwithdonor", header.casefold().replace(" ", "")))
    comparative = re.search(rf"comparative totals for ({YEAR})", header, re.I)
    rows = ACTIVITY_ROWS if is_activities else POSITION_ROWS
    # Layout extraction sometimes inserts a space between glyphs in a word.
    rows = {label.replace(" ", ""): (label, metric) for label, metric in rows.items()}
    in_net_assets = False
    currency_symbol = "$" if "$" in text else None
    for line in lines[heading_index + 1:]:
        label, *cells = re.split(r"\s{2,}", line, maxsplit=1)
        label = " ".join(label.split())
        if label.casefold().rstrip(":") == "net assets":
            in_net_assets = True
        row = rows.get(label.casefold().replace(" ", ""))
        if is_activities and in_net_assets and label.casefold() == "ending":
            row = ("ending", "endingNetAssets")
        if row is None or not cells:
            continue
        expected_label, metric = row
        if label.casefold() != expected_label:
            label = expected_label.capitalize()
        tokens = cells[0].replace("$", "").split()
        if not tokens or not all(AMOUNT.fullmatch(token) for token in tokens):
            continue
        amounts = [parse_amount(token) for token in tokens]
        if len(amounts) == 1 and not (column_years or donor_columns or comparative):
            amount = amounts[0]
        elif len(amounts) == 2 and str(fiscal_year) in column_years and len(set(column_years)) == 2:
            amount = amounts[column_years.index(str(fiscal_year))]
        elif (is_activities and donor_columns and len(amounts) == (4 if comparative else 3)
              and amounts[0] + amounts[1] == amounts[2]):
            amount = amounts[2]
        else:
            continue
        amount *= scale
        yield {
            "metric": metric,
            "label": label,
            "amount": int(amount) if amount == amount.to_integral_value() else float(amount),
            "currencySymbol": currency_symbol,
            "fiscalYear": fiscal_year,
            "page": page_number,
        }


def read_highlights(body):
    try:
        from pypdf import PdfReader
        from pypdf.errors import PyPdfError
    except ImportError as error:
        raise ValueError("Install scripts/requirements.txt to read financial statements") from error

    highlights = {}
    try:
        pdf = PdfReader(BytesIO(body))
        for index in range(min(len(pdf.pages), MAX_PDF_PAGES)):
            page = pdf.pages[index]
            for item in extract_page_highlights(page.extract_text(extraction_mode="layout"), index + 1):
                highlights.setdefault((item["metric"], item["fiscalYear"]), item)
    except (PyPdfError, ArithmeticError, ImportError, RecursionError) as error:
        raise ValueError(f"Could not read PDF: {error}") from error
    return list(highlights.values())
