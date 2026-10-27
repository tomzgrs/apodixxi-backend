"""Receipt-parser and import-route regressions without server startup or a DB.

Run from the repository root: python -m unittest discover -s tests -p test_aade_receipts.py
Only pure definitions are extracted from the production entrypoint. No production
database, credentials, network calls or third-party providers are used.
"""
import ast
import asyncio
from datetime import datetime, timezone
import logging
from pathlib import Path
import re
from types import SimpleNamespace
from typing import List
import unittest
from unittest.mock import AsyncMock
from urllib.parse import urlparse
import uuid

from bs4 import BeautifulSoup
from pydantic import BaseModel, Field


SERVER = Path(__file__).resolve().parents[1] / "server.py"
URL = "https://www1.aade.gr/tameiakes/myweb/q1.php?SIG=synthetic-test-only"


class ImportErrorResponse(Exception):
    def __init__(self, status_code, detail):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


def load_definitions():
    names = {
        "ProductItem", "ReceiptData", "parse_greek_number",
        "parse_aade_receipt", "detect_provider", "import_receipt_from_url",
    }
    tree = ast.parse(SERVER.read_text(encoding="utf-8"))
    selected = []
    for node in tree.body:
        if isinstance(node, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)) and node.name in names:
            node.decorator_list = []
            if node.name == "import_receipt_from_url":
                node.args.defaults = []  # Don't evaluate Depends / auth startup.
            selected.append(node)
    if {node.name for node in selected} != names:
        raise AssertionError("Production definitions changed; update the isolated test harness.")
    namespace = dict(
        re=re, BeautifulSoup=BeautifulSoup, BaseModel=BaseModel, Field=Field,
        List=List, uuid=uuid, datetime=datetime, timezone=timezone,
        urlparse=urlparse, URLImportInput=SimpleNamespace,
        HTTPException=ImportErrorResponse, logger=logging.getLogger(__name__),
    )
    exec(compile(ast.Module(body=selected, type_ignores=[]), str(SERVER), "exec"), namespace)
    return namespace


def full_receipt(total="€ 11.93", vat="012345678"):
    return f"""<table class="info">
    <tr><td>Συνολική αξία</td><td><strong>{total}</strong></td></tr>
    <tr><td>Ποσό πληρωμής με κάρτα</td><td>€ 5.00</td></tr>
    <tr><td>ΑΦΜ εκδότη</td><td>{vat}</td></tr>
    <tr><td>Επωνυμία</td><td>ΔΟΚΙΜΑΣΤΙΚΟ ΚΑΤΑΣΤΗΜΑ Ε Ε</td></tr>
    <tr><td>Ημερομηνία, ώρα</td><td>2026-10-21 02:02</td></tr>
    <tr><td>ΑΦΜ λήπτη (σε τιμολόγιο)</td><td>987654321</td></tr>
    <tr><td>Καθαρή αξία Β</td><td>€ 10.56</td></tr>
    <tr><td>ΦΠΑ Β</td><td>€ 1.37</td></tr></table>"""


def restricted_receipt(vat="012345678", total="7.40"):
    return f"""<p class="receipt">Έλεγχος απόδειξης
    Συνολικού ποσού <strong>{total} ευρώ</strong></p>
    <div class="callout warning box-warning">
    Η ταμειακή μηχανή (ΦΗΜ) είναι ενεργή και δηλωμένη στον ΑΦΜ {vat} .
    Η απόδειξη δεν έχει διαβιβαστεί στην ΑΑΔΕ.</div>
    <table class="info">
    <tr><td>ΦΗΜ</td><td>TEST00000001</td></tr>
    <tr><td>Επωνυμία</td><td>ΔΟΚΙΜΑΣΤΙΚΟ ΚΑΤΑΣΤΗΜΑ</td></tr>
    <tr><td>Διεύθυνση όπου λειτουργεί ο ΦΗΜ σήμερα 27-10-2026</td>
    <td>ΔΟΚΙΜΑΣΤΙΚΗ ΔΙΕΥΘΥΝΣΗ</td></tr></table>"""


class AadeReceiptTests(unittest.TestCase):
    def setUp(self):
        self.ns = load_definitions()
        self.parse = self.ns["parse_aade_receipt"]

    def test_full_receipt_uses_total_not_card_payment_net_or_vat(self):
        result = self.parse(full_receipt(), URL)
        self.assertEqual(result["total"], 11.93)
        self.assertEqual(result["store_name"], "ΔΟΚΙΜΑΣΤΙΚΟ ΚΑΤΑΣΤΗΜΑ Ε Ε")
        self.assertEqual(result["store_vat"], "012345678")
        self.assertEqual(result["source_url"], URL)
        self.assertEqual(result["items"], [])

    def test_restricted_receipt_extracts_registered_owner_vat(self):
        result = self.parse(restricted_receipt(), URL)
        self.assertEqual(result["store_vat"], "012345678")
        self.assertEqual(result["total"], 7.40)
        self.assertEqual(result["date"], "")
        self.assertEqual(result["store_address"], "")
        self.assertEqual(result["items"], [])

    def test_table_issuer_vat_has_priority_over_warning(self):
        html = full_receipt() + restricted_receipt(vat="987654321")
        self.assertEqual(self.parse(html, URL)["store_vat"], "012345678")

    def test_label_variations_and_table_without_class(self):
        html = full_receipt().replace(' class="info"', "")
        html = html.replace("ΑΦΜ εκδότη", " Α.Φ.Μ. ΕΚΔΟΤΗ: ")
        html = html.replace("Συνολική αξία", " ΣΥΝΟΛΙΚΗ   ΑΞΙΑ: ")
        result = self.parse(html, URL)
        self.assertEqual(result["store_vat"], "012345678")
        self.assertEqual(result["total"], 11.93)

    def test_greek_and_english_amounts(self):
        for amount, expected in [("€ 1.234,56", 1234.56), ("11,93", 11.93), ("€ 11.93", 11.93)]:
            with self.subTest(amount=amount):
                self.assertEqual(self.parse(full_receipt(total=amount), URL)["total"], expected)

    def test_missing_issuer_vat_is_not_replaced_by_recipient_or_sig(self):
        html = full_receipt().replace("ΑΦΜ εκδότη", "Άλλο πεδίο")
        self.assertEqual(self.parse(html, URL + "123456789")["store_vat"], "")

    def test_invalid_warning_vat_is_not_truncated(self):
        for vat in ["01234567", "0123456789", "INVALID"]:
            with self.subTest(vat=vat):
                self.assertEqual(self.parse(restricted_receipt(vat=vat), URL)["store_vat"], "")

    def test_unrelated_vat_text_is_not_trusted(self):
        html = restricted_receipt().replace("δηλωμένη στον ΑΦΜ", "ΑΦΜ λήπτη")
        self.assertEqual(self.parse(html, URL)["store_vat"], "")

    def test_detect_provider_does_not_trust_domain_substrings(self):
        detect = self.ns["detect_provider"]
        self.assertEqual(detect(URL), "aade")
        self.assertEqual(detect(URL.replace("www1.aade.gr", "www1.aade.gr.example.invalid")), "unknown")

    def make_route(self, html):
        receipts = SimpleNamespace(find_one=AsyncMock(return_value=None), insert_one=AsyncMock())
        self.ns.update(
            db=SimpleNamespace(receipts=receipts),
            fetch_html=AsyncMock(return_value=html),
            apply_personal_store_mapping=AsyncMock(),
            get_personal_vat_mapping=AsyncMock(return_value={}),
            index_products_with_categories=AsyncMock(return_value=[]),
            STORE_VAT_MAPPING={}, APPROVED_VAT_MAPPING={},
        )
        input_data = SimpleNamespace(url=" " + URL + " ", device_id="test-only", force_import=False)
        user = {"_id": "test-user", "email": "test@example.invalid"}
        return receipts, self.ns["import_receipt_from_url"](input_data, user)

    def test_route_saves_required_fields_and_link_without_products_or_date(self):
        receipts, pending = self.make_route(restricted_receipt())
        result = asyncio.run(pending)
        self.assertEqual(result["status"], "success")
        saved = receipts.insert_one.await_args.args[0]
        self.assertEqual(saved["total"], 7.40)
        self.assertEqual(saved["store_vat"], "012345678")
        self.assertEqual(saved["store_name"], "ΔΟΚΙΜΑΣΤΙΚΟ ΚΑΤΑΣΤΗΜΑ")
        self.assertEqual(saved["receipt_url"], URL)
        self.assertEqual(saved["source_url"], URL)
        self.assertEqual(saved["date"], "")
        self.assertEqual(saved["items"], [])
        self.ns["apply_personal_store_mapping"].assert_not_awaited()

    def test_full_table_route_saves_reported_total(self):
        receipts, pending = self.make_route(full_receipt())
        result = asyncio.run(pending)
        self.assertEqual(result["receipt"]["total"], 11.93)
        receipts.insert_one.assert_awaited_once()

    def test_incomplete_or_invalid_receipts_never_write(self):
        for html in [
            "<html>Μη διαθέσιμη υπηρεσία</html>",
            full_receipt(vat="INVALID"),
            full_receipt(total="0"),
            full_receipt(total="-1"),
            full_receipt(total="NaN"),
            full_receipt(total="inf"),
            full_receipt().replace("Επωνυμία", "Άλλο πεδίο"),
        ]:
            with self.subTest(html=html[:75]):
                receipts, pending = self.make_route(html)
                with self.assertRaises(ImportErrorResponse) as caught:
                    asyncio.run(pending)
                self.assertEqual(caught.exception.status_code, 400)
                receipts.insert_one.assert_not_awaited()


if __name__ == "__main__":
    unittest.main()
