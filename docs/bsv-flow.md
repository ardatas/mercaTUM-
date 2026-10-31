# BSV payment flow

Read [sponsor instructions](../BSV-TBC26-Developer-Pack/AGENTS.md), guide §§4–9, 14 and 20, then [starter payments.ts](../BSV-TBC26-Developer-Pack/starter/bsv21-token-kit/client/payments.ts). Preserve the pack; adapt tested helpers into application-owned code. [Contracts](contracts.md) define record/state authority.

## Wallets and derivation

Buyer: `new WalletClient('auto')` from `@bsv/sdk` in the browser. Use `getNetwork` and wallet identity public key; keys and recovery phrases remain inside BSV Desktop/Browser. Test the actual HTTPS deployment origin against the installed wallet early.

Provider: operator-owned `@bsv/wallet-toolbox` wallet with private persistent storage and a backend-only root secret. Build the explicit environment object from guide §14.1; `Setup.getEnv()` assumes a different environment. Use §14.2's Arcade-first Services/storage/monitor configuration, and start the monitor. Buyer and provider identities must differ; a self-payment is not the intended demo.

BRC-29 uses `[2, '3241645161d8']`. For one quote:

- The server issues a random 128-bit `derivationPrefix`; the buyer generates a fresh random suffix. Adapt the starter helper to accept this quoted prefix instead of generating its own. This is the deliberate app-specific change binding remittance to the quote.
- Sender `getPublicKey`: `keyID = prefix + ' ' + suffix`, `counterparty = providerIdentityKey`, `forSelf: false`.
- Receiver `getPublicKey`: same protocol/key ID, `counterparty = senderIdentityKey`, `forSelf: true`.
- Lock the exact service price to P2PKH of the derived recipient key. Never P2PKH of an identity key, and never use `counterparty: 'self'` for this payment.

Public standard reference: [BRC-29](https://bsv-blockchain.github.io/ts-stack/specs/brc-29-peer-payment/). The supplied guide and installed pins govern implementation if newer web examples differ.

## Payment sequence

1. Persist immutable task and the coordinator's real pending purchase call. Check provider readiness before offering a payable quote.
2. Connect buyer wallet. Server creates a [fixed scoped quote](contracts.md#fixed-price-purchases) tied to that payer, task fingerprint, quoted prefix, price, limits, network and provider identity. Display scope, intended deliverable, limit-exhaustion policy, the demo-provider label and direct-payment terms.
3. Human approves the exact quote in the app. Reserve the attempt/terms atomically, authenticate the buyer, check identity/network, derive the recipient and test browser storage, then persist its one-time `WALLET_REQUESTED` claim immediately before `createAction`. An unclaimed `APPROVED` attempt can be atomically released by reconciliation; a late wallet claim is denied.
4. Use the adapted helper with `signAndProcess: false`, `noSend: true`, `randomizeOutputs: false`, `acceptDelayedBroadcast: false`, `returnTXIDOnly: false` and complete AtomicBEEF returned. Review the unsigned draft: derive actual input/output fee, locate the exact payment by script, verify every other output is wallet-owned change through `noSendChange` outpoints bound to the unsigned transaction ID, and reject a total debit above the approved maximum. Only then call `signAction`. Add a non-sensitive attempt label for reconciliation. Unsupported metadata or missing ancestry blocks signing.
5. Save returned proof immediately and send it to the attempt endpoint. Native `signAction` signs without broadcasting under the saved `noSend` action; the server verifies and broadcasts those same signed bytes through Arcade. A timeout after signing still requires reconciliation because signed bytes may exist. Keep the same attempt unresolved instead of making another payment.
6. Server checks the proof against saved terms, verifies the transaction, explicitly submits the SAME signed transaction through Arcade, observes network status and internalizes the payment into the provider wallet. Do not construct another transfer merely to satisfy Arcade evidence.
7. Persist one verified receipt and paid entitlement. The worker may now execute the saved model tool call. Expose sats, recipient role, network, txid and explorer link.

## Human authorization and fees

App approval is required for each quote even if the wallet remembers a site spending grant. `WalletClient` does not guarantee a fresh native dialog on every call. For the recorded demo, have the user inspect/clear/restrict prior domain grants so native authorization is observable. Agents never approve native wallet spending on the user's behalf.

Show service price separately from network fees. Establish a maximum authorized total debit before spending, and verify how the selected standard wallet enforces it through its spending permissions/native review. Do not invent a `WalletClient` fee-cap argument. If native review/permissions cannot enforce the agreed bound, block live debit until the wallet adapter has a tested review-before-sign flow. Do not claim an app checkbox protects against a malicious frontend or unlimited wallet grant.

Actual model usage cannot change the approved service price. Extra scope requires a new linked task, quote and explicit wallet approval; keep the original receipt and recovery entitlement intact. Technical recovery never invokes another payment.

## Server verification

- Bound and parse AtomicBEEF; compute txid from bytes, compare claimed txid and selected output index. Verify transaction scripts/ancestry with `Transaction.fromAtomicBEEF(...).verify(chainTracker)` using the configured network's trusted headers.
- Compare `satoshis` AND actual output value with the stored quote price; the starter's helper alone only compares against caller-supplied `p.satoshis`.
- Compare quoted prefix, expected payer identity and task/attempt binding. Derive the expected receiving script in the provider wallet; compare the actual script exactly. Recipient, network and price come from the server record.
- Network is not a field cryptographically embedded in an ordinary Bitcoin transaction. Match wallet network before signing and verify/broadcast against trusted network-specific services; do not trust a client network label.
- Check the unique outpoint/task constraints and serialize acceptance before allowing execution. A valid old payment cannot pay a new task with a different quoted prefix.
- After verification/broadcast observation, call `internalizeAction` using protocol `'wallet payment'`, the actual output index and BRC-29 remittance. Only provider-owned revenue is internalized; no buyer balance exists on the server.

SPV script/proof verification and network status are different checks. An unmined payment does not have a merkle proof for itself. Low-value execution may start after valid ancestry/scripts plus network-observed acceptance; this is a deliberate zero-confirmation risk decision, not mined finality. Track later rejection/double-spend observations and stop new execution if the payment ceases to be acceptable.

## Arcade and explorer mapping

| App network | Wallet Toolbox chain | Arcade | Explorer transaction URL |
|---|---|---|---|
| `mainnet` | `main` | `https://arcade-v2-us-1.bsvblockchain.tech` | `https://whatsonchain.com/tx/{txid}` |
| `testnet` | `test` | `https://arcade-v2-testnet-us-1.bsvblockchain.tech` | `https://test.whatsonchain.com/tx/{txid}` |

Use installed `Arcade` declarations/source from wallet-toolbox. The pinned class provides `postRawTx(efHex, [txid])`, `postBeef(beef, txids)` and `getTxData(txid)`. Direct submission is `POST /tx` with JSON `{ "rawTx": "<EF hex>" }`, no `/v1` prefix. `Transaction.toHexEF()` requires complete source outputs; AtomicBEEF is NOT valid `/tx` payload.

Keep full ancestry when collecting the wallet proof. If direct parent bytes are absent, resolve them with validated provenance before EF conversion; otherwise leave reconciliation pending. Never record a successful Arcade POST from a header request or by substituting BEEF into an EF field.

HTTP 202 means submitted, not paid/mined. The pinned provider recognizes `ACCEPTED_BY_NETWORK`, `SEEN_ON_NETWORK`, `SEEN_MULTIPLE_NODES` as network-known and `MINED`/`IMMUTABLE` as mined observations; `RECEIVED`/`PENDING_RETRY` are insufficient. Preserve raw status plus normalized interpretation and poll with bounded backoff. Validate a mined proof against canonical headers before calling it confirmed.

## Recovery and evidence

A wallet refusal, network mismatch or insufficient funds never starts paid execution. A review failure before signing saves a confirmed `abortAction({ reference })` result only when `aborted === true`. For an older saved pre-sign draft, recompute its exact payment and fee and retry aborting that same reference. If abort returns an error, only a draft proven to exceed its original immutable approval can be recovered: the application throws before signing on that branch and persists `sign_requested` before any native signature call. Record whether a fresh abort acknowledgement was received; do not describe an abort error as wallet confirmation. A positive wallet refusal (`aborted: false`) always stays blocked. SDK failed-history validation and default-basket access are not bypassed. In-cap drafts without confirmed cancellation and malformed drafts remain unresolved with a specific explanation. `sign_requested` records are never cancelled or signed again: recovery queries standard `listActions` for the exact attempt label with inputs, unlocking scripts and outputs, requires one transaction matching the reviewed template and recomputed ID, and saves the recovered proof. Empty, denied, incomplete or mismatched history cannot authorize a new debit. Confirmed cancellation closes the old unpaid attempt and returns to fresh quote review with service price, observed draft fee, total and prior cap. A lost wallet/broadcast response enters `PAYMENT_UNKNOWN`: inspect the same attempt label/txid in wallet history and Arcade, recover the same proof and resubmit the same bytes. Do not automatically create a replacement payment. Browser refresh cannot erase a known proof or unresolved attempt.

Acceptance can crash between provider internalization and app receipt persistence. Reconcile the exact stored outpoint against wallet records before finalizing the ledger; no second charge. A model failure retains the paid entitlement. Provider refunds would require a separate, explicitly implemented outgoing-payment path; do not imply one exists.

Record network, sats, wallet/version, public recipient identity, task/call/attempt/receipt IDs, txid, working WhatsOnChain link, redacted Arcade POST/status evidence and provider internalization outcome. Keep proof bytes and remittance private. Test mainnet/testnet mapping and failure/replay cases offline; make the authorized live transaction separately.

Recovered signatures may be accompanied only by the unsigned draft's incomplete ancestry. The server recovers hash-bound ancestors through its configured chain services (at most32 lookups,30 seconds,2MB evidence), then applies the ordinary quote/script/SPV/fee/network/internalization checks. Chain-service failure preserves the attempt. This adds no trust in browser history status and no replacement signature.
