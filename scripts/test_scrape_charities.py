"""Regression checks for report discovery and financial table layouts."""

from email.message import Message
import unittest
from unittest.mock import Mock, patch

from scripts.financial_statements import extract_page_highlights, read_highlights
from scripts.pdf_ocr import words_to_layout
from scripts.scrape_charities import (
    collect_financial_statements,
    discover_statements,
    extract_charity,
    parse_html,
    web_url,
)


class PageFetcher:
    def __init__(self, pages):
        self.pages = pages
        self.requested = []

    def fetch(self, url, **kwargs):
        self.requested.append(url)
        response = self.pages[url]
        if isinstance(response, Exception):
            raise response
        headers = Message()
        headers["Content-Type"] = "text/html; charset=utf-8"
        return url, headers, response.encode()


class DiscoveryTests(unittest.TestCase):
    def test_homepage_financials_and_about_navigation(self):
        for home in (
            '<title>Example</title><a href="/financials">See Our Financials</a>',
            '<title>Example</title><a href="/about-us.html">About Us</a>',
        ):
            with self.subTest(home=home):
                fetcher = PageFetcher({
                    "https://example.org/about-us.html":
                        '<a href="/financials?utm_source=menu">Financials</a>',
                    "https://example.org/financials":
                        '<a href="/archive">Financial reports archive</a>',
                    "https://example.org/archive":
                        '<a href="https://cdn.example.org/2099/old.pdf">2023 Audit Report</a>'
                        '<a href="https://cdn.example.org/new.pdf">2025 Audit Report</a>'
                        '<a href="https://cdn.example.org/new.pdf#download">2025 Audit Report</a>'
                        '<a href="/financials">Financials</a>'
                        '<a href="https://unrelated.org/about">About Us</a>',
                })
                record = extract_charity(home, "https://example.org/")
                statements, errors = discover_statements(fetcher, record, parse_html(home))
                self.assertFalse(errors)
                self.assertEqual(list(statements), [
                    "https://cdn.example.org/new.pdf", "https://cdn.example.org/2099/old.pdf",
                ])
                self.assertEqual(len(fetcher.requested), len(set(fetcher.requested)))
                self.assertNotIn("https://unrelated.org/about", fetcher.requested)

    def test_statement_wrapper_and_partial_download_failure(self):
        html = '<title>Example</title><a href="/reports">Reports &amp; Financials</a>'
        fetcher = PageFetcher({
            "https://example.org/reports":
                '<a href="/audit">Audited Financial Statements</a>'
                '<a href="/bad.pdf">2025 Audit Report</a>',
            "https://example.org/audit": '<a href="/ok.pdf">2024 Audit Report</a>',
            "https://example.org/ok.pdf": "%PDF-fixture",
            "https://example.org/bad.pdf": OSError("Download failed"),
        })
        record = extract_charity(html, "https://example.org/")
        with patch("scripts.scrape_charities.read_highlights", return_value=[{"metric": "totalExpenses"}]):
            collect_financial_statements(fetcher, record)
        self.assertEqual(record["financialStatements"][0]["status"], "extracted")
        self.assertEqual(record["financialStatementErrors"], [
            {"url": "https://example.org/bad.pdf", "error": "Download failed"},
        ])

    def test_tracking_parameters_preserve_signed_query(self):
        self.assertEqual(
            web_url("https://example.org/report?signature=a%2Fb&sc_icid=nav&utm_source=menu#download"),
            "https://example.org/report?signature=a%2Fb",
        )


class FinancialTableTests(unittest.TestCase):
    def highlights(self, text, **kwargs):
        return {row["metric"]: row for row in extract_page_highlights(text, 6, **kwargs)}

    def test_nested_subtotals_and_comparative_year(self):
        rows = self.highlights(
            "Consolidated Statement of Activities\nYear ended September 30, 2025\n"
            "(With summarized comparative financial information for September 30, 2024)\n"
            "Without donor restrictions    With donor restrictions\n"
            "Operations    fund    projects    Total    Operations    projects    Total    2025 Total    2024 Total\n"
            "Development    100,200    300    -    100,500    -    -    -    100,500    90,000\n"
            "Total expenses    100    -    200    300    -    -    -    300    250\n"
        )
        self.assertEqual(rows["fundraisingExpenses"]["amount"], 100500)
        self.assertEqual(rows["totalExpenses"]["amount"], 300)
        self.assertEqual(rows["totalExpenses"]["fiscalYear"], 2025)
        self.assertEqual(rows["totalExpenses"]["page"], 6)

    def test_original_donor_layout_and_broken_word_spacing(self):
        rows = self.highlights(
            "Consolidated Statement of Activities\nYear Ended December 31, 2024\n"
            "(With Comparative Totals for 2023)\n2024\nW ithout Donor    W ith Donor    2023\n"
            "Restrictions    Restrictions    Total    Total\n"
            "Program serv ices    120    -    120    100\n"
            "Change in net assets    30    (10)    20    25\n"
        )
        self.assertEqual(rows["programServiceExpenses"]["amount"], 120)
        self.assertEqual(rows["changeInNetAssets"]["amount"], 20)

    def test_ocr_blank_columns_thousands_and_two_year_groups(self):
        # Match right-aligned image coordinates, including empty donor columns.
        def line(cells):
            return "".join(text.rjust(width) for text, width in cells)

        header = line([("", 35)] + [(value, 16) for value in
                      ("Restrictions", "Restrictions", "Total", "Restrictions", "Restrictions", "Total")])
        amount_row = line([("Total expenses", 35)] + [(value, 16) for value in
                          ("2,500", "", "2,500", "2,000", "", "2,000")])
        text = (
            "COMBINED  STATEMENTS  OF  ACTIVITIES\n"
            "FOR  THE  YEARS  ENDED  JUNE  30, 2025  AND  2024\n(In OOOs)\n"
            "2025    2024\nWithout Donor    With Donor    Without Donor    With Donor\n"
            + header + "\n" + amount_row
        )
        rows = self.highlights(text, extraction_method="ocr")
        self.assertEqual(rows["totalExpenses"]["amount"], 2_500_000)
        self.assertEqual(rows["totalExpenses"]["extractionMethod"], "ocr")
        self.assertFalse(self.highlights(text.replace("2,500", "2,501", 1), extraction_method="ocr"))

    def test_year_order_and_plural_totals(self):
        rows = self.highlights(
            "Consolidated Statement of Financial Position\nSeptember 30, 2025\n"
            "Operations    projects    2025 Totals    2024 Totals\n"
            "Total assets    100    200    300    250"
        )
        self.assertEqual(rows["totalAssets"]["amount"], 300)
        rows = self.highlights(
            "Balance Sheet\nDecember 31, 2025\n(In thousands)\n2024    2025\n"
            "Total liabilities    2    3.5"
        )
        self.assertEqual(rows["totalLiabilities"]["amount"], 3500)
        rows = self.highlights(
            "Combined Statements of Activities\nFor the years ended June 30, 2025 and 2024\n"
            "2024    2025\nWithout Donor    With Donor    Without Donor    With Donor\n"
            "Restrictions    Restrictions    Total    Restrictions    Restrictions    Total\n"
            "Total expenses    100    20    120    200    30    230"
        )
        self.assertEqual(rows["totalExpenses"]["amount"], 230)

    def test_ambiguous_or_inconsistent_totals_are_skipped(self):
        self.assertFalse(self.highlights(
            "Statement of Activities\nDecember 31, 2025\nTotal expenses    100    110"
        ))
        self.assertFalse(self.highlights(
            "Statement of Activities\nDecember 31, 2025\n"
            "Without donor restrictions    With donor restrictions\n"
            "Restrictions    Restrictions    Total\nTotal expenses    100    20    200"
        ))

    def test_special_event_contribution_is_not_an_organization_total(self):
        self.assertFalse(self.highlights(
            "Statement of Activities\nDecember 31, 2025\n"
            "Special event revenue:\nContributions    500"
        ))

    def test_rotated_pdf_text_is_normalized_before_extraction(self):
        page = Mock(rotation=90, images=[])
        page.extract_text.return_value = "Statement of Activities\nDecember 31, 2025\nTotal expenses    300"
        with patch("pypdf.PdfReader") as reader:
            reader.return_value.pages = [page]
            self.assertEqual(read_highlights(b"fixture")[0]["amount"], 300)
        page.transfer_rotation_to_content.assert_called_once()

    def test_ocr_failure_preserves_figures_from_text_pages(self):
        text_page = Mock(rotation=0, images=[])
        text_page.extract_text.return_value = "Statement of Activities\nDecember 31, 2025\nTotal expenses    300"
        scan_page = Mock(rotation=0, images=[object()])
        scan_page.extract_text.return_value = ""
        warnings = []
        with patch("pypdf.PdfReader") as reader, patch(
            "scripts.pdf_ocr.ocr_pages", side_effect=ValueError("OCR unavailable")
        ):
            reader.return_value.pages = [text_page, scan_page]
            self.assertEqual(read_highlights(b"fixture", warnings=warnings)[0]["amount"], 300)
        self.assertEqual(warnings, ["OCR unavailable"])

    def test_ocr_word_coordinates_preserve_empty_cells(self):
        layout = words_to_layout([
            {"text": "expenses", "x": 40, "y": 10, "width": 64, "height": 10},
            {"text": "Total", "x": 0, "y": 10, "width": 32, "height": 10},
            {"text": "100", "x": 240, "y": 11, "width": 24, "height": 10},
        ])
        self.assertEqual(" ".join(layout.split()), "Total expenses 100")
        self.assertGreater(layout.index("100") - layout.index("expenses"), 10)


if __name__ == "__main__":
    unittest.main()
