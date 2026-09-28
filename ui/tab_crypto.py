"""Streamlit tab for an interactive SHA-256 demonstration."""

import streamlit as st

from crypto.hashing import check_sha256_properties, sha256


_DEFAULT_INPUT = "Blockchain is built on trustless verification."
_DEFAULT_COMPARISON = "Blockchain is built on trustless verification!"


def _short_digest(digest: str) -> str:
    return f"{digest[:16]}…{digest[-8:]}"


def render_sha256_tab() -> None:
    """Render the real-time SHA-256 input and four property cards."""
    st.subheader("SHA-256 demo")
    st.caption("Thay đổi input để quan sát hash được cập nhật theo thời gian thực.")

    input_text = st.text_area(
        "Input",
        value=_DEFAULT_INPUT,
        key="sha256_demo_input",
        height=100,
        help="SHA-256 xử lý nội dung dưới dạng UTF-8.",
    )
    digest = sha256(input_text)
    st.caption(f"REAL-TIME HASH · {len(input_text.encode('utf-8'))} BYTES · SHA-256")
    st.code(digest, language=None)

    comparison_text = st.session_state.get(
        "sha256_demo_comparison",
        _DEFAULT_COMPARISON,
    )
    properties = check_sha256_properties(input_text, comparison_text)
    avalanche = properties["avalanche_effect"]
    fixed_length = properties["fixed_length"]

    deterministic_card, avalanche_card, preimage_card, fixed_length_card = st.columns(4)

    with deterministic_card:
        with st.container(border=True):
            st.markdown("#### Deterministic")
            st.caption("Cùng input luôn tạo cùng digest.")
            st.code(_short_digest(digest), language=None)
            if properties["deterministic"]:
                st.success("Hai lần tính khớp nhau.")
            else:
                st.error("Digest không khớp.")

    with avalanche_card:
        with st.container(border=True):
            st.markdown("#### Avalanche effect")
            comparison_text = st.text_input(
                "Input so sánh",
                value=_DEFAULT_COMPARISON,
                key="sha256_demo_comparison",
                help="So sánh input này với nội dung phía trên.",
            )
            properties = check_sha256_properties(input_text, comparison_text)
            avalanche = properties["avalanche_effect"]
            comparison_digest = avalanche["comparison_digest"]
            changed_bits = avalanche["changed_bits"]
            changed_ratio = avalanche["changed_ratio"]
            st.caption(f"A  {_short_digest(digest)}")
            st.caption(f"B  {_short_digest(comparison_digest)}")
            st.metric(
                "Bit thay đổi",
                f"{changed_bits} / 256",
                f"{changed_ratio:.1%} của digest",
            )
            st.progress(changed_ratio, text="Tỷ lệ bit khác nhau")
            st.caption("Khoảng 50% là xu hướng thống kê, không phải bảo đảm cho mọi cặp input.")

    with preimage_card:
        with st.container(border=True):
            st.markdown("#### Pre-image resistance")
            st.caption("Không thể suy ngược input chỉ từ digest.")
            st.metric("Không gian digest", "2²⁵⁶")
            st.info(
                "Đây là tính chất bảo mật của thuật toán; một ví dụ đơn lẻ "
                "không thể chứng minh khả năng chống pre-image."
            )

    with fixed_length_card:
        with st.container(border=True):
            st.markdown("#### Fixed length")
            st.caption("Độ dài output không phụ thuộc input.")
            st.metric("Độ dài SHA-256", f"{fixed_length['bits']} bits")
            st.metric("Hex characters", fixed_length["hex_characters"])
            if fixed_length["valid"]:
                st.success("Digest luôn gồm 64 ký tự hex.")
            else:
                st.error("Độ dài digest không đúng 256 bits.")
