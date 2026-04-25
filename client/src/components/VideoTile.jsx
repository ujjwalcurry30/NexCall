import { useEffect, useRef } from "react";
import styles from "./VideoTile.module.css";

export default function VideoTile({ stream, name, isLocal, videoOn, audioOn, isScreenSharing }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const initials = name ? name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) : "?";

  return (
    <div className={`${styles.tile} ${isLocal ? styles.local : ""}`}>
      {stream && videoOn !== false ? (
        <video ref={videoRef} autoPlay playsInline muted={isLocal} className={styles.video} />
      ) : (
        <div className={styles.avatar}>
          <span>{initials}</span>
        </div>
      )}

      <div className={styles.nameBar}>
        {isLocal && isScreenSharing && <span className={styles.screenBadge}>Screen</span>}
        <span className={styles.name}>
          {name}
          {isLocal ? " (you)" : ""}
        </span>
        {audioOn === false && (
          <span className={styles.mutedIcon} title="Muted">
            🔇
          </span>
        )}
      </div>

      {!stream && !isLocal && <div className={styles.connecting}>Connecting…</div>}
    </div>
  );
}

