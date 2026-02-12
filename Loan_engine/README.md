CampusTrust Loan & Reputation Logic Engine
==========================================

This document explains how the CampusTrust microcredit and reputation system
is implemented **purely using Algorand Layer‑1 stateful smart contracts (ASC1)**.
All trust, loan eligibility, and reputation changes are enforced on‑chain, with
no off‑chain servers or databases.


High‑Level Design
-----------------

- **Platform**: Algorand Stateful Smart Contract (ASC1)
- **Interaction mechanism**: Application Calls (AppCalls)
- **State model**:
  - **Global state (application‑wide)** for shared parameters and pool balance.
  - **Local state (per user)** for reputation and loan status.
- **Time / deadlines**: Use **Algorand round numbers** (e.g. `Global.round()`)
  instead of timestamps.
- **Funds movement**: Done via **atomic transaction groups** that include:
  - A payment transaction (Algo or ASA) for actual value transfer.
  - An AppCall transaction to update contract state and enforce rules.


State Layout
-----------

### Global State (application)

All keys are stored as integers (uint) in Algorand global state:

- `pool_balance` (uint): Total units of credit currently available in the
  community pool. Updated when users borrow, repay, or contribute.
- `penalty_rate` (uint): Reserved for future monetary penalties
  (not required for core hackathon rules, but modeled as a parameter).
- `reward_rate` (uint): Reserved for future monetary rewards
  (not required for core hackathon rules, but modeled as a parameter).

These parameters are **read‑only for normal users** and can only be updated
by an admin or governance logic (out of scope for this document).


### Local State (per user / per student)

Each account that opts into the application has its own local state:

- `reputation_score` (uint): Non‑negative integer representing trust level.
  - Directly controls borrowing permission and loan ceilings.
- `has_active_loan` (bool encoded as 0/1 uint):
  - `0` → no active loan
  - `1` → there is an active unpaid loan
- `active_loan_amount` (uint): Size of the currently active loan.
  - `0` if there is no active loan.
- `loan_due_round` (uint): Algorand round at or before which repayment
  is considered **on time**.
  - Set when a new loan is created as `Global.round() + LOAN_DURATION_ROUNDS`,
    where `LOAN_DURATION_ROUNDS` is a constant baked into the approval program.


Key Business Rules
------------------

All rules are enforced within the ASC1 approval program and are designed to
map directly to PyTeal expressions with **if/else conditions** and **no loops**.

### 1. Borrowing Eligibility

The contract allows borrowing **only if all** of the following hold:

1. **Reputation threshold**: `reputation_score > 40`
2. **Single active loan**: `has_active_loan == 0`
3. **Pool balance sufficient**: `pool_balance >= requested_amount`
4. **Within loan limit**: `requested_amount <= allowed_loan_limit`

Where the **allowed loan limit** depends on the current `reputation_score`:

- If `reputation_score < 40`:
  - Borrowing is **disabled**.
- If `40 <= reputation_score <= 69`:
  - `max_loan = 500`
- If `reputation_score >= 70`:
  - `max_loan = 1000`

If any of the above checks fail, the AppCall **rejects**, which causes the
entire atomic group (including transfers) to fail.


### 2. Borrow Workflow (AppCall: "borrow")

Assuming a `borrow` AppCall is part of an atomic group where the contract sends
funds to the borrower:

- Compute the current limit from `reputation_score`.
- Verify that:
  - `has_active_loan == 0`
  - `requested_amount > 0`
  - `requested_amount <= computed_limit`
  - `pool_balance >= requested_amount`
- On success:
  - Set `has_active_loan = 1`
  - Set `active_loan_amount = requested_amount`
  - Set `loan_due_round = Global.round() + LOAN_DURATION_ROUNDS`
  - Decrease `pool_balance` by `requested_amount`
  - The payment transaction in the same atomic group transfers
    `requested_amount` from the pool account to the borrower.


### 3. Repayment Workflow (AppCall: "repay")

Repayment is also executed in an atomic group:

- Atomic group contains:
  - A payment from borrower to the pool account for at least
    `active_loan_amount` units.
  - The `repay` AppCall.
- Contract verifies:
  - `has_active_loan == 1`
  - `active_loan_amount > 0`
  - The payment covers the required amount (checked via group inspection).
- The contract compares `Global.round()` with `loan_due_round`:
  - **On‑time or early repayment** (`Global.round() <= loan_due_round`):
    - Reputation change: `reputation_score += 10`
  - **Late repayment** (`Global.round() > loan_due_round`):
    - Reputation change: `reputation_score -= 15`
    - Reputation is clamped to a minimum of 0.
- In all successful repayment cases:
  - Set `has_active_loan = 0`
  - Set `active_loan_amount = 0`
  - Optionally set `loan_due_round = 0` for clarity
  - Increase `pool_balance` by the repaid principal amount

If any check fails, the AppCall rejects and the atomic group is rolled back
so **no repayment is partially applied**.


### 4. Contribution Workflow (AppCall: "contribute")

When a user contributes to the community pool:

- Atomic group contains:
  - A payment from contributor to the pool account.
  - The `contribute` AppCall.
- Contract verifies:
  - The payment is positive.
  - The payment is directed to the pool account.
- On success:
  - Increase `pool_balance` by the contributed amount.
  - Increase `reputation_score` by **+5** as a reward.
  - Clamp reputation at an upper bound if desired (e.g. 0–1000),
    implemented via integer min/max expressions.


Algorand‑Only Design Choices
----------------------------

- **No off‑chain storage**:
  - All critical state (reputation, loan status, pool balance) lives in
    Algorand application local/global state.
- **No external time source**:
  - Only `Global.round()` is used for deadlines, ensuring determinism and
    consensus safety.
- **No oracles or L2s**:
  - All rules are enforced entirely inside the ASC1 approval logic.
- **No Web2 logic**:
  - Frontend or mobile apps may only construct and submit AppCall + payment
    transactions; they do not maintain business logic.


Mapping to PyTeal
-----------------

The logic is intentionally designed to be expressed as straight‑line PyTeal
code using:

- `Seq([...])` for sequences of operations.
- `If(...)` for branching.
- `Assert(...)` for business rule enforcement.
- `App.globalGet(...)` / `App.globalPut(...)` for global state.
- `App.localGet(...)` / `App.localPut(...)` for per‑user state.
- `Global.round()` for round‑based deadline comparisons.
- Group transaction access (e.g. `Gtxn[i]`) to verify payments.

The `pseudocode.md` file contains PyTeal‑style pseudocode for each operation:
`borrow`, `repay`, and `contribute`.


Reference Python Engine
-----------------------

The `loan_engine.py` file in this directory is a **non‑production**,
off‑chain simulation of the same rules. It:

- Uses plain Python classes to mirror global and local state.
- Implements `borrow`, `repay`, and `contribute` as pure functions/methods.
- Uses an integer `current_round` argument wherever deadline logic is needed.

This reference is meant to:

- Help judges and developers reason about correctness.
- Provide a quick way to unit test loan and reputation behavior.
- Act as a guide for implementing the actual PyTeal ASC1.


Summary
-------

CampusTrust enforces **trust‑driven microcredit** purely via Algorand smart
contract logic:

- Reputation governs who can borrow and how much.
- Smart contract state ensures only one active loan per user.
- Repayments and contributions directly adjust both pool balance and
  reputation, incentivizing responsible behavior and participation.

All of this is encoded and enforced on Algorand Layer‑1 without any reliance
on centralized infrastructure.

