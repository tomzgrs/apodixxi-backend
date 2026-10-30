"""Exercise real approval functions with isolated database mocks."""
import ast
from datetime import datetime, timezone
import logging
from pathlib import Path
import re
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock


class ResponseError(Exception):
    def __init__(self, status_code, detail):
        self.status_code = status_code
        super().__init__(detail)


def load():
    names = {
        "find_approved_store", "validate_vat", "refresh_approved_stores",
        "approve_store_review", "request_store_review", "get_supported_stores",
    }
    nodes = []
    for node in ast.parse((Path(__file__).resolve().parents[1] / "server.py").read_text()).body:
        if isinstance(node, ast.AsyncFunctionDef) and node.name in names:
            node.decorator_list = []
            node.args.defaults = [ast.Constant(None) for _ in node.args.defaults]
            nodes.append(node)
    assert len(nodes) == len(names)
    db = SimpleNamespace(
        approved_stores=SimpleNamespace(find_one=AsyncMock(), update_one=AsyncMock(), find=Mock()),
        store_review_requests=SimpleNamespace(
            find_one=AsyncMock(), update_one=AsyncMock(), insert_one=AsyncMock(),
        ),
    )
    env = dict(
        db=db, re=re, datetime=datetime, timezone=timezone,
        STORE_VAT_MAPPING={}, APPROVED_VAT_MAPPING={},
        logger=logging.getLogger("store-test"), HTTPException=ResponseError,
        ADMIN_PASSWORD="test-only", verify_admin_token=AsyncMock(return_value=False),
    )
    exec(compile(ast.fix_missing_locations(ast.Module(body=nodes, type_ignores=[])), "<server>", "exec"), env)
    return env


class StoreApprovalTests(unittest.IsolatedAsyncioTestCase):
    async def test_unnamed_approval_is_recognized_on_another_worker(self):
        e = load()
        e["db"].approved_stores.find_one.return_value = {"vat": "012345678", "store_name": ""}
        result = await e["validate_vat"]("012345678")
        self.assertTrue(result["is_known"])
        self.assertEqual(result["store_name"], "ΑΦΜ 012345678")

    async def test_database_beats_stale_cache_and_normalizes_vat(self):
        e = load()
        e["APPROVED_VAT_MAPPING"]["012345678"] = "Old name"
        e["db"].approved_stores.find_one.return_value = {"store_name": "New name"}
        result = await e["validate_vat"]("EL012345678")
        self.assertEqual(result["store_name"], "New name")
        self.assertIn("012345678", e["db"].approved_stores.find_one.call_args.args[0]["vat"]["$in"])

    async def test_removed_approval_is_not_recognized_from_stale_cache(self):
        e = load()
        e["APPROVED_VAT_MAPPING"]["012345678"] = "Removed"
        e["db"].approved_stores.find_one.return_value = None
        self.assertFalse((await e["validate_vat"]("012345678"))["is_known"])

    async def test_refresh_includes_unnamed_approved_store(self):
        e = load()
        cursor = SimpleNamespace(to_list=AsyncMock(return_value=[
            {"vat": "012345678", "store_name": ""}, {"vat": "invalid", "store_name": "Bad"},
        ]))
        e["db"].approved_stores.find.return_value = cursor
        await e["refresh_approved_stores"]()
        self.assertEqual(e["APPROVED_VAT_MAPPING"], {"012345678": "ΑΦΜ 012345678"})

    async def test_approval_then_fresh_worker_validation_without_name(self):
        e = load()
        e["db"].store_review_requests.find_one.return_value = {
            "id": "test", "vat": "EL012345678", "store_name": "",
        }
        e["db"].approved_stores.find.return_value = SimpleNamespace(to_list=AsyncMock(return_value=[]))
        await e["approve_store_review"]("test", "test-only", None)
        call = e["db"].approved_stores.update_one.call_args
        self.assertEqual(call.args[0], {"vat": "012345678"})
        stored = call.args[1]["$set"]
        other = load()
        other["db"].approved_stores.find_one.return_value = stored
        self.assertTrue((await other["validate_vat"]("012345678"))["is_known"])

    async def test_already_approved_store_creates_no_new_request(self):
        e = load()
        e["db"].approved_stores.find_one.return_value = {"store_name": ""}
        result = await e["request_store_review"]("012345678", "", "https://example.test", "device")
        self.assertTrue(result["already_known"])
        e["db"].store_review_requests.insert_one.assert_not_awaited()

    async def test_invalid_vat_and_unauthorized_approval_write_nothing(self):
        e = load()
        e["db"].store_review_requests.find_one.return_value = {"vat": "", "store_name": ""}
        with self.assertRaises(ResponseError) as error:
            await e["approve_store_review"]("test", "test-only", None)
        self.assertEqual(error.exception.status_code, 400)
        with self.assertRaises(ResponseError) as error:
            await e["approve_store_review"]("test", "wrong", None)
        self.assertEqual(error.exception.status_code, 403)
        e["db"].approved_stores.update_one.assert_not_awaited()
        e["db"].store_review_requests.update_one.assert_not_awaited()
