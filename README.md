# NexCall — Video Calling Web App

A full-stack peer-to-peer video calling app built with React, Node.js, Express, Socket.io, and WebRTC.

## Features

- 🎥 Real-time peer-to-peer video & audio via WebRTC
- 💬 In-call text chat
- 🖥 Screen sharing
- 🔇 Toggle mic / camera
- 🔗 Shareable room links
- 🏠 Create or join rooms by code
- 📡 Socket.io signaling server
- 🌐 REST API for room management

## Project Structure

```
nexcall/
├── package.json          ← root scripts (concurrently)
├── server/
│   ├── package.json
│   └── index.js          ← Express + Socket.io signaling server
└── client/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── socket.js          ← Socket.io singleton
        ├── hooks/
        │   └── useWebRTC.js   ← All WebRTC + signaling logic
        ├── pages/
        │   ├── LobbyPage.jsx  ← Create / join room
        │   └── RoomPage.jsx   ← Live call UI
        └── components/
            ├── VideoTile.jsx  ← Individual video stream tile
            ├── Controls.jsx   ← Mic / camera / screen / chat / leave
            └── ChatPanel.jsx  ← Slide-in chat sidebar
```

## Quick Start

### 1. Install dependencies

```bash
# From project root
npm install          # installs concurrently
npm run install:all  # installs server + client deps
```

Or manually:
```bash
cd server && npm install
cd ../client && npm install
```

### 2. Configure environment

```bash
# Server
cp server/.env.example server/.env

# Client
cp client/.env.example client/.env
```

### 3. Run in development

```bash
# From project root — starts both server and client
npm run dev
```

Or separately:
```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

- Frontend: http://localhost:5173
- Backend:  http://localhost:4000

## REST API

| Method | Endpoint           | Description                    |
|--------|--------------------|--------------------------------|
| POST   | /api/rooms         | Create a new room              |
| GET    | /api/rooms/:id     | Get room info & participants   |
| GET    | /api/rooms         | List all active rooms          |
| GET    | /health            | Health check                   |

## Socket.io Events

### Client → Server
| Event           | Payload                          |
|-----------------|----------------------------------|
| join-room       | { roomId, userName }             |
| offer           | { targetId, offer }              |
| answer          | { targetId, answer }             |
| ice-candidate   | { targetId, candidate }          |
| chat-message    | { roomId, message }              |
| media-state     | { roomId, video, audio }         |

### Server → Client
| Event                   | Payload                                    |
|-------------------------|--------------------------------------------|
| room-joined             | { roomId, roomName, participants, you }    |
| participant-joined      | { id, name }                               |
| participant-left        | { id }                                     |
| offer                   | { offer, fromId, fromName }                |
| answer                  | { answer, fromId }                         |
| ice-candidate           | { candidate, fromId }                      |
| chat-message            | { id, senderId, senderName, message, ts }  |
| participant-media-state | { participantId, video, audio }            |

## Production Deployment

### Add a TURN server (required for some networks)

Edit `useWebRTC.js`:
```js
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:your-turn-server.com:3478",
      username: "user",
      credential: "password",
    },
  ],
};
```

Free options: [Twilio TURN](https://www.twilio.com/stun-turn), [Metered](https://www.metered.ca/tools/openrelay/)

### Deploy

| Part     | Platform suggestion              |
|----------|----------------------------------|
| Frontend | Vercel, Netlify                  |
| Backend  | Railway, Render, Fly.io          |
| TURN     | coturn on a VPS or Metered.ca    |

Set `VITE_SERVER_URL` in your frontend env to your deployed backend URL.

## Tech Stack

- **Frontend**: React 18, React Router 6, Vite
- **Backend**: Node.js, Express, Socket.io
- **Real-time video**: WebRTC (browser-native, no paid SDK)
- **Styling**: CSS Modules, custom design system
