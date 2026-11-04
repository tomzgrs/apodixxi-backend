"""Isolated admin promotion tests: no real database, credentials or deletions."""
import ast
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock

from pydantic import BaseModel, Field, ValidationError
from typing import List


class ResponseError(Exception):
    def __init__(self, status_code, detail):
        self.status_code = status_code
        super().__init__(detail)


def load():
    names = {"PromotionBulkDelete", "delete_selected_promotions", "list_promotions"}
    nodes = []
    for node in ast.parse((Path(__file__).resolve().parents[1] / "server.py").read_text()).body:
        if isinstance(node, (ast.AsyncFunctionDef, ast.ClassDef)) and node.name in names:
            node.decorator_list = []
            if isinstance(node, ast.AsyncFunctionDef):
                node.args.defaults = []
            nodes.append(node)
    assert len(nodes) == len(names)
    collection = SimpleNamespace(
        delete_many=AsyncMock(return_value=SimpleNamespace(deleted_count=2)),
        count_documents=AsyncMock(return_value=102),
        find=Mock(),
    )
    cursor = Mock()
    cursor.sort.return_value = cursor
    cursor.skip.return_value = cursor
    cursor.limit.return_value = cursor
    cursor.to_list = AsyncMock(return_value=[{"_id": "old-promotion"}])
    collection.find.return_value = cursor
    env = dict(
        List=List, BaseModel=BaseModel, Field=Field, datetime=datetime, timezone=timezone,
        HTTPException=ResponseError, ADMIN_PASSWORD="test-only",
        verify_admin_token=AsyncMock(return_value=False),
        db=SimpleNamespace(promotions=collection),
    )
    exec(compile(ast.fix_missing_locations(ast.Module(body=nodes, type_ignores=[])), "<server>", "exec"), env)
    return env, collection, cursor


class PromotionSelectionTests(unittest.IsolatedAsyncioTestCase):
    async def test_only_explicit_deduplicated_ids_are_deleted(self):
        e, db, _ = load()
        body = e["PromotionBulkDelete"](ids=["one", "two", "one"])
        result = await e["delete_selected_promotions"](body, "test-only", None)
        db.delete_many.assert_awaited_once_with({"_id": {"$in": ["one", "two"]}})
        self.assertEqual(result, {"success": True, "requested": 2, "deleted": 2, "not_found": 0})

    async def test_missing_ids_have_explicit_counts(self):
        e, db, _ = load()
        db.delete_many.return_value = SimpleNamespace(deleted_count=1)
        result = await e["delete_selected_promotions"](
            e["PromotionBulkDelete"](ids=["one", "gone"]), "test-only", None,
        )
        self.assertEqual(result["deleted"], 1)
        self.assertEqual(result["not_found"], 1)

    async def test_unauthorized_deletion_never_reaches_database(self):
        e, db, _ = load()
        with self.assertRaises(ResponseError) as error:
            await e["delete_selected_promotions"](
                e["PromotionBulkDelete"](ids=["one"]), "wrong", None,
            )
        self.assertEqual(error.exception.status_code, 403)
        db.delete_many.assert_not_awaited()

    async def test_valid_admin_token_works(self):
        e, db, _ = load()
        e["verify_admin_token"].return_value = True
        await e["delete_selected_promotions"](
            e["PromotionBulkDelete"](ids=["one", "two"]), None, "test-token",
        )
        e["verify_admin_token"].assert_awaited_once_with("test-token")
        db.delete_many.assert_awaited_once()

    async def test_empty_oversized_and_non_string_selections_are_rejected(self):
        e, _, _ = load()
        for ids in [[], ["id"] * 501, [{"$ne": None}], [None]]:
            with self.subTest(ids=str(ids)[:30]), self.assertRaises(ValidationError):
                e["PromotionBulkDelete"](ids=ids)

    async def test_blank_and_padded_ids_do_not_delete_anything(self):
        e, db, _ = load()
        for value in ["", " ", " one", "a" * 129]:
            with self.subTest(value=value), self.assertRaises(ResponseError):
                await e["delete_selected_promotions"](
                    e["PromotionBulkDelete"](ids=[value]), "test-only", None,
                )
        db.delete_many.assert_not_awaited()

    async def test_inactive_filter_is_applied_before_pagination(self):
        e, db, cursor = load()
        result = await e["list_promotions"]("test-only", None, "inactive", 100, 100)
        query = db.find.call_args.args[0]
        self.assertIn("$expr", query)
        self.assertIn("$not", query["$expr"])
        self.assertIn('"$end_date"', __import__("json").dumps(query, default=str))
        db.count_documents.assert_awaited_once_with(query)
        cursor.skip.assert_called_once_with(100)
        cursor.limit.assert_called_once_with(100)
        self.assertEqual(result["total"], 102)

    async def test_all_filter_preserves_existing_default_list_behavior(self):
        e, db, _ = load()
        await e["list_promotions"]("test-only", None, "all", 0, 100)
        db.find.assert_called_once_with({})

    async def test_active_filter_and_failed_database_deletion(self):
        e, db, _ = load()
        await e["list_promotions"]("test-only", None, "active", 0, 100)
        self.assertIn("$and", db.find.call_args.args[0]["$expr"])
        db.delete_many.side_effect = RuntimeError("Database unavailable")
        with self.assertRaises(RuntimeError):
            await e["delete_selected_promotions"](
                e["PromotionBulkDelete"](ids=["one"]), "test-only", None,
            )
