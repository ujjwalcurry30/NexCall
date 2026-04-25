import { useState, useEffect, useRef } from "react";
import styles from "./ChatPanel.module.css";

export default function ChatPanel({ messages, myId, onSend, onClose }) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput("");
  }

  function formatTime(iso) {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span>In-call chat</span>
        <button className={styles.closeBtn} onClick={onClose} type="button">
          ✕
        </button>
      </div>

      <div className={styles.messages}>
        {messages.length === 0 && <p className={styles.empty}>No messages yet. Say hello!</p>}
        {messages.map((msg) => {
          const isMe = msg.senderId === myId;
          return (
            <div key={msg.id} className={`${styles.msg} ${isMe ? styles.msgMe : styles.msgThem}`}>
              {!isMe && <span className={styles.sender}>{msg.senderName}</span>}
              <div className={styles.bubble}>{msg.message}</div>
              <span className={styles.time}>{formatTime(msg.timestamp)}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form className={styles.inputRow} onSubmit={handleSend}>
        <input
          type="text"
          placeholder="Type a message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
          maxLength={500}
        />
        <button type="submit" disabled={!input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}

