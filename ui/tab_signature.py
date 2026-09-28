"""Streamlit tab for wallets, digital signatures, and a Merkle tree."""

from __future__ import annotations

import streamlit as st

from crypto.hashing import merkle_root, sha256
from crypto.signature import generate_key_pair, sign_transaction, verify_signature


_INITIAL_MEMPOOL = [
    "0x7A3F...91C2 -> 0x2B8E...0D44 | 12.50 CHAIN",
    "0x91C2...3F8B -> 0x4D10...A567 | 3.25 CHAIN",
    "0x2B8E...0D44 -> 0xA501...09DE | 8.00 CHAIN",
    "0x4D10...A567 -> 0x7A3F...91C2 | 1.75 CHAIN",
]


def _ensure_state() -> None:
    defaults = {
        "wallet_private_key": "",
        "wallet_public_key": "",
        "wallet_address": "",
        "wallet_signature": "",
        "wallet_signed_message": "",
        "wallet_verify_result": None,
        "wallet_verify_error": "",
        "transaction_sender": "",
        "wallet_mempool": _INITIAL_MEMPOOL.copy(),
        "wallet_selected_merkle_node": "root",
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value


def _digest_levels(transactions: list[str]) -> list[list[str]]:
    """Return Merkle levels from leaves upward for displaying node hashes."""
    if not transactions:
        return [[sha256("")]]

    levels = [[sha256(transaction) for transaction in transactions]]
    while len(levels[-1]) > 1:
        current = levels[-1]
        if len(current) % 2:
            current = [*current, current[-1]]
        levels.append(
            [
                sha256(bytes.fromhex(current[index]) + bytes.fromhex(current[index + 1]))
                for index in range(0, len(current), 2)
            ]
        )
    return levels


def _show_merkle_node(label: str, digest: str, node_id: str) -> None:
    selected = st.session_state.wallet_selected_merkle_node == node_id
    if st.button(
        f"{'◆' if selected else '◇'} {label}\n{digest[:12]}…{digest[-8:]}",
        key=f"merkle_node_{node_id}",
        use_container_width=True,
        type="primary" if selected else "secondary",
    ):
        st.session_state.wallet_selected_merkle_node = node_id


def _clear_verification_result() -> None:
    st.session_state.wallet_verify_result = None
    st.session_state.wallet_verify_error = ""


def _render_merkle_tree() -> None:
    st.subheader("Cây Merkle · Mempool")
    st.caption("Sửa giao dịch để cập nhật cây. Chọn một node để xem digest đầy đủ.")

    edited = st.text_area(
        "4 giao dịch trong Mempool · mỗi dòng là một giao dịch",
        value="\n".join(st.session_state.wallet_mempool),
        height=112,
        key="wallet_mempool_editor",
    )
    transaction_lines = edited.splitlines()
    transactions = [line.strip() for line in transaction_lines[:4]]
    transactions.extend([""] * (4 - len(transactions)))
    st.session_state.wallet_mempool = transactions
    if len(transaction_lines) > 4:
        st.warning("Cây Mempool giới hạn ở 4 giao dịch; các dòng sau không được đưa vào cây.")

    levels = _digest_levels(transactions)
    root = merkle_root(transactions)
    st.caption(f"MERKLE ROOT · {root}")

    leaf_columns = st.columns(4)
    for index, column in enumerate(leaf_columns):
        with column:
            if index < len(transactions):
                _show_merkle_node(f"TX {index + 1}", levels[0][index], f"leaf_{index}")
            else:
                st.empty()

    if len(levels) > 1:
        parent_columns = st.columns(4)
        for index, column in enumerate(parent_columns):
            with column:
                if index in (0, 2) and len(levels[1]) > index // 2:
                    parent_index = index // 2
                    _show_merkle_node(
                        f"NODE {parent_index + 1}",
                        levels[1][parent_index],
                        f"parent_{parent_index}",
                    )
                else:
                    st.empty()

    root_columns = st.columns([1, 2, 1])
    with root_columns[1]:
        _show_merkle_node("MERKLE ROOT", root, "root")

    selected_node = st.session_state.wallet_selected_merkle_node
    selected_digest = root
    if selected_node.startswith("leaf_"):
        leaf_index = int(selected_node.split("_")[1])
        if leaf_index < len(levels[0]):
            selected_digest = levels[0][leaf_index]
    elif selected_node.startswith("parent_") and len(levels) > 1:
        parent_index = int(selected_node.split("_")[1])
        if parent_index < len(levels[1]):
            selected_digest = levels[1][parent_index]

    st.code(selected_digest, language=None)


def render_signature_tab() -> None:
    """Render wallet creation, transaction signing, verification, and Merkle UI."""
    _ensure_state()
    st.subheader("Ví & Chữ ký số")
    st.caption("Tạo danh tính ECDSA, ký giao dịch và kiểm tra tính toàn vẹn bằng Merkle tree.")

    with st.container(border=True):
        st.markdown("#### Ví ECDSA P-256")
        st.caption("Private key được giữ trong Streamlit session hiện tại; không dùng key demo cho tài sản thật.")
        if st.button("Tạo Ví", key="create_wallet", type="primary"):
            private_key, public_key = generate_key_pair()
            st.session_state.wallet_private_key = private_key
            st.session_state.wallet_public_key = public_key
            st.session_state.wallet_address = f"0x{sha256(public_key)[:40]}"
            st.session_state["transaction_sender"] = st.session_state.wallet_address
            st.session_state.wallet_signature = ""
            st.session_state.wallet_signed_message = ""
            st.session_state.wallet_verify_result = None
            st.session_state.wallet_verify_error = ""

        if st.session_state.wallet_private_key:
            wallet_left, wallet_right = st.columns(2)
            with wallet_left:
                st.caption("PRIVATE KEY · GIỮ BÍ MẬT")
                st.code(st.session_state.wallet_private_key, language=None)
            with wallet_right:
                st.caption("PUBLIC KEY")
                st.code(st.session_state.wallet_public_key, language=None)
            st.code(st.session_state.wallet_address, language=None)
        else:
            st.info("Chưa có ví. Chọn “Tạo Ví” để sinh key pair và địa chỉ.")

    signing_column, verification_column = st.columns(2)

    with signing_column:
        with st.container(border=True):
            st.markdown("#### Tạo & ký giao dịch")
            sender = st.text_input(
                "Ví gửi",
                key="transaction_sender",
            )
            receiver = st.text_input(
                "Ví nhận",
                value="0x2B8E...0D44",
                key="transaction_receiver",
            )
            amount = st.number_input(
                "Số tiền",
                min_value=0.0,
                value=1.0,
                step=0.1,
                format="%.4f",
                key="transaction_amount",
            )
            transaction_message = f"{sender.strip()}|{receiver.strip()}|{amount:.4f}"
            st.caption("MESSAGE ĐƯỢC KÝ")
            st.code(transaction_message, language=None)

            if st.button("Ký giao dịch", key="sign_transaction", use_container_width=True):
                if not st.session_state.wallet_private_key:
                    st.session_state.wallet_signature = ""
                    st.error("Hãy tạo ví trước khi ký giao dịch.")
                elif not sender.strip() or not receiver.strip() or amount <= 0:
                    st.session_state.wallet_signature = ""
                    st.error("Nhập ví gửi, ví nhận và số tiền lớn hơn 0.")
                else:
                    st.session_state.wallet_signed_message = transaction_message
                    st.session_state.wallet_signature = sign_transaction(
                        st.session_state.wallet_private_key,
                        transaction_message,
                    )
                    st.session_state.wallet_verify_result = None

            if st.session_state.wallet_signature:
                st.caption("DIGITAL SIGNATURE · BASE64 DER")
                st.code(st.session_state.wallet_signature, language=None)
                if st.button("Đưa vào khung xác thực", key="send_to_verify"):
                    st.session_state["verification_message"] = st.session_state.wallet_signed_message
                    st.session_state["verification_public_key"] = st.session_state.wallet_public_key
                    st.session_state["verification_signature"] = st.session_state.wallet_signature
                    st.rerun()

    with verification_column:
        with st.container(border=True):
            st.markdown("#### Xác thực chữ ký")
            verify_message = st.text_area(
                "Message",
                key="verification_message",
                height=90,
                placeholder="Nhập chính xác message đã được ký.",
                on_change=_clear_verification_result,
            )
            verify_public_key = st.text_area(
                "Public Key",
                key="verification_public_key",
                height=120,
                placeholder="-----BEGIN PUBLIC KEY-----",
                on_change=_clear_verification_result,
            )
            verify_signature_value = st.text_area(
                "Signature · Base64 DER",
                key="verification_signature",
                height=90,
                placeholder="Dán chữ ký cần xác thực.",
                on_change=_clear_verification_result,
            )
            if st.button("Verify", key="verify_signature", use_container_width=True):
                if not verify_message or not verify_public_key or not verify_signature_value:
                    st.session_state.wallet_verify_result = False
                    st.session_state.wallet_verify_error = "Cần nhập đủ Message, Public Key và Signature."
                else:
                    st.session_state.wallet_verify_result = verify_signature(
                        verify_public_key,
                        verify_message,
                        verify_signature_value.strip(),
                    )
                    st.session_state.wallet_verify_error = ""

            if st.session_state.wallet_verify_error:
                st.error(st.session_state.wallet_verify_error)
            elif st.session_state.wallet_verify_result is True:
                st.success("Hợp lệ · chữ ký khớp với message và public key.")
            elif st.session_state.wallet_verify_result is False:
                st.error("Không hợp lệ · chữ ký không khớp hoặc dữ liệu xác thực sai.")

    with st.container(border=True):
        _render_merkle_tree()