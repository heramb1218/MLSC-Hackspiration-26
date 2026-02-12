CampusTrust PyTeal-Compatible Pseudocode
=======================================

This file provides **PyTeal‑style pseudocode** for the CampusTrust logic.
It is not directly executable but is structured to be easy to convert into
real PyTeal.

- No loops
- Integer arithmetic only
- Explicit use of Algorand local/global state
- Round‑number based deadlines


State Keys
----------

Global keys (uint):

- `pool_balance`
- `penalty_rate`
- `reward_rate`

Local keys (uint per account):

- `reputation_score`
- `has_active_loan`      # 0 = false, 1 = true
- `active_loan_amount`
- `loan_due_round`


Helpers
-------

Assume the following helper expressions/macros (to be implemented in PyTeal):

- `get_rep(acct)` → `App.localGet(acct, Bytes("reputation_score"))`
- `get_has_loan(acct)` → `App.localGet(acct, Bytes("has_active_loan"))`
- `get_loan_amount(acct)` → `App.localGet(acct, Bytes("active_loan_amount"))`
- `get_loan_due_round(acct)` → `App.localGet(acct, Bytes("loan_due_round"))`

- `set_rep(acct, v)` → `App.localPut(acct, Bytes("reputation_score"), v)`
- `set_has_loan(acct, v)` → `App.localPut(acct, Bytes("has_active_loan"), v)`
- `set_loan_amount(acct, v)` → `App.localPut(acct, Bytes("active_loan_amount"), v)`
- `set_loan_due_round(acct, v)` → `App.localPut(acct, Bytes("loan_due_round"), v)`

- `get_pool_balance()` → `App.globalGet(Bytes("pool_balance"))`
- `set_pool_balance(v)` → `App.globalPut(Bytes("pool_balance"), v)`

Constants (hard‑coded in approval program):

- `LOAN_DURATION_ROUNDS`  # e.g. 5000 or other chosen duration
- `MAX_REPUTATION`        # optional upper bound, e.g. 1000


Function: compute_max_loan_limit
--------------------------------

```text
compute_max_loan_limit(reputation_score):
    If reputation_score < 40:
        return 0
    If reputation_score <= 69:
        return 500
    # reputation_score >= 70
    return 1000
```

In PyTeal form (expression style):

```text
max_loan_expr(rep) =
    If(rep < Int(40))
        .Then(Int(0))
        .Else(
            If(rep <= Int(69))
                .Then(Int(500))
                .Else(Int(1000))
        )
```


Operation: borrow
-----------------

**Intent**: User requests a loan of `requested_amount` units.

Inputs:

- `Txn.application_args[0] == "borrow"`
- `requested_amount` encoded in `Txn.application_args[1]` (as uint).
- Caller account = `Txn.sender()`.
- Atomic group also includes a payment from the pool account to the caller
  for `requested_amount` units (checked via `Gtxn`).

Pseudocode (logical steps):

```text
borrow():
    acct = Txn.sender()

    rep = get_rep(acct)
    hasLoan = get_has_loan(acct)
    pool = get_pool_balance()

    requested_amount = Btoi(Txn.application_args[1])

    max_allowed = compute_max_loan_limit(rep)

    # Basic checks
    Assert(rep > 40)
    Assert(hasLoan == Int(0))
    Assert(requested_amount > Int(0))
    Assert(requested_amount <= max_allowed)
    Assert(pool >= requested_amount)

    # Check that group includes the correct outgoing payment from pool
    # Example pattern (index and fields can be adapted in real PyTeal):
    #   - Gtxn[POOL_PAYMENT_TXN_INDEX].sender() == pool_account
    #   - Gtxn[POOL_PAYMENT_TXN_INDEX].receiver() == acct
    #   - Gtxn[POOL_PAYMENT_TXN_INDEX].amount() == requested_amount
    Assert(correct_group_transfer_from_pool_to(acct, requested_amount))

    # State updates
    set_has_loan(acct, Int(1))
    set_loan_amount(acct, requested_amount)

    current_round = Global.round()
    due_round = current_round + Int(LOAN_DURATION_ROUNDS)
    set_loan_due_round(acct, due_round)

    set_pool_balance(pool - requested_amount)

    Approve()
```


Operation: repay
----------------

**Intent**: User repays their active loan.

Inputs:

- `Txn.application_args[0] == "repay"`
- Caller account = `Txn.sender()`.
- Atomic group also includes a payment from the caller to the pool account
  for at least `active_loan_amount`.

Pseudocode:

```text
repay():
    acct = Txn.sender()

    hasLoan = get_has_loan(acct)
    loanAmt = get_loan_amount(acct)
    dueRound = get_loan_due_round(acct)
    rep = get_rep(acct)
    pool = get_pool_balance()

    # Preconditions
    Assert(hasLoan == Int(1))
    Assert(loanAmt > Int(0))

    # Validate group contains payment from acct to pool for at least loanAmt
    # Example pattern:
    #   Gtxn[REPAY_TXN_INDEX].sender()   == acct
    #   Gtxn[REPAY_TXN_INDEX].receiver() == pool_account
    #   Gtxn[REPAY_TXN_INDEX].amount()   >= loanAmt
    Assert(correct_group_transfer_to_pool_from(acct, loanAmt))

    current_round = Global.round()

    # Reputation update
    If(current_round <= dueRound)
        .Then(
            rep_new = rep + Int(10)
        )
        .Else(
            # Late repayment: subtract 15, clamp to >= 0
            rep_new_temp = rep - Int(15)
            rep_new =
                If(rep_new_temp < Int(0))
                    .Then(Int(0))
                    .Else(rep_new_temp)
        )

    # Optional upper bound
    If(rep_new > Int(MAX_REPUTATION))
        .Then(rep_new = Int(MAX_REPUTATION))

    # Apply state updates
    set_rep(acct, rep_new)
    set_has_loan(acct, Int(0))
    set_loan_amount(acct, Int(0))
    set_loan_due_round(acct, Int(0))

    set_pool_balance(pool + loanAmt)

    Approve()
```


Operation: contribute
---------------------

**Intent**: User contributes funds to the community pool and earns reputation.

Inputs:

- `Txn.application_args[0] == "contribute"`
- Caller account = `Txn.sender()`.
- Atomic group includes a payment from caller to pool account.

Pseudocode:

```text
contribute():
    acct = Txn.sender()

    rep = get_rep(acct)
    pool = get_pool_balance()

    # Determine contribution amount from the grouped payment transaction.
    # Example pattern:
    #   Gtxn[CONTRIB_TXN_INDEX].sender()   == acct
    #   Gtxn[CONTRIB_TXN_INDEX].receiver() == pool_account
    #   contrib_amount = Gtxn[CONTRIB_TXN_INDEX].amount()
    contrib_amount = get_contribution_amount_from_group(acct)

    Assert(contrib_amount > Int(0))

    # Increase pool balance
    set_pool_balance(pool + contrib_amount)

    # Increase reputation by 5, with optional cap
    rep_new = rep + Int(5)

    If(rep_new > Int(MAX_REPUTATION))
        .Then(rep_new = Int(MAX_REPUTATION))

    set_rep(acct, rep_new)

    Approve()
```


Application Call Dispatch
-------------------------

Typical PyTeal structure (simplified) for routing based on method name:

```text
handle_noop():
    method = Txn.application_args[0]

    return Cond(
        [method == Bytes("borrow"),     borrow()],
        [method == Bytes("repay"),      repay()],
        [method == Bytes("contribute"), contribute()],
    )
```

Initialization (creation) and opt‑in branches are omitted here but would
typically set:

- Initial `pool_balance`
- Initial per‑user `reputation_score` and flags on opt‑in

All of the above logic is designed to be translated directly into PyTeal
expressions without introducing loops, external time sources, or floating
point arithmetic.

CampusTrust JavaScript-Compatible Pseudocode
============================================

This file provides **JavaScript‑style pseudocode** for the CampusTrust logic.
It is structured to be implemented using the Algorand JavaScript SDK (`algosdk`).

- Uses async/await patterns for Algorand API calls
- Integer arithmetic only
- Explicit use of Algorand local/global state via SDK
- Round‑number based deadlines


State Keys
----------

Global keys (uint):

- `pool_balance`
- `penalty_rate`
- `reward_rate`

Local keys (uint per account):

- `reputation_score`
- `has_active_loan`      # 0 = false, 1 = true
- `active_loan_amount`
- `loan_due_round`


Helpers & Setup
---------------

Assume the following helper functions (to be implemented using `algosdk`):

```javascript
// State key constants
const STATE_KEYS = {
  REPUTATION_SCORE: 'reputation_score',
  HAS_ACTIVE_LOAN: 'has_active_loan',
  ACTIVE_LOAN_AMOUNT: 'active_loan_amount',
  LOAN_DUE_ROUND: 'loan_due_round',
  POOL_BALANCE: 'pool_balance',
  PENALTY_RATE: 'penalty_rate',
  REWARD_RATE: 'reward_rate'
};

// Constants
const LOAN_DURATION_ROUNDS = 5000;  // e.g. 5000 rounds
const MAX_REPUTATION = 1000;         // optional upper bound

// Helper: Read local state for a user
async function getLocalState(algodClient, appId, account) {
  const accountInfo = await algodClient.accountInformation(account).do();
  const localState = accountInfo['apps-local-state']?.find(
    app => app.id === appId
  );
  return localState?.['key-value'] || [];
}

// Helper: Read global state
async function getGlobalState(algodClient, appId) {
  const appInfo = await algodClient.getApplicationByID(appId).do();
  return appInfo.params['global-state'] || [];
}

// Helper: Get a specific state value (local or global)
function getStateValue(stateArray, key) {
  const entry = stateArray.find(item => 
    Buffer.from(item.key, 'base64').toString() === key
  );
  if (!entry) return 0;
  return entry.value.uint || entry.value || 0;
}

// Helper: Encode state value for transaction
function encodeStateValue(value) {
  return new Uint8Array(Buffer.from(value.toString()));
}
```


Function: compute_max_loan_limit
--------------------------------

```javascript
function computeMaxLoanLimit(reputationScore) {
  if (reputationScore < 40) {
    return 0;
  }
  if (reputationScore <= 69) {
    return 500;
  }
  // reputationScore >= 70
  return 1000;
}
```


Operation: borrow
-----------------

**Intent**: User requests a loan of `requestedAmount` units.

Inputs:

- Method name: `"borrow"`
- `requestedAmount` (uint) passed as application argument
- Caller account = transaction sender
- Atomic group also includes a payment from the pool account to the caller
  for `requestedAmount` units

Pseudocode (logical steps):

```javascript
async function borrow(algodClient, appId, sender, requestedAmount, poolAccount) {
  // Read current state
  const localState = await getLocalState(algodClient, appId, sender);
  const globalState = await getGlobalState(algodClient, appId);
  
  const rep = getStateValue(localState, STATE_KEYS.REPUTATION_SCORE);
  const hasLoan = getStateValue(localState, STATE_KEYS.HAS_ACTIVE_LOAN);
  const pool = getStateValue(globalState, STATE_KEYS.POOL_BALANCE);
  
  // Get current round
  const status = await algodClient.status().do();
  const currentRound = status['last-round'];
  
  // Compute max allowed loan
  const maxAllowed = computeMaxLoanLimit(rep);
  
  // Basic checks
  if (rep <= 40) {
    throw new Error('Reputation must be > 40 to borrow');
  }
  if (hasLoan !== 0) {
    throw new Error('User already has an active loan');
  }
  if (requestedAmount <= 0) {
    throw new Error('Requested amount must be positive');
  }
  if (requestedAmount > maxAllowed) {
    throw new Error(`Requested amount ${requestedAmount} exceeds max allowed ${maxAllowed}`);
  }
  if (pool < requestedAmount) {
    throw new Error('Insufficient pool balance for this loan');
  }
  
  // Note: In actual implementation, you would verify the atomic group contains:
  // - A payment transaction from poolAccount to sender for requestedAmount
  // - The AppCall transaction
  // This verification happens when building/validating the transaction group
  
  // Calculate due round
  const dueRound = currentRound + LOAN_DURATION_ROUNDS;
  
  // Prepare state updates for AppCall
  const stateChanges = [
    {
      key: STATE_KEYS.HAS_ACTIVE_LOAN,
      value: 1
    },
    {
      key: STATE_KEYS.ACTIVE_LOAN_AMOUNT,
      value: requestedAmount
    },
    {
      key: STATE_KEYS.LOAN_DUE_ROUND,
      value: dueRound
    }
  ];
  
  // Update global state (pool balance decreases)
  const globalStateChanges = [
    {
      key: STATE_KEYS.POOL_BALANCE,
      value: pool - requestedAmount
    }
  ];
  
  // Build AppCall transaction with state updates
  // (Actual implementation would use algosdk.makeApplicationCall with accounts, 
  //  appArgs, foreignApps, etc.)
  
  return {
    stateChanges,
    globalStateChanges,
    success: true
  };
}
```


Operation: repay
----------------

**Intent**: User repays their active loan.

Inputs:

- Method name: `"repay"`
- Caller account = transaction sender
- Atomic group also includes a payment from the caller to the pool account
  for at least `activeLoanAmount`

Pseudocode:

```javascript
async function repay(algodClient, appId, sender, poolAccount) {
  // Read current state
  const localState = await getLocalState(algodClient, appId, sender);
  const globalState = await getGlobalState(algodClient, appId);
  
  const hasLoan = getStateValue(localState, STATE_KEYS.HAS_ACTIVE_LOAN);
  const loanAmt = getStateValue(localState, STATE_KEYS.ACTIVE_LOAN_AMOUNT);
  const dueRound = getStateValue(localState, STATE_KEYS.LOAN_DUE_ROUND);
  const rep = getStateValue(localState, STATE_KEYS.REPUTATION_SCORE);
  const pool = getStateValue(globalState, STATE_KEYS.POOL_BALANCE);
  
  // Get current round
  const status = await algodClient.status().do();
  const currentRound = status['last-round'];
  
  // Preconditions
  if (hasLoan !== 1) {
    throw new Error('No active loan to repay');
  }
  if (loanAmt <= 0) {
    throw new Error('Active loan amount is invalid');
  }
  
  // Note: In actual implementation, verify atomic group contains:
  // - A payment transaction from sender to poolAccount for at least loanAmt
  // - The AppCall transaction
  // This verification happens when building/validating the transaction group
  
  // Reputation update based on timing
  let repNew;
  if (currentRound <= dueRound) {
    // On-time or early repayment
    repNew = rep + 10;
  } else {
    // Late repayment: subtract 15, clamp to >= 0
    const repNewTemp = rep - 15;
    repNew = repNewTemp < 0 ? 0 : repNewTemp;
  }
  
  // Optional upper bound
  if (repNew > MAX_REPUTATION) {
    repNew = MAX_REPUTATION;
  }
  
  // Prepare state updates
  const stateChanges = [
    {
      key: STATE_KEYS.REPUTATION_SCORE,
      value: repNew
    },
    {
      key: STATE_KEYS.HAS_ACTIVE_LOAN,
      value: 0
    },
    {
      key: STATE_KEYS.ACTIVE_LOAN_AMOUNT,
      value: 0
    },
    {
      key: STATE_KEYS.LOAN_DUE_ROUND,
      value: 0
    }
  ];
  
  // Update global state (pool balance increases)
  const globalStateChanges = [
    {
      key: STATE_KEYS.POOL_BALANCE,
      value: pool + loanAmt
    }
  ];
  
  // Build AppCall transaction with state updates
  // (Actual implementation would use algosdk.makeApplicationCall)
  
  return {
    stateChanges,
    globalStateChanges,
    success: true
  };
}
```


Operation: contribute
---------------------

**Intent**: User contributes funds to the community pool and earns reputation.

Inputs:

- Method name: `"contribute"`
- Caller account = transaction sender
- Atomic group includes a payment from caller to pool account
- Contribution amount is determined from the payment transaction in the group

Pseudocode:

```javascript
async function contribute(algodClient, appId, sender, contributionAmount, poolAccount) {
  // Read current state
  const localState = await getLocalState(algodClient, appId, sender);
  const globalState = await getGlobalState(algodClient, appId);
  
  const rep = getStateValue(localState, STATE_KEYS.REPUTATION_SCORE);
  const pool = getStateValue(globalState, STATE_KEYS.POOL_BALANCE);
  
  // Validate contribution amount
  if (contributionAmount <= 0) {
    throw new Error('Contribution amount must be positive');
  }
  
  // Note: In actual implementation, verify atomic group contains:
  // - A payment transaction from sender to poolAccount for contributionAmount
  // - The AppCall transaction
  // This verification happens when building/validating the transaction group
  
  // Increase pool balance
  const newPoolBalance = pool + contributionAmount;
  
  // Increase reputation by 5, with optional cap
  let repNew = rep + 5;
  if (repNew > MAX_REPUTATION) {
    repNew = MAX_REPUTATION;
  }
  
  // Prepare state updates
  const stateChanges = [
    {
      key: STATE_KEYS.REPUTATION_SCORE,
      value: repNew
    }
  ];
  
  // Update global state
  const globalStateChanges = [
    {
      key: STATE_KEYS.POOL_BALANCE,
      value: newPoolBalance
    }
  ];
  
  // Build AppCall transaction with state updates
  // (Actual implementation would use algosdk.makeApplicationCall)
  
  return {
    stateChanges,
    globalStateChanges,
    success: true
  };
}
```


Application Call Dispatch
-------------------------

Typical JavaScript structure for routing based on method name:

```javascript
async function handleAppCall(algodClient, appId, method, sender, args, poolAccount) {
  switch (method) {
    case 'borrow':
      const requestedAmount = parseInt(args[0], 10);
      return await borrow(algodClient, appId, sender, requestedAmount, poolAccount);
    
    case 'repay':
      return await repay(algodClient, appId, sender, poolAccount);
    
    case 'contribute':
      const contributionAmount = parseInt(args[0], 10);
      return await contribute(algodClient, appId, sender, contributionAmount, poolAccount);
    
    default:
      throw new Error(`Unknown method: ${method}`);
  }
}

// Example usage when building transaction:
async function buildBorrowTransaction(algodClient, appId, sender, requestedAmount, poolAccount) {
  const params = await algodClient.getTransactionParams().do();
  
  // Build payment transaction (pool to sender)
  const paymentTxn = algosdk.makePaymentTxnWithSuggestedParams(
    poolAccount,
    sender,
    requestedAmount,
    undefined,
    undefined,
    params
  );
  
  // Build AppCall transaction
  const appArgs = [
    new Uint8Array(Buffer.from('borrow')),
    algosdk.encodeUint64(requestedAmount)
  ];
  
  const appCallTxn = algosdk.makeApplicationCallTxnFromObject({
    from: sender,
    appIndex: appId,
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    appArgs: appArgs,
    suggestedParams: params
  });
  
  // Assign group ID for atomic execution
  algosdk.assignGroupID([paymentTxn, appCallTxn]);
  
  return [paymentTxn, appCallTxn];
}
```

Initialization (creation) and opt‑in branches:

- **App Creation**: Set initial `pool_balance` in global state
- **Opt‑In**: When a user opts in, initialize their local state:
  - `reputation_score` = initial value (e.g., 50)
  - `has_active_loan` = 0
  - `active_loan_amount` = 0
  - `loan_due_round` = 0

All of the above logic uses integer arithmetic only, with no floating point
operations. The actual smart contract (ASC1) will enforce these rules on-chain,
while this JavaScript code demonstrates the client-side logic for building
and submitting transactions.

