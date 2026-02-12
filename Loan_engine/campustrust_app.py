# pyright: reportMissingImports=false, reportUndefinedVariable=false
from pyteal import *

# --------------------------------------------------------
# State keys (as bytes)
# --------------------------------------------------------

POOL_BALANCE_KEY = Bytes("pool_balance")
PENALTY_RATE_KEY = Bytes("penalty_rate")
REWARD_RATE_KEY = Bytes("reward_rate")

REP_SCORE_KEY = Bytes("reputation_score")
HAS_LOAN_KEY = Bytes("has_active_loan")
LOAN_AMOUNT_KEY = Bytes("active_loan_amount")
DUE_ROUND_KEY = Bytes("loan_due_round")

# Constants
LOAN_DURATION_ROUNDS = Int(5000)      # adjust as needed
MAX_REPUTATION = Int(1000)           # optional cap


# --------------------------------------------------------
# Helper: compute max loan based on reputation
# --------------------------------------------------------

def compute_max_loan_limit(rep: Expr) -> Expr:
    return If(rep < Int(40)).Then(
        Int(0)
    ).Else(
        If(rep <= Int(69)).Then(
            Int(500)
        ).Else(
            Int(1000)
        )
    )


# --------------------------------------------------------
# Borrow logic
# --------------------------------------------------------

def borrow() -> Expr:
    acct = Txn.sender()

    rep = App.localGet(acct, REP_SCORE_KEY)
    has_loan = App.localGet(acct, HAS_LOAN_KEY)
    pool = App.globalGet(POOL_BALANCE_KEY)

    requested_amount = Btoi(Txn.application_args[1])
    max_allowed = compute_max_loan_limit(rep)

    return Seq(
        # Basic checks
        Assert(rep > Int(40)),
        Assert(has_loan == Int(0)),
        Assert(requested_amount > Int(0)),
        Assert(requested_amount <= max_allowed),
        Assert(pool >= requested_amount),

        # NOTE: In a full implementation, also Assert that the group
        # contains a payment from the pool account to acct for
        # requested_amount. Omitted here for brevity.

        # State updates
        App.localPut(acct, HAS_LOAN_KEY, Int(1)),
        App.localPut(acct, LOAN_AMOUNT_KEY, requested_amount),
        App.localPut(
            acct,
            DUE_ROUND_KEY,
            Global.round() + LOAN_DURATION_ROUNDS,
        ),
        App.globalPut(POOL_BALANCE_KEY, pool - requested_amount),

        Approve(),
    )


# --------------------------------------------------------
# Repay logic
# --------------------------------------------------------

def repay() -> Expr:
    acct = Txn.sender()

    has_loan = App.localGet(acct, HAS_LOAN_KEY)
    loan_amt = App.localGet(acct, LOAN_AMOUNT_KEY)
    due_round = App.localGet(acct, DUE_ROUND_KEY)
    rep = App.localGet(acct, REP_SCORE_KEY)
    pool = App.globalGet(POOL_BALANCE_KEY)

    rep_new = ScratchVar(TealType.uint64)

    return Seq(
        # Preconditions
        Assert(has_loan == Int(1)),
        Assert(loan_amt > Int(0)),

        # NOTE: In a full implementation, also Assert that the group
        # contains a payment from acct to the pool account for at
        # least loan_amt. Omitted here for brevity.

        # Reputation update based on timing
        If(Global.round() <= due_round).Then(
            # On-time or early repayment: +10
            rep_new.store(rep + Int(10))
        ).Else(
            # Late repayment: -15, clamped to >= 0
            If(rep > Int(15))
            .Then(rep_new.store(rep - Int(15)))
            .Else(rep_new.store(Int(0)))
        ),

        # Optional cap
        If(rep_new.load() > MAX_REPUTATION).Then(
            rep_new.store(MAX_REPUTATION)
        ),

        # Apply state updates
        App.localPut(acct, REP_SCORE_KEY, rep_new.load()),
        App.localPut(acct, HAS_LOAN_KEY, Int(0)),
        App.localPut(acct, LOAN_AMOUNT_KEY, Int(0)),
        App.localPut(acct, DUE_ROUND_KEY, Int(0)),

        App.globalPut(POOL_BALANCE_KEY, pool + loan_amt),

        Approve(),
    )


# --------------------------------------------------------
# Contribute logic
# --------------------------------------------------------

def contribute() -> Expr:
    acct = Txn.sender()

    rep = App.localGet(acct, REP_SCORE_KEY)
    pool = App.globalGet(POOL_BALANCE_KEY)

    contrib_amount = Btoi(Txn.application_args[1])  # or read from Gtxn payment

    rep_new = ScratchVar(TealType.uint64)

    return Seq(
        Assert(contrib_amount > Int(0)),

        # NOTE: In a full implementation, Assert that group contains
        # a payment from acct to the pool account of contrib_amount.

        # Pool balance update
        App.globalPut(POOL_BALANCE_KEY, pool + contrib_amount),

        # Reputation +5 (with optional cap)
        rep_new.store(rep + Int(5)),
        If(rep_new.load() > MAX_REPUTATION).Then(
            rep_new.store(MAX_REPUTATION)
        ),
        App.localPut(acct, REP_SCORE_KEY, rep_new.load()),

        Approve(),
    )


# --------------------------------------------------------
# App lifecycle handlers
# --------------------------------------------------------

def on_create() -> Expr:
    return Seq(
        # Initialize global state; pool_balance could be 0 or set by creator
        App.globalPut(POOL_BALANCE_KEY, Int(0)),
        App.globalPut(PENALTY_RATE_KEY, Int(0)),
        App.globalPut(REWARD_RATE_KEY, Int(0)),
        Approve(),
    )


def on_opt_in() -> Expr:
    acct = Txn.sender()
    return Seq(
        App.localPut(acct, REP_SCORE_KEY, Int(50)),  # initial reputation
        App.localPut(acct, HAS_LOAN_KEY, Int(0)),
        App.localPut(acct, LOAN_AMOUNT_KEY, Int(0)),
        App.localPut(acct, DUE_ROUND_KEY, Int(0)),
        Approve(),
    )


def on_close_out() -> Expr:
    # For simplicity, allow close-out only when no active loan
    acct = Txn.sender()
    return Seq(
        Assert(App.localGet(acct, HAS_LOAN_KEY) == Int(0)),
        Approve(),
    )


def on_noop() -> Expr:
    method = Txn.application_args[0]

    return Cond(
        [method == Bytes("borrow"), borrow()],
        [method == Bytes("repay"), repay()],
        [method == Bytes("contribute"), contribute()],
    )


# --------------------------------------------------------
# Main approval & clear programs
# --------------------------------------------------------

def approval_program() -> Expr:
    return Cond(
        [Txn.application_id() == Int(0), on_create()],
        [Txn.on_completion() == OnComplete.OptIn, on_opt_in()],
        [Txn.on_completion() == OnComplete.CloseOut, on_close_out()],
        [Txn.on_completion() == OnComplete.NoOp, on_noop()],
        # Reject updates / deletes by default
        [Txn.on_completion() == OnComplete.UpdateApplication, Reject()],
        [Txn.on_completion() == OnComplete.DeleteApplication, Reject()],
    )


def clear_state_program() -> Expr:
    return Approve()


if __name__ == "__main__":
    print(compileTeal(approval_program(), mode=Mode.Application, version=8))
    print(compileTeal(clear_state_program(), mode=Mode.Application, version=8))