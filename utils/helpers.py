"""Helper utility functions."""
import math
import re
from typing import Any

def safe_float(value: Any, default: float = 0.0) -> float:
    """Convert value to float, handling inf/nan and invalid values."""
    try:
        f = float(value)
        if math.isnan(f) or math.isinf(f):
            return default
        return f
    except (ValueError, TypeError):
        return default

def sanitize_receipt_data(data: Any) -> Any:
    """Sanitize all float values in receipt data to prevent JSON serialization errors."""
    if isinstance(data, dict):
        return {k: sanitize_receipt_data(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_receipt_data(item) for item in data]
    elif isinstance(data, float):
        if math.isnan(data) or math.isinf(data):
            return 0.0
        return data
    return data

def parse_greek_number(text: str) -> float:
    """Parse Greek-formatted number (comma as decimal separator)."""
    if not text:
        return 0.0
    try:
        # Remove currency symbols and whitespace
        text = re.sub(r'[\u20ac\$\s]', '', text.strip())
        # Replace comma with period for decimal
        text = text.replace(',', '.')
        # Handle multiple periods (thousand separators)
        parts = text.split('.')
        if len(parts) > 2:
            # Assume last part is decimal
            text = ''.join(parts[:-1]) + '.' + parts[-1]
        return float(text)
    except (ValueError, AttributeError):
        return 0.0
