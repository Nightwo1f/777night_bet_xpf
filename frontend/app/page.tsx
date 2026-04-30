"use client";

import { useEffect, useMemo, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

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

type RoundResult = {
  drawn: number;
  won: boolean;
  delta: number;
  balance: number;
};

export default function Home() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [stake, setStake] = useState(25);
  const [choice, setChoice] = useState(7);
  const [lastResult, setLastResult] = useState<RoundResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const balance = wallet?.balance ?? 0;
  const canPlay = !isLoading && !isPlaying && stake > 0 && stake <= balance;
  const potentialReturn = useMemo(() => stake * 2, [stake]);

  async function loadWallet() {
    setError(null);

    try {
      const response = await fetch(`${API_URL}/wallet`);

      if (!response.ok) {
        throw new Error("Nao foi possivel carregar a carteira");
      }

      setWallet(await response.json());
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Erro inesperado ao carregar a carteira",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function playRound() {
    if (!canPlay) return;

    setIsPlaying(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/games/night-dice/play`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stake, choice }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? "Nao foi possivel jogar a rodada");
      }

      const result: RoundResult = await response.json();

      setLastResult(result);
      await loadWallet();
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

  useEffect(() => {
    void loadWallet();
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
          <div className="rounded-md border border-[#3b4248] bg-[#20252a] px-4 py-2 text-right">
            <p className="text-xs text-[#9fa7af]">Saldo</p>
            <p className="text-xl font-semibold">
              {isLoading ? "..." : balance.toLocaleString("pt-BR")} VC
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-6xl gap-5 px-5 py-6 lg:grid-cols-[1.3fr_0.7fr]">
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
              {error}
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
            {isPlaying ? "Processando..." : "Jogar rodada"}
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
