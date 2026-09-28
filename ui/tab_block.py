"""Streamlit blockchain explorer with editable transaction tamper tests."""

from __future__ import annotations

from datetime import datetime, timezone

import streamlit as st

from crypto.hashing import merkle_root, sha256


def _block_hash(block: dict[str, object]) -> str:
    """Hash the V2 fields in the specified order, without separators."""
    fields = (
        block["index"],
        block["timestamp"],
        block["prev_hash"],
        merkle_root(block["transactions"]),
        block["nonce"],
        block["validator"],
    )
    return sha256("".join(str(field) for field in fields))


def _make_chain() -> list[dict[str, object]]:
    now = int(datetime.now(timezone.utc).timestamp() * 1000)
    entries = [
        (["Genesis block · Chainlab testnet"], "0x" + "0" * 40),
        (["Alice → Bob · 12.50 ETH", "Bob → Alice · 0.25 ETH"], "0x7a3f" + "1" * 36),
        (["Carol → David · 4.20 ETH", "David → Eve · 0.10 ETH"], "0x2b8e" + "2" * 36),
        (["Eve → Finn · 1.75 ETH", "Finn → Alice · 0.05 ETH"], "0x4d10" + "3" * 36),
    ]
    chain: list[dict[str, object]] = []
    previous_hash = "0" * 64
    for index, (transactions, validator) in enumerate(entries):
        block: dict[str, object] = {
            "index": index,
            "timestamp": now + index * 12_000,
            "prev_hash": previous_hash,
            "transactions": transactions,
            "merkle_root": merkle_root(transactions),
            "nonce": 0,
            "validator": validator,
        }
        block["hash"] = _block_hash(block)
        previous_hash = str(block["hash"])
        chain.append(block)
    return chain


def _ensure_state() -> None:
    if "explorer_chain" not in st.session_state:
        st.session_state.explorer_chain = _make_chain()


def _chain_validity(chain: list[dict[str, object]]) -> list[bool]:
    validity: list[bool] = []
    for index, block in enumerate(chain):
        expected_previous = "0" * 64 if index == 0 else _block_hash(chain[index - 1])
        transactions = block["transactions"]
        merkle_is_valid = block["merkle_root"] == merkle_root(transactions)
        hash_is_valid = block["hash"] == _block_hash(block)
        links_are_valid = block["prev_hash"] == expected_previous
        previous_is_valid = index == 0 or validity[index - 1]
        validity.append(merkle_is_valid and hash_is_valid and links_are_valid and previous_is_valid)
    return validity


def _save_transactions(block_index: int) -> None:
    block = st.session_state.explorer_chain[block_index]
    editor_key = f"block_transactions_{block_index}"
    transactions = [
        line.strip()
        for line in st.session_state[editor_key].splitlines()
        if line.strip()
    ]
    block["transactions"] = transactions


def _remine_chain() -> None:
    chain = st.session_state.explorer_chain
    previous_hash = "0" * 64
    for block in chain:
        block["prev_hash"] = previous_hash
        block["merkle_root"] = merkle_root(block["transactions"])
        block["nonce"] = int(block["nonce"]) + 1
        block["hash"] = _block_hash(block)
        previous_hash = str(block["hash"])
    st.session_state.explorer_chain = chain
    st.session_state.explorer_notice = "Chuỗi đã được re-validate; tất cả block hiện hợp lệ."
    for index in range(len(chain)):
        st.session_state.pop(f"block_transactions_{index}", None)


def _reset_chain() -> None:
    old_chain = st.session_state.explorer_chain
    for index in range(len(old_chain)):
        st.session_state.pop(f"block_transactions_{index}", None)
    st.session_state.explorer_chain = _make_chain()
    st.session_state.explorer_notice = "Đã khôi phục chuỗi mẫu ban đầu."


def render_block_tab() -> None:
    """Render the V2 blockchain, chain validation, and transaction editor."""
    _ensure_state()
    chain = st.session_state.explorer_chain
    validity = _chain_validity(chain)
    valid_count = sum(validity)

    st.subheader("Blockchain explorer · Block V2")
    st.caption("Sửa transaction để kiểm thử Merkle root, block hash và liên kết toàn chuỗi.")
    left_action, right_action = st.columns([1, 5])
    with left_action:
        st.button("Reset chain", key="reset_blockchain", on_click=_reset_chain)
    with right_action:
        st.button(
            "Re-mine / Re-validate",
            key="remine_blockchain",
            type="primary",
            on_click=_remine_chain,
        )

    if notice := st.session_state.pop("explorer_notice", ""):
        st.success(notice)

    summary_columns = st.columns(3)
    summary_columns[0].metric("Blocks", len(chain))
    summary_columns[1].metric("Valid blocks", f"{valid_count} / {len(chain)}")
    summary_columns[2].metric("Chain status", "VALID" if valid_count == len(chain) else "TAMPERED")

    for index, block in enumerate(chain):
        valid = validity[index]
        status = "VALID" if valid else "INVALID · TAMPER DETECTED"
        with st.expander(f"Block #{int(block['index']):04d}  ·  {status}", expanded=index == 1):
            if valid:
                st.success("Block hash, Merkle root, và liên kết PrevHash hợp lệ.")
            else:
                st.error("Block không hợp lệ. Lỗi được truyền xuống các block theo sau trong chuỗi.")

            metadata_columns = st.columns(2)
            with metadata_columns[0]:
                st.caption("TIMESTAMP · ISO 8601")
                st.code(datetime.fromtimestamp(int(block["timestamp"]) / 1000, timezone.utc).isoformat(), language=None)
                st.caption("TIMESTAMP · UNIX EPOCH MS")
                st.code(str(block["timestamp"]), language=None)
                st.caption("PREVIOUS HASH")
                st.code(str(block["prev_hash"]), language=None)
                st.caption("MERKLE ROOT · STORED")
                st.code(str(block["merkle_root"]), language=None)
            with metadata_columns[1]:
                st.caption("NONCE")
                st.code(str(block["nonce"]), language=None)
                st.caption("VALIDATOR ADDRESS")
                st.code(str(block["validator"]), language=None)
                st.caption("BLOCK HASH · STORED")
                st.code(str(block["hash"]), language=None)
                st.caption("BLOCK HASH · RECALCULATED")
                calculated_hash = _block_hash(block)
                if calculated_hash == block["hash"] and block["merkle_root"] == merkle_root(block["transactions"]):
                    st.code(calculated_hash, language=None)
                else:
                    st.error(calculated_hash)

            st.text_area(
                "Transactions · mỗi dòng là một giao dịch",
                value="\n".join(block["transactions"]),
                key=f"block_transactions_{index}",
                height=100,
                on_change=_save_transactions,
                args=(index,),
            )

    st.caption("Block Hash = SHA256(Index + Timestamp + PrevHash + MerkleRoot + Nonce + Validator)")