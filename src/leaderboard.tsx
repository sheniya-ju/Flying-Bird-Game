import { useEffect, useState } from "react";
import "./leaderboard.css";

interface LeaderboardPlayer {
  rank: number;
  player_id: number;
  username: string;
  best_score: number;
  highest_level: number;
}

const API_URL = "http://127.0.0.1:8000";

export default function Leaderboard() {
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch(`${API_URL}/leaderboard/`);

        if (!response.ok) {
          throw new Error("Failed to load leaderboard");
        }

        const data = await response.json();
        setPlayers(data.leaderboard);
      } catch {
        setError("Unable to load leaderboard.");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return (
    <div className="leaderboard">
      <h2>🏆 Leaderboard</h2>

      {loading && <p>Loading leaderboard...</p>}

      {error && <p>{error}</p>}

      {!loading && !error && players.length === 0 && (
        <p>No scores available yet. Be the first to play!</p>
      )}

      {!loading && !error && players.length > 0 && (
        <div className="leaderboard-list">
          {players.map((player) => (
            <div className="leaderboard-row" key={player.player_id}>
              <span className="rank">#{player.rank}</span>

              <div className="player-info">
                <strong>{player.username}</strong>
                <small>Level {player.highest_level}</small>
              </div>

              <span className="player-score">
                {player.best_score}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}