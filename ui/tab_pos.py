"""Educational Ethereum-style proof-of-stake simulator for Streamlit."""

from __future__ import annotations

from datetime import datetime, timezone
import random
import secrets

import streamlit as st

from crypto.hashing import sha256


PROPOSER_REWARD_ETH = 0.02
ATTESTER_REWARD_ETH = 0.005
PROPOSER_SLASH_RATE = 0.10
BAD_ATTESTATION_SLASH_RATE = 0.02

_INITIAL_VALIDATORS = [
    {
        "id": "validator-alice",
        "name": "Alice Chen",
        "address": "0x7A3F0000000000000000000000000000000091C2",
        "stake": 32.0,
        "rewards": 0.0,
        "slashed": 0.0,
    },
    {
        "id": "validator-bruno",
        "name": "Bruno Silva",
        "address": "0x2B8E000000000000000000000000000000000D44",
        "stake": 24.0,
        "rewards": 0.0,
        "slashed": 0.0,
    },
    {
        "id": "validator-chika",
        "name": "Chika Mori",
        "address": "0x4D1000000000000000000000000000000000A567",
        "stake": 16.0,
        "rewards": 0.0,
        "slashed": 0.0,
    },
]


def _ensure_state() -> None:
    defaults = {
        "pos_validators": [dict(validator) for validator in _INITIAL_VALIDATORS],
        "pos_slot": 128,
        "pos_pending_proposal": None,
        "pos_blocks_proposed": 0,
        "pos_blocks_finalized": 0,
        "pos_events": [
            {
                "time": "09:41:02",
                "kind": "NETWORK",
                "message": "PoS simulator initialized.",
                "detail": "3 validators · educational testnet",
            }
        ],
        "pos_fraud_mode": False,
        "pos_clear_fraud_mode": False,
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value


def _weighted_validator(validators: list[dict[str, object]]) -> dict[str, object] | None:
    eligible = [validator for validator in validators if float(validator["stake"]) > 0]
    total_stake = sum(float(validator["stake"]) for validator in eligible)
    if total_stake <= 0:
        return None

    ticket = random.random() * total_stake
    for validator in eligible:
        ticket -= float(validator["stake"])
        if ticket < 0:
            return validator
    return eligible[-1]


def _add_event(kind: str, message: str, detail: str) -> None:
    events = st.session_state.pos_events
    events.insert(
        0,
        {
            "time": datetime.now(timezone.utc).strftime("%H:%M:%S UTC"),
            "kind": kind,
            "message": message,
            "detail": detail,
        },
    )
    del events[10:]


def _add_validator(name: str, address: str, stake: float) -> tuple[bool, str]:
    name = name.strip()
    address = address.strip() or f"0x{sha256(f'{name}:{secrets.token_hex(16)}')[:40]}"
    if not name:
        return False, "Nhập tên ví/validator."
    if stake <= 0:
        return False, "Stake phải lớn hơn 0 ETH."
    if any(validator["address"].lower() == address.lower() for validator in st.session_state.pos_validators):
        return False, "Địa chỉ ví này đã tham gia staking."

    validator = {
        "id": f"validator-{secrets.token_hex(6)}",
        "name": name,
        "address": address,
        "stake": float(stake),
        "rewards": 0.0,
        "slashed": 0.0,
    }
    st.session_state.pos_validators.append(validator)
    _add_event("STAKE", f"{name} joined the validator set.", f"{stake:.4f} ETH staked · {address}")
    return True, f"{name} đã stake {stake:.4f} ETH và tham gia validator set."


def _propose_block() -> tuple[bool, str]:
    validator = _weighted_validator(st.session_state.pos_validators)
    if validator is None:
        return False, "Chưa có validator nào với stake lớn hơn 0."

    slot = st.session_state.pos_slot
    is_fraudulent = st.session_state.pos_fraud_mode
    timestamp = datetime.now(timezone.utc).isoformat()
    block_hash = sha256(
        f"{slot}|{timestamp}|{validator['address']}|{secrets.token_hex(16)}|{is_fraudulent}"
    )
    proposal = {
        "slot": slot,
        "hash": block_hash,
        "proposer_id": validator["id"],
        "proposer_name": validator["name"],
        "proposer_address": validator["address"],
        "fraudulent": is_fraudulent,
        "status": "PENDING ATTESTATION",
    }
    st.session_state.pos_pending_proposal = proposal
    st.session_state.pos_slot += 1
    st.session_state.pos_blocks_proposed += 1
    st.session_state.pos_clear_fraud_mode = True
    _add_event(
        "PROPOSE",
        f"Block for slot {slot} proposed by {validator['name']}.",
        f"{validator['address']} · {float(validator['stake']):.4f} ETH staked",
    )
    return True, f"{validator['name']} được chọn làm proposer cho slot {slot}."


def _find_validator(validator_id: str) -> dict[str, object] | None:
    return next(
        (validator for validator in st.session_state.pos_validators if validator["id"] == validator_id),
        None,
    )


def _submit_attestation(attester_id: str, vote: str) -> tuple[bool, str]:
    proposal = st.session_state.pos_pending_proposal
    if proposal is None:
        return False, "Không có block đang chờ attestation."

    proposer = _find_validator(proposal["proposer_id"])
    attester = _find_validator(attester_id)
    if proposer is None or attester is None:
        return False, "Proposer hoặc attester không còn trong validator set."
    if float(attester["stake"]) <= 0:
        return False, "Validator đã bị slashing hết stake và không thể attestation."

    if vote == "Report fraud":
        if proposal["fraudulent"]:
            proposer_penalty = min(
                float(proposer["stake"]),
                float(proposer["stake"]) * PROPOSER_SLASH_RATE,
            )
            proposer["stake"] = float(proposer["stake"]) - proposer_penalty
            proposer["slashed"] = float(proposer["slashed"]) + proposer_penalty
            proposal["status"] = "REJECTED · PROPOSER SLASHED"
            _add_event(
                "SLASH",
                f"Fraud confirmed · {proposer['name']} slashed {proposer_penalty:.4f} ETH.",
                "Malicious proposal rejected by validator attestation.",
            )
            result = f"Gian lận được xác nhận. Proposer bị slash {proposer_penalty:.4f} ETH."
        else:
            false_vote_penalty = min(
                float(attester["stake"]),
                float(attester["stake"]) * BAD_ATTESTATION_SLASH_RATE,
            )
            attester["stake"] = float(attester["stake"]) - false_vote_penalty
            attester["slashed"] = float(attester["slashed"]) + false_vote_penalty
            proposal["status"] = "FINALIZED · FALSE REPORT SLASHED"
            proposer["rewards"] = float(proposer["rewards"]) + PROPOSER_REWARD_ETH
            attester["rewards"] = float(attester["rewards"]) + ATTESTER_REWARD_ETH
            st.session_state.pos_blocks_finalized += 1
            _add_event(
                "SLASH",
                f"False fraud report · {attester['name']} slashed {false_vote_penalty:.4f} ETH.",
                "Proposal was valid; block finalized and proposer rewarded.",
            )
            result = f"Block hợp lệ đã finalized; false reporter bị slash {false_vote_penalty:.4f} ETH."
        _add_event(
            "ATTEST",
            f"{attester['name']} voted: report fraud.",
            f"Block slot {proposal['slot']} · {proposal['status']}",
        )
    elif proposal["fraudulent"]:
        proposer_penalty = min(
            float(proposer["stake"]),
            float(proposer["stake"]) * PROPOSER_SLASH_RATE,
        )
        attester_penalty = min(
            float(attester["stake"]),
            float(attester["stake"]) * BAD_ATTESTATION_SLASH_RATE,
        )
        proposer["stake"] = float(proposer["stake"]) - proposer_penalty
        proposer["slashed"] = float(proposer["slashed"]) + proposer_penalty
        attester["stake"] = float(attester["stake"]) - attester_penalty
        attester["slashed"] = float(attester["slashed"]) + attester_penalty
        proposal["status"] = "REJECTED · INVALID ATTESTATION SLASHED"
        _add_event(
            "SLASH",
            f"Invalid attestation · proposer {proposer_penalty:.4f} ETH, voter {attester_penalty:.4f} ETH slashed.",
            "Fraudulent block rejected; voting to accept it is slashable in this simulation.",
        )
        _add_event(
            "ATTEST",
            f"{attester['name']} voted: accept block.",
            f"Dishonest vote on fraudulent slot {proposal['slot']}.",
        )
        result = "Block gian lận bị từ chối; proposer và voter gian lận đã bị slash."
    else:
        proposer["rewards"] = float(proposer["rewards"]) + PROPOSER_REWARD_ETH
        attester["rewards"] = float(attester["rewards"]) + ATTESTER_REWARD_ETH
        proposal["status"] = "FINALIZED"
        st.session_state.pos_blocks_finalized += 1
        _add_event(
            "REWARD",
            f"Block finalized · {proposer['name']} and {attester['name']} rewarded.",
            f"+{PROPOSER_REWARD_ETH:.4f} ETH proposer · +{ATTESTER_REWARD_ETH:.4f} ETH attester",
        )
        _add_event(
            "ATTEST",
            f"{attester['name']} attested block slot {proposal['slot']}.",
            f"Vote accepted · block {proposal['hash'][:16]}…",
        )
        result = f"Attestation hợp lệ. Block finalized, {proposer['name']} và {attester['name']} nhận thưởng."

    st.session_state.pos_pending_proposal = None
    return True, result


def _render_validator_set() -> None:
    validators = st.session_state.pos_validators
    total_stake = sum(float(validator["stake"]) for validator in validators)

    st.subheader("Validator set")
    st.caption(f"{len(validators)} ví staking · tổng stake {total_stake:.4f} ETH")
    for validator in validators:
        stake = float(validator["stake"])
        weight = stake / total_stake if total_stake else 0.0
        with st.container(border=True):
            identity, balance = st.columns([3, 1])
            with identity:
                st.markdown(f"**{validator['name']}**")
                st.code(str(validator["address"]), language=None)
            with balance:
                st.metric("Stake", f"{stake:.4f} ETH")
                st.caption(f"Selection weight · {weight:.1%}")
            progress_columns = st.columns([4, 1])
            with progress_columns[0]:
                st.progress(weight)
            with progress_columns[1]:
                st.caption(f"Rewards +{float(validator['rewards']):.4f}")
            if float(validator["slashed"]) > 0:
                st.error(f"Slashed: {float(validator['slashed']):.4f} ETH")


def _render_events() -> None:
    st.subheader("Consensus activity")
    for event in st.session_state.pos_events:
        with st.container(border=True):
            heading, timestamp = st.columns([4, 1])
            with heading:
                st.markdown(f"**{event['kind']} · {event['message']}**")
                st.caption(str(event["detail"]))
            with timestamp:
                st.caption(str(event["time"]))


def render_pos_tab() -> None:
    """Render staking, proposer selection, attestations, rewards, and slashing."""
    _ensure_state()
    if st.session_state.pos_clear_fraud_mode:
        st.session_state.pos_fraud_mode = False
        st.session_state.pos_clear_fraud_mode = False
    st.subheader("Ethereum-style Proof of Stake")
    st.caption("Stake → chọn proposer theo trọng số → attestation → finality hoặc slashing.")
    st.info(
        "Mô phỏng giáo dục: rewards, slash và số ETH không theo thông số mainnet; "
        "không có giao dịch hoặc tài sản thật."
    )

    validators = st.session_state.pos_validators
    total_stake = sum(float(validator["stake"]) for validator in validators)
    proposer, finalized, slot, staked = st.columns(4)
    proposer.metric("Validators", len(validators))
    finalized.metric("ETH staked", f"{total_stake:.4f}")
    slot.metric("Next slot", st.session_state.pos_slot)
    staked.metric("Blocks finalized", st.session_state.pos_blocks_finalized)

    stake_column, proposer_column = st.columns(2)
    with stake_column:
        with st.container(border=True):
            st.markdown("#### Tham gia staking")
            with st.form("pos_stake_form", clear_on_submit=True):
                wallet_name = st.text_input("Tên ví / validator", placeholder="Ví dụ: Validator mới")
                wallet_address = st.text_input("Địa chỉ ví · tùy chọn", placeholder="Tự tạo địa chỉ demo nếu để trống")
                stake_amount = st.number_input(
                    "Số ETH stake",
                    min_value=0.0,
                    value=1.0,
                    step=0.5,
                    format="%.4f",
                )
                submitted = st.form_submit_button("Stake ETH", type="primary", use_container_width=True)
            if submitted:
                added, message = _add_validator(wallet_name, wallet_address, stake_amount)
                if added:
                    st.success(message)
                    st.rerun()
                else:
                    st.error(message)

    with proposer_column:
        with st.container(border=True):
            st.markdown("#### Đề xuất block")
            st.caption("Mỗi validator có xác suất được chọn tỷ lệ thuận với stake đang hoạt động.")
            st.toggle(
                "Đánh dấu proposer gian lận",
                key="pos_fraud_mode",
                help="Block kế tiếp sẽ bị đánh dấu gian lận để kiểm thử vote và slashing.",
            )
            pending = st.session_state.pos_pending_proposal
            if pending is None:
                if st.button("Chọn proposer & đề xuất block", key="pos_propose", type="primary", use_container_width=True):
                    proposed, message = _propose_block()
                    if proposed:
                        st.success(message)
                    else:
                        st.error(message)
                    st.rerun()
            else:
                state_label = "FRAUD FLAGGED" if pending["fraudulent"] else "VALID CANDIDATE"
                st.warning(f"Slot {pending['slot']} · {state_label} · {pending['proposer_name']}")
                st.code(f"Proposer: {pending['proposer_address']}\nBlock hash: {pending['hash']}", language=None)
                active_validators = [
                    validator for validator in validators if float(validator["stake"]) > 0
                ]
                if active_validators:
                    validator_labels = {
                        str(validator["id"]): f"{validator['name']} · {validator['address']}"
                        for validator in active_validators
                    }
                    default_attester = next(
                        (
                            index
                            for index, validator in enumerate(active_validators)
                            if validator["id"] != pending["proposer_id"]
                        ),
                        0,
                    )
                    attester_id = st.selectbox(
                        "Validator committee · người bỏ phiếu",
                        options=list(validator_labels),
                        format_func=validator_labels.get,
                        index=default_attester,
                        key="pos_attester",
                    )
                    vote = st.radio(
                        "Attestation vote",
                        options=["Attest block", "Report fraud"],
                        index=1 if pending["fraudulent"] else 0,
                        horizontal=True,
                        key="pos_vote",
                    )
                    if st.button("Gửi attestation vote", key="pos_attest", use_container_width=True):
                        submitted_vote, message = _submit_attestation(attester_id, vote)
                        if submitted_vote:
                            st.success(message)
                        else:
                            st.error(message)
                        st.rerun()

    _render_validator_set()
    _render_events()

    with st.expander("Quy tắc mô phỏng"):
        st.markdown(
            f"- Proposer nhận **{PROPOSER_REWARD_ETH:.4f} ETH** và attester nhận **{ATTESTER_REWARD_ETH:.4f} ETH** khi block hợp lệ được finalized.\n"
            f"- Proposer gian lận bị slash **{PROPOSER_SLASH_RATE:.0%}** stake.\n"
            f"- Vote chấp nhận block gian lận bị slash **{BAD_ATTESTATION_SLASH_RATE:.0%}** stake.\n"
            "- Báo gian lận sai bị slash 2%; block hợp lệ vẫn được finalized trong mô phỏng này."
        )