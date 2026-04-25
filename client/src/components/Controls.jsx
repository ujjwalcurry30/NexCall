import styles from "./Controls.module.css";

export default function Controls({
  myMediaState,
  isScreenSharing,
  chatOpen,
  unreadCount = 0,
  onToggleVideo,
  onToggleAudio,
  onToggleScreen,
  onToggleChat,
  onLeave,
}) {
  return (
    <div className={styles.bar}>
      <div className={styles.group}>
        <CtrlBtn
          onClick={onToggleAudio}
          active={myMediaState.audio}
          label={myMediaState.audio ? "Mute" : "Unmute"}
          icon={myMediaState.audio ? "🎙" : "🔇"}
        />
        <CtrlBtn
          onClick={onToggleVideo}
          active={myMediaState.video}
          label={myMediaState.video ? "Stop video" : "Start video"}
          icon={myMediaState.video ? "📹" : "🚫"}
        />
      </div>

      <div className={styles.group}>
        <CtrlBtn
          onClick={onToggleScreen}
          active={!isScreenSharing}
          label={isScreenSharing ? "Stop share" : "Share screen"}
          icon="🖥"
          accent={isScreenSharing}
        />
        <CtrlBtn
          onClick={onToggleChat}
          active={!chatOpen}
          label="Chat"
          icon="💬"
          accent={chatOpen}
          badge={!chatOpen ? unreadCount : 0}
        />
      </div>

      <button className={styles.leaveBtn} onClick={onLeave} type="button">
        Leave call
      </button>
    </div>
  );
}

function CtrlBtn({ onClick, active, label, icon, accent, badge }) {
  return (
    <button
      className={`${styles.btn} ${!active ? styles.btnOff : ""} ${accent ? styles.btnAccent : ""}`}
      onClick={onClick}
      title={label}
      type="button"
    >
      <span className={styles.btnIcon}>{icon}</span>
      <span className={styles.btnLabel}>{label}</span>
      {badge > 0 && <span className={styles.badge}>{badge > 99 ? "99+" : badge}</span>}
    </button>
  );
}

