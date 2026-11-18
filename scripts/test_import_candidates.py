"""Checks for turning scraper output into a reviewable migration."""

from datetime import date
from decimal import Decimal
import json
from pathlib import Path
import tempfile
import unittest

from scripts.import_candidates import build_sql, charity_id, fiscal_years, read_candidates

RECORD = {
    "name": "Harbor Light Food Bank",
    "description": "Feeds families across the 'Harbor' district.",
    "city": "Baytown",
    "region": "TX",
    "country": "US",
    "sourceUrl": "https://harborlight.example.org/about",
    "scrapedAt": "2026-11-11T21:50:12+00:00",
    "financialStatements": [
        {
            "url": "https://harborlight.example.org/files/fy2025-audit.pdf",
            "highlights": [
                {"metric": "totalSupportAndRevenue", "amount": 512000, "fiscalYear": 2025, "page": 3},
                {"metric": "programServiceExpenses", "amount": 410000, "fiscalYear": 2025, "page": 4},
                {"metric": "managementAndGeneralExpenses", "amount": 52000, "fiscalYear": 2025, "page": 4},
                {"metric": "fundraisingExpenses", "amount": 38000, "fiscalYear": 2025, "page": 4},
                {"metric": "totalExpenses", "amount": 500000, "fiscalYear": 2025, "page": 4},
                {"metric": "programServiceExpenses", "amount": 360000, "fiscalYear": 2024, "page": 4},
                {"metric": "totalExpenses", "amount": 450000, "fiscalYear": 2024, "page": 4},
            ],
        }
    ],
}


class ImportCandidatesTest(unittest.TestCase):
    def test_maps_metrics_to_columns_with_ratio_and_page_source(self):
        rows = {r["year"]: r for r in fiscal_years(RECORD)}
        latest = rows[2025]
        self.assertEqual(latest["columns"]["total_revenue"], Decimal(512000))
        self.assertEqual(latest["columns"]["admin_expenses"], Decimal(52000))
        self.assertEqual(latest["ratio"], Decimal("0.8200"))
        self.assertEqual(latest["source"], "https://harborlight.example.org/files/fy2025-audit.pdf#page=4")
        self.assertEqual(rows[2024]["ratio"], Decimal("0.8000"))

    def test_total_expenses_falls_back_to_the_sum_of_parts(self):
        record = {**RECORD, "financialStatements": [{"url": "https://x.example.org/s.pdf", "highlights": [
            {"metric": "programServiceExpenses", "amount": 80, "fiscalYear": 2025, "page": 2},
            {"metric": "managementAndGeneralExpenses", "amount": 15, "fiscalYear": 2025, "page": 2},
            {"metric": "fundraisingExpenses", "amount": 5, "fiscalYear": 2025, "page": 2},
        ]}]}
        [row] = fiscal_years(record)
        self.assertEqual(row["columns"]["total_expenses"], Decimal(100))
        self.assertEqual(row["ratio"], Decimal("0.8000"))

    def test_sql_is_pending_idempotent_and_escaped(self):
        sql, imported = build_sql([RECORD, {"name": "", "sourceUrl": "https://skip.example.org/"}], today=date(2026, 11, 18))
        self.assertEqual(imported, 1)
        self.assertIn("'pending'", sql)
        self.assertNotIn("vetting_status = excluded", sql)  # re-imports never un-vet or vet
        self.assertIn("the ''Harbor'' district", sql)
        self.assertIn(charity_id(RECORD["sourceUrl"]), sql)
        self.assertIn("on conflict (charity_id, fiscal_year) do update", sql)
        self.assertIn("'https://harborlight.example.org/'", sql)  # website is the site root

    def test_ids_are_stable_per_source_page(self):
        self.assertEqual(charity_id("https://a.example.org/"), charity_id("https://a.example.org/"))
        self.assertNotEqual(charity_id("https://a.example.org/"), charity_id("https://b.example.org/"))

    def test_reads_utf16_output_from_powershell_redirection(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "candidates.json"
            path.write_bytes(json.dumps([RECORD]).encode("utf-16"))
            self.assertEqual(read_candidates(path)[0]["name"], RECORD["name"])

    def test_record_without_statements_still_imports_the_charity(self):
        sql, imported = build_sql([{**RECORD, "financialStatements": []}], today=date(2026, 11, 18))
        self.assertEqual(imported, 1)
        self.assertNotIn("charity_financials", sql.split("-- " + "=" * 76)[-1])


if __name__ == "__main__":
    unittest.main()
