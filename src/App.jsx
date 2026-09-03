
import React, { useState, useEffect, useRef } from "react";
import {
  initDerivSocket,
  addMessageListener,
  authorizeToken,
  subscribeTicks,
  unsubscribeTicks,
  buyContract,
  isLiveConfigured,
  setToken,
  getToken,
  DERIV_APP_ID,
} from "./lib/derivApi";
import {
  TrendingUp,
  Activity,
  Zap,
  Play,
  Square,
  BarChart2,
  DollarSign,
  ShieldAlert,
  HelpCircle,
  RefreshCw,
  LogOut,
  ExternalLink,
  ChevronRight,
  TrendingDown,
  Lock,
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState("trading");
  const [symbol, setSymbol] = useState("R_100");
  const [stake, setStake] = useState(10);
  const [strategy, setStrategy] = useState("EVEN_ODD");
  const [isRunning, setIsRunning] = useState(false);
  
  const [ticks, setTicks] = useState([]);
  const [stats, setStats] = useState({ total: 0, wins: 0, losses: 0, profit: 0 });
  const [logs, setLogs] = useState([]);
  
  const [tokenInput, setTokenInput] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    initDerivSocket();
    
    const savedToken = getToken();
    if (savedToken) {
      authorizeToken(savedToken);
    }

    const removeListener = addMessageListener((data) => {
      if (data.msg_type === "authorize") {
        if (data.error) {
          addLog(`Auth Error: ${data.error.message}`, "error");
          setIsAuthorized(false);
        } else {
          setIsAuthorized(true);
          setBalance(data.authorize.balance);
          addLog(`Authorized as ${data.authorize.email}`, "success");
          subscribeTicks(symbol);
        }
      }

      if (data.msg_type === "tick") {
        const tick = data.tick;
        if (tick.symbol === symbol) {
          const quote = tick.quote;
          const lastDigit = parseInt(quote.toString().slice(-1));
          setTicks((prev) => [...prev.slice(-49), { quote, lastDigit, time: tick.epoch }]);
        }
      }

      if (data.msg_type === "buy") {
        if (data.error) {
          addLog(`Purchase Failed: ${data.error.message}`, "error");
        } else {
          addLog(`Trade Placed! Contract ID: ${data.buy.contract_id}`, "success");
        }
      }
    });

    return () => {
      removeListener();
    };
  }, [symbol]);

  const addLog = (msg, type = "info") => {
    setLogs((prev) => [{ id: Date.now(), msg, type, time: new Date().toLocaleTimeString() }, ...prev]);
  };

  const handleConnect = (e) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    authorizeToken(tokenInput.trim());
  };

  const handleDisconnect = () => {
    setToken(null);
    setIsAuthorized(false);
    setBalance(null);
    addLog("Disconnected from Deriv", "info");
  };

  const toggleBot = () => {
    if (!isRunning) {
      setIsRunning(true);
      addLog(`Started KRISHWAVE Engine on ${symbol}`, "info");
    } else {
      setIsRunning(false);
      addLog("Stopped Trading Engine", "info");
    }
  };

  const handleManualTrade = (contractType) => {
    if (!isAuthorized) {
      addLog("Please connect your API token first", "error");
      return;
    }
    buyContract({
      contract_type: contractType,
      symbol: symbol,
      amount: parseFloat(stake),
      duration: 1,
      duration_unit: "t",
    });
    addLog(`Executing manual ${contractType} trade ($${stake})...`, "info");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white font-bold">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              KRISHWAVE
            </h1>
            <p className="text-xs text-slate-400">Deriv Algorithmic Execution</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {isAuthorized ? (
            <div className="flex items-center space-x-3 bg-slate-800/80 border border-slate-700 px-4 py-2 rounded-xl">
              <div className="text-right">
                <p className="text-xs text-slate-400">Balance</p>
                <p className="text-sm font-bold text-emerald-400">${balance ?? "---"}</p>
              </div>
              <button
                onClick={handleDisconnect}
                className="text-slate-400 hover:text-rose-400 transition"
                title="Disconnect"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <a
              href={`https://oauth.deriv.com/oauth2/authorize?app_id=${DERIV_APP_ID}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
            >
              <span>Login via Deriv</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Config & Control */}
        <div className="space-y-6">
          {/* Auth Card if not connected */}
          {!isAuthorized && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <h2 className="text-md font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-400" />
                API Token Setup
              </h2>
              <form onSubmit={handleConnect} className="space-y-3">
                <input
                  type="password"
                  placeholder="Paste Deriv API Token"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-2.5 rounded-xl transition"
                >
                  Connect API Token
                </button>
              </form>
            </div>
          )}

          {/* Execution Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h2 className="text-md font-semibold text-slate-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              Trading Engine Config
            </h2>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Asset Symbol</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="R_100">Volatility 100 Index</option>
                <option value="R_75">Volatility 75 Index</option>
                <option value="R_50">Volatility 50 Index</option>
                <option value="R_25">Volatility 25 Index</option>
                <option value="R_10">Volatility 10 Index</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Strategy Pattern</label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="EVEN_ODD">Even / Odd Strategy</option>
                <option value="MATCH_DIFF">Matches / Differs Strategy</option>
                <option value="OVER_UNDER">Over / Under Strategy</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Stake Amount ($)</label>
              <input
                type="number"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              onClick={toggleBot}
              className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg ${
                isRunning
                  ? "bg-rose-600 hover:bg-rose-500 text-white"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white"
              }`}
            >
              {isRunning ? (
                <>
                  <Square className="w-4 h-4 fill-current" /> Stop Automated Engine
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" /> Start Automated Engine
                </>
              )}
            </button>
          </div>

          {/* Quick Manual Trade Buttons */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h2 className="text-md font-semibold text-slate-200 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Manual Execution
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleManualTrade("DIGITEVEN")}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 py-2.5 rounded-xl text-sm font-semibold text-indigo-400 transition"
              >
                Trade EVEN
              </button>
              <button
                onClick={() => handleManualTrade("DIGITODD")}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 py-2.5 rounded-xl text-sm font-semibold text-cyan-400 transition"
              >
                Trade ODD
              </button>
            </div>
          </div>
        </div>

        {/* Center & Right Column: Ticks & Console */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tick Visualizer */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-md font-semibold text-slate-200 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-indigo-400" />
                Live Digit Feed ({symbol})
              </h2>
              <span className="text-xs text-slate-500">Last 50 Ticks</span>
            </div>

            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-slate-950 rounded-xl border border-slate-800/80">
              {ticks.length === 0 ? (
                <p className="text-xs text-slate-500 p-2">Awaiting WebSocket stream...</p>
              ) : (
                ticks.map((t, index) => (
                  <div
                    key={index}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-all ${
                      t.lastDigit % 2 === 0
                        ? "bg-indigo-950 border border-indigo-700/50 text-indigo-300"
                        : "bg-cyan-950 border border-cyan-700/50 text-cyan-300"
                    }`}
                  >
                    {t.lastDigit}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Activity Logs */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h2 className="text-md font-semibold text-slate-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              Console Logs
            </h2>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 h-64 overflow-y-auto font-mono text-xs space-y-2">
              {logs.length === 0 ? (
                <p className="text-slate-600">Console ready...</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2">
                    <span className="text-slate-600">[{log.time}]</span>
                    <span
                      className={
                        log.type === "error"
                          ? "text-rose-400"
                          : log.type === "success"
                          ? "text-emerald-400"
                          : "text-slate-300"
                      }
                    >
                      {log.msg}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
    }
                
