import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWebRTC } from "../hooks/useWebRTC.js";
import VideoTile from "../components/VideoTile.jsx";
import ChatPanel from "../components/ChatPanel.jsx";
import Controls from "../components/Controls.jsx";
import styles from "./RoomPage.module.css";

export default function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const userName = sessionStorage.getItem("userName") || "Guest";
  const [chatOpen, setChatOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevMsgCountRef = useRef(0);

  const {
    localStream,
    peers,
    messages,
    roomInfo,
    myMediaState,
    isConnected,
    isScreenSharing,
    error,
    toggleVideo,
    toggleAudio,
    sendMessage,
    toggleScreenShare,
  } = useWebRTC({ roomId, userName });

  useEffect(() => {
    const prev = prevMsgCountRef.current;
    const next = messages.length;
    if (next > prev) {
      const delta = next - prev;
      if (!chatOpen) setUnreadCount((c) => c + delta);
    }
    prevMsgCountRef.current = next;
  }, [messages.length, chatOpen]);

  useEffect(() => {
    if (chatOpen) setUnreadCount(0);
  }, [chatOpen]);

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function leave() {
    navigate("/");
  }

  const peerList = Object.entries(peers);
  const totalTiles = 1 + peerList.length;

  if (error) {
    return (
      <div className={styles.error}>
        <div className={styles.errorBox}>
          <h2>Permission Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate("/")}>← Back to lobby</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>
            <div className={styles.logoMark} />
            NexCall
          </div>
          <div className={styles.roomBadge}>
            <span className={styles.roomId}>{roomId}</span>
            <button className={styles.copyBtn} onClick={copyLink} title="Copy invite link" type="button">
              {copied ? "✓" : "⧉"}
            </button>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={`${styles.dot} ${isConnected ? styles.dotGreen : styles.dotRed}`} />
          <span className={styles.connStatus}>{isConnected ? "Connected" : "Connecting…"}</span>
          <span className={styles.participantCount}>
            {totalTiles} participant{totalTiles !== 1 ? "s" : ""}
          </span>
        </div>
      </header>

      <main className={`${styles.grid} ${styles[`grid${Math.min(totalTiles, 6)}`]}`}>
        <VideoTile
          stream={localStream}
          name={userName}
          isLocal
          videoOn={myMediaState.video}
          audioOn={myMediaState.audio}
          isScreenSharing={isScreenSharing}
        />
        {peerList.map(([id, peer]) => (
          <VideoTile
            key={id}
            stream={peer.stream}
            name={peer.name}
            videoOn={peer.video}
            audioOn={peer.audio}
          />
        ))}
      </main>

      <div className={styles.footer}>
        <Controls
          myMediaState={myMediaState}
          isScreenSharing={isScreenSharing}
          chatOpen={chatOpen}
          unreadCount={unreadCount}
          onToggleVideo={toggleVideo}
          onToggleAudio={toggleAudio}
          onToggleScreen={toggleScreenShare}
          onToggleChat={() => setChatOpen((v) => !v)}
          onLeave={leave}
        />
      </div>

      {chatOpen && (
        <ChatPanel
          messages={messages}
          myId={roomInfo?.myId}
          onSend={sendMessage}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
}

