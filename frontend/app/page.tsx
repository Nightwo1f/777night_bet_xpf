"use client";

import { useEffect, useMemo, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const SESSION_STORAGE_KEY = "777night.session";

const games = [
  { name: "Night Dice", multiplier: "2.0x", status: "Ao vivo" },
  { name: "Lucky 7", multiplier: "7.0x", status: "MVP" },
  { name: "Crash Lab", multiplier: "1.1x-8.0x", status: "Em breve" },
];

type Transaction = {
  id: number;
  amount: number;
  balanceAfter: number;
  type: "credit" | "debit" | "win" | "loss";
  description: string;
  createdAt: string;
};

type Wallet = {
  userId: number;
  balance: number;
  transactions: Transaction[];
};

type GameRound = {
  id: number;
  game: string;
  stake: number;
  choice: number;
  drawn: number;
  won: boolean;
  delta: number;
  createdAt: string;
};

type AdminOverview = {
  stats: {
    users: number;
    totalBalance: number;
    totalTransactions: number;
  };
  users: Array<{
    id: number;
    email: string;
    createdAt: string;
    balance: number;
    transactions: Transaction[];
  }>;
};

type RoundResult = {
  drawn: number;
  won: boolean;
  delta: number;
  balance: number;
};

type AuthMode = "login" | "register";
type UserRole = "ADMIN" | "PLAYER";

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("test@test.com");
  const [password, setPassword] = useState("123456");
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [adminOverview, setAdminOverview] = useState<AdminOverview | null>(null);
  const [roundHistory, setRoundHistory] = useState<GameRound[]>([]);
  const [stake, setStake] = useState(25);
  const [choice, setChoice] = useState(7);
  const [lastResult, setLastResult] = useState<RoundResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const balance = wallet?.balance ?? 0;
  const canPlay = Boolean(token) && !isLoading && !isPlaying && stake > 0 && stake <= balance;
  const isAdmin = userRole === "ADMIN";
  const potentialReturn = useMemo(() => stake * 2, [stake]);

  async function submitAuth(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/auth/${authMode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? "Nao foi possivel autenticar");
      }

      const payload = await response.json();
      saveSession(payload.access_token, payload.user.email, payload.user.role);
      await loadWallet(payload.access_token);
      if (payload.user.role === "ADMIN") {
        await loadAdminOverview(payload.access_token, true);
      }
      await loadRoundHistory(payload.access_token);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Erro inesperado ao autenticar",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function loadWallet(authToken = token) {
    if (!authToken) return;

    setError(null);

    const response = await fetch(`${API_URL}/wallet`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearSession();
      }

      throw new Error("Nao foi possivel carregar a carteira");
    }

    setWallet(await response.json());
  }

  async function loadAdminOverview(authToken = token, hasAdminAccess = isAdmin) {
    if (!authToken || !hasAdminAccess) return;

    const response = await fetch(`${API_URL}/admin/overview`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearSession();
      }

      if (response.status === 403) {
        setAdminOverview(null);
        return;
      }

      throw new Error("Nao foi possivel carregar o painel admin");
    }

    setAdminOverview(await response.json());
  }

  async function loadRoundHistory(authToken = token) {
    if (!authToken) return;

    const response = await fetch(`${API_URL}/games/night-dice/history`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearSession();
      }

      throw new Error("Nao foi possivel carregar o historico de partidas");
    }

    setRoundHistory(await response.json());
  }

  async function playRound() {
    if (!canPlay || !token) return;

    setIsPlaying(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/games/night-dice/play`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ stake, choice }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? "Nao foi possivel jogar a rodada");
      }

      const result: RoundResult = await response.json();

      setLastResult(result);
      await loadWallet();
      if (isAdmin) {
        await loadAdminOverview();
      }
      await loadRoundHistory();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Erro inesperado ao jogar a rodada",
      );
    } finally {
      setIsPlaying(false);
    }
  }

  function saveSession(accessToken: string, emailAddress: string, role: UserRole) {
    setToken(accessToken);
    setUserEmail(emailAddress);
    setUserRole(role);
    window.localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ token: accessToken, email: emailAddress, role }),
    );
  }

  function clearSession() {
    setToken(null);
    setUserEmail(null);
    setUserRole(null);
    setWallet(null);
    setAdminOverview(null);
    setRoundHistory([]);
    setLastResult(null);
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  }

  useEffect(() => {
    const storedSession = window.localStorage.getItem(SESSION_STORAGE_KEY);

    if (!storedSession) {
      setIsLoading(false);
      return;
    }

    try {
      const parsedSession = JSON.parse(storedSession);
      setToken(parsedSession.token);
      setUserEmail(parsedSession.email);
      setUserRole(parsedSession.role);
      void Promise.all([
        loadWallet(parsedSession.token),
        parsedSession.role === "ADMIN"
          ? loadAdminOverview(parsedSession.token, true)
          : Promise.resolve(),
        loadRoundHistory(parsedSession.token),
      ]).finally(() => setIsLoading(false));
    } catch {
      clearSession();
      setIsLoading(false);
    }
  }, []);

  return (
    <main className="min-h-screen bg-[#111315] text-[#f6f1e7]">
      <section className="border-b border-[#2d3135] bg-[#171a1d]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e8bc5c]">
              Creditos virtuais
            </p>
            <h1 className="text-2xl font-bold">777 Night</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-md border border-[#3b4248] bg-[#20252a] px-4 py-2 text-right">
              <p className="text-xs text-[#9fa7af]">
                {userEmail ? `${userEmail} (${userRole})` : "Sem sessao"}
              </p>
              <p className="text-xl font-semibold">
                {isLoading ? "..." : balance.toLocaleString("pt-BR")} VC
              </p>
            </div>
            {token && (
              <button
                className="h-11 rounded-md border border-[#3b4248] px-3 text-sm font-semibold text-[#c8ced5] hover:border-[#e8bc5c]"
                onClick={clearSession}
                type="button"
              >
                Sair
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-6xl gap-5 px-5 py-6 lg:grid-cols-[1.3fr_0.7fr]">
        {!token && (
          <section className="rounded-lg border border-[#2d3135] bg-[#181c20] p-5 lg:col-span-2">
            <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-sm text-[#9fa7af]">Conta do jogador</p>
                <h2 className="mt-1 text-3xl font-bold">
                  {authMode === "login" ? "Entrar" : "Criar conta"}
                </h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-[#c8ced5]">
                  Cada conta recebe uma carteira propria com 1000 VC iniciais para jogar em
                  ambiente virtual.
                </p>
              </div>

              <form className="space-y-4" onSubmit={submitAuth}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    className={`h-11 rounded-md border text-sm font-bold ${
                      authMode === "login"
                        ? "border-[#e8bc5c] bg-[#e8bc5c] text-[#17130b]"
                        : "border-[#3b4248] bg-[#20252a] text-[#c8ced5]"
                    }`}
                    onClick={() => setAuthMode("login")}
                    type="button"
                  >
                    Entrar
                  </button>
                  <button
                    className={`h-11 rounded-md border text-sm font-bold ${
                      authMode === "register"
                        ? "border-[#e8bc5c] bg-[#e8bc5c] text-[#17130b]"
                        : "border-[#3b4248] bg-[#20252a] text-[#c8ced5]"
                    }`}
                    onClick={() => setAuthMode("register")}
                    type="button"
                  >
                    Criar conta
                  </button>
                </div>

                <label className="block text-sm font-medium text-[#c8ced5]" htmlFor="email">
                  Email
                  <input
                    id="email"
                    className="mt-2 h-12 w-full rounded-md border border-[#3b4248] bg-[#111315] px-3 text-base font-semibold outline-none"
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    value={email}
                  />
                </label>

                <label className="block text-sm font-medium text-[#c8ced5]" htmlFor="password">
                  Senha
                  <input
                    id="password"
                    className="mt-2 h-12 w-full rounded-md border border-[#3b4248] bg-[#111315] px-3 text-base font-semibold outline-none"
                    minLength={6}
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    value={password}
                  />
                </label>

                <button
                  className="h-12 w-full rounded-md bg-[#e8bc5c] px-5 font-bold text-[#17130b] transition hover:bg-[#f0cb74] disabled:cursor-not-allowed disabled:bg-[#575c61] disabled:text-[#c8ced5]"
                  disabled={isLoading}
                  type="submit"
                >
                  {isLoading ? "Aguarde..." : authMode === "login" ? "Entrar" : "Criar conta"}
                </button>
              </form>
            </div>
          </section>
        )}

        <section className="rounded-lg border border-[#2d3135] bg-[#181c20] p-5">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-[#9fa7af]">Jogo MVP via API</p>
              <h2 className="text-3xl font-bold">Night Dice</h2>
            </div>
            <span className="rounded-md bg-[#245a3b] px-3 py-1 text-sm font-semibold text-[#bdf4d4]">
              Servidor
            </span>
          </div>

          {error && (
            <div className="mb-5 rounded-md border border-[#7a3028] bg-[#2c1714] p-3 text-sm text-[#ffb2a8]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>{error}</span>
                <button
                  className="rounded-md bg-[#ffb2a8] px-3 py-1 font-semibold text-[#2c1714]"
                  onClick={() => void submitAuth()}
                  type="button"
                >
                  Tentar de novo
                </button>
              </div>
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-lg border border-[#30363b] bg-[#20252a] p-4">
              <label className="text-sm font-medium text-[#c8ced5]" htmlFor="stake">
                Aposta
              </label>
              <div className="mt-3 flex h-12 items-center rounded-md border border-[#3b4248] bg-[#111315] px-3">
                <input
                  id="stake"
                  className="w-full bg-transparent text-lg font-semibold outline-none"
                  min={1}
                  max={balance}
                  type="number"
                  value={stake}
                  onChange={(event) => setStake(Number(event.target.value))}
                />
                <span className="text-sm text-[#9fa7af]">VC</span>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {[10, 25, 50, 100].map((value) => (
                  <button
                    className="h-10 rounded-md border border-[#3b4248] bg-[#252b30] text-sm font-semibold hover:border-[#e8bc5c]"
                    key={value}
                    onClick={() => setStake(value)}
                    type="button"
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-[#30363b] bg-[#20252a] p-4">
              <label className="text-sm font-medium text-[#c8ced5]" htmlFor="choice">
                Numero escolhido
              </label>
              <select
                id="choice"
                className="mt-3 h-12 w-full rounded-md border border-[#3b4248] bg-[#111315] px-3 text-lg font-semibold outline-none"
                value={choice}
                onChange={(event) => setChoice(Number(event.target.value))}
              >
                {Array.from({ length: 10 }, (_, index) => index + 1).map((number) => (
                  <option key={number} value={number}>
                    {number}
                  </option>
                ))}
              </select>
              <div className="mt-3 rounded-md bg-[#111315] p-3 text-sm text-[#c8ced5]">
                Retorno possivel:{" "}
                <strong className="text-[#e8bc5c]">
                  {potentialReturn.toLocaleString("pt-BR")} VC
                </strong>
              </div>
            </div>
          </div>

          <button
            className="mt-5 h-12 w-full rounded-md bg-[#e8bc5c] px-5 font-bold text-[#17130b] transition hover:bg-[#f0cb74] disabled:cursor-not-allowed disabled:bg-[#575c61] disabled:text-[#c8ced5]"
            disabled={!canPlay}
            onClick={playRound}
            type="button"
          >
            {isPlaying ? "Processando..." : token ? "Jogar rodada" : "Entre para jogar"}
          </button>

          {lastResult && (
            <div className="mt-5 rounded-lg border border-[#30363b] bg-[#111315] p-4">
              <p className="text-sm text-[#9fa7af]">Resultado</p>
              <p className="mt-1 text-xl font-semibold">
                Saiu {lastResult.drawn}.{" "}
                <span className={lastResult.won ? "text-[#78df9d]" : "text-[#ff8f82]"}>
                  {lastResult.won ? "Voce ganhou" : "Voce perdeu"}{" "}
                  {Math.abs(lastResult.delta).toLocaleString("pt-BR")} VC
                </span>
              </p>
            </div>
          )}
        </section>

        <aside className="space-y-5">
          {isAdmin && adminOverview && (
            <section className="rounded-lg border border-[#2d3135] bg-[#181c20] p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold">Admin</h2>
                <button
                  className="rounded-md border border-[#3b4248] px-3 py-1 text-xs font-semibold text-[#c8ced5] hover:border-[#e8bc5c]"
                  onClick={() => void loadAdminOverview()}
                  type="button"
                >
                  Atualizar
                </button>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-md bg-[#20252a] p-3">
                  <p className="text-xs text-[#9fa7af]">Users</p>
                  <p className="text-lg font-bold">{adminOverview.stats.users}</p>
                </div>
                <div className="rounded-md bg-[#20252a] p-3">
                  <p className="text-xs text-[#9fa7af]">Saldo</p>
                  <p className="text-lg font-bold">
                    {adminOverview.stats.totalBalance.toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="rounded-md bg-[#20252a] p-3">
                  <p className="text-xs text-[#9fa7af]">Tx</p>
                  <p className="text-lg font-bold">{adminOverview.stats.totalTransactions}</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {adminOverview.users.map((user) => (
                  <article
                    className="rounded-lg border border-[#30363b] bg-[#20252a] p-3"
                    key={user.id}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-semibold">{user.email}</p>
                      <span className="text-sm font-bold text-[#e8bc5c]">
                        {user.balance.toLocaleString("pt-BR")} VC
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#9fa7af]">
                      {user.transactions.length} transacoes recentes
                    </p>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-lg border border-[#2d3135] bg-[#181c20] p-5">
            <h2 className="text-lg font-bold">Lobby</h2>
            <div className="mt-4 space-y-3">
              {games.map((game) => (
                <article
                  className="rounded-lg border border-[#30363b] bg-[#20252a] p-4"
                  key={game.name}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold">{game.name}</h3>
                    <span className="rounded-md bg-[#2d3135] px-2 py-1 text-xs text-[#c8ced5]">
                      {game.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[#9fa7af]">Multiplicador {game.multiplier}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-[#2d3135] bg-[#181c20] p-5">
            <h2 className="text-lg font-bold">Extrato</h2>
            <div className="mt-4 space-y-3">
              {(wallet?.transactions ?? []).map((transaction) => (
                <article
                  className="rounded-lg border border-[#30363b] bg-[#20252a] p-3"
                  key={transaction.id}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{transaction.description}</p>
                    <span
                      className={
                        transaction.amount >= 0
                          ? "text-sm font-bold text-[#78df9d]"
                          : "text-sm font-bold text-[#ff8f82]"
                      }
                    >
                      {transaction.amount >= 0 ? "+" : ""}
                      {transaction.amount.toLocaleString("pt-BR")} VC
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#9fa7af]">
                    Saldo: {transaction.balanceAfter.toLocaleString("pt-BR")} VC
                  </p>
                </article>
              ))}
            </div>
          </section>

          {token && (
            <section className="rounded-lg border border-[#2d3135] bg-[#181c20] p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold">Historico</h2>
                <button
                  className="rounded-md border border-[#3b4248] px-3 py-1 text-xs font-semibold text-[#c8ced5] hover:border-[#e8bc5c]"
                  onClick={() => void loadRoundHistory()}
                  type="button"
                >
                  Atualizar
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {roundHistory.length === 0 && (
                  <p className="text-sm text-[#9fa7af]">Nenhuma rodada registrada.</p>
                )}

                {roundHistory.map((round) => (
                  <article
                    className="rounded-lg border border-[#30363b] bg-[#20252a] p-3"
                    key={round.id}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">
                        Escolha {round.choice}, saiu {round.drawn}
                      </p>
                      <span
                        className={
                          round.won
                            ? "text-sm font-bold text-[#78df9d]"
                            : "text-sm font-bold text-[#ff8f82]"
                        }
                      >
                        {round.delta >= 0 ? "+" : ""}
                        {round.delta.toLocaleString("pt-BR")} VC
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#9fa7af]">
                      Aposta {round.stake.toLocaleString("pt-BR")} VC
                    </p>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-lg border border-[#4a3520] bg-[#211b14] p-5">
            <h2 className="text-lg font-bold text-[#f0cb74]">Ambiente demo</h2>
            <p className="mt-2 text-sm leading-6 text-[#d8c8ad]">
              Esta tela usa apenas creditos virtuais e nao processa dinheiro real.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
