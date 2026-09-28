"""ECDSA P-256 key generation and transaction signatures."""

import base64
import hashlib
import json
from collections.abc import Mapping

from ecdsa.der import UnexpectedDER
from ecdsa.errors import MalformedPointError
from ecdsa.keys import BadSignatureError, SigningKey, VerifyingKey
from ecdsa import NIST256p
from ecdsa.util import sigdecode_der, sigencode_der


def _key_bytes(key: str | bytes) -> bytes:
    return key.encode("ascii") if isinstance(key, str) else key


def _transaction_bytes(transaction: str | bytes | Mapping[str, object]) -> bytes:
    if isinstance(transaction, bytes):
        return transaction
    if isinstance(transaction, str):
        return transaction.encode("utf-8")
    return json.dumps(
        transaction,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    ).encode("utf-8")


def generate_key_pair() -> tuple[str, str]:
    """Generate a NIST P-256 ECDSA pair and return (private PEM, public PEM)."""
    private_key = SigningKey.generate(curve=NIST256p)
    public_key = private_key.verifying_key
    return (
        private_key.to_pem().decode("ascii"),
        public_key.to_pem().decode("ascii"),
    )


def sign_transaction(
    private_key: str | bytes,
    transaction: str | bytes | Mapping[str, object],
) -> str:
    """Sign a transaction and return its DER signature encoded as Base64.

    Mapping transactions are serialized as sorted compact JSON so signatures
    remain stable regardless of the mapping's insertion order.
    """
    signing_key = SigningKey.from_pem(_key_bytes(private_key))
    signature = signing_key.sign_deterministic(
        _transaction_bytes(transaction),
        hashfunc=hashlib.sha256,
        sigencode=sigencode_der,
    )
    return base64.b64encode(signature).decode("ascii")


def verify_signature(
    public_key: str | bytes,
    transaction: str | bytes | Mapping[str, object],
    signature: str,
) -> bool:
    """Verify a Base64 DER signature; return False for malformed/invalid input."""
    try:
        verifying_key = VerifyingKey.from_pem(_key_bytes(public_key))
        signature_bytes = base64.b64decode(signature, validate=True)
        return verifying_key.verify(
            signature_bytes,
            _transaction_bytes(transaction),
            hashfunc=hashlib.sha256,
            sigdecode=sigdecode_der,
        )
    except (
        BadSignatureError,
        MalformedPointError,
        UnexpectedDER,
        ValueError,
        TypeError,
    ):
        return False