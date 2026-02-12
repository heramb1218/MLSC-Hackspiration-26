CampusTrust Loan & Reputation Rules
===================================

This document lists the CampusTrust rules in **plain English**, matching how
they will be enforced in Algorand Stateful Smart Contracts.


1. User Onboarding
------------------

1.1 A student must **opt in** to the CampusTrust application to participate.  
1.2 On opt‑in:
   - Their `reputation_score` starts at a configured initial value (e.g. 50).  
   - Their `has_active_loan` is `false`.  
   - Their `active_loan_amount` is `0`.  
   - Their `loan_due_round` is `0`.


2. Reputation‑Based Borrowing
-----------------------------

2.1 **Reputation threshold**  

   - If a user’s `reputation_score` is **less than 40**, they **cannot borrow**.  
   - If their `reputation_score` is **greater than 40**, they may be eligible,
     subject to other rules.

2.2 **Single active loan rule** 

   - A user **cannot start a new loan** if `has_active_loan` is `true`.  
   - A user must fully repay their current loan before borrowing again.

2.3 **Loan size limits by reputation**

   - If `reputation_score < 40` → **borrowing disabled** (max loan = 0).
   - If `40 ≤ reputation_score ≤ 69` → **maximum loan = 500 units**.
   - If `reputation_score ≥ 70` → **maximum loan = 1000 units**.

2.4 **Community pool sufficiency**  

   - The global `pool_balance` must be **at least equal** to the requested
     loan amount.  
   - If `pool_balance < requested_amount`, the loan is **rejected**.


3. Borrow Action ("borrow")
---------------------------

3.1 Preconditions for a successful borrow:

   - The caller is opted into the application.  
   - Their `reputation_score > 40`.  
   - Their `has_active_loan` is `false`.  
   - The requested loan amount is **greater than 0**.  
   - The requested loan amount is **less than or equal to** their
     reputation‑based maximum loan limit.  
   - The global `pool_balance` is **greater than or equal to** the
     requested amount.

3.2 On a successful borrow:

   - `has_active_loan` is set to `true`.  
   - `active_loan_amount` is set to the requested amount.  
   - `loan_due_round` is set to the **current Algorand round** plus a fixed
     loan duration (a constant in the smart contract).  
   - `pool_balance` is reduced by the requested amount.  
   - In the same atomic transaction group, the borrower receives the funds
     from the pool account.

3.3 If any precondition fails, the **entire transaction group fails** and
no loan is created.


4. Repayment Action ("repay")
-----------------------------

4.1 Preconditions for a successful repayment:

   - The caller is opted into the application.  
   - Their `has_active_loan` is `true`.  
   - Their `active_loan_amount` is **greater than 0**.  
   - In the atomic group, there is a payment from the borrower to the pool
     account for **at least** `active_loan_amount`.  

4.2 On a successful repayment:

   - The loan is marked as repaid:
     - `has_active_loan` is set to `false`.  
     - `active_loan_amount` is set to `0`.  
     - `loan_due_round` may be reset to `0` (for clarity).  
   - The global `pool_balance` is increased by the repaid principal amount.

4.3 Reputation changes on repayment:

   - If the repayment occurs **on or before** `loan_due_round`:
     - `reputation_score` is **increased by 10**.  
   - If the repayment occurs **after** `loan_due_round`:
     - `reputation_score` is **decreased by 15**.  
   - Reputation is never allowed to go below 0.

4.4 If any repayment precondition fails, the **entire transaction group
fails** and no partial repayment is recorded.


5. Contribution Action ("contribute")
-------------------------------------

5.1 Preconditions for a successful contribution:

   - The caller is opted into the application.  
   - In the atomic group, there is a payment from the caller to the pool
     account with a **positive amount**.

5.2 On a successful contribution:

   - The global `pool_balance` is **increased** by the contributed amount.  
   - The caller’s `reputation_score` is **increased by 5**.

5.3 Reputation can optionally be capped at a maximum (e.g. 1000) to avoid
unbounded growth, but this is not required for core functionality.

5.4 If the payment conditions are not satisfied, the **contribution is
rejected** and the entire transaction group fails.


6. Safety and Integrity Rules
-----------------------------

6.1 **Atomicity**  
   - All monetary effects (loans, repayments, contributions) must be in
     atomic transaction groups where:
     - Payments and AppCalls occur together.  
     - If the smart contract rejects, the payment transaction is also
       rolled back.

6.2 **No double borrowing**  
   - A user can never have more than one unpaid loan because
     `has_active_loan` must be `false` to borrow, and is set to `true`
     when a loan is granted.

6.3 **No partial repayments**  
   - Either a repayment group satisfies all checks and marks the loan as
     fully repaid, or it fails and the loan state remains unchanged.

6.4 **On‑chain only**  
   - The system does **not** depend on:
     - Off‑chain servers or databases.  
     - External oracles.  
     - Any non‑Algorand blockchain.
   - All trust and credit decisions are made from on‑chain state.


7. Intended Outcomes
--------------------

7.1 **Good behavior is rewarded**  
   - Contributing to the pool immediately increases a user’s reputation.  
   - Repaying loans on time boosts reputation even more.

7.2 **Risky behavior is discouraged**  
   - Late repayment decreases reputation and can eventually block a user
     from borrowing.

7.3 **Fully on‑chain trust**  
   - Whether a student can borrow and how much they can borrow is determined
     completely by **Algorand smart contract state** and **round‑based logic**,
     with no trusted administrators or external databases.

