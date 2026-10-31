import { QuoteReview } from "./components/ui/quote-review";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Blocks,
  Check,
  ChevronDown,
  Code2,
  Copy,
  Download,
  FileText,
  FolderGit2,
  History,
  Menu,
  MessageSquare,
  PanelLeftClose,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  Wallet,
  X,
  AlertCircle,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { api, startSession } from "./api";
import { paymentRecoveryMessage } from "./wallet/recovery-status";
import { PromptInput } from "./components/ui/prompt-input";
import ThinkingState, { getStreamedAnswer } from "./components/ui/thinking";
import { InteractiveGrid } from "./components/ui/interactive-grid";
import { Marketplace, ModelLogo } from "./components/ui/marketplace";
import {
  offers,
  brandNames,
  defaultSelection,
  findSelection,
  formatTokens,
  type MarketplaceSelection,
} from "../shared/marketplace";
import { DeleteHistoryDialog } from "./components/ui/delete-history-dialog";
import { ArtifactViewer } from "./components/ui/artifact-viewer";
import { FileViewer } from "./components/ui/file-viewer";
import { ActionMenu, ContextActions } from "./components/ui/context-menu";
import type {
  PublicTask,
  PublicQuote as Quote,
  RepositorySnapshot,
  PaymentAttempt,
} from "../shared/contracts";
// Load wallet code with the page: an open tab must not fetch a deleted chunk
// after a deployment, especially after reserving a payment attempt.
import * as walletAdapter from "./wallet/payment";
interface Provider {
  id: string;
  name: string;
  isDemo: boolean;
  modelId: string | null;
  priceSats: number;
  capacity: { fiveHour: number; weekly: number };
  ready: boolean;
}
interface Readiness {
  ready: boolean;
  model: boolean;
  wallet: boolean;
  paymentsEnabled: boolean;
  blockers: string[];
}
const stateText = (s: string) => s.toLowerCase().replaceAll("_", " ");
export function App() {
  const [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [providers, setProviders] = useState<Provider[]>([]),
    [readiness, setReadiness] = useState<Readiness>(),
    [history, setHistory] = useState<
      Pick<PublicTask, "id" | "mode" | "prompt" | "state" | "createdAt">[]
    >([]),
    [task, setTask] = useState<PublicTask>(),
    [deleteTarget, setDeleteTarget] = useState<{
      id: string;
      prompt: string;
    }>(),
    [view, setView] = useState<"workspace" | "capacity" | "history" | "agents">(
      "capacity",
    ),
    [selection, setSelection] =
      useState<MarketplaceSelection>(defaultSelection()),
    [mode, setMode] = useState<"chat" | "code">("chat"),
    [newChat, setNewChat] = useState(0),
    [sidebar, setSidebar] = useState(false),
    [desktopNav, setDesktopNav] = useState(
      () => matchMedia("(min-width: 900px)").matches,
    ),
    [snapshot, setSnapshot] = useState<RepositorySnapshot>(),
    [repo, setRepo] = useState(""),
    [ref, setRef] = useState("HEAD"),
    [wallet, setWallet] = useState<{ identityKey: string; network: string }>(),
    [search, setSearch] = useState(""),
    [extension, setExtension] = useState<string>(),
    [initialPrompt, setInitialPrompt] = useState(""),
    [pendingPrompt, setPendingPrompt] = useState("");
  useEffect(() => {
    const media = matchMedia("(min-width: 900px)");
    const update = () => {
      setDesktopNav(media.matches);
      setSidebar(false);
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const removedHistoryIds = useRef(new Set<string>());
  const navVisible = desktopNav || sidebar;
  useEffect(() => {
    if (!sidebar) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebar(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [sidebar]);
  const provider = providers[0];
  const selected = findSelection(selection)!;
  const streamedAnswer =
    task?.state === "RUNNING" ? getStreamedAnswer(task.events) : "";
  const taskSettled =
    !task ||
    [
      "SUCCEEDED",
      "LIMIT_REACHED",
      "FAILED",
      "SCOPE_REJECTED",
      "CANCELLED",
    ].includes(task.state);

  const refresh = useCallback(async () => {
    const items = await api<typeof history>("/api/tasks");
    setHistory(items.filter((t) => !removedHistoryIds.current.has(t.id)));
    const data = await api<{ providers: Provider[]; readiness: Readiness }>(
      "/api/providers",
    );
    setProviders(data.providers);
    setReadiness(data.readiness);
  }, []);
  const loadTask = useCallback(async (id: string) => {
    const t = await api<PublicTask>(`/api/tasks/${id}`);
    setTask(t);
    if (t.selection && findSelection(t.selection)) setSelection(t.selection);
    else setSelection(defaultSelection("gemini-ultra"));
    setMode(t.mode);
    if (t.snapshotId)
      setSnapshot(await api(`/api/repositories/${t.snapshotId}`));
    setView("workspace");
    setSidebar(false);
    window.history.replaceState(null, "", `/?task=${id}`);
  }, []);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        await startSession();
        if (!live) return;
        await refresh();
        const id = new URLSearchParams(location.search).get("task");
        if (id) await loadTask(id);
        setLoaded(true);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
    return () => {
      live = false;
    };
  }, [refresh, loadTask]);
  useEffect(() => {
    if (!task?.id) return;
    const id = task.id;
    let closed = false;
    const source = new EventSource(`/api/tasks/${id}/events`);
    const update = async () => {
      try {
        const t = await api<PublicTask>(`/api/tasks/${id}`);
        if (!closed && !removedHistoryIds.current.has(id)) setTask(t);
      } catch {
        /* Polling resumes on reconnect. */
      }
    };
    source.onmessage = () => void update();
    const poll = setInterval(() => {
      void update();
      void refresh();
    }, 5000);
    return () => {
      closed = true;
      source.close();
      clearInterval(poll);
    };
  }, [task?.id, refresh]);
  const perform = async (fn: () => Promise<void>) => {
    setError("");
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const reset = () => {
    setTask(undefined);
    setSnapshot(undefined);
    setExtension(undefined);
    setInitialPrompt("");
    setNewChat((n) => n + 1);
    setView("workspace");
    setSidebar(false);
    window.history.replaceState(null, "", "/");
  };
  const deleteHistory = (item: (typeof history)[number]) => {
    if (busy) return;
    setError("");
    setDeleteTarget(item);
  };
  const confirmDeleteHistory = () => {
    if (busy || !deleteTarget) return;
    const item = deleteTarget;
    void perform(async () => {
      await api(`/api/tasks/${item.id}/history`, {}, "DELETE");
      removedHistoryIds.current.add(item.id);
      setHistory((items) => items.filter((t) => t.id !== item.id));
      setDeleteTarget(undefined);
      if (task?.id === item.id) {
        reset();
        if (view === "history") setView("history");
      }
    });
  };
  const startNewTask = () => {
    reset();
    setView("capacity");
  };
  const connect = () =>
    perform(async () => {
      const connected = await walletAdapter.connectWallet();
      setWallet(connected);
    });
  const submit = (prompt: string) =>
    perform(async () => {
      setPendingPrompt(prompt);
      try {
        const t = await api<PublicTask>("/api/tasks", {
          mode,
          prompt,
          providerId: "demo-provider",
          selection,
          ...(mode === "code" ? { snapshotId: snapshot?.id } : {}),
          ...(extension ? { extensionOfTaskId: extension } : {}),
        });
        setTask(t);
        setInitialPrompt("");
        setNewChat((n) => n + 1);
        setExtension(undefined);
        window.history.replaceState(null, "", `/?task=${t.id}`);
        await refresh();
      } finally {
        setPendingPrompt("");
      }
    });
  const quote = () =>
    perform(async () => {
      let connected = wallet;
      if (!connected) {
        connected = await walletAdapter.connectWallet();
        setWallet(connected);
      }
      await api(`/api/tasks/${task!.id}/quote`, {
        payerIdentityKey: connected.identityKey,
      });
      await loadTask(task!.id);
    });
  const importRepo = () =>
    perform(async () => {
      const match = repo
        .trim()
        .replace(/^https:\/\/github.com\//, "")
        .replace(/\/$/, "")
        .match(/^([\w.-]+)\/([\w.-]+)$/);
      if (!match)
        throw new Error(
          "Enter a public GitHub repository as owner/repository.",
        );
      const s = await api<RepositorySnapshot>("/api/repositories/import", {
        owner: match[1],
        repository: match[2],
        ref,
      });
      setSnapshot(s);
    });
  const recoverPayment = () =>
    perform(async () => {
      if (!task?.attempt) return;
      try {
        // Prefer the server's saved proof/receipt over potentially stale browser evidence.
        const status = await api<{
          attempt: { state: string; hasProof?: boolean };
          receipt?: unknown;
        }>(`/api/payments/${task.attempt.id}/reconcile`, {});
        if (
          status.receipt ||
          status.attempt.hasProof ||
          ["REJECTED", "VERIFIED"].includes(status.attempt.state)
        )
          return;
        const options = task.quote
          ? {
              quote: task.quote,
              attemptId: task.attempt.id,
              maxAuthorizedDebitSats:
                task.attempt.approval.maxAuthorizedDebitSats,
            }
          : undefined;
        const proof =
          (await walletAdapter.savedPaymentProof(task.attempt.id)) ||
          (options
            ? await walletAdapter.recoverSignedPayment(options)
            : undefined);
        if (proof) await api(`/api/payments/${task.attempt.id}/proof`, proof);
        else {
          const rejection = options
            ? await walletAdapter.recoverUnsignedDraft(options)
            : undefined;
          if (rejection)
            await api(
              `/api/payments/${task.attempt.id}/unsigned-abort`,
              rejection,
            );
          else throw new Error(paymentRecoveryMessage(task.attempt));
        }
      } finally {
        await loadTask(task.id);
      }
    });
  const pay = async (q: Quote, max: number) =>
    perform(async () => {
      const attempt = await api<PaymentAttempt>(`/api/quotes/${q.id}/approve`, {
        approved: true,
        feePolicy: "review-before-sign",
        maxAuthorizedDebitSats: max,
      });
      try {
        await walletAdapter.payApprovedQuote({
          quote: q,
          attemptId: attempt.id,
          maxAuthorizedDebitSats: max,
          // Connection, identity checks, derivation and storage checks happen
          // before the server grants its one-time permission to create a draft.
          claimWallet: async () => {
            const claim = await api<{ invokeWallet: boolean }>(
              `/api/payments/${attempt.id}/wallet-requested`,
              {},
            );
            return claim.invokeWallet;
          },
          onProof: async (proof) => {
            await api(`/api/payments/${attempt.id}/proof`, proof);
          },
        });
      } catch (e) {
        const rejection = await walletAdapter.savedUnsignedAbort(attempt.id);
        if (rejection) {
          await api(`/api/payments/${attempt.id}/unsigned-abort`, rejection);
          return;
        }
        // Only an unclaimed APPROVED attempt can be released by the server.
        // A failed/lost createAction or signAction response remains unresolved.
        await api(`/api/payments/${attempt.id}/reconcile`, {}).catch(() => {});
        throw e;
      } finally {
        await loadTask(q.taskId);
      }
    });
  return (
    <div
      className={`app-shell ${navVisible ? "nav-open" : "nav-closed"} ${view === "capacity" ? "marketplace-shell" : ""}`}
    >
      {sidebar && !desktopNav && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setSidebar(false)}
        />
      )}
      <aside
        className={`sidebar ${navVisible ? "open" : ""}`}
        inert={!navVisible}
      >
        <button
          className="brand"
          onClick={() => {
            setView("capacity");
            setSidebar(false);
            window.history.replaceState(null, "", "/");
          }}
        >
          <img
            className="brand-logo"
            src="/brands/mercatum.png"
            alt=""
            width={68}
            height={68}
          />
          <span>mercaTUM</span>
          <ChevronDown size={14} />
        </button>
        <button className="new-task" onClick={startNewTask}>
          <Plus size={16} />
          New task <kbd>↗</kbd>
        </button>
        <nav aria-label="Main navigation">
          <button
            className={view === "workspace" ? "active" : ""}
            onClick={() => {
              setView("workspace");
              setSidebar(false);
              window.history.replaceState(
                null,
                "",
                task ? `/?task=${task.id}` : "/",
              );
            }}
          >
            <MessageSquare size={17} />
            Workspace
          </button>
          <button
            className={view === "capacity" ? "active" : ""}
            onClick={() => {
              setView("capacity");
              setSidebar(false);
              window.history.replaceState(null, "", "/");
            }}
          >
            <Blocks size={17} />
            Marketplace<span className="nav-count">{offers.length}</span>
          </button>
          <button
            className={view === "history" ? "active" : ""}
            onClick={() => {
              setView("history");
              setSidebar(false);
            }}
          >
            <History size={17} />
            Task history
          </button>
          <button
            className={view === "agents" ? "active" : ""}
            onClick={() => {
              setView("agents");
              setSidebar(false);
            }}
          >
            <Terminal size={17} />
            Connect your agent
          </button>
        </nav>
        <div className="sidebar-divider" />
        {deleteTarget && (
          <DeleteHistoryDialog
            prompt={deleteTarget.prompt}
            busy={busy}
            error={error}
            onCancel={() => setDeleteTarget(undefined)}
            onConfirm={confirmDeleteHistory}
          />
        )}
        <div className="sidebar-section">
          <span>RECENT TASKS</span>
          <button
            className="icon-button"
            aria-label="New task"
            onClick={startNewTask}
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="recent-tasks">
          {history.length ? (
            history.slice(0, 8).map((t) => (
              <div className="recent-task-row" key={t.id}>
                <ContextActions
                  actions={[
                    {
                      label: "Open task",
                      run: () => void perform(() => loadTask(t.id)),
                      disabled: busy,
                    },
                    {
                      label: "Copy task link",
                      run: () =>
                        void navigator.clipboard.writeText(
                          `${location.origin}/?task=${t.id}`,
                        ),
                    },
                    {
                      label: "Delete from history",
                      run: () => deleteHistory(t),
                      disabled: busy,
                    },
                  ]}
                >
                  <button
                    className={`recent-task-open ${task?.id === t.id ? "selected" : ""}`}
                    disabled={busy}
                    onClick={() => void perform(() => loadTask(t.id))}
                  >
                    {t.mode === "code" ? (
                      <Code2 size={14} />
                    ) : (
                      <MessageSquare size={14} />
                    )}
                    <span>{t.prompt}</span>
                  </button>
                </ContextActions>
                <ActionMenu
                  label={`Actions for ${t.prompt}`}
                  actions={[
                    {
                      label: "Delete from history",
                      run: () => deleteHistory(t),
                      disabled: busy,
                    },
                  ]}
                />
              </div>
            ))
          ) : (
            <p>No tasks yet</p>
          )}
        </div>
        <div className="sidebar-bottom">
          <div className="wallet-info">
            <span className={wallet ? "wallet-dot connected" : "wallet-dot"} />
            <div>
              <strong>
                {wallet ? "Wallet connected" : "Wallet disconnected"}
              </strong>
              {wallet && (
                <span>
                  {wallet.network} · {wallet.identityKey.slice(0, 8)}…
                </span>
              )}
            </div>
          </div>
          <button className="wallet-button" onClick={connect} disabled={busy}>
            <img
              className="wallet-brand"
              src="/brands/bsv-square.svg"
              alt="BSV Blockchain"
              width={48}
              height={48}
            />
            <span className="wallet-button-label">
              {wallet ? "Reconnect wallet" : "Connect wallet"}
            </span>
            <ArrowUpRight size={14} />
          </button>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div>
            <button
              className="mobile-menu icon-button"
              aria-label={sidebar ? "Close navigation" : "Open navigation"}
              aria-expanded={sidebar}
              onClick={() => setSidebar(!sidebar)}
            >
              <Menu size={19} />
            </button>
            <strong>
              {view === "capacity"
                ? "Marketplace"
                : view === "history"
                  ? "Task history"
                  : view === "agents"
                    ? "Agent access"
                    : mode === "code"
                      ? "Code"
                      : "Chat"}
            </strong>
          </div>
          <button
            className="marketplace-home"
            onClick={() => {
              setView("capacity");
              setSidebar(false);
              window.history.replaceState(null, "", "/");
            }}
          >
            <img
              className="brand-logo"
              src="/brands/mercatum.png"
              alt=""
              width={44}
              height={44}
            />
            <span>mercaTUM</span>
          </button>
        </header>
        <main>
          {error && (
            <div className="error-banner" role="alert">
              <AlertCircle size={17} />
              <span>{error}</span>
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {!loaded && !error ? (
            <p className="page-loading">Loading…</p>
          ) : (
            <>
              {view === "workspace" && (
                <div
                  className={`workspace ${task || pendingPrompt ? "has-task" : ""}`}
                >
                  {mode === "chat" && <InteractiveGrid />}
                  <div className="workspace-main">
                    <div className="selected-offer-strip">
                      <ModelLogo brand={selected.offer.brand} />
                      <div>
                        <strong>
                          {brandNames[selected.offer.brand]}{" "}
                          <span>{selected.offer.tier}</span>
                        </strong>
                        <small>
                          From {selected.offer.seller} ·{" "}
                          {formatTokens(selected.offer.remainingTokens)} demo
                          tokens available
                        </small>
                      </div>
                      <button
                        onClick={() => {
                          setView("capacity");
                          window.history.replaceState(null, "", "/");
                        }}
                      >
                        Browse offers <ArrowUpRight size={14} />
                      </button>
                    </div>
                    {pendingPrompt ? (
                      <div className="task-content">
                        <article
                          className="user-message"
                          aria-label="Your message"
                        >
                          {pendingPrompt}
                        </article>
                        <ThinkingState events={[]} state="CREATED" />
                      </div>
                    ) : !task ? (
                      <>
                        {extension && (
                          <div className="notice">
                            New extension task. A separate quote and approval
                            are required.
                          </div>
                        )}
                        {mode === "code" && (
                          <section className="repo-import">
                            <div>
                              <FolderGit2 size={19} />
                              <strong>Public repository</strong>
                            </div>
                            <div className="repo-input-row">
                              <input
                                aria-label="GitHub repository"
                                placeholder="owner/repository"
                                value={repo}
                                onChange={(e) => setRepo(e.target.value)}
                              />
                              <input
                                aria-label="Repository revision"
                                value={ref}
                                onChange={(e) => setRef(e.target.value)}
                                placeholder="HEAD"
                              />
                              <button
                                className="button"
                                onClick={importRepo}
                                disabled={busy}
                              >
                                Import <ArrowRight size={14} />
                              </button>
                            </div>
                            <p>Select files to share with the model.</p>
                          </section>
                        )}
                        {snapshot && mode === "code" && (
                          <FileViewer
                            key={snapshot.id}
                            snapshot={snapshot}
                            onConsent={setSnapshot}
                            onError={setError}
                          />
                        )}
                      </>
                    ) : (
                      <div className="task-content">
                        <article
                          className="user-message"
                          aria-label="Your message"
                        >
                          {task.prompt}
                        </article>
                        <div className="message-tools">
                          <ActionMenu
                            actions={[
                              {
                                label: "Copy message",
                                run: () =>
                                  void navigator.clipboard.writeText(
                                    task.prompt,
                                  ),
                              },
                              {
                                label: "Copy task link",
                                run: () =>
                                  void navigator.clipboard.writeText(
                                    location.href,
                                  ),
                              },
                              { label: "Start a new task", run: reset },
                            ]}
                          />
                        </div>
                        <article
                          className="assistant-message"
                          aria-label="Assistant response"
                        >
                          {task.attempt?.state !== "APPROVED" && (
                            <ThinkingState
                              key={task.id}
                              events={task.events}
                              state={task.state}
                              hasAnswer={!!task.result || !!streamedAnswer}
                            />
                          )}
                          {task.state === "CANCELLED" && (
                            <p className="notice">Request cancelled.</p>
                          )}
                          {task.error && (
                            <div className="notice">{task.error.message}</div>
                          )}
                          {task.state === "AWAITING_APPROVAL" &&
                            !task.quote && (
                              <div className="approval-intro">
                                <Wallet size={24} />
                                <h2>Your task is scoped.</h2>
                                <p>
                                  Connect your BSV wallet to review a quote.
                                  Connecting does not spend funds.
                                </p>
                                <button
                                  className="button primary"
                                  onClick={quote}
                                  disabled={busy}
                                >
                                  Connect & review quote{" "}
                                  <ArrowRight size={16} />
                                </button>
                              </div>
                            )}
                          {task.quote && task.state === "AWAITING_APPROVAL" && (
                            <QuoteReview
                              key={task.quote.id}
                              quote={task.quote}
                              selection={task.selection}
                              onRefresh={quote}
                              busy={busy}
                              onApprove={pay}
                              onCancel={() =>
                                void perform(async () => {
                                  await api(`/api/tasks/${task.id}/cancel`, {});
                                  await loadTask(task.id);
                                })
                              }
                            />
                          )}
                          {["PAYMENT_PENDING", "PAYMENT_UNKNOWN"].includes(
                            task.state,
                          ) && (
                            <div className="notice">
                              <strong>
                                {task.attempt?.state === "APPROVED"
                                  ? "The wallet transaction has not started."
                                  : "Recover your existing payment."}
                              </strong>
                              <p>
                                {task.attempt &&
                                  paymentRecoveryMessage(task.attempt)}
                              </p>
                              {task.attempt?.error && (
                                <p role="status">{task.attempt.error}</p>
                              )}
                              <button
                                className="button"
                                onClick={recoverPayment}
                                disabled={busy}
                              >
                                <RefreshCw size={15} />
                                {busy ? "Checking payment…" : "Check payment"}
                              </button>
                            </div>
                          )}
                          {task.state === "RUNNING" && !task.result && (
                            <div className="stream-output">
                              <ReactMarkdown>{streamedAnswer}</ReactMarkdown>
                            </div>
                          )}
                          {task.result && (
                            <section className="result-panel">
                              {task.result.completion === "partial" && (
                                <p className="subtle">
                                  Partial answer · execution limit reached
                                </p>
                              )}
                              <div className="markdown">
                                <ReactMarkdown>
                                  {task.result.answer}
                                </ReactMarkdown>
                              </div>
                              <div className="answer-actions">
                                <button
                                  className="icon-button"
                                  aria-label="Copy answer"
                                  onClick={() =>
                                    void navigator.clipboard.writeText(
                                      task.result!.answer,
                                    )
                                  }
                                >
                                  <Copy size={15} />
                                </button>
                                <details className="answer-details">
                                  <summary>Details</summary>
                                  <p>
                                    {task.modelId} · {stateText(task.state)} ·{" "}
                                    {new Date(task.createdAt).toLocaleString()}
                                  </p>
                                  {task.result.usage && (
                                    <p>
                                      {task.result.usage.inputTokens.toLocaleString()}{" "}
                                      input ·{" "}
                                      {task.result.usage.outputTokens.toLocaleString()}{" "}
                                      output tokens · fixed service price
                                      unchanged
                                    </p>
                                  )}
                                </details>
                              </div>
                              <ArtifactViewer
                                taskId={task.id}
                                artifacts={task.result.artifacts}
                              />
                              {task.mode === "code" && (
                                <p className="subtle">
                                  Checks: not run. Review and test the patch
                                  before applying it.
                                </p>
                              )}
                            </section>
                          )}
                          {task.receipt && (
                            <details className="receipt-details">
                              <summary>
                                Payment verified · {task.receipt.amountSats}{" "}
                                sats
                              </summary>
                              <section className="receipt">
                                <ShieldCheck size={18} />
                                <div>
                                  <strong>
                                    Payment verified · {task.receipt.amountSats}{" "}
                                    sats
                                  </strong>
                                  <span>
                                    {task.receipt.network} ·{" "}
                                    {task.receipt.arcade.status} · provider
                                    received payment
                                  </span>
                                  <a
                                    href={task.receipt.explorerUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    View transaction on WhatsOnChain{" "}
                                    <ExternalLink size={12} />
                                  </a>
                                </div>
                              </section>
                            </details>
                          )}
                          {["FAILED_PAID", "EXECUTION_UNKNOWN"].includes(
                            task.state,
                          ) && (
                            <button
                              className="button"
                              disabled={busy}
                              onClick={() =>
                                void perform(async () => {
                                  await api(`/api/tasks/${task.id}/retry`, {});
                                  await loadTask(task.id);
                                })
                              }
                            >
                              <RefreshCw size={15} />
                              Retry using this payment
                            </button>
                          )}
                          {["SUCCEEDED", "LIMIT_REACHED"].includes(
                            task.state,
                          ) && (
                            <button
                              className="button text-action"
                              onClick={() => {
                                const id = task.id;
                                reset();
                                setExtension(id);
                              }}
                            >
                              Request more work <Plus size={15} />
                            </button>
                          )}
                          {snapshot && task.mode === "code" && (
                            <FileViewer
                              snapshot={snapshot}
                              onConsent={setSnapshot}
                              onError={setError}
                            />
                          )}
                        </article>
                      </div>
                    )}
                    <div className="composer-dock">
                      <PromptInput
                        key={newChat}
                        mode={mode}
                        setMode={(next) => {
                          if (task) reset();
                          setMode(next);
                        }}
                        onSubmit={submit}
                        busy={busy || !loaded || !taskSettled}
                        modeLocked={!taskSettled || busy}
                        model={selected.model.label}
                        selection={selection}
                        onSelectionChange={setSelection}
                        hasContext={!!snapshot?.consentedAt}
                        initialValue={initialPrompt}
                        placeholder={
                          task
                            ? taskSettled
                              ? "Ask another question…"
                              : "Write your next message…"
                            : undefined
                        }
                      />
                      {task && (
                        <p className="composer-note">
                          {taskSettled
                            ? "Each new request has its own quote and approval."
                            : "Finish this request before sending another."}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {view === "capacity" && (
                <Marketplace
                  priceSats={provider?.priceSats}
                  onSelect={(offerId) => {
                    reset();
                    setMode("chat");
                    setSelection(defaultSelection(offerId));
                  }}
                />
              )}
              {view === "history" && (
                <div className="page-content">
                  <h1>Task history</h1>
                  <label className="search-field">
                    <Search size={17} />
                    <input
                      placeholder="Search your tasks"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                  {history
                    .filter((t) =>
                      t.prompt.toLowerCase().includes(search.toLowerCase()),
                    )
                    .map((t) => (
                      <div className="history-item" key={t.id}>
                        <button
                          className="history-row"
                          disabled={busy}
                          onClick={() => void perform(() => loadTask(t.id))}
                        >
                          {t.mode === "code" ? (
                            <Code2 size={19} />
                          ) : (
                            <MessageSquare size={19} />
                          )}
                          <span>
                            <strong>{t.prompt}</strong>
                            <small>
                              {new Date(t.createdAt).toLocaleString()}
                            </small>
                          </span>
                          <span className="state-badge">
                            {stateText(t.state)}
                          </span>
                          <ArrowUpRight size={16} />
                        </button>
                        <ActionMenu
                          label={`History actions for ${t.prompt}`}
                          actions={[
                            {
                              label: "Delete from history",
                              run: () => deleteHistory(t),
                              disabled: busy,
                            },
                          ]}
                        />
                      </div>
                    ))}
                  {!history.length && (
                    <div className="empty-state">
                      <History size={32} />
                      <h2>No tasks yet</h2>
                      <button className="button" onClick={startNewTask}>
                        Create a task
                      </button>
                    </div>
                  )}
                </div>
              )}
              {view === "agents" && <AgentAccess onError={setError} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
function AgentAccess({ onError }: { onError: (s: string) => void }) {
  const [tokens, setTokens] = useState<
      { id: string; createdAt: string; revoked: boolean }[]
    >([]),
    [issued, setIssued] = useState("");
  const refresh = () => api<typeof tokens>("/api/mcp-tokens").then(setTokens);
  useEffect(() => {
    void refresh().catch((e) => onError(e.message));
  }, []);
  return (
    <div className="page-content">
      <h1>Agent access</h1>
      <p className="page-description">
        MCP tasks require your quote approval and wallet confirmation.
      </p>
      <section className="agent-card">
        <Terminal size={26} />
        <h2>Connect through MCP</h2>
        <label>Streamable HTTP endpoint</label>
        <code>{location.origin}/mcp</code>
        <p>
          Configure your client with an Authorization header:{" "}
          <code>Bearer YOUR_TOKEN</code>. Tokens only access tasks owned by this
          browser session.
        </p>
        <div className="tool-tags">
          {["list_providers", "create_task", "get_task", "get_result"].map(
            (t) => (
              <span key={t}>{t}</span>
            ),
          )}
        </div>
        <button
          className="button primary"
          onClick={async () => {
            try {
              const r = await api("/api/mcp-tokens", {});
              setIssued(r.token);
              await refresh();
            } catch (e) {
              onError((e as Error).message);
            }
          }}
        >
          Create access token <Plus size={16} />
        </button>
        {issued && (
          <div className="issued-token">
            <p>
              Shown once. Copy it to your client; keep it out of screenshots and
              chat.
            </p>
            <input
              readOnly
              type="password"
              value={issued}
              aria-label="New access token"
            />
            <button
              className="button"
              onClick={() => void navigator.clipboard.writeText(issued)}
            >
              Copy token
            </button>
            <button className="button" onClick={() => setIssued("")}>
              Hide
            </button>
          </div>
        )}
        {tokens.map((t) => (
          <div className="token-row" key={t.id}>
            <span>
              {t.id.slice(0, 8)} · {new Date(t.createdAt).toLocaleDateString()}
            </span>
            {t.revoked ? (
              <span>Revoked</span>
            ) : (
              <button
                className="button"
                onClick={async () => {
                  try {
                    await api(`/api/mcp-tokens/${t.id}`, undefined, "DELETE");
                    await refresh();
                  } catch (e) {
                    onError((e as Error).message);
                  }
                }}
              >
                Revoke
              </button>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
