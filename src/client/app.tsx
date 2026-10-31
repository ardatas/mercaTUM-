import { useEffect, useState, useCallback } from "react";
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
import { PromptInput } from "./components/ui/prompt-input";
import { ActivityChain } from "./components/ui/activity-chain";
import { CapacityDial } from "./components/ui/capacity-dial";
import { FileViewer } from "./components/ui/file-viewer";
import { ActionMenu, ContextActions } from "./components/ui/context-menu";
import type {
  PublicTask,
  PublicQuote as Quote,
  RepositorySnapshot,
  PaymentAttempt,
} from "../shared/contracts";
// Load the wallet SDK only when a wallet action is requested.
const walletAdapter = {
  connectWallet: async () => (await import("./wallet/payment")).connectWallet(),
  savedPaymentProof: async (id: string) =>
    (await import("./wallet/payment")).savedPaymentProof(id),
  payApprovedQuote: async (
    options: Parameters<typeof import("./wallet/payment").payApprovedQuote>[0],
  ) => (await import("./wallet/payment")).payApprovedQuote(options),
};
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
    [view, setView] = useState<"workspace" | "capacity" | "history" | "agents">(
      "workspace",
    ),
    [mode, setMode] = useState<"chat" | "code">("chat"),
    [newChat, setNewChat] = useState(0),
    [sidebar, setSidebar] = useState(false),
    [snapshot, setSnapshot] = useState<RepositorySnapshot>(),
    [repo, setRepo] = useState(""),
    [ref, setRef] = useState("HEAD"),
    [wallet, setWallet] = useState<{ identityKey: string; network: string }>(),
    [search, setSearch] = useState(""),
    [extension, setExtension] = useState<string>(),
    [initialPrompt, setInitialPrompt] = useState("");
  const provider = providers[0];
  const refresh = useCallback(async () => {
    setHistory(await api("/api/tasks"));
    const data = await api<{ providers: Provider[]; readiness: Readiness }>(
      "/api/providers",
    );
    setProviders(data.providers);
    setReadiness(data.readiness);
  }, []);
  const loadTask = useCallback(async (id: string) => {
    const t = await api<PublicTask>(`/api/tasks/${id}`);
    setTask(t);
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
        if (!closed) setTask(t);
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
  const connect = () =>
    perform(async () => {
      const connected = await walletAdapter.connectWallet();
      setWallet(connected);
    });
  const submit = (prompt: string) =>
    perform(async () => {
      const t = await api<PublicTask>("/api/tasks", {
        mode,
        prompt,
        providerId: "demo-provider",
        ...(mode === "code" ? { snapshotId: snapshot?.id } : {}),
        ...(extension ? { extensionOfTaskId: extension } : {}),
      });
      setTask(t);
      window.history.replaceState(null, "", `/?task=${t.id}`);
      await refresh();
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
      const proof = await walletAdapter.savedPaymentProof(task.attempt.id);
      if (proof) await api(`/api/payments/${task.attempt.id}/proof`, proof);
      else await api(`/api/payments/${task.attempt.id}/reconcile`, {});
      await loadTask(task.id);
    });
  const pay = async (q: Quote, max: number) =>
    perform(async () => {
      const attempt = await api<PaymentAttempt>(`/api/quotes/${q.id}/approve`, {
        approved: true,
        feePolicy: "review-before-sign",
        maxAuthorizedDebitSats: max,
      });
      const claim = await api<{
        invokeWallet: boolean;
        attempt: PaymentAttempt;
      }>(`/api/payments/${attempt.id}/wallet-requested`, {});
      if (claim.invokeWallet) {
        try {
          await walletAdapter.payApprovedQuote({
            quote: q,
            attemptId: attempt.id,
            maxAuthorizedDebitSats: max,
            onProof: async (proof) => {
              await api(`/api/payments/${attempt.id}/proof`, proof);
            },
          });
        } catch (e) {
          await api(`/api/payments/${attempt.id}/reconcile`, {}).catch(
            () => {},
          );
          throw e;
        }
      } else {
        await api(`/api/payments/${attempt.id}/reconcile`, {});
      }
      await loadTask(q.taskId);
    });
  const renderCapacity = (large = false) => (
    <div className={`provider-card ${large ? "large" : ""}`}>
      <div className="provider-header">
        <div className="provider-icon">
          <Sparkles size={18} />
        </div>
        <div>
          <strong>{provider?.name ?? "mercaTUM Studio"}</strong>
          <span>Chat & code · operator API</span>
        </div>
        <span className="badge">Demo provider</span>
      </div>
      <div className="capacity-dials">
        <CapacityDial
          value={provider?.capacity.fiveHour ?? 72}
          label="5-hour capacity"
        />
        <CapacityDial
          value={provider?.capacity.weekly ?? 86}
          label="Weekly capacity"
        />
      </div>
      <div className="provider-footer">
        <div>
          <strong>
            {provider?.priceSats ?? "—"} <small>sats / task</small>
          </strong>
          <span>Fixed quote before you pay</span>
        </div>
        <span className={`availability ${readiness?.ready ? "online" : ""}`}>
          {readiness?.ready ? "Available" : "Setup pending"}
        </span>
      </div>
      <p className="simulation-note">
        Capacity is simulated. Execution uses the configured model API. No
        subscription credentials are shared.
      </p>
    </div>
  );
  return (
    <div className="app-shell">
      {sidebar && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setSidebar(false)}
        />
      )}
      <aside className={`sidebar ${sidebar ? "open" : ""}`}>
        <button className="brand" onClick={reset}>
          <span className="brand-symbol">
            m<span>↗</span>
          </span>
          <span>
            mercaTUM<small>YOUR AI WORKSPACE</small>
          </span>
          <ChevronDown size={14} />
        </button>
        <button className="new-task" onClick={reset}>
          <Plus size={16} />
          New task <kbd>↗</kbd>
        </button>
        <nav aria-label="Main navigation">
          <button
            className={view === "workspace" ? "active" : ""}
            onClick={() => {
              setView("workspace");
              setSidebar(false);
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
            }}
          >
            <Blocks size={17} />
            Available capacity<span className="nav-count">1</span>
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
        <div className="sidebar-section">
          <span>RECENT TASKS</span>
          <button className="icon-button" aria-label="New task" onClick={reset}>
            <Plus size={14} />
          </button>
        </div>
        <div className="recent-tasks">
          {history.length ? (
            history.slice(0, 8).map((t) => (
              <ContextActions
                key={t.id}
                actions={[
                  {
                    label: "Open task",
                    run: () => void perform(() => loadTask(t.id)),
                  },
                  {
                    label: "Copy task link",
                    run: () =>
                      void navigator.clipboard.writeText(
                        `${location.origin}/?task=${t.id}`,
                      ),
                  },
                ]}
              >
                <button
                  className={task?.id === t.id ? "selected" : ""}
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
            ))
          ) : (
            <p>Your work will appear here.</p>
          )}
        </div>
        <div className="sidebar-bottom">
          <div className="wallet-info">
            <span className={wallet ? "wallet-dot connected" : "wallet-dot"} />
            <div>
              <strong>
                {wallet ? "Wallet connected" : "Your wallet, your control"}
              </strong>
              <span>
                {wallet
                  ? `${wallet.network} · ${wallet.identityKey.slice(0, 8)}…`
                  : "Approve each payment yourself"}
              </span>
            </div>
          </div>
          <button className="wallet-button" onClick={connect} disabled={busy}>
            <Wallet size={16} />
            {wallet ? "Reconnect wallet" : "Connect wallet"}
            <ArrowUpRight size={14} />
          </button>
          <div className="sidebar-footnote">
            Built for TUM Blockchain & AI <span>2026</span>
          </div>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div>
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setSidebar(true)}
            >
              <Menu size={19} />
            </button>
            <span className="breadcrumb">Personal workspace</span>
            <span className="slash">/</span>
            <strong>
              {view === "capacity"
                ? "Available capacity"
                : view === "history"
                  ? "Task history"
                  : view === "agents"
                    ? "Agent access"
                    : mode === "code"
                      ? "Code workspace"
                      : "Chat workspace"}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="demo-indicator">
              <span />
              Demo marketplace
            </span>
            <button
              className="avatar"
              aria-label="Open task history"
              onClick={() => setView("history")}
            >
              M
            </button>
          </div>
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
            <p className="page-loading">Opening your workspace…</p>
          ) : (
            <>
              {view === "workspace" && (
                <div className={`workspace ${task ? "has-task" : ""}`}>
                  <div className="workspace-main">
                    {!task ? (
                      <>
                        <div className="workspace-heading">
                          <div className="eyebrow">
                            <span /> A LITTLE CAPACITY. A LOT OF POSSIBILITY.
                          </div>
                          <h1>
                            What will you
                            <br />
                            <span>make possible?</span>
                          </h1>
                          <p>
                            Bring a question. Bring your code.
                            <br className="mobile-break" /> Get the right AI for
                            the work.
                          </p>
                        </div>
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
                              <strong>Start with a public repository</strong>
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
                            <p>
                              Review the pinned files before sharing context
                              with the model. Your repository stays untouched.
                            </p>
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
                        <PromptInput
                          key={newChat}
                          mode={mode}
                          setMode={setMode}
                          onSubmit={submit}
                          busy={busy || !loaded}
                          model={provider?.modelId ?? ""}
                          hasContext={!!snapshot?.consentedAt}
                          initialValue={initialPrompt}
                        />
                        <div className="composer-caption">
                          <ShieldCheck size={13} />
                          Review the scope and fixed price before approving
                          payment.<span>⌘ ↵ to continue</span>
                        </div>
                        <div className="suggestions">
                          {[
                            {
                              icon: MessageSquare,
                              title: "Make sense of an idea",
                              text: "Compare two approaches and their tradeoffs.",
                              prompt:
                                "Compare REST and GraphQL for a small team building its first API. Focus on concrete tradeoffs.",
                              mode: "chat" as const,
                            },
                            {
                              icon: Code2,
                              title: "Make a focused change",
                              text: "Select a repo. Review a real patch.",
                              prompt:
                                "Make a small, focused improvement to the selected code and explain the change.",
                              mode: "code" as const,
                            },
                          ].map((s) => (
                            <button
                              key={s.title}
                              onClick={() => {
                                setMode(s.mode);
                                setInitialPrompt(s.prompt);
                                setNewChat((n) => n + 1);
                              }}
                            >
                              <s.icon size={18} />
                              <strong>
                                {s.title}
                                <ArrowUpRight size={14} />
                              </strong>
                              <p>{s.text}</p>
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="task-content">
                        <div className="task-heading">
                          <span
                            className={`state-badge ${task.state === "SUCCEEDED" ? "complete" : ""}`}
                          >
                            {stateText(task.state)}
                          </span>
                          <ActionMenu
                            actions={[
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
                        <h1>{task.prompt}</h1>
                        <p className="task-meta">
                          {task.mode === "code" ? "Code task" : "Chat task"} ·{" "}
                          {task.modelId} ·{" "}
                          {new Date(task.createdAt).toLocaleString()}
                        </p>
                        <ActivityChain
                          events={task.events}
                          state={task.state}
                        />
                        {task.error && (
                          <div className="notice">{task.error.message}</div>
                        )}
                        {task.state === "AWAITING_APPROVAL" && !task.quote && (
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
                              Connect & review quote <ArrowRight size={16} />
                            </button>
                          </div>
                        )}
                        {task.quote && task.state === "AWAITING_APPROVAL" && (
                          <QuoteReview
                            quote={task.quote}
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
                            <strong>Payment is being reconciled.</strong>
                            <p>
                              A wallet timeout can still mean funds moved. This
                              action checks the same payment and never starts
                              another debit.
                            </p>
                            <button
                              className="button"
                              onClick={recoverPayment}
                              disabled={busy}
                            >
                              <RefreshCw size={15} />
                              Reconcile payment
                            </button>
                          </div>
                        )}
                        {task.state === "RUNNING" && !task.result && (
                          <div className="stream-output">
                            <ReactMarkdown>
                              {task.events
                                .filter(
                                  (e) => e.type === "execution.text_delta",
                                )
                                .map((e) => e.data.text as string)
                                .join("")}
                            </ReactMarkdown>
                          </div>
                        )}
                        {task.result && (
                          <section className="result-panel">
                            <div className="result-header">
                              <span>
                                <Sparkles size={16} />
                                {task.result.completion === "partial"
                                  ? "Partial result"
                                  : "Your result"}
                              </span>
                              <button
                                className="icon-button"
                                aria-label="Copy answer"
                                onClick={() =>
                                  void navigator.clipboard.writeText(
                                    task.result!.answer,
                                  )
                                }
                              >
                                <Copy size={16} />
                              </button>
                            </div>
                            <div className="markdown">
                              <ReactMarkdown>
                                {task.result.answer}
                              </ReactMarkdown>
                            </div>
                            {task.result.artifacts.map((a) => (
                              <a
                                className="artifact-download"
                                key={a.id}
                                href={`/api/tasks/${task.id}/artifacts/${a.id}`}
                              >
                                <FileText size={17} />
                                <span>{a.name}</span>
                                <Download size={16} />
                              </a>
                            ))}
                            {task.mode === "code" && (
                              <p className="subtle">
                                Checks: not run. Review and test the patch
                                before applying it.
                              </p>
                            )}
                            {task.result.usage && (
                              <p className="subtle">
                                {task.result.usage.inputTokens.toLocaleString()}{" "}
                                input ·{" "}
                                {task.result.usage.outputTokens.toLocaleString()}{" "}
                                output tokens · fixed service price unchanged
                              </p>
                            )}
                          </section>
                        )}
                        {task.receipt && (
                          <section className="receipt">
                            <ShieldCheck size={18} />
                            <div>
                              <strong>
                                Payment verified · {task.receipt.amountSats}{" "}
                                sats
                              </strong>
                              <span>
                                {task.receipt.network} ·{" "}
                                {task.receipt.arcade.status} · provider received
                                payment
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
                            className="button"
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
                      </div>
                    )}
                  </div>
                  <aside className="workspace-aside">
                    <div className="section-label">
                      YOUR CAPACITY <span>↗</span>
                    </div>
                    {renderCapacity()}
                    <div className="how-it-works">
                      <span className="section-label">A SIMPLE EXCHANGE</span>
                      <div>
                        <span>01</span>
                        <p>
                          <strong>Define the work</strong>A question or a
                          focused code change.
                        </p>
                      </div>
                      <div>
                        <span>02</span>
                        <p>
                          <strong>Review your quote</strong>Clear scope. Fixed
                          sats. Your approval.
                        </p>
                      </div>
                      <div>
                        <span>03</span>
                        <p>
                          <strong>Keep what you make</strong>Real output, code
                          artifacts and a receipt.
                        </p>
                      </div>
                    </div>
                    {readiness && !readiness.ready && (
                      <div className="setup-note">
                        <span className="status-dot" />
                        <strong>Getting ready</strong>
                        <p>{readiness.blockers.join(" ")}</p>
                        <small>
                          No payment is available until setup checks pass.
                        </small>
                      </div>
                    )}
                  </aside>
                </div>
              )}
              {view === "capacity" && (
                <div className="page-content">
                  <div className="eyebrow">THE CAPACITY MARKETPLACE</div>
                  <h1>
                    A little more room
                    <br />
                    to do your best work.
                  </h1>
                  <p className="page-description">
                    One demonstration listing. Actual model execution and
                    individually approved BSV payments.
                  </p>
                  {renderCapacity(true)}
                  <button className="button primary" onClick={reset}>
                    Start a task <ArrowRight size={16} />
                  </button>
                </div>
              )}
              {view === "history" && (
                <div className="page-content">
                  <h1>Your work, kept here.</h1>
                  <p className="page-description">
                    Tasks, results and payment receipts in this browser session.
                  </p>
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
                      <button
                        className="history-row"
                        key={t.id}
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
                    ))}
                  {!history.length && (
                    <div className="empty-state">
                      <History size={32} />
                      <h2>A fresh start.</h2>
                      <p>Once you start a task, you can return to it here.</p>
                      <button className="button" onClick={reset}>
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
        <footer className="main-footer">
          <span>Made for work worth doing.</span>
          <span>Direct payments. No deposited balance.</span>
        </footer>
      </div>
    </div>
  );
}
function QuoteReview({
  onRefresh,
  quote: q,
  busy,
  onApprove,
  onCancel,
}: {
  quote: Quote;
  busy: boolean;
  onApprove: (q: Quote, max: number) => void;
  onRefresh: () => void;
  onCancel: () => void;
}) {
  const [max, setMax] = useState(q.priceSats + 10),
    [confirmed, setConfirmed] = useState(false);
  const expired = Date.parse(q.expiresAt) < Date.now();
  return (
    <section className="quote-review">
      <div className="quote-heading">
        <Wallet size={21} />
        <h2>Review this purchase</h2>
        <span className="badge">Fixed price</span>
      </div>
      <p>{q.scopeSummary}</p>
      <dl>
        <dt>Deliverable</dt>
        <dd>{q.intendedDeliverable}</dd>
        <dt>Model</dt>
        <dd>{q.modelId}</dd>
        <dt>Service price</dt>
        <dd>
          <strong>{q.priceSats} sats</strong>
        </dd>
        <dt>Network</dt>
        <dd>{q.network}</dd>
        <dt>Provider recipient</dt>
        <dd className="mono break">{q.recipientIdentityKey}</dd>
        <dt>Execution limits</dt>
        <dd>
          {q.limits.maxOutputTokens.toLocaleString()} output tokens / call ·{" "}
          {q.limits.maxModelCalls} paid calls including recovery ·{" "}
          {q.limits.maxTotalOutputTokens.toLocaleString()} aggregate output
          tokens · {q.limits.maxRuntimeSeconds}s per attempt ·{" "}
          {q.limits.maxRecoveryAttempts} recovery attempt ·{" "}
          {q.limits.maxContextBytes.toLocaleString()} context bytes
        </dd>
        <dt>Expires</dt>
        <dd>{new Date(q.expiresAt).toLocaleString()}</dd>
      </dl>
      <p className="quote-policy">
        {q.limitPolicy} Technical recovery uses this payment. There are no
        automatic refunds.
      </p>
      <label className="debit-field">
        Maximum total debit, including network fee{" "}
        <input
          type="number"
          min={q.priceSats}
          max={1000000}
          value={max}
          onChange={(e) => setMax(Number(e.target.value))}
        />
        <span>sats</span>
      </label>
      <p className="subtle">
        The wallet prepares the transaction for review. If its fee exceeds your
        bound, signing is blocked. You approve native wallet spending yourself.
      </p>
      <label className="consent">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        <span>
          I approve this scope, provider, network and total debit bound. I will
          review the native wallet prompt.
        </span>
      </label>
      <div className="quote-actions">
        {expired && (
          <button className="button" disabled={busy} onClick={onRefresh}>
            Refresh quote
          </button>
        )}
        <button className="button" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button
          className="button primary"
          disabled={
            busy ||
            !confirmed ||
            expired ||
            !Number.isSafeInteger(max) ||
            max < q.priceSats
          }
          onClick={() => onApprove(q, max)}
        >
          {expired
            ? "Quote expired"
            : `Approve ${q.priceSats} sats + bounded fee`}
          <ArrowRight size={15} />
        </button>
      </div>
    </section>
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
      <div className="eyebrow">BRING YOUR OWN AGENT</div>
      <h1>
        Same workspace.
        <br />
        Another way in.
      </h1>
      <p className="page-description">
        Let an MCP client submit work and retrieve results. You still review
        each quote and approve spending in your browser and wallet.
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
