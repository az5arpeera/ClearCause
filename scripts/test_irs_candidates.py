"""Checks for finding charities in IRS data (no network)."""

import unittest

from scripts.import_candidates import build_sql, fiscal_years
from scripts.irs_candidates import cause_for, keep_bmf_row, next_part, parse_return, pick, to_record, website

FORM_990 = b"""<?xml version="1.0" encoding="utf-8"?>
<Return xmlns="http://www.irs.gov/efile" returnVersion="2023v5.0">
  <ReturnHeader>
    <TaxYr>2024</TaxYr>
    <Filer>
      <EIN>271234567</EIN>
      <BusinessName>
        <BusinessNameLine1Txt>RANDOLPH AREA FOOD SHELF</BusinessNameLine1Txt>
        <BusinessNameLine2Txt>AND PANTRY</BusinessNameLine2Txt>
      </BusinessName>
      <USAddress><CityNm>RANDOLPH</CityNm><StateAbbreviationCd>VT</StateAbbreviationCd></USAddress>
    </Filer>
  </ReturnHeader>
  <ReturnData>
    <IRS990>
      <WebsiteAddressTxt>www.randolphfood.org</WebsiteAddressTxt>
      <ActivityOrMissionDesc>PROVIDE FOOD TO PEOPLE IN NEED IN CENTRAL VERMONT.</ActivityOrMissionDesc>
      <CYTotalRevenueAmt>242576</CYTotalRevenueAmt>
      <CYTotalExpensesAmt>177660</CYTotalExpensesAmt>
      <SomeOtherGrp><ProgramServicesAmt>1</ProgramServicesAmt></SomeOtherGrp>
      <TotalFunctionalExpensesGrp>
        <TotalAmt>177660</TotalAmt>
        <ProgramServicesAmt>160000</ProgramServicesAmt>
        <ManagementAndGeneralAmt>12660</ManagementAndGeneralAmt>
        <FundraisingAmt>5000</FundraisingAmt>
      </TotalFunctionalExpensesGrp>
    </IRS990>
  </ReturnData>
</Return>"""

FORM_990EZ = b"""<?xml version="1.0" encoding="utf-8"?>
<Return xmlns="http://www.irs.gov/efile">
  <ReturnHeader><TaxYr>2023</TaxYr>
    <Filer><BusinessName><BusinessNameLine1Txt>Paws Rescue</BusinessNameLine1Txt></BusinessName>
      <USAddress><CityNm>Shelburne</CityNm><StateAbbreviationCd>VT</StateAbbreviationCd></USAddress></Filer>
  </ReturnHeader>
  <ReturnData><IRS990EZ>
    <WebsiteAddressTxt>N/A</WebsiteAddressTxt>
    <PrimaryExemptPurposeTxt>Rescue animals</PrimaryExemptPurposeTxt>
    <TotalRevenueAmt>90000</TotalRevenueAmt><TotalExpensesAmt>85000</TotalExpensesAmt>
  </IRS990EZ></ReturnData>
</Return>"""

BMF_ROW = {"EIN": "271234567", "NAME": "RANDOLPH AREA FOOD SHELF", "CITY": "RANDOLPH", "STATE": "VT",
           "SUBSECTION": "03", "FOUNDATION": "15", "STATUS": "01", "REVENUE_AMT": "242576", "NTEE_CD": "K31"}


class IrsCandidatesTest(unittest.TestCase):
    def test_ntee_codes_map_to_causes_longest_prefix_first(self):
        self.assertEqual(cause_for("K31"), "hunger")
        self.assertEqual(cause_for("C27"), "reuse")
        self.assertEqual(cause_for("C32"), "climate")
        self.assertEqual(cause_for("P30"), "kids")
        self.assertIsNone(cause_for("P20"))  # human services in general isn't a cause we cover
        self.assertIsNone(cause_for(""))

    def test_register_filter_keeps_small_public_charities_only(self):
        self.assertTrue(keep_bmf_row(BMF_ROW, 50_000, 5_000_000))
        self.assertFalse(keep_bmf_row({**BMF_ROW, "FOUNDATION": "04"}, 50_000, 5_000_000))  # private foundation
        self.assertFalse(keep_bmf_row({**BMF_ROW, "SUBSECTION": "04"}, 50_000, 5_000_000))  # not 501(c)(3)
        self.assertFalse(keep_bmf_row({**BMF_ROW, "REVENUE_AMT": "9000000"}, 50_000, 5_000_000))
        self.assertFalse(keep_bmf_row({**BMF_ROW, "REVENUE_AMT": ""}, 50_000, 5_000_000))

    def test_full_990_gives_name_website_mission_and_program_split(self):
        r = parse_return(FORM_990)
        self.assertEqual(r["name"], "Randolph Area Food Shelf And Pantry")
        self.assertEqual(r["website"], "https://www.randolphfood.org")
        self.assertEqual(r["mission"], "Provide food to people in need in central vermont.")
        self.assertEqual(r["programServiceExpenses"], 160000)  # from the functional-expense group, not elsewhere
        self.assertEqual(r["managementAndGeneralExpenses"], 12660)
        self.assertEqual(r["taxYear"], 2024)

    def test_990ez_has_totals_only_and_ignores_placeholder_websites(self):
        r = parse_return(FORM_990EZ)
        self.assertEqual(r["formType"], "990-EZ")
        self.assertIsNone(r["website"])
        self.assertEqual(r["totalExpenses"], 85000)
        self.assertNotIn("programServiceExpenses", r)

    def test_record_imports_with_ratio_cause_and_irs_citation(self):
        record = to_record("271234567", BMF_ROW, parse_return(FORM_990))
        self.assertEqual(record["ein"], "27-1234567")
        self.assertEqual(record["causes"], ["hunger"])
        self.assertEqual(record["websiteUrl"], "https://www.randolphfood.org")
        [row] = fiscal_years(record)
        self.assertEqual(str(row["ratio"]), "0.9006")
        self.assertIn("apps.irs.gov/app/eos/details/?ein=271234567", row["source"])
        sql, imported = build_sql([record])
        self.assertEqual(imported, 1)
        self.assertIn("'pending'", sql)
        self.assertIn("'https://www.randolphfood.org'", sql)

    def test_split_archives_and_websites(self):
        self.assertEqual(next_part("2025_TEOS_XML_05A"), "2025_TEOS_XML_05B")
        self.assertIsNone(next_part("2025_TEOS_XML_05H"))
        self.assertIsNone(website("0"))
        self.assertEqual(website("HTTP://Example.org"), "http://example.org")

    def test_pick_skips_known_charities_and_prefers_full_990s(self):
        bmf = {"1": {**BMF_ROW, "EIN": "1"}, "2": {**BMF_ROW, "EIN": "2"}, "3": {**BMF_ROW, "EIN": "3"}}
        filings = {"1": {"type": "990EZ"}, "2": {"type": "990"}, "3": {"type": "990"}}
        chosen = pick(bmf, filings, skip_eins={"3"}, per_state_cause=1)
        self.assertEqual(chosen, ["2"])


if __name__ == "__main__":
    unittest.main()
