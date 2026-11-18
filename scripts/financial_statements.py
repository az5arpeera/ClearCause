"""Extract labeled totals from nonprofit financial statements and scanned pages."""

from decimal import Decimal
from io import BytesIO
import re


MAX_PDF_PAGES = 30
YEAR = r"(?:19|20)\d{2}"
ACTIVITIES = re.compile(r"(?:consolidated |combined )?statements? of (?:financial )?activities", re.I)
POSITION = re.compile(r"(?:consolidated |combined )?(?:statements? of financial position|balance sheets?)", re.I)
PERIOD = re.compile(
    rf"(?:(?:for the )?(?:years?|\w+ months) ended |as of )?[a-z]+\s+\d{{1,2}},?\s*({YEAR})\b", re.I
)
NUMBER = r"(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?"
AMOUNT = re.compile(rf"-?{NUMBER}|\({NUMBER}\)|[-\u2013\u2014]")
OCR_NUMBER = r"(?:\d{1,3}(?:(?:, *| )\d{3})+|\d+)(?:\.\d{1,2})?"
OCR_AMOUNT = re.compile(rf"(?<![\w,])(?:-?{OCR_NUMBER}|\({OCR_NUMBER}\)|[-\u2013\u2014])(?![\w,])")
ACTIVITY_ROWS = {
    "total support and revenue": "totalSupportAndRevenue",
    "total revenue and support": "totalSupportAndRevenue",
    "total revenues and support": "totalSupportAndRevenue",
    "total revenue and other support": "totalSupportAndRevenue",
    "total revenues, gains, and other support": "totalSupportAndRevenue",
    "total support": "totalSupport",
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
    "development": "fundraisingExpenses",
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
    return Decimal(token.replace(",", "").replace(" ", "").replace("(", "-").replace(")", ""))


def label_key(value):
    return re.sub(r"[^a-z]", "", value.casefold())


def table_columns(lines, fiscal_year):
    """Identify total columns from headers, including nested donor subtotals."""
    header = " ".join(" ".join(line.split()) for line in lines)
    year_pair = next((re.findall(YEAR, line) for line in lines
                      if re.fullmatch(rf"\s*{YEAR}\s+{YEAR}\s*", line)), [])
    columns = []
    for line in lines:
        matches = list(re.finditer(rf"\b(?:{YEAR}\s+totals?|totals?|restrictions|operations|fund|projects)\b", line, re.I))
        remainder = re.sub(rf"\b(?:{YEAR}\s+totals?|totals?|restrictions|operations|fund|projects|assets)\b", "", line, flags=re.I)
        if len(matches) >= 2 and not remainder.strip() and any("total" in m[0].lower() for m in matches):
            columns = matches
    if columns:
        totals = [i for i, match in enumerate(columns) if "total" in match[0].lower()]
        explicit = next((i for i, match in enumerate(columns)
                         if re.fullmatch(rf"{fiscal_year}\s+totals?", match[0], re.I)), None)
        if explicit is not None:
            selected = explicit
        elif str(fiscal_year) in year_pair and len(totals) == len(year_pair):
            selected = totals[year_pair.index(str(fiscal_year))]
        elif re.search(r"comparative", header, re.I) and len(totals) == 2:
            selected = totals[0]
        elif len(set(re.findall(YEAR, header))) <= 1:
            selected = totals[-1]
        else:
            return None
        if str(fiscal_year) in year_pair and len(totals) == len(year_pair):
            group = year_pair.index(str(fiscal_year))
            start = totals[group - 1] + 1 if group else 0
            components = list(range(start, selected))
        else:
            subtotals = [i for i in range(selected) if "total" in columns[i][0].lower()]
            components = subtotals or list(range(selected))
        return columns, selected, components
    if year_pair and str(fiscal_year) in year_pair:
        line = next(line for line in lines if re.fullmatch(rf"\s*{YEAR}\s+{YEAR}\s*", line))
        return list(re.finditer(YEAR, line)), year_pair.index(str(fiscal_year)), None
    return None


def row_values(line, *, ocr=False):
    # OCR and PDF fonts can put extra spaces inside a label. Locate the first
    # numeric cell rather than treating the first wide space as the label boundary.
    start = re.search(r"(?<!\S)(?:\$|\(?-?\d|[-\u2013\u2014](?=\s|$))", line)
    if start is None:
        return None
    label = " ".join(line[:start.start()].split())
    tail = line[start.start():]
    pattern = OCR_AMOUNT if ocr else AMOUNT
    matches = list(pattern.finditer(tail))
    remainder = pattern.sub("", tail).replace("$", "")
    if not matches or remainder.strip():
        return None
    return label, [parse_amount(match[0]) for match in matches], matches, start.start()


def extract_page_highlights(text, page_number, *, extraction_method="text"):
    lines = [line.rstrip() for line in text.splitlines() if line.strip()]
    heading_index = next(
        (i for i, line in enumerate(lines[:10])
         if ACTIVITIES.fullmatch(" ".join(line.split())) or POSITION.fullmatch(" ".join(line.split()))),
        None,
    )
    if heading_index is None:
        return
    is_activities = bool(ACTIVITIES.fullmatch(" ".join(lines[heading_index].split())))
    period = next((match for line in lines[heading_index + 1:heading_index + 7]
                   if (match := PERIOD.match(" ".join(line.split())))), None)
    if period is None:
        return
    fiscal_year = int(period[1])

    header_lines = lines[heading_index + 1:heading_index + 10]
    header = " ".join(" ".join(line.split()) for line in header_lines)
    scale = 1
    if re.search(r"\bin (?:[a-z]+ )?thousands\b|\b000s omitted\b|\bin [0oc]{3}s\b", header, re.I):
        scale = 1000
    elif re.search(r"\bin (?:[a-z]+ )?millions\b", header, re.I):
        scale = 1000000
    columns = table_columns(header_lines, fiscal_year)
    rows = ACTIVITY_ROWS if is_activities else POSITION_ROWS
    # Layout extraction sometimes inserts a space between glyphs in a word.
    rows = {label_key(label): (label, metric) for label, metric in rows.items()}
    in_net_assets = False
    special_event_contributions = False
    currency_symbol = "$" if "$" in text else None
    for line in lines[heading_index + 1:]:
        if "specialevent" in label_key(line):
            special_event_contributions = True
        if label_key(line) == "netassets":
            in_net_assets = True
        values = row_values(line, ocr=extraction_method == "ocr")
        if values is None:
            continue
        label, amounts, matches, offset = values
        row = rows.get(label_key(label))
        if is_activities and in_net_assets and label_key(label) == "ending":
            row = ("ending", "endingNetAssets")
        if row is None:
            continue
        expected_label, metric = row
        if metric == "contributions" and special_event_contributions:
            continue
        if label.casefold() != expected_label:
            label = expected_label.capitalize()
        if columns is None and len(amounts) == 1 and not re.search(r"donor|comparative", header, re.I):
            amount = amounts[0]
        elif columns is not None:
            fields, selected, components = columns
            if extraction_method == "ocr":
                # Scanned statements often leave zero cells blank. Image coordinates
                # retain those columns and allow us to check the reported total.
                aligned = {}
                valid = True
                for match, value in zip(matches, amounts):
                    end = offset + match.end()
                    if end > fields[selected].end() + 5:
                        continue
                    index = min(range(len(fields)), key=lambda i: abs(fields[i].end() - end))
                    if index > selected:
                        continue
                    if abs(fields[index].end() - end) > 5 or index in aligned:
                        valid = False
                        break
                    aligned[index] = value
                if not valid or selected not in aligned:
                    continue
                amounts = [aligned.get(i, Decimal(0)) for i in range(len(fields))]
            if len(amounts) != len(fields):
                continue
            if components is not None:
                if not components or sum(amounts[i] for i in components) != amounts[selected]:
                    continue
            amount = amounts[selected]
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
            "extractionMethod": extraction_method,
        }


def read_highlights(body, *, warnings=None):
    try:
        from pypdf import PdfReader
        from pypdf.errors import PyPdfError
    except ImportError as error:
        raise ValueError("Install scripts/requirements.txt to read financial statements") from error

    highlights = {}
    try:
        pdf = PdfReader(BytesIO(body))
        scanned_pages = []
        for index in range(min(len(pdf.pages), MAX_PDF_PAGES)):
            page = pdf.pages[index]
            if page.rotation:
                page.transfer_rotation_to_content()
            text = page.extract_text(extraction_mode="layout")
            if len(text.strip()) < 40 and page.images:
                scanned_pages.append(index)
            for item in extract_page_highlights(text, index + 1):
                highlights.setdefault((item["metric"], item["fiscalYear"]), item)
        if scanned_pages:
            if __package__:
                from .pdf_ocr import ocr_pages
            else:
                from pdf_ocr import ocr_pages
            try:
                scanned_text = ocr_pages(body, scanned_pages)
            except (ValueError, RuntimeError, OSError) as error:
                if not highlights or warnings is None:
                    raise
                warnings.append(str(error))
                scanned_text = {}
            for index, text in scanned_text.items():
                for item in extract_page_highlights(text, index + 1, extraction_method="ocr"):
                    highlights.setdefault((item["metric"], item["fiscalYear"]), item)
    except (PyPdfError, ArithmeticError, ImportError, RuntimeError, OSError) as error:
        raise ValueError(f"Could not read PDF: {error}") from error
    return list(highlights.values())
