"""SHA-256 and Merkle-tree utilities for the simulator."""

from collections.abc import Sequence
import hashlib


def _to_bytes(value: str | bytes) -> bytes:
    if isinstance(value, bytes):
        return value
    if isinstance(value, str):
        return value.encode("utf-8")
    raise TypeError("value must be str or bytes")


def sha256(data: str | bytes) -> str:
    """Return the lowercase hexadecimal SHA-256 digest of ``data``."""
    return hashlib.sha256(_to_bytes(data)).hexdigest()


def merkle_root(transactions: Sequence[str | bytes]) -> str:
    """Return a Merkle root, duplicating the final hash on odd-sized levels.

    Transaction values are hashed as UTF-8 (or used as-is when bytes). Each
    parent hashes the concatenated binary digests of its two children. The
    empty transaction list has SHA-256 of the empty byte string as its root.
    """
    if not transactions:
        return sha256(b"")

    level = [hashlib.sha256(_to_bytes(transaction)).digest() for transaction in transactions]
    while len(level) > 1:
        if len(level) % 2:
            level.append(level[-1])
        level = [
            hashlib.sha256(level[index] + level[index + 1]).digest()
            for index in range(0, len(level), 2)
        ]
    return level[0].hex()


def check_sha256_properties(
    message: str | bytes,
    comparison_message: str | bytes | None = None,
) -> dict[str, object]:
    """Measure SHA-256's visible properties for an input.

    Avalanche is measured against ``comparison_message`` or a default input
    differing by one bit. Pre-image resistance is reported as a design
    property because it cannot be demonstrated by testing a single digest.
    """
    message_bytes = _to_bytes(message)
    comparison_bytes = (
        _to_bytes(comparison_message)
        if comparison_message is not None
        else message_bytes[:-1] + bytes([message_bytes[-1] ^ 1])
        if message_bytes
        else b"\x01"
    )

    digest = sha256(message_bytes)
    repeated_digest = sha256(message_bytes)
    comparison_digest = sha256(comparison_bytes)
    changed_bits = (int(digest, 16) ^ int(comparison_digest, 16)).bit_count()
    changed_ratio = changed_bits / 256

    return {
        "deterministic": digest == repeated_digest,
        "avalanche_effect": {
            "comparison_digest": comparison_digest,
            "changed_bits": changed_bits,
            "total_bits": 256,
            "changed_ratio": changed_ratio,
            "approximately_half_changed": 0.25 <= changed_ratio <= 0.75,
        },
        "pre_image_resistance": {
            "empirically_verifiable": False,
            "description": (
                "Pre-image resistance is a cryptographic security property; "
                "one input/output sample cannot prove it."
            ),
        },
        "fixed_length": {
            "hex_characters": len(digest),
            "bits": len(digest) * 4,
            "valid": len(digest) == 64,
        },
    }