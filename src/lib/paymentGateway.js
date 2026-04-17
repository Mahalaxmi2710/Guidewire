// ─────────────────────────────────────────────────────────────
//  RideSure — Payment Gateway
//  Adapters: Razorpay (test mode) · Stripe (sandbox) · UPI sim
//
//  Primary export:  processPayout(claim)
//    → { transactionId, status, amount, method, timestamp }
//
//  Full flow:
//    claim approved
//    → calculatePayout()
//    → adapter.simulate()
//    → updateWorkerWallet()  ← Firestore
//    → storeTransaction()    ← Firestore
//    → return receipt
// ─────────────────────────────────────────────────────────────

import { DB } from "./firebase.js";

// ── Helpers ───────────────────────────────────────────────────
const rid = (prefix) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Payout Status Codes ───────────────────────────────────────
export const PAYOUT_STATUS = {
  INITIATED:  "initiated",
  PROCESSING: "processing",
  SUCCESS:    "success",
  FAILED:     "failed",
  REVERSED:   "reversed",
};

// ── In-memory transaction ledger (dev/mock mode) ──────────────
const _ledger = [];

export function getLedger() { return [..._ledger]; }

function logTransaction(entry) {
  _ledger.push({ ...entry, loggedAt: Date.now() });
  console.log(`[PaymentGateway] ${entry.type} | ${entry.txnId} | ₹${entry.amount} → ${entry.status}`);
}

// ── Mock Payout ───────────────────────────────────────────────
async function mockPayout(workerId, amount, meta = {}) {
  await sleep(600);
  const txnId = rid("UTR");
  logTransaction({
    type:     "CLAIM_PAYOUT",
    txnId,
    workerId,
    amount,
    status:   PAYOUT_STATUS.SUCCESS,
    meta,
  });
  return {
    txnId,
    workerId,
    amount,
    status:      PAYOUT_STATUS.SUCCESS,
    processedAt: Date.now(),
    gateway:     "mock",
  };
}

// ── Real Razorpay Payout ──────────────────────────────────────
async function razorpayPayout(workerId, amount, meta = {}) {
  // Razorpay X Payouts API — set VITE_RAZORPAY_KEY_ID + VITE_RAZORPAY_KEY_SECRET in .env
  const KEY_ID     = import.meta.env.VITE_RAZORPAY_KEY_ID;
  const KEY_SECRET = import.meta.env.VITE_RAZORPAY_KEY_SECRET;
  const ACCOUNT_NO = import.meta.env.VITE_RAZORPAY_ACCOUNT_NUMBER;

  if (!KEY_ID || !KEY_SECRET || !ACCOUNT_NO) throw new Error("Razorpay credentials not configured");

  const body = {
    account_number: ACCOUNT_NO,
    fund_account_id: meta.fundAccountId,      // pre-created fund account for the worker
    amount: amount * 100,                      // paise
    currency: "INR",
    mode: "UPI",
    purpose: "payout",
    queue_if_low_balance: true,
    reference_id: rid("RSCLM"),
    narration: `RideSure Parametric Payout - ${meta.claimId || ""}`,
  };

  const res = await fetch("https://api.razorpay.com/v1/payouts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:  "Basic " + btoa(`${KEY_ID}:${KEY_SECRET}`),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Razorpay payout failed: ${err.error?.description || res.status}`);
  }

  const data   = await res.json();
  const txnId  = data.id;
  logTransaction({
    type:     "CLAIM_PAYOUT",
    txnId,
    workerId,
    amount,
    status:   data.status === "processed" ? PAYOUT_STATUS.SUCCESS : PAYOUT_STATUS.PROCESSING,
    meta,
  });

  return {
    txnId,
    workerId,
    amount,
    status:      data.status === "processed" ? PAYOUT_STATUS.SUCCESS : PAYOUT_STATUS.PROCESSING,
    processedAt: Date.now(),
    gateway:     "razorpay",
    raw:         data,
  };
}

// ═════════════════════════════════════════════════════════════
//  PAYMENT ADAPTERS
// ═════════════════════════════════════════════════════════════

// ── Razorpay Test-Mode Adapter ────────────────────────────────
/**
 * Uses Razorpay X Payouts API in test mode.
 * Set VITE_RAZORPAY_KEY_ID, VITE_RAZORPAY_KEY_SECRET,
 *     VITE_RAZORPAY_ACCOUNT_NUMBER in .env
 * Simulates when credentials missing.
 */
async function _razorpayAdapter(amount, claim) {
  const KEY_ID     = import.meta.env.VITE_RAZORPAY_KEY_ID;
  const KEY_SECRET = import.meta.env.VITE_RAZORPAY_KEY_SECRET;
  const ACCOUNT_NO = import.meta.env.VITE_RAZORPAY_ACCOUNT_NUMBER;

  // ── Simulation branch (no real credentials) ──
  if (!KEY_ID || !KEY_SECRET || !ACCOUNT_NO) {
    await sleep(700);
    const transactionId = rid("RZP");
    console.log(`[Razorpay/Test] Simulated payout ${transactionId} ₹${amount}`);
    return {
      transactionId,
      status:    PAYOUT_STATUS.SUCCESS,
      amount,
      method:    "razorpay",
      timestamp: Date.now(),
      simulated: true,
    };
  }

  // ── Real API call (test-mode credentials) ────────────────
  const body = {
    account_number:       ACCOUNT_NO,
    fund_account_id:      claim.fundAccountId ?? undefined,
    amount:               amount * 100,          // paise
    currency:             "INR",
    mode:                 "UPI",
    purpose:              "payout",
    queue_if_low_balance: true,
    reference_id:         rid("RSCLM"),
    narration:            `RideSure Payout - ${claim.id ?? ""}`,
  };

  const res = await fetch("https://api.razorpay.com/v1/payouts", {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:  "Basic " + btoa(`${KEY_ID}:${KEY_SECRET}`),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Razorpay error: ${err.error?.description ?? res.status}`);
  }

  const data = await res.json();
  return {
    transactionId: data.id,
    status:        data.status === "processed" ? PAYOUT_STATUS.SUCCESS : PAYOUT_STATUS.PROCESSING,
    amount,
    method:        "razorpay",
    timestamp:     Date.now(),
    raw:           data,
  };
}

// ── Stripe Sandbox Adapter ────────────────────────────────────
/**
 * Uses Stripe Payouts API (sandbox / test mode).
 * Set VITE_STRIPE_SECRET_KEY (starts with sk_test_) in .env
 * Simulates when key missing.
 */
async function _stripeAdapter(amount, claim) {
  const SECRET_KEY = import.meta.env.VITE_STRIPE_SECRET_KEY;

  // ── Simulation branch ────────────────────────────────────
  if (!SECRET_KEY) {
    await sleep(850);
    const transactionId = rid("STR");
    console.log(`[Stripe/Sandbox] Simulated payout ${transactionId} ₹${amount}`);
    return {
      transactionId,
      status:    PAYOUT_STATUS.SUCCESS,
      amount,
      method:    "stripe",
      timestamp: Date.now(),
      simulated: true,
    };
  }

  // ── Real Stripe Transfer API (test mode) ─────────────────
  // Stripe works in USD cents; convert ₹→$ at approximate rate for sandbox
  const amountUSD = Math.round(amount / 84 * 100); // cents

  const params = new URLSearchParams({
    amount:   String(amountUSD),
    currency: "usd",
    destination: claim.stripeAccountId ?? "acct_test_placeholder",
    description: `RideSure payout - claimId=${claim.id ?? ""}`,
  });

  const res = await fetch("https://api.stripe.com/v1/transfers", {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Stripe error: ${err.error?.message ?? res.status}`);
  }

  const data = await res.json();
  return {
    transactionId: data.id,
    status:        data.reversed ? PAYOUT_STATUS.REVERSED : PAYOUT_STATUS.SUCCESS,
    amount,
    method:        "stripe",
    timestamp:     Date.now(),
    raw:           data,
  };
}

// ── UPI Simulation Adapter ────────────────────────────────────
/**
 * Simulates a UPI direct payout.
 * In production, wire to Razorpay UPI payout or NPCI API.
 * Generates realistic UTR numbers and latency.
 */
async function _upiAdapter(amount, claim) {
  // Realistic UPI processing latency: 400–1200ms
  await sleep(400 + Math.random() * 800);

  // ~4% failure rate simulation (mirrors real UPI failure rates)
  const failed = Math.random() < 0.04;

  const utr   = rid("UTR");
  const vpa   = claim.upiVpa ?? claim.workerVpa ?? `worker${Date.now()}@upi`;
  const status = failed ? PAYOUT_STATUS.FAILED : PAYOUT_STATUS.SUCCESS;

  console.log(
    `[UPI/Sim] ${status.toUpperCase()} | UTR: ${utr} | ₹${amount} → ${vpa}`
  );

  if (failed) {
    throw new Error(`UPI transfer failed for VPA ${vpa} (simulated failure)`);
  }

  return {
    transactionId: utr,
    status,
    amount,
    method:        "upi",
    timestamp:     Date.now(),
    upiVpa:        vpa,
    simulated:     true,
  };
}

// ── Payout Calculator ─────────────────────────────────────────
/**
 * Derives the final payout amount from a claim.
 * Uses claim.payoutAmount if set, otherwise computes from triggers.
 */
function calculatePayout(claim) {
  if (claim.payoutAmount && claim.payoutAmount > 0) return claim.payoutAmount;
  if (Array.isArray(claim.triggers) && claim.triggers.length > 0) {
    return claim.triggers.reduce((sum, t) => sum + (t.payout ?? 0), 0);
  }
  return 0;
}

// ── Method Selector ───────────────────────────────────────────
/**
 * Picks a payment adapter based on claim metadata or env config.
 * Priority: UPI VPA present → UPI | Stripe key set → Stripe | Razorpay
 */
function selectAdapter(claim) {
  if (claim.upiVpa ?? claim.workerVpa)               return { name: "upi",      fn: _upiAdapter };
  if (import.meta.env.VITE_STRIPE_SECRET_KEY)        return { name: "stripe",   fn: _stripeAdapter };
  return                                                     { name: "razorpay", fn: _razorpayAdapter };
}

// ── Firestore Transaction Store ───────────────────────────────
async function storeTransaction(receipt, claim) {
  try {
    const txnDoc = {
      ...receipt,
      claimId:   claim.id,
      policyId:  claim.policyId  ?? null,
      workerId:  claim.uid       ?? claim.workerId ?? null,
      zoneId:    claim.zoneId    ?? null,
      storedAt:  Date.now(),
    };
    await DB.saveTransaction?.(receipt.transactionId, txnDoc);
    console.log(`[PaymentGateway] Transaction stored: ${receipt.transactionId}`);
  } catch (err) {
    // Non-fatal — log and continue
    console.warn(`[PaymentGateway] Could not store transaction in Firestore:`, err.message);
  }
}

// ═════════════════════════════════════════════════════════════
//  processPayout(claim)  — PRIMARY EXPORT
// ═════════════════════════════════════════════════════════════
/**
 * Full parametric claim payout flow:
 *   1. Validate claim
 *   2. Calculate payout amount
 *   3. Select payment adapter (Razorpay / Stripe / UPI)
 *   4. Simulate / execute transaction
 *   5. Update worker wallet in Firestore
 *   6. Store transaction record in Firestore
 *   7. Return standard receipt
 *
 * @param {object} claim - Approved claim document
 *   { id, policyId, uid, zoneId, payoutAmount?, triggers[],
 *     upiVpa?, fundAccountId?, stripeAccountId? }
 *
 * @returns {Promise<object>} {
 *   transactionId,
 *   status,
 *   amount,
 *   method,   // "razorpay" | "stripe" | "upi"
 *   timestamp,
 *   workerId,
 *   claimId,
 * }
 */
export async function processPayout(claim) {
  // ── 1. Validate ───────────────────────────────────────────
  const workerId = claim?.uid ?? claim?.workerId;
  if (!workerId) throw new Error("[PaymentGateway] claim.uid is required");

  // ── 2. Calculate payout ───────────────────────────────────
  const amount = calculatePayout(claim);
  if (!amount || amount <= 0) {
    throw new Error(`[PaymentGateway] Invalid payout amount: ${amount} for claim ${claim?.id}`);
  }

  console.log(
    `[PaymentGateway] Processing payout | claim=${claim.id} | ₹${amount} | worker=${workerId}`
  );

  // ── 3. Select adapter ─────────────────────────────────────
  const adapter = selectAdapter(claim);
  console.log(`[PaymentGateway] Adapter selected: ${adapter.name}`);

  // ── 4. Execute / Simulate transaction ────────────────────
  let receipt;
  try {
    receipt = await adapter.fn(amount, claim);
  } catch (adapterErr) {
    console.warn(
      `[PaymentGateway] ${adapter.name} failed (${adapterErr.message}), trying UPI fallback`
    );
    // Fallback to UPI sim on any adapter error
    try {
      receipt = await _upiAdapter(amount, claim);
    } catch (upiErr) {
      console.error(`[PaymentGateway] All adapters failed:`, upiErr.message);
      receipt = {
        transactionId: rid("FAIL"),
        status:        PAYOUT_STATUS.FAILED,
        amount,
        method:        adapter.name,
        timestamp:     Date.now(),
        error:         upiErr.message,
      };
    }
  }

  // Normalise to standard contract
  const standardReceipt = {
    transactionId: receipt.transactionId ?? receipt.txnId ?? rid("TXN"),
    status:        receipt.status        ?? PAYOUT_STATUS.SUCCESS,
    amount,
    method:        receipt.method        ?? adapter.name,
    timestamp:     receipt.timestamp     ?? Date.now(),
    workerId,
    claimId:       claim.id,
  };

  // Log to in-memory ledger
  logTransaction({
    type:    "CLAIM_PAYOUT",
    txnId:   standardReceipt.transactionId,
    workerId,
    amount,
    status:  standardReceipt.status,
    method:  standardReceipt.method,
    meta:    { claimId: claim.id, policyId: claim.policyId },
  });

  // ── 5. Update worker wallet in Firestore ──────────────────
  if (standardReceipt.status === PAYOUT_STATUS.SUCCESS) {
    try {
      await updateWorkerWallet({
        db:       DB,
        workerId,
        amount,
        claimId:  claim.id,
        txnId:    standardReceipt.transactionId,
      });
    } catch (walletErr) {
      console.warn(`[PaymentGateway] Wallet update failed:`, walletErr.message);
    }
  }

  // ── 6. Store transaction in Firestore ─────────────────────
  await storeTransaction(standardReceipt, claim);

  console.log(
    `[PaymentGateway] ✓ Payout complete | ${standardReceipt.transactionId} | ` +
    `₹${amount} via ${standardReceipt.method} | ${standardReceipt.status}`
  );

  return standardReceipt;
}

// ── Legacy low-level export (used by triggerMonitor internally) ─
/**
 * @deprecated Use processPayout(claim) instead.
 * Kept for backward compatibility with triggerMonitor.js calls
 * that pass { workerId, amount, meta } directly.
 */
export async function processPayoutRaw({ workerId, amount, meta = {} }) {
  if (!workerId || !amount || amount <= 0) {
    throw new Error(`[PaymentGateway] Invalid payout params: workerId=${workerId}, amount=${amount}`);
  }
  try {
    return await razorpayPayout(workerId, amount, meta);
  } catch (err) {
    console.warn("[PaymentGateway] Razorpay unavailable, using mock:", err.message);
    return await mockPayout(workerId, amount, meta);
  }
}

/**
 * updateWorkerWallet({ db, workerId, amount, claimId, txnId })
 *
 * Credits amount to the worker's Firestore wallet document.
 * Creates the wallet doc if it doesn't exist.
 *
 * @param {object} db        - The DB abstraction from firebase.js
 * @param {string} workerId
 * @param {number} amount    - Amount in INR to credit
 * @param {string} claimId
 * @param {string} txnId
 * @returns {object} Updated wallet snapshot
 */
export async function updateWorkerWallet({ db, workerId, amount, claimId, txnId }) {
  if (!db || !workerId) throw new Error("[PaymentGateway] db and workerId are required");

  const existing = await db.getWallet(workerId).catch(() => null);
  const prev     = existing?.balance ?? 0;
  const newBal   = prev + amount;

  const walletDoc = {
    workerId,
    balance:     newBal,
    lastCredit:  amount,
    lastClaimId: claimId,
    lastTxnId:   txnId,
    updatedAt:   Date.now(),
    history:     [
      ...(existing?.history ?? []).slice(-49), // keep last 50 entries
      {
        type:      "credit",
        amount,
        claimId,
        txnId,
        ts:        Date.now(),
      },
    ],
  };

  await db.saveWallet(workerId, walletDoc);

  console.log(`[PaymentGateway] Wallet updated: ${workerId} | +₹${amount} | Balance: ₹${newBal}`);

  return walletDoc;
}

/**
 * reverseTransaction({ txnId, reason })
 * Logs a reversal entry in the ledger. Extend with real refund API as needed.
 */
export async function reverseTransaction({ txnId, reason = "fraud-reversal" }) {
  await sleep(300);
  logTransaction({
    type:   "REVERSAL",
    txnId:  rid("REV"),
    refTxnId: txnId,
    status: PAYOUT_STATUS.REVERSED,
    reason,
  });
  console.warn(`[PaymentGateway] Reversal logged for txnId=${txnId}, reason=${reason}`);
  return { reversed: true, txnId, reason };
}
