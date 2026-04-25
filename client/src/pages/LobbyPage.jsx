import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./LobbyPage.module.css";
import nexcallHome from "../assets/nextcallhome.png";

export default function LobbyPage() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [tab, setTab] = useState("create");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleCreate(e) {
    e.preventDefault();
    if (!userName.trim()) return setErr("Enter your name first");
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${userName}'s Room` }),
      });
      const { roomId } = await res.json();
      sessionStorage.setItem("userName", userName.trim());
      navigate(`/room/${roomId}`);
    } catch {
      setErr("Server error. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    if (!userName.trim()) return setErr("Enter your name first");
    if (!roomCode.trim()) return setErr("Enter a room code");
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`/api/rooms/${roomCode.trim().toUpperCase()}`);
      if (!res.ok) return setErr("Room not found. Check the code.");
      sessionStorage.setItem("userName", userName.trim());
      navigate(`/room/${roomCode.trim().toUpperCase()}`);
    } catch {
      setErr("Server error. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.bgGrid} />
      <div className={styles.bgGlow} />

      <div className={styles.card}>
        <div className={styles.logo}>
          <img className={styles.logoImage} src={nexcallHome} alt="NexCall" />
          <span className={styles.logoText}>NexCall</span>
        </div>
        <p className={styles.tagline}>Crystal-clear video. Zero setup.</p>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === "create" ? styles.tabActive : ""}`}
            onClick={() => setTab("create")}
            type="button"
          >
            New room
          </button>
          <button
            className={`${styles.tab} ${tab === "join" ? styles.tabActive : ""}`}
            onClick={() => setTab("join")}
            type="button"
          >
            Join room
          </button>
        </div>

        <form onSubmit={tab === "create" ? handleCreate : handleJoin} className={styles.form}>
          <div className={styles.field}>
            <label>Your name</label>
            <input
              type="text"
              placeholder="e.g. Alex Kumar"
              value={userName}
              onChange={(e) => {
                setUserName(e.target.value);
                setErr("");
              }}
              maxLength={32}
              autoFocus
            />
          </div>

          {tab === "join" && (
            <div className={styles.field}>
              <label>Room code</label>
              <input
                type="text"
                placeholder="e.g. A1B2C3D4"
                value={roomCode}
                onChange={(e) => {
                  setRoomCode(e.target.value.toUpperCase());
                  setErr("");
                }}
                maxLength={8}
                style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.12em" }}
              />
            </div>
          )}

          {err && <p className={styles.error}>{err}</p>}

          <button className={styles.cta} disabled={loading}>
            {loading ? "Loading…" : tab === "create" ? "Create & enter" : "Join room"}
          </button>
        </form>

        <p className={styles.hint}>No account needed. Rooms auto-close when everyone leaves.</p>
      </div>
    </div>
  );
}

