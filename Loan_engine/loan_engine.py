"""
CampusTrust Loan & Reputation Logic Engine (Python Reference)
=============================================================

This module is a **non-production** Python simulation of the CampusTrust logic.
It mirrors what the Algorand Stateful Smart Contract (ASC1) will enforce:

- Reputation-based borrowing limits
- Single active loan per user
- Round-based deadlines
- Reputation changes on repayment and contribution

NO blockchain SDKs are used here. This is purely for reasoning, testing, and
demonstration. The actual on-chain implementation will use PyTeal.
"""

from dataclasses import dataclass, field
from typing import Dict


# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------

@dataclass
class UserLocalState:
    """
    Represents Algorand application local state for a single user.
    """

    reputation_score: int = 50  # example initial reputation
    has_active_loan: bool = False
    active_loan_amount: int = 0
    loan_due_round: int = 0

    def __post_init__(self) -> None:
        # Ensure non-negative values for safety in the simulation.
        if self.reputation_score < 0:
            self.reputation_score = 0
        if self.active_loan_amount < 0:
            self.active_loan_amount = 0
        if self.loan_due_round < 0:
            self.loan_due_round = 0


@dataclass
class GlobalState:
    """
    Represents Algorand application global state.
    """

    pool_balance: int = 1000000
    penalty_rate: int = 10  # reserved for future use
    reward_rate: int = 5   # reserved for future use


class LoanEngine:
    """
    Reference engine that simulates CampusTrust logic.

    This class is intentionally simple; it closely follows the rules specified
    in README.md, rules.md, and pseudocode.md.
    """

    # Loan duration in rounds (constant baked into approval program on-chain)
    LOAN_DURATION_ROUNDS: int = 5_000

    # Optional reputation bounds for simulation
    MIN_REPUTATION: int = 0
    MAX_REPUTATION: int = 1_000

    def __init__(self, initial_pool_balance: int = 0) -> None:
        self.global_state = GlobalState(pool_balance=initial_pool_balance)
        # Keyed by a simple string user id (e.g., wallet address)
        self.users: Dict[str, UserLocalState] = {}

    # ------------------------------------------------------------------
    # Helper methods
    # ------------------------------------------------------------------

    def _get_user(self, user_id: str) -> UserLocalState:
        """
        Get or create a user's local state. In Algorand terms, this is similar
        to an opted-in account; here we auto-create for convenience.
        """
        if user_id not in self.users:
            self.users[user_id] = UserLocalState()
        return self.users[user_id]

    @staticmethod
    def compute_max_loan_limit(reputation_score: int) -> int:
        """
        Compute the maximum loan allowed based on reputation.

        - reputation < 40  -> 0 (borrowing disabled)
        - 40 <= rep <= 69  -> 500
        - rep >= 70        -> 1000
        """
        if reputation_score < 40:
            return 0
        if reputation_score <= 69:
            return 500
        return 1000

    # ------------------------------------------------------------------
    # Public API / core operations
    # ------------------------------------------------------------------

    def borrow(self, user_id: str, requested_amount: int, current_round: int) -> None:
        """
        Simulate a borrow AppCall.

        :param user_id:    Identifier of the user (e.g., wallet address).
        :param requested_amount: Requested loan size.
        :param current_round: Current "Algorand" round in this simulation.

        Raises:
            ValueError if any business rule is violated.
        """
        user = self._get_user(user_id)
        pool = self.global_state.pool_balance

        if requested_amount <= 0:
            raise ValueError("Requested amount must be positive.")

        # Reputation-based checks
        if user.reputation_score <= 40:
            raise ValueError("Reputation must be > 40 to borrow.")

        max_allowed = self.compute_max_loan_limit(user.reputation_score)
        if requested_amount > max_allowed:
            raise ValueError(
                f"Requested amount {requested_amount} exceeds max allowed {max_allowed}."
            )

        # Single active loan rule
        if user.has_active_loan:
            raise ValueError("User already has an active loan.")

        # Pool balance check
        if pool < requested_amount:
            raise ValueError("Insufficient pool balance for this loan.")

        # All checks passed: grant loan
        user.has_active_loan = True
        user.active_loan_amount = requested_amount
        user.loan_due_round = current_round + self.LOAN_DURATION_ROUNDS

        self.global_state.pool_balance -= requested_amount

    def repay(self, user_id: str, repay_amount: int, current_round: int) -> None:
        """
        Simulate a repay AppCall.

        :param user_id: Identifier of the user repaying the loan.
        :param repay_amount: Amount actually paid back in this action.
        :param current_round: Current "Algorand" round in this simulation.

        Raises:
            ValueError if there is no active loan or payment is insufficient.
        """
        user = self._get_user(user_id)

        if not user.has_active_loan or user.active_loan_amount <= 0:
            raise ValueError("No active loan to repay.")

        if repay_amount < user.active_loan_amount:
            raise ValueError("Repayment amount is less than active loan amount.")

        loan_principal = user.active_loan_amount

        # Round-based timing check
        on_time = current_round <= user.loan_due_round

        # Update pool balance
        self.global_state.pool_balance += loan_principal

        # Clear loan state
        user.has_active_loan = False
        user.active_loan_amount = 0
        user.loan_due_round = 0

        # Reputation updates
        if on_time:
            user.reputation_score += 10
        else:
            user.reputation_score -= 15

        # Clamp reputation within bounds
        if user.reputation_score < self.MIN_REPUTATION:
            user.reputation_score = self.MIN_REPUTATION
        if user.reputation_score > self.MAX_REPUTATION:
            user.reputation_score = self.MAX_REPUTATION

    def contribute(self, user_id: str, contribution_amount: int) -> None:
        """
        Simulate a contribute AppCall.

        :param user_id: Identifier of the contributing user.
        :param contribution_amount: Amount contributed to the pool.

        Raises:
            ValueError if the contribution amount is non-positive.
        """
        if contribution_amount <= 0:
            raise ValueError("Contribution amount must be positive.")

        user = self._get_user(user_id)

        # Update pool balance
        self.global_state.pool_balance += contribution_amount

        # Reputation reward
        user.reputation_score += 5

        # Clamp reputation within bounds
        if user.reputation_score > self.MAX_REPUTATION:
            user.reputation_score = self.MAX_REPUTATION

    # ------------------------------------------------------------------
    # Convenience / inspection helpers (for tests or demos)
    # ------------------------------------------------------------------

    def get_user_state(self, user_id: str) -> UserLocalState:
        """
        Return a copy-like reference to the user's current local state.
        """
        return self._get_user(user_id)

    def get_pool_balance(self) -> int:
        """
        Return the current pool balance from global state.
        """
        return self.global_state.pool_balance


if __name__ == "__main__":
    # Simple demonstration of the engine behavior.
    engine = LoanEngine(initial_pool_balance=10_000)
    alice = "alice"

    current_round = 1_000_000

    print("Initial pool balance:", engine.get_pool_balance())
    print("Initial Alice state:", engine.get_user_state(alice))

    # Alice borrows 500 units
    engine.borrow(user_id=alice, requested_amount=500, current_round=current_round)
    print("\nAfter borrow:")
    print("Pool balance:", engine.get_pool_balance())
    print("Alice state:", engine.get_user_state(alice))

    # Alice contributes 200 units (unrelated to her loan)
    engine.contribute(user_id=alice, contribution_amount=200)
    print("\nAfter contribution:")
    print("Pool balance:", engine.get_pool_balance())
    print("Alice state:", engine.get_user_state(alice))

    # Alice repays on time
    repay_round = current_round + LoanEngine.LOAN_DURATION_ROUNDS - 1
    engine.repay(user_id=alice, repay_amount=500, current_round=repay_round)
    print("\nAfter on-time repayment:")
    print("Pool balance:", engine.get_pool_balance())
    print("Alice state:", engine.get_user_state(alice))

