import { useState, useEffect, useRef, useCallback } from "react";
import { connectSocket, disconnectSocket } from "../socket.js";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export function useWebRTC({ roomId, userName }) {
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState({}); // { socketId: { stream, name, video, audio } }
  const [messages, setMessages] = useState([]);
  const [roomInfo, setRoomInfo] = useState(null);
  const [myMediaState, setMyMediaState] = useState({ video: true, audio: true });
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({}); // { socketId: RTCPeerConnection }
  const socketRef = useRef(null);
  const myMediaStateRef = useRef({ video: true, audio: true });

  const createPeerConnection = useCallback((peerId, peerName) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    const remoteStream = new MediaStream();
    pc.ontrack = (e) => {
      e.streams[0].getTracks().forEach((track) => remoteStream.addTrack(track));
      setPeers((prev) => ({
        ...prev,
        [peerId]: { ...prev[peerId], stream: remoteStream, name: peerName },
      }));
    };

    pc.onicecandidate = (e) => {
      if (e.candidate && socketRef.current) {
        socketRef.current.emit("ice-candidate", {
          targetId: peerId,
          candidate: e.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        setPeers((prev) => {
          const next = { ...prev };
          delete next[peerId];
          return next;
        });
      }
    };

    peerConnectionsRef.current[peerId] = pc;
    return pc;
  }, []);

  const callPeer = useCallback(
    async (peerId, peerName) => {
      const pc = createPeerConnection(peerId, peerName);
      setPeers((prev) => ({
        ...prev,
        [peerId]: { stream: null, name: peerName, video: true, audio: true },
      }));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.emit("offer", { targetId: peerId, offer });
    },
    [createPeerConnection]
  );

  useEffect(() => {
    if (!roomId || !userName) return;

    let mounted = true;

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        setLocalStream(stream);
      } catch {
        setError("Camera/mic access denied. Please allow permissions and refresh.");
        return;
      }

      const socket = connectSocket();
      socketRef.current = socket;

      socket.on("connect", () => setIsConnected(true));
      socket.on("disconnect", () => setIsConnected(false));

      socket.on("room-joined", ({ roomName, participants, you }) => {
        setRoomInfo({ name: roomName, myId: you.id });
        participants.forEach(({ id, name }) => callPeer(id, name));
      });

      socket.on("participant-joined", ({ id, name }) => {
        setPeers((prev) => ({ ...prev, [id]: { stream: null, name, video: true, audio: true } }));
      });

      socket.on("offer", async ({ offer, fromId, fromName }) => {
        let pc = peerConnectionsRef.current[fromId];
        if (!pc) {
          pc = createPeerConnection(fromId, fromName);
          setPeers((prev) => ({
            ...prev,
            [fromId]: { stream: null, name: fromName, video: true, audio: true },
          }));
        }
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", { targetId: fromId, answer });
      });

      socket.on("answer", async ({ answer, fromId }) => {
        const pc = peerConnectionsRef.current[fromId];
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
      });

      socket.on("ice-candidate", async ({ candidate, fromId }) => {
        const pc = peerConnectionsRef.current[fromId];
        if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
      });

      socket.on("participant-left", ({ id }) => {
        peerConnectionsRef.current[id]?.close();
        delete peerConnectionsRef.current[id];
        setPeers((prev) => {
          const n = { ...prev };
          delete n[id];
          return n;
        });
      });

      socket.on("chat-message", (msg) => {
        setMessages((prev) => [...prev, msg]);
      });

      socket.on("participant-media-state", ({ participantId, video, audio }) => {
        setPeers((prev) =>
          prev[participantId] ? { ...prev, [participantId]: { ...prev[participantId], video, audio } } : prev
        );
      });

      socket.emit("join-room", { roomId, userName });
    }

    init();

    return () => {
      mounted = false;
      Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
      peerConnectionsRef.current = {};
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      disconnectSocket();
    };
  }, [roomId, userName, callPeer, createPeerConnection]);

  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      const next = { ...myMediaStateRef.current, video: videoTrack.enabled };
      myMediaStateRef.current = next;
      setMyMediaState(next);
      socketRef.current?.emit("media-state", { roomId, ...next });
    }
  }, [roomId]);

  const toggleAudio = useCallback(() => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      const next = { ...myMediaStateRef.current, audio: audioTrack.enabled };
      myMediaStateRef.current = next;
      setMyMediaState(next);
      socketRef.current?.emit("media-state", { roomId, ...next });
    }
  }, [roomId]);

  const sendMessage = useCallback(
    (message) => {
      socketRef.current?.emit("chat-message", { roomId, message });
    },
    [roomId]
  );

  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenStreamRef = useRef(null);

  const toggleScreenShare = useCallback(async () => {
    const pcs = peerConnectionsRef.current;

    if (isScreenSharing) {
      const screenTrack = screenStreamRef.current?.getVideoTracks?.()[0];
      screenTrack?.stop();
      screenStreamRef.current = null;
      setIsScreenSharing(false);

      const camTrack = localStreamRef.current?.getVideoTracks?.()[0];
      if (camTrack) {
        Object.values(pcs).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          sender?.replaceTrack(camTrack);
        });
      }
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const screenTrack = screenStream.getVideoTracks()[0];
      screenStreamRef.current = screenStream;
      setIsScreenSharing(true);

      Object.values(pcs).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        sender?.replaceTrack(screenTrack);
      });

      screenTrack.onended = () => {
        setIsScreenSharing(false);
        const camTrack = localStreamRef.current?.getVideoTracks?.()[0];
        if (camTrack) {
          Object.values(pcs).forEach((pc) => {
            const sender = pc.getSenders().find((s) => s.track?.kind === "video");
            sender?.replaceTrack(camTrack);
          });
        }
      };
    } catch {
      // user cancelled
    }
  }, [isScreenSharing]);

  return {
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
  };
}

