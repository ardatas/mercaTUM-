import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  Beef,
  PrivateKey,
  Transaction,
  UnlockingScript,
  WalletClient,
} from "@bsv/sdk";
import { Store } from "../src/server/tasks/store";
import { PaymentService } from "../src/server/payments/service";
import { hydratePaymentProof } from "../src/server/payments/proof-recovery";
import {
  verifyRemittance,
  NETWORKS,
  type Merchant,
} from "../src/server/payments/merchant";
import {
  payApprovedQuote,
  savedPaymentProof,
  savedUnsignedAbort,
  recoverUnsignedDraft,
  recoverSignedPayment,
  type PaymentStorage,
} from "../src/client/wallet/payment";
import {
  DEFAULT_LIMITS,
  type Task,
  type PaymentProof,
  type Quote,
} from "../src/shared/contracts";
import { createMockChain, type MockChain } from "./helpers/paymentMockchain";

const memoryStorage = (): PaymentStorage => {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
};
const task = (id: string): Task => ({
  id,
  ownerId: "owner",
  mode: "chat",
  prompt: "Explain SPV",
  providerId: "demo-provider",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  state: "AWAITING_APPROVAL",
  config: {
    adapterId: "openai-responses",
    modelId: "test-model",
    version: "v1",
    limits: DEFAULT_LIMITS,
  },
  fingerprint: `fingerprint-${id}`,
  context: "",
  pendingCall: {
    callId: `call-${id}`,
    arguments: {
      taskId: id,
      providerId: "demo-provider",
      outputKind: "answer",
    },
    checkpoint: [],
    state: "pending",
  },
  callsUsed: 1,
  outputTokensUsed: 0,
  recoveryAttempts: 0,
  generation: 0,
});

describe("real wallet engine with offline chain; no live spending", () => {
  let chain: MockChain;
  beforeAll(async () => {
    chain = await createMockChain();
  });
  afterAll(async () => {
    await chain.close();
  });
  it("returns an approved but unclaimed attempt to quote review after a connection failure", async () => {
    const buyer = await chain.makeWallet();
    const provider = await chain.makeWallet();
    const store = new Store(":memory:");
    store.put("task", task("not-started"));
    const service = new PaymentService(
      store,
      { network: "testnet", priceSats: 100, walletStorageDir: "." },
      () => true,
      {
        identityKey: provider.identityKey,
        verify: vi.fn(),
        submit: vi.fn(),
        observe: vi.fn(),
        internalize: vi.fn(),
        close: vi.fn(),
      },
    );
    const quote = await service.quote(
      "owner",
      "not-started",
      buyer.identityKey,
      "unstarted-quote",
    );
    const attempt = service.approve(
      "owner",
      quote.id,
      {
        approved: true,
        feePolicy: "review-before-sign",
        maxAuthorizedDebitSats: 1000,
      },
      "unstarted-approve",
    );
    vi.spyOn(buyer, "waitForAuthentication").mockRejectedValueOnce(
      new Error("wallet offline"),
    );
    const create = vi.spyOn(buyer, "createAction");
    await expect(
      payApprovedQuote({
        quote,
        attemptId: attempt.id,
        maxAuthorizedDebitSats: 1000,
        wallet: buyer,
        storage: memoryStorage(),
        claimWallet: async () =>
          service.claimWallet("owner", attempt.id).invokeWallet,
      }),
    ).rejects.toThrow("wallet offline");
    expect(create).not.toHaveBeenCalled();
    await service.reconcile("owner", attempt.id);
    expect(store.get<Task>("task", "not-started")?.state).toBe(
      "AWAITING_APPROVAL",
    );
    expect(service.claimWallet("owner", attempt.id).invokeWallet).toBe(false);
    expect(store.receipt("not-started")).toBeUndefined();
    await service.reconcile("owner", attempt.id);
    expect(store.get<Task>("task", "not-started")?.attemptId).toBeUndefined();
    const fresh = await service.quote(
      "owner",
      "not-started",
      buyer.identityKey,
      "fresh-unstarted",
    );
    const claimed = service.approve(
      "owner",
      fresh.id,
      {
        approved: true,
        feePolicy: "review-before-sign",
        maxAuthorizedDebitSats: 1000,
      },
      "claimed-approval",
    );
    expect(service.claimWallet("owner", claimed.id).invokeWallet).toBe(true);
    await service.reconcile("owner", claimed.id);
    await service.reconcile("owner", claimed.id);
    expect(store.get<Task>("task", "not-started")?.state).toBe(
      "PAYMENT_UNKNOWN",
    );
    expect(store.get<Task>("task", "not-started")?.attemptId).toBe(claimed.id);
    expect(service.claimWallet("owner", claimed.id).invokeWallet).toBe(false);
    store.close();
  });
  it("does not claim a wallet call when authentication fails; a late denied claim cannot create a draft", async () => {
    const buyer = await chain.makeWallet();
    const provider = await chain.makeWallet();
    await chain.fund(buyer);
    vi.spyOn(buyer, "getNetwork").mockResolvedValue({ network: "testnet" });
    const quote = {
      id: "prepare-quote",
      network: "testnet",
      payerIdentityKey: buyer.identityKey,
      recipientIdentityKey: provider.identityKey,
      derivationPrefix: "prepare-prefix",
      priceSats: 100,
    } as Quote;
    const auth = vi
      .spyOn(buyer, "waitForAuthentication")
      .mockRejectedValueOnce(new Error("wallet locked"));
    const create = vi.spyOn(buyer, "createAction");
    const sign = vi.spyOn(buyer, "signAction");
    const claim = vi.fn(async () => false);
    const storage = memoryStorage();
    await expect(
      payApprovedQuote({
        quote,
        attemptId: "prepare-attempt",
        maxAuthorizedDebitSats: 1000,
        wallet: buyer,
        storage,
        claimWallet: claim,
      }),
    ).rejects.toThrow("wallet locked");
    expect(claim).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    auth.mockRejectedValueOnce(
      new Error(
        "No wallet available over any communication substrate. Install a BSV wallet today!",
      ),
    );
    await expect(
      payApprovedQuote({
        quote,
        attemptId: "permission-pending",
        maxAuthorizedDebitSats: 1000,
        wallet: buyer,
        storage,
        claimWallet: claim,
      }),
    ).rejects.toThrow(/local-app access.*Connect wallet again/);
    expect(claim).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    auth.mockRestore();
    await expect(
      payApprovedQuote({
        quote,
        attemptId: "prepare-attempt",
        maxAuthorizedDebitSats: 1000,
        wallet: buyer,
        storage,
        claimWallet: claim,
      }),
    ).rejects.toThrow(/claimed or released/);
    expect(claim).toHaveBeenCalledOnce();
    expect(create).not.toHaveBeenCalled();
    expect(sign).not.toHaveBeenCalled();
    // A late authentication reply cannot continue into createAction after the UI times out.
    let unlock!: () => void;
    vi.spyOn(buyer, "waitForAuthentication").mockImplementation(
      () =>
        new Promise((resolve) => {
          unlock = () => resolve({ authenticated: true });
        }),
    );
    vi.useFakeTimers();
    try {
      const late = payApprovedQuote({
        quote,
        attemptId: "late-unlock",
        maxAuthorizedDebitSats: 1000,
        wallet: buyer,
        storage: memoryStorage(),
        claimWallet: claim,
      });
      const rejected = expect(late).rejects.toThrow(/within 30 seconds/);
      await vi.advanceTimersByTimeAsync(30001);
      await rejected;
      unlock();
      await vi.advanceTimersByTimeAsync(0);
      expect(claim).toHaveBeenCalledTimes(1);
      expect(create).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
  it("recovers a lost signing response from standard wallet history without another signature", async () => {
    const buyer = await chain.makeWallet();
    const provider = await chain.makeWallet();
    await chain.fund(buyer);
    vi.spyOn(buyer, "getNetwork").mockResolvedValue({ network: "testnet" });
    const quote = {
      id: "lost-sign-quote",
      network: "testnet",
      payerIdentityKey: buyer.identityKey,
      recipientIdentityKey: provider.identityKey,
      derivationPrefix: Buffer.from("lost-sign-prefix").toString("base64"),
      priceSats: 100,
    } as Quote;
    const signOriginal = buyer.signAction.bind(buyer);
    let originalTxid = "";
    let originalBytes: number[] = [];
    const sign = vi
      .spyOn(buyer, "signAction")
      .mockImplementation(async (args) => {
        const result = await signOriginal(args);
        originalTxid = result.txid!;
        originalBytes = Array.from(result.tx!);
        throw new Error("lost signing response");
      });
    const create = vi.spyOn(buyer, "createAction");
    const abort = vi.spyOn(buyer, "abortAction");
    const storage = memoryStorage();
    const options = {
      quote,
      attemptId: "lost-sign-attempt",
      maxAuthorizedDebitSats: 1000,
      wallet: new WalletClient(buyer),
      storage,
    };
    await expect(payApprovedQuote(options)).rejects.toThrow(
      /lost signing response/,
    );
    expect(savedPaymentProof(options.attemptId, storage)).toBeUndefined();
    const snapshot = storage.getItem(`mercatum:payment:${options.attemptId}`)!;
    const recovered = await recoverSignedPayment(options);
    expect(recovered?.txid).toBe(originalTxid);
    expect(Transaction.fromAtomicBEEF(recovered!.tx).id("hex")).toBe(
      originalTxid,
    );
    const originalEnvelope = Beef.fromBinary(originalBytes);
    const loader = vi.fn(async (txid: string) => ({
      rawTx: originalEnvelope.findTxid(txid)?.rawTx,
      merklePath: originalEnvelope.findBump(txid),
    }));
    await expect(
      verifyRemittance(provider, chain.chainTracker, recovered!, quote, loader),
    ).resolves.toBeTruthy();
    expect(loader).toHaveBeenCalled();
    const hydrated = await hydratePaymentProof(recovered!, loader);
    await provider.internalizeAction({
      tx: hydrated.tx,
      outputs: [
        {
          outputIndex: recovered!.outputIndex,
          protocol: "wallet payment",
          paymentRemittance: {
            derivationPrefix: recovered!.derivationPrefix,
            derivationSuffix: recovered!.derivationSuffix,
            senderIdentityKey: recovered!.senderIdentityKey,
          },
        },
      ],
      description: "Recovered offline payment",
    });
    const alreadyComplete = vi.fn(async () => {
      throw new Error("must not fetch complete ancestry");
    });
    expect(await hydratePaymentProof(hydrated, alreadyComplete)).toEqual(
      hydrated,
    );
    expect(alreadyComplete).not.toHaveBeenCalled();
    await expect(
      verifyRemittance(
        provider,
        chain.chainTracker,
        recovered!,
        quote,
        async () => {
          throw new Error("chain unavailable");
        },
      ),
    ).rejects.toThrow(/ancestry is unavailable/);
    await expect(
      verifyRemittance(
        provider,
        chain.chainTracker,
        recovered!,
        quote,
        async () => ({
          rawTx: Transaction.fromAtomicBEEF(originalBytes).toBinary(),
        }),
      ),
    ).rejects.toThrow(/different ancestor/);
    expect(savedPaymentProof(options.attemptId, storage)?.txid).toBe(
      originalTxid,
    );
    expect((await recoverSignedPayment(options))?.txid).toBe(originalTxid);
    expect(sign).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledOnce();
    expect(abort).not.toHaveBeenCalled();
    // Empty or inconsistent history cannot release or overwrite the uncertain attempt.
    storage.setItem(`mercatum:payment:${options.attemptId}`, snapshot);
    const list = vi.spyOn(buyer, "listActions");
    const actual = await buyer.listActions({
      labels: [`mercatum-${options.attemptId}`],
      includeLabels: true,
      includeInputs: true,
      includeInputUnlockingScripts: true,
      includeOutputs: true,
      includeOutputLockingScripts: true,
    });
    list.mockResolvedValueOnce({ totalActions: 0, actions: [] });
    await expect(recoverSignedPayment(options)).rejects.toThrow(
      /No complete signed transaction/,
    );
    list.mockResolvedValueOnce({
      ...actual,
      actions: actual.actions.map((a) => ({ ...a, txid: "f".repeat(64) })),
    });
    await expect(recoverSignedPayment(options)).rejects.toThrow(
      /No complete signed transaction/,
    );
    list.mockResolvedValueOnce({
      ...actual,
      actions: actual.actions.map((a) => ({
        ...a,
        outputs: a.outputs!.map((o) => ({ ...o, satoshis: o.satoshis + 1 })),
      })),
    });
    await expect(recoverSignedPayment(options)).rejects.toThrow(
      /No complete signed transaction/,
    );
    list.mockRejectedValueOnce(new Error("history permission denied"));
    await expect(recoverSignedPayment(options)).rejects.toThrow(
      /allow history access/,
    );
    expect(storage.getItem(`mercatum:payment:${options.attemptId}`)).toBe(
      snapshot,
    );
    expect(sign).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledOnce();
    expect(abort).not.toHaveBeenCalled();
  });
  it("reviews an unsigned real wallet draft, submits the identical EF, verifies and internalizes once; refresh cannot authorize a second spend", async () => {
    const buyer = await chain.makeWallet();
    const provider = await chain.makeWallet();
    await chain.fund(buyer);
    vi.spyOn(buyer, "getNetwork").mockResolvedValue({ network: "testnet" });
    const create = vi.spyOn(buyer, "createAction");
    const sign = vi.spyOn(buyer, "signAction");
    let known = false;
    const merchant: Merchant = {
      identityKey: provider.identityKey,
      verify: (p, q) => verifyRemittance(provider, chain.chainTracker, p, q),
      submit: vi.fn(async (txid, ef) => {
        expect(Transaction.fromHexEF(ef).id("hex")).toBe(txid);
        return {
          submittedAt: new Date().toISOString(),
          postStatus: "RECEIVED",
          status: "RECEIVED",
          networkKnown: false,
        };
      }),
      observe: vi.fn(async (_id, prev) => ({
        ...prev,
        status: known ? "SEEN_ON_NETWORK" : "RECEIVED",
        networkKnown: known,
      })),
      internalize: vi.fn(async (p) => {
        await provider.internalizeAction({
          tx: p.tx,
          outputs: [
            {
              outputIndex: p.outputIndex,
              protocol: "wallet payment",
              paymentRemittance: {
                derivationPrefix: p.derivationPrefix,
                derivationSuffix: p.derivationSuffix,
                senderIdentityKey: p.senderIdentityKey,
              },
            },
          ],
          description: "Test received payment",
        });
      }),
      close: async () => {},
    };
    const store = new Store(":memory:");
    store.put("task", task("task-one"));
    const service = new PaymentService(
      store,
      { network: "testnet", priceSats: 100, walletStorageDir: "." },
      () => true,
      merchant,
    );
    const quote = await service.quote(
      "owner",
      "task-one",
      buyer.identityKey,
      "quote-key-one",
    );
    expect(quote.derivationPrefix).not.toBe("");
    const approval = {
      approved: true as const,
      feePolicy: "review-before-sign" as const,
      maxAuthorizedDebitSats: 1000,
    };
    const attempt = service.approve(
      "owner",
      quote.id,
      approval,
      "approve-key-one",
    );
    expect(
      service.approve("owner", quote.id, approval, "approve-key-one").id,
    ).toBe(attempt.id);
    expect(() =>
      service.approve(
        "owner",
        quote.id,
        { ...approval, maxAuthorizedDebitSats: 2000 },
        "approve-key-one",
      ),
    ).toThrow(/different input/);
    expect(() => service.claimWallet("stranger", attempt.id)).toThrow(
      /unavailable/,
    );
    expect(service.claimWallet("owner", attempt.id).invokeWallet).toBe(true);
    expect(service.claimWallet("owner", attempt.id).invokeWallet).toBe(false);
    // A slow wallet response is reconciled under reserved terms even after quote expiry.
    quote.expiresAt = "2000-01-01T00:00:00.000Z";
    store.put("quote", quote);
    const local = memoryStorage();
    const proof = await payApprovedQuote({
      quote,
      attemptId: attempt.id,
      maxAuthorizedDebitSats: 1000,
      wallet: new WalletClient(buyer),
      storage: local,
      onProof: (p) => {
        expect(savedPaymentProof(attempt.id, local)).toEqual(p);
      },
    });
    expect(create.mock.calls[0][0].options?.signAndProcess).toBe(false);
    expect(create.mock.calls[0][0].options?.noSend).toBe(true);
    expect(sign).toHaveBeenCalledTimes(1);
    expect(proof.derivationPrefix).toBe(quote.derivationPrefix);
    const waiting = await service.submitProof("owner", attempt.id, proof);
    expect(waiting.attempt.state).toBe("PAYMENT_UNKNOWN");
    expect(waiting.receipt).toBeUndefined();
    expect(() =>
      service.rejectUnsigned("owner", attempt.id, {
        quoteId: quote.id,
        reference: "AQID",
        aborted: true,
        code: "DRAFT_REJECTED",
      }),
    ).toThrow(/requires reconciliation/);
    expect(merchant.internalize).not.toHaveBeenCalled();
    known = true;
    const [first, second] = await Promise.all([
      service.reconcile("owner", attempt.id),
      service.reconcile("owner", attempt.id),
    ]);
    const receipt = first.receipt || second.receipt;
    expect(receipt?.txid).toBe(proof.txid);
    expect(receipt?.explorerUrl).toBe(
      `https://test.whatsonchain.com/tx/${proof.txid}`,
    );
    expect(store.get<Task>("task", "task-one")?.state).toBe("READY");
    expect(merchant.submit).toHaveBeenCalledTimes(1);
    expect(merchant.internalize).toHaveBeenCalledTimes(1);
    expect(
      (await service.submitProof("owner", attempt.id, proof)).receipt?.id,
    ).toBe(receipt?.id);
    expect(
      (
        await payApprovedQuote({
          quote,
          attemptId: attempt.id,
          maxAuthorizedDebitSats: 1000,
          wallet: buyer,
          storage: local,
        })
      ).txid,
    ).toBe(proof.txid);
    expect(create).toHaveBeenCalledTimes(1);
    expect(sign).toHaveBeenCalledTimes(1);
    await expect(
      service.submitProof("owner", attempt.id, { ...proof, satoshis: 101 }),
    ).rejects.toThrow(/different proof/);
    await expect(
      verifyRemittance(
        provider,
        chain.chainTracker,
        { ...proof, derivationPrefix: "another-quote" },
        quote,
      ),
    ).rejects.toThrow(/match this quote/);
    await expect(
      verifyRemittance(
        provider,
        chain.chainTracker,
        { ...proof, txid: "0".repeat(64) },
        quote,
      ),
    ).rejects.toThrow(/Transaction ID/);
    await expect(
      verifyRemittance(
        provider,
        chain.chainTracker,
        { ...proof, outputIndex: 1000 },
        quote,
      ),
    ).rejects.toThrow(/selected output/);
    await expect(
      verifyRemittance(buyer, chain.chainTracker, proof, quote),
    ).rejects.toThrow(/selected output/);
    await expect(
      verifyRemittance(
        provider,
        chain.chainTracker,
        { ...proof, satoshis: 101 },
        quote,
      ),
    ).rejects.toThrow(/match this quote/);
    await expect(
      verifyRemittance(
        provider,
        chain.chainTracker,
        { ...proof, senderIdentityKey: provider.identityKey },
        quote,
      ),
    ).rejects.toThrow(/match this quote/);
    const invalid = Transaction.fromAtomicBEEF(proof.tx);
    invalid.inputs[0].unlockingScript = UnlockingScript.fromHex("00");
    await expect(
      verifyRemittance(
        provider,
        chain.chainTracker,
        { ...proof, tx: invalid.toAtomicBEEF(), txid: invalid.id("hex") },
        quote,
      ),
    ).rejects.toThrow(/verification/);
    merchant.observe = async (_id, previous) => ({
      ...previous,
      status: "DOUBLE_SPEND_ATTEMPTED",
      networkKnown: false,
    });
    await service.reconcile("owner", attempt.id);
    expect(store.get<Task>("task", "task-one")?.error?.code).toBe(
      "PAYMENT_REVOKED",
    );
    expect(store.get<Task>("task", "task-one")?.state).toBe("FAILED_PAID");
    expect(store.receipt("task-one")?.id).toBe(receipt?.id);
    store.close();
  });
  it("never signs a real draft whose actual fee exceeds the approved bound", async () => {
    const buyer = await chain.makeWallet();
    const provider = await chain.makeWallet();
    await chain.fund(buyer);
    vi.spyOn(buyer, "getNetwork").mockResolvedValue({ network: "testnet" });
    const sign = vi.spyOn(buyer, "signAction");
    const create = vi.spyOn(buyer, "createAction");
    const derive = vi.spyOn(buyer, "getPublicKey");
    const abort = vi.spyOn(buyer, "abortAction");
    const store = new Store(":memory:");
    store.put("task", task("fee-task"));
    const service = new PaymentService(
      store,
      { network: "testnet", priceSats: 100, walletStorageDir: "." },
      () => true,
      {
        identityKey: provider.identityKey,
        verify: vi.fn(),
        submit: vi.fn(),
        observe: vi.fn(),
        internalize: vi.fn(),
        close: vi.fn(),
      },
    );
    const quote = await service.quote(
      "owner",
      "fee-task",
      buyer.identityKey,
      "fee-quote-key",
    );
    const attempt = service.approve(
      "owner",
      quote.id,
      {
        approved: true,
        feePolicy: "review-before-sign",
        maxAuthorizedDebitSats: 100,
      },
      "fee-approval-key",
    );
    service.claimWallet("owner", attempt.id);
    const local = memoryStorage();
    await expect(
      payApprovedQuote({
        quote,
        attemptId: attempt.id,
        maxAuthorizedDebitSats: 100,
        wallet: buyer,
        storage: local,
      }),
    ).rejects.toThrow(/actual network fee/);
    expect(sign).not.toHaveBeenCalled();
    expect(abort).toHaveBeenCalledOnce();
    expect(
      JSON.parse(local.getItem(`mercatum:payment:${attempt.id}`)!),
    ).toMatchObject({
      phase: "unsigned_aborted",
      rejection: { code: "DEBIT_LIMIT_EXCEEDED" },
    });
    const rejected = savedUnsignedAbort(attempt.id, local)!;
    expect(rejected.feeSats).toBeGreaterThan(0);
    // Reproduce the old browser record: abort succeeded but the record remained draft.
    const draft = (await create.mock.results[0].value).signableTransaction!;
    local.setItem(
      `mercatum:payment:${attempt.id}`,
      JSON.stringify({
        phase: "draft",
        reference: draft.reference,
        draft: draft.tx,
        quoteId: quote.id,
        derivationSuffix: derive.mock.calls
          .find(([args]) =>
            args.keyID?.startsWith(quote.derivationPrefix + " "),
          )![0]
          .keyID!.slice(quote.derivationPrefix.length + 1),
      }),
    );
    // Exercise the SDK boundary with the original saved derivation and cap.
    // Already-aborted history cannot be read; prove the pre-sign fee rejection.
    const browserWallet = new WalletClient(buyer);
    const recovered = await recoverUnsignedDraft({
      quote,
      attemptId: attempt.id,
      maxAuthorizedDebitSats: 100,
      wallet: browserWallet,
      storage: local,
    });
    expect(recovered).toMatchObject({
      aborted: false,
      code: "DEBIT_LIMIT_EXCEEDED",
      feeSats: rejected.feeSats,
    });
    expect(sign).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledOnce();
    // Server recovery also covers an attempt already moved to UNKNOWN by the old UI.
    await service.reconcile("owner", attempt.id);
    expect(() =>
      service.rejectUnsigned("owner", attempt.id, {
        ...recovered!,
        feeSats: 0,
      }),
    ).toThrow(/proven to exceed/);
    expect(() =>
      service.rejectUnsigned("stranger", attempt.id, rejected),
    ).toThrow(/unavailable/);
    expect(
      service.rejectUnsigned("owner", attempt.id, recovered!).attempt.state,
    ).toBe("REJECTED");
    expect(
      service.rejectUnsigned("owner", attempt.id, recovered!).attempt.state,
    ).toBe("REJECTED");
    const recoveredTask = store.get<Task>("task", "fee-task")!;
    expect(recoveredTask.state).toBe("AWAITING_APPROVAL");
    expect(recoveredTask.attemptId).toBeUndefined();
    expect(recoveredTask.error?.message).toContain(
      `Draft network fee: ${rejected.feeSats} sats`,
    );
    expect(store.receipt("fee-task")).toBeUndefined();
    expect(service.claimWallet("owner", attempt.id).invokeWallet).toBe(false);
    const fresh = await service.quote(
      "owner",
      "fee-task",
      buyer.identityKey,
      "fresh-quote-key",
    );
    expect(fresh.id).not.toBe(quote.id);
    expect(fresh.derivationPrefix).not.toBe(quote.derivationPrefix);
    expect(store.get<Task>("task", "fee-task")?.state).toBe(
      "AWAITING_APPROVAL",
    );
    store.close();
  });
  it.each(["refused", "timeout"])(
    "keeps an uncertain abort unresolved (%s)",
    async (outcome) => {
      const buyer = await chain.makeWallet();
      const provider = await chain.makeWallet();
      await chain.fund(buyer);
      vi.spyOn(buyer, "getNetwork").mockResolvedValue({ network: "testnet" });
      const sign = vi.spyOn(buyer, "signAction");
      const create = vi.spyOn(buyer, "createAction");
      const abort = vi.spyOn(buyer, "abortAction");
      if (outcome === "refused") abort.mockResolvedValue({ aborted: false });
      else abort.mockRejectedValue(new Error("offline abort"));
      const local = memoryStorage();
      const quote = {
        id: "uncertain-quote",
        network: "testnet",
        payerIdentityKey: buyer.identityKey,
        recipientIdentityKey: provider.identityKey,
        derivationPrefix: "uncertain-prefix",
        priceSats: 100,
      } as Quote;
      await expect(
        payApprovedQuote({
          quote,
          attemptId: "uncertain-attempt",
          maxAuthorizedDebitSats: 100,
          wallet: buyer,
          storage: local,
        }),
      ).rejects.toThrow(/actual network fee/);
      expect(savedUnsignedAbort("uncertain-attempt", local)).toBeUndefined();
      expect(sign).not.toHaveBeenCalled();
      await expect(
        payApprovedQuote({
          quote,
          attemptId: "uncertain-attempt",
          maxAuthorizedDebitSats: 1000,
          wallet: buyer,
          storage: local,
        }),
      ).rejects.toThrow(/already started/);
      expect(create).toHaveBeenCalledOnce();
      // Without a proven over-limit draft, an abort refusal/failure stays unknown.
      await expect(
        recoverUnsignedDraft({
          quote,
          attemptId: "uncertain-attempt",
          maxAuthorizedDebitSats: 100000,
          wallet: new WalletClient(buyer),
          storage: local,
        }),
      ).rejects.toThrow(
        outcome === "refused"
          ? /refused to cancel/
          : /did not confirm cancellation/,
      );
      expect(savedUnsignedAbort("uncertain-attempt", local)).toBeUndefined();
      // Once signing was requested, even an available abort method cannot permit a replacement.
      const record = JSON.parse(
        local.getItem("mercatum:payment:uncertain-attempt")!,
      );
      local.setItem(
        "mercatum:payment:uncertain-attempt",
        JSON.stringify({ ...record, phase: "sign_requested" }),
      );
      abort.mockClear();
      expect(
        await recoverUnsignedDraft({
          quote,
          attemptId: "uncertain-attempt",
          maxAuthorizedDebitSats: 100,
          wallet: buyer,
          storage: local,
        }),
      ).toBeUndefined();
      expect(abort).not.toHaveBeenCalled();
    },
  );

  it("reconciles the same outpoint after an internalization acknowledgement is lost", async () => {
    const store = new Store(":memory:");
    store.put("task", task("recovery-task"));
    const identity = PrivateKey.fromRandom().toPublicKey().toString();
    let committed = false;
    let calls = 0;
    const merchant: Merchant = {
      identityKey: identity,
      verify: async () => ({
        txid: "a".repeat(64),
        ef: "test-only-ef",
        feeSats: 1,
      }),
      submit: async () => ({
        submittedAt: new Date().toISOString(),
        postStatus: "RECEIVED",
        status: "RECEIVED",
        networkKnown: false,
      }),
      observe: async (_id, p) => ({
        ...p,
        status: "SEEN_ON_NETWORK",
        networkKnown: true,
      }),
      internalize: async () => {
        calls++;
        if (!committed) {
          committed = true;
          throw Error("lost acknowledgement");
        }
      },
      close: async () => {},
    };
    const service = new PaymentService(
      store,
      { network: "testnet", priceSats: 100, walletStorageDir: "." },
      () => true,
      merchant,
    );
    const payer = PrivateKey.fromRandom().toPublicKey().toString();
    const q = await service.quote(
      "owner",
      "recovery-task",
      payer,
      "recovery-quote",
    );
    const a = service.approve(
      "owner",
      q.id,
      {
        approved: true,
        feePolicy: "review-before-sign",
        maxAuthorizedDebitSats: 1000,
      },
      "recovery-approval",
    );
    service.claimWallet("owner", a.id);
    const p: PaymentProof = {
      tx: [1],
      txid: "a".repeat(64),
      outputIndex: 0,
      satoshis: 100,
      derivationPrefix: q.derivationPrefix,
      derivationSuffix: "suffix",
      senderIdentityKey: payer,
    };
    expect(
      (await service.submitProof("owner", a.id, p)).receipt,
    ).toBeUndefined();
    expect((await service.reconcile("owner", a.id)).receipt?.txid).toBe(p.txid);
    expect(calls).toBe(2);
    expect(
      store.db.prepare("SELECT count(*) AS n FROM receipts").get(),
    ).toEqual({ n: 1 });
    store.close();
  });
  it("keeps absent wallet and disabled provider unavailable, and maps network endpoints explicitly", async () => {
    const store = new Store(":memory:");
    const service = new PaymentService(
      store,
      { network: "mainnet", priceSats: 100, walletStorageDir: "." },
      () => false,
    );
    await service.initialize();
    expect(service.walletConfig().paymentsEnabled).toBe(false);
    await expect(
      service.quote(
        "owner",
        "task",
        PrivateKey.fromRandom().toPublicKey().toString(),
        "absent-quote",
      ),
    ).rejects.toThrow(/not enabled/);
    expect(NETWORKS.mainnet.chain).toBe("main");
    expect(NETWORKS.testnet.arcade).toContain("testnet");
    store.close();
  });
});
