"""Mempool navigation entry point, reusing the wallet/signature explorer."""

from ui.tab_signature import render_signature_tab


def render_mempool_tab() -> None:
    """Render wallet, transaction signatures, and the four-transaction Merkle tree."""
    render_signature_tab()