import { useEffect, useRef, useState } from "react";
import "./App.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

type BirdId = "golden" | "blue" | "pink" | "purple";
type WorldId = "fantasy" | "sunset" | "forest" | "ocean";
type Screen =
  | "welcome"
  | "login"
  | "register"
  | "dashboard"
  | "customize"
  | "levels"
  | "game";

type Player = {
  username: string;
  password: string;
  totalScore: number;
  bestScore: number;
  totalGems: number;
  unlockedLevel: number;
  completedLevels: number[];
  gamesPlayed: number;
  unlockedSkins: string[];
  unlockedPowers: string[];
  selectedSkin: string;
  selectedPower: string;
  lastDailyClaim?: string;
  achievements?: string[];
  totalObstaclesPassed?: number;
};

type Obstacle = {
  x: number;
  gapY: number;
  passed: boolean;
};

type Gem = {
  x: number;
  y: number;
  collected: boolean;
};

const STORAGE_KEY = "flyingBirdPlayers";
const SOUND_KEY = "flyingBirdSoundEnabled";
const MISSION_CLAIMS_KEY = "flyingBirdDailyMissionClaims";

const WIDTH = 1000;
const HEIGHT = 560;

const REVIVE_COST = 5;
const REVIVE_SECONDS = 5;
const PROTECTION_FRAMES = 120;

const birds: {
  id: BirdId;
  name: string;
  emoji: string;
  color: string;
}[] = [
  {
    id: "golden",
    name: "Golden Phoenix",
    emoji: "🐤",
    color: "#facc15",
  },
  {
    id: "blue",
    name: "Sky Bird",
    emoji: "🐦",
    color: "#38bdf8",
  },
  {
    id: "pink",
    name: "Love Bird",
    emoji: "🐧",
    color: "#fb7185",
  },
  {
    id: "purple",
    name: "Magic Bird",
    emoji: "🦜",
    color: "#c084fc",
  },
];

const worlds: {
  id: WorldId;
  name: string;
  background: string;
}[] = [
  {
    id: "fantasy",
    name: "Fantasy Kingdom",
    background:
      "linear-gradient(135deg,#51316f,#e879a9,#ffd18a)",
  },
  {
    id: "sunset",
    name: "Sunset Valley",
    background:
      "linear-gradient(135deg,#7c2d12,#fb923c,#fde68a)",
  },
  {
    id: "forest",
    name: "Enchanted Forest",
    background:
      "linear-gradient(135deg,#052e16,#15803d,#bef264)",
  },
  {
    id: "ocean",
    name: "Ocean Adventure",
    background:
      "linear-gradient(135deg,#082f49,#0284c7,#a5f3fc)",
  },
];

const skins = [
  {
    id: "default",
    name: "Classic",
    emoji: "🐤",
    cost: 0,
  },
  {
    id: "fire",
    name: "Fire Bird",
    emoji: "🔥",
    cost: 100,
  },
  {
    id: "rainbow",
    name: "Rainbow",
    emoji: "🌈",
    cost: 250,
  },
  {
    id: "dragon",
    name: "Dragon Bird",
    emoji: "🐉",
    cost: 500,
  },
  {
    id: "diamond",
    name: "Diamond Bird",
    emoji: "💎",
    cost: 1000,
  },
];

const powers = [
  {
    id: "none",
    name: "No power",
    description: "Fly normally",
    cost: 0,
  },
  {
    id: "shield",
    name: "Shield",
    description: "Protects you from one obstacle hit",
    cost: 150,
  },
  {
    id: "slow",
    name: "Slow Motion",
    description: "Slows obstacles for 8 seconds",
    cost: 250,
  },
  {
    id: "magnet",
    name: "Gem Magnet",
    description: "Pulls nearby gems toward you for 10 seconds",
    cost: 350,
  },
  {
    id: "double",
    name: "Double Gems",
    description: "Earn 2 gems per pickup for 12 seconds",
    cost: 450,
  },
];

function readPlayers(): Record<string, Player> {
  try {
    return JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "{}"
    );
  } catch {
    return {};
  }
}

function savePlayer(player: Player) {
  const players = readPlayers();

  players[player.username.toLowerCase()] = player;

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(players)
  );
}

function makePlayer(
  username: string,
  password: string
): Player {
  return {
    username,
    password,
    totalScore: 0,
    bestScore: 0,
    totalGems: 0,
    unlockedLevel: 1,
    completedLevels: [],
    gamesPlayed: 0,
    unlockedSkins: ["default"],
    unlockedPowers: ["none"],
    selectedSkin: "default",
    selectedPower: "none",
    lastDailyClaim: "",
    achievements: [],
    totalObstaclesPassed: 0,
  };
}


type ApiLeaderboardPlayer = {
  rank: number;
  player_id: number;
  username: string;
  best_score: number;
  highest_level: number;
};

function ApiLeaderboard() {
  const [leaderboardPlayers, setLeaderboardPlayers] = useState<ApiLeaderboardPlayer[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardRefreshing, setLeaderboardRefreshing] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState("");

  async function loadLeaderboard(manual = false) {
    if (manual) setLeaderboardRefreshing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/leaderboard/`);
      if (!response.ok) throw new Error("Could not load leaderboard");
      const data = await response.json();
      setLeaderboardPlayers(Array.isArray(data.leaderboard) ? data.leaderboard : []);
      setLeaderboardError("");
    } catch {
      setLeaderboardError("Leaderboard is unavailable. Make sure the FastAPI backend is running.");
    } finally {
      setLeaderboardLoading(false);
      setLeaderboardRefreshing(false);
    }
  }

  useEffect(() => {
    void loadLeaderboard();
    const interval = window.setInterval(() => void loadLeaderboard(), 30000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="api-leaderboard-card">
      <div className="api-leaderboard-heading">
        <div>
          <p className="eyebrow">GLOBAL RANKINGS</p>
          <h2>🏆 Leaderboard</h2>
        </div>
        <div className="leaderboard-actions">
          <span className="leaderboard-top-badge">TOP 10</span>
          <button
            type="button"
            className="leaderboard-refresh-button"
            onClick={() => void loadLeaderboard(true)}
            disabled={leaderboardRefreshing}
            aria-label="Refresh leaderboard"
          >
            {leaderboardRefreshing ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>
      </div>

      {leaderboardLoading && <p className="leaderboard-message">Loading leaderboard...</p>}
      {!leaderboardLoading && leaderboardError && (
        <p className="leaderboard-message leaderboard-error">{leaderboardError}</p>
      )}
      {!leaderboardLoading && !leaderboardError && leaderboardPlayers.length === 0 && (
        <p className="leaderboard-message">No scores yet. Play a game to become the first champion!</p>
      )}

      {!leaderboardLoading && !leaderboardError && leaderboardPlayers.length > 0 && (
        <div className="api-leaderboard-list">
          {leaderboardPlayers.map((item) => (
            <div className="api-leaderboard-row" key={item.player_id}>
              <span className={`api-leaderboard-rank rank-${item.rank}`}>
                {item.rank <= 3 ? ["🥇", "🥈", "🥉"][item.rank - 1] : `#${item.rank}`}
              </span>
              <div className="api-leaderboard-player">
                <strong>{item.username}</strong>
                <small>Level {item.highest_level}</small>
              </div>
              <strong className="api-leaderboard-score">{item.best_score.toLocaleString()}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}


type BackendScoreItem = {
  id?: number;
  score: number;
  level: number;
  gems_collected: number;
  obstacles_passed: number;
  created_at?: string;
};

function BackendPlayerStats() {
  const [best, setBest] = useState<{ best_score?: number; highest_level?: number } | null>(null);
  const [history, setHistory] = useState<BackendScoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("flyingBirdToken");
    if (!token) { setLoading(false); setError("Log in to view online stats."); return; }
    let cancelled = false;
    const headers = { Authorization: `Bearer ${token}` };
    async function load() {
      setLoading(true);
      try {
        const [bestRes, historyRes] = await Promise.all([
          fetch(`${API_BASE_URL}/scores/my-best`, { headers }),
          fetch(`${API_BASE_URL}/scores/my-scores`, { headers }),
        ]);
        if (!bestRes.ok || !historyRes.ok) throw new Error("Could not load your online stats.");
        const bestData = await bestRes.json();
        const historyData = await historyRes.json();
        if (cancelled) return;
        setBest(bestData);
        const rows = Array.isArray(historyData) ? historyData :
          Array.isArray(historyData.scores) ? historyData.scores :
          Array.isArray(historyData.history) ? historyData.history : [];
        setHistory(rows.slice(0, 5));
        setError("");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unable to load online stats.");
      } finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  return (
    <section className="section-card backend-player-stats">
      <div className="api-leaderboard-heading">
        <div><p className="eyebrow">ACCOUNT OVERVIEW</p><h2>📊 Online Player Stats</h2></div>
        <button className="leaderboard-refresh-button" type="button" onClick={() => setRefreshKey(k => k + 1)} disabled={loading}>
          {loading ? "Loading..." : "↻ Refresh"}
        </button>
      </div>
      {loading && <p className="muted">Loading stats from your account...</p>}
      {!loading && error && <p className="leaderboard-message leaderboard-error">{error}</p>}
      {!loading && !error && <>
        <div className="stats-grid">
          <StatCard icon="🏆" label="Online best score" value={best?.best_score ?? 0} />
          <StatCard icon="🪜" label="Highest online level" value={best?.highest_level ?? 1} />
          <StatCard icon="🎮" label="Saved game runs" value={history.length} />
        </div>
        <h3>Recent online runs</h3>
        {history.length === 0 ? <p className="muted">No online game runs saved yet.</p> :
          <div className="api-leaderboard-list">
            {history.map((item, index) => <div className="api-leaderboard-row" key={item.id ?? `${item.created_at ?? "run"}-${index}`}>
              <div className="api-leaderboard-player"><strong>Score {item.score.toLocaleString()}</strong><small>Level {item.level} · 💎 {item.gems_collected} · Obstacles {item.obstacles_passed}</small></div>
              <small>{item.created_at ? new Date(item.created_at).toLocaleDateString() : `Run ${index + 1}`}</small>
            </div>)}
          </div>}
      </>}
    </section>
  );
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const [screen, setScreen] = useState<Screen>("welcome");

  const [player, setPlayer] =
    useState<Player | null>(null);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessToken, setAccessToken] = useState(localStorage.getItem("flyingBirdToken") || "");
  const [authError, setAuthError] = useState("");

  const [birdChoice, setBirdChoice] =
    useState<BirdId>("golden");

  const [worldChoice, setWorldChoice] =
    useState<WorldId>("fantasy");

  const [selectedLevel, setSelectedLevel] =
    useState(1);

  const [screenSize, setScreenSize] = useState<
    "normal" | "wide" | "full"
  >("wide");

  const [score, setScore] = useState(0);
  const [runGems, setRunGems] = useState(0);

  const [gameOver, setGameOver] = useState(false);
  const [levelComplete, setLevelComplete] =
    useState(false);

  const [reviving, setReviving] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [gameSession, setGameSession] = useState(0);
  const [gamePaused, setGamePaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem(SOUND_KEY) !== "false");
  const gamePausedRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);

  const [message, setMessage] = useState("");

  // Restore the signed-in session when the page is refreshed.
  useEffect(() => {
  const storedToken = localStorage.getItem("flyingBirdToken");

  if (!storedToken) {
    return;
  }

  const token: string = storedToken;

  let cancelled = false;

  async function restoreSession() {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        localStorage.removeItem("flyingBirdToken");

        if (!cancelled) {
          setAccessToken("");
        }

        return;
      }

      const data = await response.json();

      if (cancelled || !data?.username) {
        return;
      }

      const existingPlayers = readPlayers();
      const oldPlayer =
        existingPlayers[data.username.toLowerCase()];

      const restoredPlayer: Player = {
        ...makePlayer(data.username, ""),
        ...oldPlayer,
        username: data.username,
        password: "",
        totalGems:
          data.total_gems ??
          oldPlayer?.totalGems ??
          0,
      };

      setPlayer(restoredPlayer);
      setAccessToken(token);
      setScreen("dashboard");
    } catch (error) {
      console.error(
        "Could not restore login session:",
        error
      );
    }
  }

  void restoreSession();

  return () => {
    cancelled = true;
  };
}, []);

  const [powerActive, setPowerActive] = useState(false);
  const [powerSeconds, setPowerSeconds] = useState(0);
  const [powerNotice, setPowerNotice] = useState("");
  const powerControlRef = useRef({ active: false, frames: 0, type: "none" as string });

  const gameRef = useRef({
    running: false,
    dead: false,
    shieldUsed: false,
    score: 0,
    gems: 0,
    protection: 0,
  });

  function playSound(kind: "jump" | "gem" | "hit" | "complete" | "click") {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioRef.current) audioRef.current = new AudioCtx();
      const audio = audioRef.current;
      if (audio.state === "suspended") void audio.resume();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const tones: Record<string, [number, number]> = {
        jump: [520, 0.06],
        gem: [880, 0.08],
        hit: [150, 0.16],
        complete: [1040, 0.2],
        click: [420, 0.04],
      };
      const [frequency, duration] = tones[kind];
      oscillator.type = kind === "hit" ? "sawtooth" : "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, audio.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + duration + 0.02);
    } catch {
      // Sound is optional; gameplay must continue if audio is unavailable.
    }
  }

  function toggleSound() {
    setSoundEnabled((enabled) => {
      const next = !enabled;
      localStorage.setItem(SOUND_KEY, String(next));
      return next;
    });
    playSound("click");
  }

  function togglePause() {
    if (screen !== "game" || gameOver || levelComplete || reviving || countdown > 0) return;
    const next = !gamePausedRef.current;
    gamePausedRef.current = next;
    setGamePaused(next);
    if (next) {
      gameRef.current.running = false;
      setPowerNotice("Game paused");
    } else {
      gameRef.current.running = true;
      setPowerNotice("");
      playSound("click");
    }
  }

  function getMissionClaims(): Record<string, string[]> {
    try {
      return JSON.parse(localStorage.getItem(MISSION_CLAIMS_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function isMissionClaimed(missionId: string) {
    if (!player) return false;
    const claims = getMissionClaims();
    const key = `${player.username.toLowerCase()}:${getLocalDateKey()}`;
    return Array.isArray(claims[key]) && claims[key].includes(missionId);
  }

  async function claimMission(missionId: string, reward: number, completed: boolean) {
    if (!player || !completed) return;
    if (isMissionClaimed(missionId)) {
      setMessage("You have already claimed this mission today.");
      return;
    }

    const token = localStorage.getItem("flyingBirdToken") || accessToken;
    if (!token) {
      setMessage("Please log in again to claim mission rewards.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/missions/${missionId}/claim`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Could not claim this mission.");

      const claims = getMissionClaims();
      const key = `${player.username.toLowerCase()}:${getLocalDateKey()}`;
      claims[key] = [...(claims[key] || []), missionId];
      localStorage.setItem(MISSION_CLAIMS_KEY, JSON.stringify(claims));

      const updated = { ...player, totalGems: typeof data.total_gems === "number" ? data.total_gems : player.totalGems + reward };
      setPlayer(updated);
      savePlayer(updated);
      setMessage(`Mission reward claimed: +${data.reward_gems ?? reward} gems!`);
      playSound("complete");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not claim this mission.");
    }
  }

  function updatePlayer(changes: Partial<Player>) {
    if (!player) return;

    const updated = {
      ...player,
      ...changes,
    };

    setPlayer(updated);
    savePlayer(updated);
  }

  function stopTimer() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function stopGameAnimation() {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  function logout() {
    stopTimer();
    stopGameAnimation();

    gameRef.current.running = false;
    gameRef.current.dead = true;
    gamePausedRef.current = false;
    setGamePaused(false);

    setPlayer(null);
    localStorage.removeItem("flyingBirdToken");
    setAccessToken("");
    setEmail("");
    setUsername("");
    setPassword("");
    setAuthError("");
    setScreen("welcome");
  }

  // ---------------- AUTHENTICATION ----------------

  async function register() {
    const name = username.trim();
    if (name.length < 3) { setAuthError("Username must contain at least 3 characters."); return; }
    if (!email.trim()) { setAuthError("Please enter your email address."); return; }
    if (password.length < 8) { setAuthError("Password must contain at least 8 characters."); return; }
    try {
      setAuthError("");
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name, email: email.trim(), password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Registration failed.");
      setEmail(""); setUsername(""); setPassword("");
      setAuthError("");
      alert("Account created successfully! Please log in.");
      setScreen("login");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Could not connect to the backend.");
    }
  }

  async function login() {
    try {
      setAuthError("");
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Invalid username or password.");
      if (!data.access_token || !data.player) throw new Error("Invalid response from server.");
      localStorage.setItem("flyingBirdToken", data.access_token);
      setAccessToken(data.access_token);
      const existingPlayers = readPlayers();
      const oldPlayer = existingPlayers[data.player.username.toLowerCase()];
      const newPlayer: Player = {
        ...makePlayer(data.player.username, ""),
        ...oldPlayer,
        username: data.player.username,
        password: "",
        totalGems: data.player.total_gems ?? 0,
      };
      setPlayer(newPlayer);
      setAuthError(""); setUsername(""); setPassword(""); setEmail("");
      setScreen("dashboard");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Could not connect to the backend.");
    }
  }

  // ---------------- LEVELS ----------------

  function startLevel(level: number) {
    if (!player || level > player.unlockedLevel) return;

    stopTimer();
    stopGameAnimation();

    setSelectedLevel(level);
    setScore(0);
    setRunGems(0);
    setGameOver(false);
    setLevelComplete(false);
    setReviving(false);
    gamePausedRef.current = false;
    setGamePaused(false);
    setPowerActive(false);
    setPowerSeconds(0);
    powerControlRef.current = { active: false, frames: 0, type: "none" };
    setMessage("");
    setCountdown(3);

    // A new session forces the canvas effect to rebuild every local game object,
    // including obstacles, gems, bird position, finish gate, and frame counters.
    gameRef.current = {
      running: false,
      dead: false,
      shieldUsed: false,
      score: 0,
      gems: 0,
      protection: 0,
    };

    setGameSession((session) => session + 1);
    setScreen("game");

    let remaining = 3;
    timerRef.current = window.setInterval(() => {
      remaining -= 1;
      setCountdown(Math.max(remaining, 0));

      if (remaining <= 0) {
        stopTimer();
        if (!gameRef.current.dead) {
          gameRef.current.running = true;
          setCountdown(0);
        }
      }
    }, 1000);
  }
    

  function goToLevels() {
    stopTimer();
    stopGameAnimation();

    gameRef.current.running = false;
    gameRef.current.dead = true;

    setScreen("levels");

    setGameOver(false);
    setLevelComplete(false);
    setReviving(false);
    setCountdown(0);
    gamePausedRef.current = false;
    setGamePaused(false);
    setPowerActive(false);
  }

  // ---------------- BACKEND SCORE + ACHIEVEMENTS ----------------

  async function saveScoreToBackend(finalScore: number, gems: number, level: number) {
    const token = localStorage.getItem("flyingBirdToken") || accessToken;
    if (!token) return;

    try {
      const scoreResponse = await fetch(`${API_BASE_URL}/scores/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          score: Math.max(0, finalScore),
          level: Math.max(1, level),
          gems_collected: Math.max(0, gems),
          obstacles_passed: Math.max(0, finalScore),
        }),
      });

      const scoreData = await scoreResponse.json().catch(() => ({}));
      if (!scoreResponse.ok) {
        console.error("Backend score save failed:", scoreData);
        setMessage("Game saved locally, but online score could not be saved. Please log in again.");
        return;
      }

      const achievementResponse = await fetch(`${API_BASE_URL}/achievements/check`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const achievementData = await achievementResponse.json().catch(() => ({}));

      if (achievementResponse.ok) {
        if (typeof achievementData.total_gems === "number") {
          setPlayer((current) => {
            if (!current) return current;
            const updated = { ...current, totalGems: achievementData.total_gems };
            savePlayer(updated);
            return updated;
          });
        }

        const unlocked = Array.isArray(achievementData.newly_unlocked)
          ? achievementData.newly_unlocked
          : [];
        if (unlocked.length > 0) {
          const names = unlocked
            .map((item: any) => item.name)
            .filter(Boolean)
            .join(", ");
          setMessage(names ? `Achievement unlocked: ${names}` : "New achievement unlocked!");
        }
      }
    } catch (error) {
      console.error("Unable to save score to backend:", error);
      setMessage("Game saved locally. Online score sync failed; check that the backend is running.");
    }
  }

  // ---------------- SAVE SCORE ----------------

  function saveRunProgress() {
    if (!player) return;

    const game = gameRef.current;

    const updated: Player = {
      ...player,
      totalScore:
        player.totalScore + game.score,

      bestScore: Math.max(
        player.bestScore,
        game.score
      ),

      totalGems:
        player.totalGems + game.gems,

      gamesPlayed:
        player.gamesPlayed + 1,
    };

    setPlayer(updated);
    savePlayer(updated);
    void saveScoreToBackend(game.score, game.gems, selectedLevel);
  }

  // ---------------- COMPLETE LEVEL ----------------

  function finishLevel() {
    const game = gameRef.current;
    playSound("complete");

    if (
      game.dead ||
      levelComplete ||
      !player
    ) {
      return;
    }

    game.running = false;
    game.dead = true;

    setLevelComplete(true);
    setGameOver(false);
    setReviving(false);

    const completed = Array.from(
      new Set([
        ...player.completedLevels,
        selectedLevel,
      ])
    );

    // Only unlock the next sequential level
    // after successfully completing this one.
    const unlocked = Math.min(
      50,
      Math.max(
        player.unlockedLevel,
        selectedLevel + 1
      )
    );

    const updated: Player = {
      ...player,

      totalScore:
        player.totalScore + game.score + (selectedLevel % 10 === 0 ? 100 : 0),

      bestScore: Math.max(
        player.bestScore,
        game.score
      ),

      totalGems:
        player.totalGems + game.gems,

      unlockedLevel: unlocked,

      completedLevels: completed,

      gamesPlayed:
        player.gamesPlayed + 1,
    };

    setPlayer(updated);
    savePlayer(updated);
    void saveScoreToBackend(
      game.score + (selectedLevel % 10 === 0 ? 100 : 0),
      game.gems,
      selectedLevel
    );

    setMessage(
      selectedLevel === 50
        ? "Congratulations! You completed all 50 levels!"
        : `Level ${selectedLevel} completed! Level ${selectedLevel + 1} is now unlocked.`
    );
  }

  // ---------------- GAME OVER ----------------

  function endGame() {
    const game = gameRef.current;

    if (game.dead) return;

    game.running = false;
    game.dead = true;
    gamePausedRef.current = false;
    setGamePaused(false);
    playSound("hit");

    setGameOver(true);
    setLevelComplete(false);

    saveRunProgress();
  }

  // ---------------- REVIVE ----------------

  function revive() {
    const game = gameRef.current;

    if (
      !player ||
      !game.dead ||
      player.totalGems < REVIVE_COST ||
      reviving
    ) {
      return;
    }

    // Gems are spent only for reviving.
    const updated: Player = {
      ...player,
      totalGems:
        player.totalGems - REVIVE_COST,
    };

    setPlayer(updated);
    savePlayer(updated);

    game.dead = false;
    game.running = false;
    gamePausedRef.current = false;
    setGamePaused(false);

    game.protection = PROTECTION_FRAMES;

    setGameOver(false);
    setReviving(true);
    setCountdown(REVIVE_SECONDS);

    let remaining = REVIVE_SECONDS;

    stopTimer();

    timerRef.current =
      window.setInterval(() => {
        remaining -= 1;

        setCountdown(remaining);

        if (remaining <= 0) {
          stopTimer();

          setReviving(false);

          game.dead = false;
          game.running = true;

          game.protection =
            PROTECTION_FRAMES;
        }
      }, 1000);
  }

  // Daily rewards are browser-local until a backend is connected.
  function getLocalDateKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function claimDailyReward() {
    if (!player) return;
    const today = getLocalDateKey();
    if (player.lastDailyClaim === today) {
      setMessage("You have already claimed today's reward.");
      return;
    }
    const updated: Player = { ...player, totalGems: player.totalGems + 10, lastDailyClaim: today };
    setPlayer(updated); savePlayer(updated);
    setMessage("Daily reward claimed: +10 gems!");
  }

  function activatePower() {
    if (!player || !player.selectedPower || player.selectedPower === "none") {
      setPowerNotice("Select or unlock a power-up in your dashboard first.");
      return;
    }
    const duration = player.selectedPower === "shield" ? 600 : player.selectedPower === "slow" ? 480 : player.selectedPower === "magnet" ? 600 : 720;
    powerControlRef.current = { active: true, frames: duration, type: player.selectedPower };
    setPowerActive(true);
    setPowerSeconds(Math.ceil(duration / 60));
    setPowerNotice(`${player.selectedPower === "double" ? "Double gems" : player.selectedPower} activated!`);
  }

  // ---------------- REWARDS ----------------

  function buySkin(
    skinId: string,
    cost: number
  ) {
    if (!player) return;

    if (
      player.unlockedSkins.includes(skinId)
    ) {
      updatePlayer({
        selectedSkin: skinId,
      });

      setMessage("Design selected!");
      return;
    }

    if (player.totalScore < cost) {
      setMessage(
        "You need more score points to unlock this design."
      );
      return;
    }

    const updated: Player = {
      ...player,

      totalScore:
        player.totalScore - cost,

      unlockedSkins: [
        ...player.unlockedSkins,
        skinId,
      ],

      selectedSkin: skinId,
    };

    setPlayer(updated);
    savePlayer(updated);

    setMessage(
      "New bird design unlocked!"
    );
  }

  function buyPower(
    powerId: string,
    cost: number
  ) {
    if (!player) return;

    if (
      player.unlockedPowers.includes(powerId)
    ) {
      updatePlayer({
        selectedPower: powerId,
      });

      setMessage("Power selected!");
      return;
    }

    if (player.totalScore < cost) {
      setMessage(
        "You need more score points to unlock this power."
      );
      return;
    }

    const updated: Player = {
      ...player,

      totalScore:
        player.totalScore - cost,

      unlockedPowers: [
        ...player.unlockedPowers,
        powerId,
      ],

      selectedPower: powerId,
    };

    setPlayer(updated);
    savePlayer(updated);

    setMessage(
      "New power unlocked!"
    );
  }

  // ---------------- CANVAS GAME ----------------

  useEffect(() => {
    if (screen !== "game") return;

    const canvas = canvasRef.current;

    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    const game = gameRef.current;

    // Each effect instance owns its animation loop and starts from a clean
    // local simulation state for the current gameSession.
    const bird =
      birds.find(
        (b) => b.id === birdChoice
      ) ?? birds[0];

    let birdY = H * 0.48;
    let velocity = 0;

    let frame = 0;
    let obstacleSpawn = 0;
    let gemSpawn = 0;

    let powerFrames = 0;

    const birdX = 230;
    const birdRadius = 20;

    const gravity = 0.24;
    const jump = -6;

    const obstacleWidth = 85;

    const difficulty =
      selectedLevel - 1;

    // Difficulty ramps gradually across 50 levels. The original acceleration
    // made later levels extremely fast and narrowed gaps too aggressively.
    const speed = Math.min(
      3.6 + difficulty * 0.075,
      7.25
    );

    const gap = Math.max(
      205,
      285 - difficulty * 1.25
    );

    // Keep the level objective meaningful while avoiding an abrupt jump in
    // required obstacles at higher levels.
    const targetScore = 8 + difficulty * 2;

    let obstacles: Obstacle[] = [
      {
        x: W + 420,
        gapY: H * 0.48,
        passed: false,
      },
    ];

    let gems: Gem[] = [];

    // FIXED: finishX is declared once and
    // moves left toward the bird every frame.
    let finishX = W + 100;

    let finishSpawned = false;

    const colors: Record<
      WorldId,
      string[]
    > = {
      fantasy: [
        "#51316f",
        "#e879a9",
        "#ffd18a",
      ],
      sunset: [
        "#7c2d12",
        "#fb923c",
        "#fde68a",
      ],
      forest: [
        "#052e16",
        "#15803d",
        "#bef264",
      ],
      ocean: [
        "#082f49",
        "#0284c7",
        "#a5f3fc",
      ],
    };

    function drawBackground() {
      const c = colors[worldChoice];
      const gradient = ctx!.createLinearGradient(0, 0, 0, H);
      gradient.addColorStop(0, c[0]);
      gradient.addColorStop(0.65, c[1]);
      gradient.addColorStop(1, c[2]);
      ctx!.fillStyle = gradient;
      ctx!.fillRect(0, 0, W, H);

      // Soft atmospheric glow that gently shifts as the scene scrolls.
      const glowX = W * (0.72 + Math.sin(frame * 0.008) * 0.035);
      const glowY = H * (0.2 + Math.cos(frame * 0.006) * 0.025);
      const glow = ctx!.createRadialGradient(glowX, glowY, 4, glowX, glowY, Math.min(W, H) * 0.28);
      glow.addColorStop(0, "rgba(255,255,220,0.28)");
      glow.addColorStop(1, "rgba(255,255,220,0)");
      ctx!.fillStyle = glow;
      ctx!.fillRect(0, 0, W, H);

      if (worldChoice === "fantasy") {
        // Twinkling stars and drifting magical sparkles.
        for (let i = 0; i < 34; i++) {
          const x = (i * 97 + Math.sin(frame * 0.012 + i) * 13) % W;
          const y = (i * 53) % (H * 0.68);
          const alpha = 0.28 + (Math.sin(frame * 0.07 + i * 2) + 1) * 0.28;
          ctx!.globalAlpha = alpha;
          ctx!.fillStyle = i % 4 === 0 ? "#fff1a8" : "#ffffff";
          ctx!.beginPath();
          ctx!.arc(x, y, i % 5 === 0 ? 2.2 : 1.2, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.globalAlpha = 1;
      }

      // Sun / moon shifts slightly for a living sky.
      ctx!.save();
      ctx!.globalAlpha = 0.72;
      ctx!.fillStyle = worldChoice === "ocean" ? "#e0f2fe" : "#fff7ad";
      ctx!.beginPath();
      ctx!.arc(glowX, glowY, Math.max(24, Math.min(W, H) * 0.055), 0, Math.PI * 2);
      ctx!.fill();
      ctx!.restore();

      // Clouds drift at different speeds to create a parallax effect.
      for (let i = 0; i < 5; i++) {
        const cloudW = Math.max(46, W * 0.09);
        const cloudX = ((i * (W / 4) - frame * (0.35 + i * 0.07)) % (W + cloudW * 2) + W + cloudW * 2) % (W + cloudW * 2) - cloudW;
        const cloudY = H * (0.13 + (i % 3) * 0.12);
        ctx!.save();
        ctx!.globalAlpha = worldChoice === "forest" ? 0.22 : 0.34;
        ctx!.fillStyle = worldChoice === "ocean" ? "#e0f2fe" : "#ffffff";
        ctx!.beginPath();
        ctx!.ellipse(cloudX, cloudY, cloudW * 0.55, cloudW * 0.18, 0, 0, Math.PI * 2);
        ctx!.ellipse(cloudX - cloudW * 0.22, cloudY + 2, cloudW * 0.27, cloudW * 0.2, 0, 0, Math.PI * 2);
        ctx!.ellipse(cloudX + cloudW * 0.2, cloudY - 4, cloudW * 0.3, cloudW * 0.24, 0, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.restore();
      }

      // Layered distant hills / mountains move at a slower rate than obstacles.
      for (let layer = 0; layer < 2; layer++) {
        const layerSpeed = layer === 0 ? 0.22 : 0.42;
        const baseY = H * (layer === 0 ? 0.78 : 0.86);
        ctx!.fillStyle = worldChoice === "forest"
          ? (layer === 0 ? "#166534" : "#14532d")
          : worldChoice === "ocean"
            ? (layer === 0 ? "rgba(14,116,144,0.42)" : "rgba(8,47,73,0.5)")
            : worldChoice === "sunset"
              ? (layer === 0 ? "#c2410c" : "#7c2d12")
              : (layer === 0 ? "#6b3b83" : "#302044");
        ctx!.beginPath();
        ctx!.moveTo(0, H);
        for (let i = -1; i <= 8; i++) {
          const x = i * (W / 5) - ((frame * layerSpeed) % (W / 5));
          const peakY = baseY - (i % 2 === 0 ? H * 0.1 : H * 0.04);
          ctx!.lineTo(x, peakY);
          ctx!.lineTo(x + W / 10, baseY + H * 0.08);
        }
        ctx!.lineTo(W, H);
        ctx!.closePath();
        ctx!.fill();
      }

      // World-specific animated details.
      if (worldChoice === "forest") {
        // Fireflies drift upward and pulse in the forest.
        for (let i = 0; i < 18; i++) {
          const x = (i * 71 + Math.sin(frame * 0.018 + i) * 20) % W;
          const y = H * 0.35 + ((i * 43 - frame * (0.25 + (i % 3) * 0.08)) % (H * 0.45 + H) + H * 0.45) % (H * 0.45);
          ctx!.globalAlpha = 0.25 + (Math.sin(frame * 0.09 + i) + 1) * 0.3;
          ctx!.fillStyle = "#d9f99d";
          ctx!.beginPath();
          ctx!.arc(x, y, 2.1, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.globalAlpha = 1;
      }

      if (worldChoice === "ocean") {
        // Layered wave bands gently roll along the lower horizon.
        for (let layer = 0; layer < 3; layer++) {
          const y = H * (0.7 + layer * 0.055);
          ctx!.globalAlpha = 0.2 + layer * 0.08;
          ctx!.strokeStyle = layer === 0 ? "#cffafe" : "#67e8f9";
          ctx!.lineWidth = 3;
          ctx!.beginPath();
          for (let x = 0; x <= W + 8; x += 8) {
            const waveY = y + Math.sin(x * 0.025 + frame * (0.035 + layer * 0.012)) * (5 + layer * 2);
            if (x === 0) ctx!.moveTo(x, waveY);
            else ctx!.lineTo(x, waveY);
          }
          ctx!.stroke();
        }
        ctx!.globalAlpha = 1;
      }

      // Ground strip remains consistent for collision/gameplay geometry.
      ctx!.fillStyle = worldChoice === "ocean" ? "#164e63" : worldChoice === "forest" ? "#1f5130" : "#1f2937";
      ctx!.fillRect(0, H - 20, W, 20);
      ctx!.fillStyle = worldChoice === "ocean" ? "#67e8f9" : worldChoice === "forest" ? "#86efac" : "#86efac";
      ctx!.fillRect(0, H - 20, W, 5);
    }

    function drawBird() {
      ctx!.save();

      ctx!.translate(
        birdX,
        birdY
      );

      ctx!.rotate(
        Math.max(
          -0.4,
          Math.min(
            0.6,
            velocity * 0.07
          )
        )
      );

      if (
        game.protection > 0 &&
        Math.floor(frame / 6) % 2 === 0
      ) {
        ctx!.globalAlpha = 0.4;
      }

      ctx!.shadowColor = bird.color;
      ctx!.shadowBlur = 18;

      ctx!.fillStyle = bird.color;

      ctx!.beginPath();

      ctx!.ellipse(
        0,
        0,
        25,
        19,
        0,
        0,
        Math.PI * 2
      );

      ctx!.fill();

      // Bird-specific silhouette accents so each choice is visibly distinct in-game.
      ctx!.shadowBlur = 0;
      ctx!.save();
      ctx!.fillStyle =
        bird.id === "blue" ? "#0e7490" :
        bird.id === "pink" ? "#be185d" :
        bird.id === "purple" ? "#6d28d9" :
        "#b45309";
      ctx!.beginPath();
      if (bird.id === "blue") {
        // Sky Bird: swept-back wing
        ctx!.ellipse(-5, 5, 13, 7, -0.45, 0, Math.PI * 2);
      } else if (bird.id === "pink") {
        // Love Bird: rounded wing
        ctx!.ellipse(-4, 6, 10, 9, 0.2, 0, Math.PI * 2);
      } else if (bird.id === "purple") {
        // Mystic Bird: pointed wing
        ctx!.moveTo(-17, -2);
        ctx!.lineTo(-5, -15);
        ctx!.lineTo(2, 5);
        ctx!.lineTo(-12, 12);
        ctx!.closePath();
      } else {
        // Golden Phoenix: flame-like crest
        ctx!.moveTo(-12, -11);
        ctx!.lineTo(-22, -24);
        ctx!.lineTo(-4, -18);
        ctx!.lineTo(2, -12);
        ctx!.closePath();
      }
      ctx!.fill();
      ctx!.restore();

      // Eye
      ctx!.fillStyle = "#fff";

      ctx!.beginPath();

      ctx!.arc(
        12,
        -7,
        7,
        0,
        Math.PI * 2
      );

      ctx!.fill();

      ctx!.fillStyle = "#172554";

      ctx!.beginPath();

      ctx!.arc(
        14,
        -7,
        3.5,
        0,
        Math.PI * 2
      );

      ctx!.fill();

      // Beak
      ctx!.fillStyle = "#f97316";

      ctx!.beginPath();

      ctx!.moveTo(23, 0);
      ctx!.lineTo(38, 5);
      ctx!.lineTo(23, 9);

      ctx!.closePath();
      ctx!.fill();

      // Equipped design
      if (
        player?.selectedSkin === "fire"
      ) {
        ctx!.font = "24px serif";
        ctx!.fillText("🔥", -25, 25);
      }

      if (
        player?.selectedSkin === "rainbow"
      ) {
        ctx!.font = "24px serif";
        ctx!.fillText("🌈", -25, 25);
      }

      if (
        player?.selectedSkin === "dragon"
      ) {
        ctx!.font = "24px serif";
        ctx!.fillText("🐉", -25, 25);
      }

      if (
        player?.selectedSkin === "diamond"
      ) {
        ctx!.font = "24px serif";
        ctx!.fillText("💎", -25, 25);
      }

      ctx!.restore();
    }

    function drawObstacles() {
      obstacles.forEach((o) => {
        const topHeight =
          o.gapY - gap / 2;

        const bottomY =
          o.gapY + gap / 2;

        const gradient =
          ctx!.createLinearGradient(
            o.x,
            0,
            o.x + obstacleWidth,
            0
          );

        gradient.addColorStop(
          0,
          "#312e81"
        );

        gradient.addColorStop(
          0.5,
          "#a78bfa"
        );

        gradient.addColorStop(
          1,
          "#312e81"
        );

        ctx!.fillStyle = gradient;

        ctx!.fillRect(
          o.x,
          0,
          obstacleWidth,
          topHeight
        );

        ctx!.fillRect(
          o.x,
          bottomY,
          obstacleWidth,
          H - bottomY
        );

        ctx!.fillStyle = "#fbbf24";

        ctx!.fillRect(
          o.x - 5,
          topHeight - 12,
          obstacleWidth + 10,
          12
        );

        ctx!.fillRect(
          o.x - 5,
          bottomY,
          obstacleWidth + 10,
          12
        );
      });
    }
        function drawGems() {
      gems.forEach((g) => {
        if (g.collected) return;

        ctx!.fillStyle = "#67e8f9";
        ctx!.beginPath();
        ctx!.moveTo(g.x, g.y - 14);
        ctx!.lineTo(g.x + 12, g.y);
        ctx!.lineTo(g.x, g.y + 14);
        ctx!.lineTo(g.x - 12, g.y);
        ctx!.closePath();
        ctx!.fill();
      });
    }

    function drawFinishGate() {
      if (!finishSpawned) return;

      ctx!.fillStyle = "#fef08a";
      ctx!.fillRect(finishX, 0, 12, H - 20);

      ctx!.fillStyle = "#16a34a";
      ctx!.fillRect(finishX - 20, H * 0.4, 55, 65);

      ctx!.fillStyle = "#fff";
      ctx!.font = "bold 18px Arial";
      ctx!.fillText("FINISH", finishX - 35, H * 0.37);
    }

    function jumpBird() {
      if (game.running && !game.dead && !gamePausedRef.current) {
        velocity = jump;
        playSound("jump");
      }
    }

    function onKey(event: KeyboardEvent) {
      if (event.code === "KeyP") {
        event.preventDefault();
        togglePause();
        return;
      }
      if (
        event.code === "Space" ||
        event.code === "ArrowUp"
      ) {
        event.preventDefault();
        jumpBird();
      }
    }

    function update() {
      drawBackground();

      if (!game.running || game.dead) {
        drawObstacles();
        drawGems();
        drawFinishGate();
        drawBird();

        rafRef.current =
          requestAnimationFrame(update);

        return;
      }

      frame++;

      if (game.protection > 0) {
        game.protection--;
      }

      if (powerControlRef.current.active && powerControlRef.current.frames > 0) {
        powerControlRef.current.frames--;
        powerFrames = powerControlRef.current.frames;
        if (frame % 60 === 0) setPowerSeconds(Math.ceil(powerFrames / 60));
        if (powerFrames <= 0) {
          powerControlRef.current.active = false;
          setPowerActive(false);
          setPowerSeconds(0);
          setPowerNotice("Power-up expired.");
        }
      } else { powerFrames = 0; }

      velocity = Math.min(
        velocity + gravity,
        7
      );

      birdY += velocity;

      const actualSpeed =
        powerControlRef.current.type === "slow" &&
        powerControlRef.current.active && powerFrames > 0
          ? speed * 0.55
          : speed;

      if (
        !finishSpawned &&
        frame - obstacleSpawn >
          Math.max(105, 165 - Math.floor(difficulty * 0.7))
      ) {
        const minY = gap / 2 + 30;
        const maxY = H - gap / 2 - 40;

        obstacles.push({
          x: W + 50,
          gapY:
            minY +
            Math.random() * (maxY - minY),
          passed: false,
        });

        obstacleSpawn = frame;
      }

      if (frame - gemSpawn > 90) {
        gems.push({
          x: W + 50,
          y: 80 + Math.random() * (H - 160),
          collected: false,
        });

        gemSpawn = frame;
      }

      obstacles.forEach((o, obstacleIndex) => {
        o.x -= actualSpeed;
        if (selectedLevel % 10 === 0) {
          o.gapY += Math.sin((frame + obstacleIndex * 50) * 0.035) * 1.35;
          o.gapY = Math.max(gap / 2 + 28, Math.min(H - gap / 2 - 30, o.gapY));
        }

        if (
          !o.passed &&
          o.x + obstacleWidth < birdX
        ) {
          o.passed = true;
          game.score++;
          setScore(game.score);
        }

        const hitX =
          birdX + birdRadius > o.x &&
          birdX - birdRadius <
            o.x + obstacleWidth;

        const hitY =
          birdY - birdRadius <
            o.gapY - gap / 2 ||
          birdY + birdRadius >
            o.gapY + gap / 2;

        if (
          hitX &&
          hitY &&
          game.protection <= 0
        ) {
          if (
            player?.selectedPower === "shield" &&
            powerControlRef.current.active &&
            powerControlRef.current.type === "shield" &&
            !game.shieldUsed
          ) {
            game.shieldUsed = true;
            game.protection = PROTECTION_FRAMES;
            powerControlRef.current.active = false;
            powerControlRef.current.frames = 0;
            powerFrames = 0;
            setPowerActive(false);
            setPowerSeconds(0);
            setPowerNotice("Shield absorbed one collision!");
          } else {
            endGame();
          }
        }
      });

      obstacles = obstacles.filter(
        (o) => o.x > -obstacleWidth - 10
      );

      gems.forEach((g) => {
        g.x -= actualSpeed;

        const magnetOn = powerControlRef.current.active && powerControlRef.current.type === "magnet" && powerFrames > 0;
        if (magnetOn && !g.collected) {
          const dx = birdX - g.x; const dy = birdY - g.y;
          const d = Math.max(1, Math.hypot(dx, dy));
          if (d < 190) { g.x += (dx / d) * 3.4; g.y += (dy / d) * 3.4; }
        }
        const distance = Math.hypot(birdX - g.x, birdY - g.y);
        const magnetDistance = magnetOn ? 46 : 35;

        if (
          !g.collected &&
          distance < magnetDistance
        ) {
          g.collected = true;
          playSound("gem");
          const multiplier = powerControlRef.current.active && powerControlRef.current.type === "double" && powerFrames > 0 ? 2 : 1;
          game.gems += multiplier;
          setRunGems(game.gems);
        }
      });

      gems = gems.filter(
        (g) => g.x > -30 && !g.collected
      );

      drawObstacles();
      drawGems();
      drawBird();

      // Spawn and move the finish gate.
      if (
        game.score >= targetScore &&
        !finishSpawned
      ) {
        finishSpawned = true;
        finishX = W + 100;
      }

      if (finishSpawned) {
        finishX -= actualSpeed;
        drawFinishGate();

        if (
          finishX <= birdX + birdRadius
        ) {
          finishLevel();
        }
      }

      if (
        (
          birdY + birdRadius > H - 20 ||
          birdY - birdRadius < 0
        ) &&
        game.protection <= 0
      ) {
        endGame();
      }

      rafRef.current =
        requestAnimationFrame(update);
    }

    powerFrames = powerControlRef.current.active ? powerControlRef.current.frames : 0;

    canvas.addEventListener(
      "pointerdown",
      jumpBird
    );

    window.addEventListener(
      "keydown",
      onKey
    );

    rafRef.current =
      requestAnimationFrame(update);

    return () => {
      canvas.removeEventListener(
        "pointerdown",
        jumpBird
      );

      window.removeEventListener(
        "keydown",
        onKey
      );

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [
    screen,
    birdChoice,
    worldChoice,
    selectedLevel,
    gameSession,
    gamePaused,
    gameOver,
    levelComplete,
    reviving,
    countdown,
  ]);

  useEffect(() => {
    return () => {
      stopTimer();

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const sizeClass =
    screenSize === "normal"
      ? "screen-normal"
      : screenSize === "full"
      ? "screen-full"
      : "screen-wide";

  return (
    <main className="app">
      <header className="topbar">
        <button
          className="brand"
          onClick={() =>
            setScreen(
              player ? "dashboard" : "welcome"
            )
          }
        >
          🪽 Flying Bird
        </button>

        {player && (
          <div className="top-actions">
            <span className="player-name">
              Hi, {player.username}
            </span>

            <button
              className="outline-btn"
              onClick={logout}
            >
              Logout
            </button>
          </div>
        )}
      </header>

      {screen === "welcome" && (
        <section className="welcome-page">
          <div className="welcome-art">🐦</div>

          <p className="eyebrow">
            YOUR ADVENTURE STARTS HERE
          </p>

          <h1>
            Welcome to <span>Flying Bird</span>
          </h1>

          <p className="welcome-description">
            Fly through magical worlds, collect
            gems, unlock new designs, and complete
            all 50 levels.
          </p>

          <div className="welcome-actions">
            <button
              className="primary-btn"
              onClick={() => setScreen("login")}
            >
              Login
            </button>

            <button
              className="secondary-btn"
              onClick={() => setScreen("register")}
            >
              Create account
            </button>
          </div>

          <div className="feature-row">
            <span>🏆 Score rewards</span>
            <span>💎 Revive gems</span>
            <span>🔓 50 levels</span>
          </div>
        </section>
      )}

      {(screen === "login" ||
        screen === "register") && (
        <section className="auth-card">
          <button
            className="back-link"
            onClick={() => {
              setScreen("welcome");
              setAuthError("");
            }}
          >
            ← Back
          </button>

          <div className="auth-icon">🪽</div>

          <h1>
            {screen === "login"
              ? "Welcome back!"
              : "Create your account"}
          </h1>

          <p className="muted">
            Your account is connected to the Flying Bird server.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();

              if (screen === "login") {
                login();
              } else {
                register();
              }
            }}
          >
            <label>Username</label>

            <input
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
              placeholder="Enter username"
              required
            />

            {screen === "register" && (
              <>
                <label>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" required />
              </>
            )}

            <label>Password</label>

            <input
              type="password"
              minLength={screen === "register" ? 8 : 1}
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Enter password"
              required
            />

            {authError && (
              <p className="error">{authError}</p>
            )}

            <button
              className="primary-btn full-btn"
              type="submit"
            >
              {screen === "login"
                ? "Login"
                : "Register"}
            </button>
          </form>

          <p className="auth-switch">
            {screen === "login"
              ? "New player? "
              : "Already registered? "}

            <button
              className="inline-link"
              onClick={() => {
                setAuthError("");

                setScreen(
                  screen === "login"
                    ? "register"
                    : "login"
                );
              }}
            >
              {screen === "login"
                ? "Create account"
                : "Login"}
            </button>
          </p>
        </section>
      )}

      {screen === "dashboard" && player && (
        <section className="page-section">
          <div className="welcome-banner">
            <div>
              <p className="eyebrow">
                PLAYER DASHBOARD
              </p>

              <h1>
                Welcome back, {player.username}! 👋
              </h1>

              <p>
                Ready to continue your adventure?
              </p>
            </div>

            <div className="banner-bird">{birds.find((bird) => bird.id === birdChoice)?.emoji ?? "🐤"}</div>
          </div>

          <div className="stats-grid">
            <StatCard
              icon="🏆"
              label="Total score"
              value={player.totalScore}
            />

            <StatCard
              icon="💎"
              label="Gems collected"
              value={player.totalGems}
            />

            <StatCard
              icon="🔓"
              label="Levels unlocked"
              value={`${player.unlockedLevel} / 50`}
            />

            <StatCard
              icon="🎮"
              label="Games played"
              value={player.gamesPlayed}
            />

            <StatCard
              icon="⭐"
              label="Best run score"
              value={player.bestScore}
            />

            <StatCard
              icon="🏁"
              label="Levels completed"
              value={player.completedLevels.length}
            />
          </div>

          <BackendPlayerStats />
          <ApiLeaderboard />

          <div className="dashboard-actions">
            <button
              className="primary-btn"
              onClick={() => setScreen("customize")}
            >
              Play game →
            </button>

            <button
              className="secondary-btn"
              onClick={goToLevels}
            >
              View levels
            </button>

            <button
              className="secondary-btn"
              onClick={() => setScreen("customize")}
            >
              Customize bird
            </button>
          </div>

          <div className="section-card engagement-card">
            <h2>🎁 Daily Login Reward</h2>
            <p className="muted">Claim 10 gems once per calendar day on this browser.</p>
            <button className="primary-btn" onClick={claimDailyReward} disabled={player.lastDailyClaim === getLocalDateKey()}>
              {player.lastDailyClaim === getLocalDateKey() ? "Today's reward claimed" : "Claim +10 gems"}
            </button>
          </div>

          <div className="section-card engagement-card daily-missions-card">
            <h2>🎯 Daily Missions</h2>
            <p className="muted">Complete a goal and claim its reward once per day.</p>
            {[
              { id: "mission-play", title: "Take a flight", detail: "Play at least 1 game", progress: Math.min(player.gamesPlayed, 1), target: 1, reward: 5 },
              { id: "mission-gems", title: "Gem hunter", detail: "Collect 10 gems", progress: Math.min(player.totalGems, 10), target: 10, reward: 10 },
              { id: "mission-score", title: "Sky challenger", detail: "Reach a best score of 20", progress: Math.min(player.bestScore, 20), target: 20, reward: 15 },
            ].map((mission) => {
              const completed = mission.progress >= mission.target;
              const claimed = isMissionClaimed(mission.id);
              return (
                <div className={`daily-mission ${completed ? "mission-complete" : ""} ${claimed ? "mission-claimed" : ""}`} key={mission.id}>
                  <div className="daily-mission-top">
                    <div><strong>{claimed ? "🎁 " : completed ? "✅ " : "🌟 "}{mission.title}</strong><small>{mission.detail}</small></div>
                    <span className="mission-reward">+{mission.reward} 💎</span>
                  </div>
                  <div className="mission-progress-track"><div className="mission-progress-fill" style={{ width: `${Math.min(100, (mission.progress / mission.target) * 100)}%` }} /></div>
                  <div className="mission-footer">
                    <small className="mission-progress-text">{Math.min(mission.progress, mission.target)} / {mission.target} {claimed ? "· Claimed today" : completed ? "· Ready to claim" : "· In progress"}</small>
                    <button className="mission-claim-btn" disabled={!completed || claimed} onClick={() => claimMission(mission.id, mission.reward, completed)}>
                      {claimed ? "Claimed ✓" : completed ? `Claim +${mission.reward}` : "Locked"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="section-card engagement-card">
            <h2>🏅 Achievements</h2>
            <p className="muted">Track milestones from your saved game progress.</p>
            <div className="achievement-grid">
              {[{id:"first-run",title:"First Flight",desc:"Play your first game",done:player.gamesPlayed>=1},{id:"gem-collector",title:"Gem Collector",desc:"Collect 50 gems",done:player.totalGems>=50},{id:"sky-veteran",title:"Sky Veteran",desc:"Complete 5 levels",done:player.completedLevels.length>=5},{id:"level-master",title:"Level Master",desc:"Complete 10 levels",done:player.completedLevels.length>=10}].map(a=>(
                <div className={`achievement-item ${a.done ? "earned" : ""}`} key={a.id}><span>{a.done ? "🏅" : "🔒"}</span><div><strong>{a.title}</strong><small>{a.desc}</small><small>{a.done ? "Unlocked" : "In progress"}</small></div></div>
              ))}
            </div>
          </div>

          

          <div className="section-card">
            <h2>🏅 Rewards & Designs</h2>

            <p className="muted">
              Use score points to unlock designs.
              Gems are only for reviving.
            </p>

            <div className="reward-grid">
              {skins.map((skin) => (
                <div
                  className="reward-card"
                  key={skin.id}
                >
                  <div className="reward-emoji">
                    {skin.emoji}
                  </div>

                  <h3>{skin.name}</h3>

                  <p>
                    {player.unlockedSkins.includes(
                      skin.id
                    )
                      ? "Unlocked"
                      : `⭐ ${skin.cost} score`}
                  </p>

                  <button
                    className="small-btn"
                    onClick={() =>
                      buySkin(skin.id, skin.cost)
                    }
                  >
                    {player.selectedSkin === skin.id
                      ? "Selected"
                      : player.unlockedSkins.includes(
                          skin.id
                        )
                      ? "Select"
                      : "Unlock"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="section-card">
            <h2>⚡ Power-ups</h2>

            <p className="muted">
              Power-ups use score points, never gems.
            </p>

            <div className="reward-grid">
              {powers.map((power) => (
                <div
                  className="reward-card"
                  key={power.id}
                >
                  <div className="reward-emoji">
                    ⚡
                  </div>

                  <h3>{power.name}</h3>

                  <p>{power.description}</p>

                  <small>
                    {player.unlockedPowers.includes(
                      power.id
                    )
                      ? "Unlocked"
                      : `⭐ ${power.cost} score`}
                  </small>

                  <button
                    className="small-btn"
                    onClick={() =>
                      buyPower(power.id, power.cost)
                    }
                  >
                    {player.selectedPower === power.id
                      ? "Selected"
                      : player.unlockedPowers.includes(
                          power.id
                        )
                      ? "Select"
                      : "Unlock"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {message && (
            <p className="notice">{message}</p>
          )}
        </section>
      )}

      {screen === "customize" && player && (
        <section className="page-section">
          <button
            className="back-link"
            onClick={() => setScreen("dashboard")}
          >
            ← Dashboard
          </button>

          <div className="page-heading">
            <p className="eyebrow">BEFORE YOU FLY</p>
            <h1>Customize your adventure</h1>
            <p className="muted">
              Choose your bird, world, and screen size.
            </p>
          </div>

          <div className="section-card">
            <h2>Choose your bird</h2>

            <div className="choice-grid">
              {birds.map((bird) => (
                <button
                  key={bird.id}
                  className={`choice-card ${
                    birdChoice === bird.id
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    setBirdChoice(bird.id)
                  }
                >
                  <span
                    className="choice-emoji bird-choice-art"
                    style={{
                      backgroundColor: bird.color,
                      color: bird.color,
                    }}
                    aria-label={`${bird.name} color`}
                  >
                    <span>{bird.emoji}</span>
                  </span>

                  <strong>{bird.name}</strong>

                  {birdChoice === bird.id && (
                    <span className="selected-label">
                      ✓ Selected
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="section-card">
            <h2>Select your world</h2>

            <div className="choice-grid">
              {worlds.map((world) => (
                <button
                  key={world.id}
                  className={`choice-card ${
                    worldChoice === world.id
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    setWorldChoice(world.id)
                  }
                >
                  <span
                    className="world-swatch"
                    style={{
                      background: world.background,
                    }}
                  >
                    ✦
                  </span>

                  <strong>{world.name}</strong>

                  {worldChoice === world.id && (
                    <span className="selected-label">
                      ✓ Selected
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="section-card">
            <h2>Game screen size</h2>

            <div className="size-options">
              {(
                ["normal", "wide", "full"] as const
              ).map((size) => (
                <button
                  key={size}
                  className={`size-btn ${
                    screenSize === size
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    setScreenSize(size)
                  }
                >
                  {size === "normal"
                    ? "Normal"
                    : size === "wide"
                    ? "Wide"
                    : "Large"}
                </button>
              ))}
            </div>
          </div>

          <button
            className="primary-btn full-btn"
            onClick={goToLevels}
          >
            Continue to level selection →
          </button>
        </section>
      )}

      {screen === "levels" && player && (
        <section className="page-section">
          <button
            className="back-link"
            onClick={() => setScreen("customize")}
          >
            ← Customize
          </button>

          <div className="page-heading">
            <p className="eyebrow">YOUR ADVENTURE</p>
            <h1>Choose a level</h1>
            <p className="muted">
              Complete each level to unlock the next.
              Your progress is saved.
            </p>
          </div>

          <div className="level-progress">
            <div className="progress-label">
              <span>Progress</span>

              <strong>
                {player.completedLevels.length} / 50
                completed
              </strong>
            </div>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${
                    player.completedLevels.length * 2
                  }%`,
                }}
              />
            </div>
          </div>

          <div className="level-grid">
            {Array.from(
              { length: 50 },
              (_, i) => i + 1
            ).map((level) => {
              const unlocked =
                level <= player.unlockedLevel;

              const completed =
                player.completedLevels.includes(level);

              return (
                <button
                  key={level}
                  disabled={!unlocked}
                  className={`level-card ${
                    unlocked ? "unlocked" : "locked"
                  } ${
                    completed ? "completed" : ""
                  }`}
                  onClick={() => startLevel(level)}
                >
                  <span>
                    {completed
                      ? "✓"
                      : unlocked
                      ? "▶"
                      : "🔒"}
                  </span>

                  <strong>{level}</strong>

                  <small>
                    {completed
                      ? "Completed"
                      : unlocked
                      ? "Play"
                      : "Locked"}
                  </small>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {screen === "game" && (
        <section className="page-section game-page">
          <div className="game-topline">
            <button
              className="back-link"
              onClick={goToLevels}
            >
              ← Exit level
            </button>

            <div className="game-stat-pills">
              <span>⭐ Score: {score}</span>
              <span>💎 Run gems: {runGems}</span>
              <span>
                🚀 Level {selectedLevel}/50 {selectedLevel % 10 === 0 ? "👑 BOSS" : ""}
              </span>
            </div>

            <div className="game-control-buttons">
              <button type="button" className="game-control-btn" onClick={togglePause} disabled={countdown > 0 || gameOver || levelComplete || reviving}>
                {gamePaused ? "▶ Resume" : "⏸ Pause"}
              </button>
              <button type="button" className="game-control-btn" onClick={toggleSound}>
                {soundEnabled ? "🔊 Sound" : "🔇 Muted"}
              </button>
            </div>
          </div>

          <div className={`game-stage ${sizeClass}`}>
            <canvas
              ref={canvasRef}
              width={WIDTH}
              height={HEIGHT}
              className="game-canvas"
            />

            {/* Initial level countdown overlay */}
            {countdown > 0 && !reviving && !gameOver && !levelComplete && (
              <div className="game-overlay countdown-overlay">
                <p className="eyebrow">GET READY!</p>
                <h2>Level {selectedLevel}</h2>
                <div className="countdown">{countdown}</div>
                <p>Get ready to fly!</p>
              </div>
            )}

            {/* Game controls hint (show only after countdown) */}
            {!gameOver &&
              !levelComplete &&
              !reviving &&
              countdown === 0 && (
                <div className="game-hint">
                  Click / tap or press SPACE to fly
                </div>
              )}

            {!gameOver && !levelComplete && !reviving && countdown === 0 && player?.selectedPower && player.selectedPower !== "none" && (
              <div className="power-control-panel">
                <button className="power-activate-btn" onClick={activatePower} disabled={powerActive || (player.selectedPower === "shield" && gameRef.current.shieldUsed)}>
                  ⚡ {powerActive ? `${player.selectedPower.toUpperCase()} · ${powerSeconds}s` : `Activate ${player.selectedPower}`}
                </button>
                {powerNotice && <small>{powerNotice}</small>}
              </div>
            )}

            {gamePaused && !gameOver && !levelComplete && !reviving && (
              <div className="game-overlay pause-overlay">
                <div className="overlay-icon">⏸️</div>
                <p className="eyebrow">GAME PAUSED</p>
                <h2>Take a break</h2>
                <p>Your progress is waiting for you.</p>
                <button className="primary-btn" onClick={togglePause}>▶ Resume game</button>
              </div>
            )}

            {reviving && (
              <div className="game-overlay">
                <div className="overlay-icon">💎</div>

                <p className="eyebrow">
                  REVIVE ACTIVATED
                </p>

                <h2>Get ready!</h2>
                <p>Flying resumes in</p>

                <div className="countdown">
                  {countdown}
                </div>

                <p>
                  Your score and level are saved.
                </p>
              </div>
            )}

            {gameOver && (
              <div className="game-overlay">
                <div className="overlay-icon">🪽</div>

                <p className="eyebrow">KEEP TRYING</p>
                <h2>Game over!</h2>

                <p>
                  Score this run: <strong>{score}</strong>
                </p>

                <p>
                  Gems collected:{" "}
                  <strong>{runGems}</strong>
                </p>

                <p>
                  Revive costs {REVIVE_COST} gems.
                  Gems cannot buy designs or powers.
                </p>

                {player && player.totalGems >= REVIVE_COST && (
                  <button
                    className="primary-btn"
                    onClick={revive}
                  >
                    💎 Revive for {REVIVE_COST} gems
                  </button>
                )}

                <button
                  className="secondary-btn"
                  onClick={() =>
                    startLevel(selectedLevel)
                  }
                >
                  Try level again
                </button>

                <button
                  className="text-btn"
                  onClick={goToLevels}
                >
                  Back to levels
                </button>
              </div>
            )}

            {levelComplete && (
              <div className="game-overlay">
                <div className="overlay-icon">🏆</div>

                <p className="eyebrow">
                  LEVEL COMPLETE
                </p>

                <h2>
                  {selectedLevel === 50
                    ? "You did it!"
                    : "Amazing flying!"}
                </h2>

                <p>{message}</p>

                <p>
                  Score: <strong>{score}</strong>
                </p>

                <p>
                  Gems collected:{" "}
                  <strong>{runGems}</strong>
                </p>

                {selectedLevel < 50 && (
                  <button
                    className="primary-btn"
                    onClick={() =>
                      startLevel(selectedLevel + 1)
                    }
                  >
                    Play Level {selectedLevel + 1} →
                  </button>
                )}

                <button
                  className="secondary-btn"
                  onClick={goToLevels}
                >
                  Level selection
                </button>

                <button
                  className="text-btn"
                  onClick={() =>
                    setScreen("dashboard")
                  }
                >
                  Dashboard
                </button>
              </div>
            )}
          </div>

          <p className="game-instructions">
            Fly through the obstacle gaps, collect
            gems, and reach the finish gate. Gems
            are only spent on revives.
          </p>
        </section>
      )}

      <footer className="footer">
        <span>🪽 Flying Bird</span>
        <span>
          50 levels • Fly, collect, complete!
        </span>
      </footer>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string | number;
}) {
  return (
    <div className="stat-card">
      <span className="stat-icon">{icon}</span>

      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

export default App;