# Rift Bot Development Guide

This document explains how bots work on the Rift platform. Rift exposes a **Discord-compatible API layer**, so most Discord bot libraries (discord.py, discord.js, JDA, etc.) can be pointed at Rift with minimal configuration changes.

---

## Key Concept: Rift Is NOT Discord

Your bot must connect to **Rift's servers**, not Discord's. Every URL that currently points to `discord.com` or `discord.gg` must be overridden to point to your Rift instance instead. If your bot library hard-codes Discord URLs, you need to patch or configure them.

### URLs to Override

| Purpose | Discord Default | Rift Equivalent |
|---|---|---|
| REST API base | `https://discord.com/api/v10` | `https://<RIFT_HOST>/api/v10` |
| Gateway discovery | `https://discord.com/api/v10/gateway/bot` | `https://<RIFT_HOST>/api/v10/gateway/bot` |
| WebSocket gateway | `wss://gateway.discord.gg` | `wss://<RIFT_HOST>/gateway/` |

Replace `<RIFT_HOST>` with your actual Rift backend domain (e.g. `lab1.riftapp.io`).

Both `/api/v10` and `/api/v9` prefixes are supported on Rift — they route to the same handlers.

---

## Authentication

Bots authenticate using a **Bot Token** obtained from the Rift Developer Portal (or the `/api/developers/applications/{appID}/bot/reset-token` endpoint).

- **REST requests**: Send the header `Authorization: Bot <token>` (same format as Discord).
- **Gateway IDENTIFY**: Send the token in the `d.token` field of the Identify payload (same as Discord).

The token is hashed server-side. Rift validates it by looking up the hash in its database — there is no JWT or OAuth involved for bot auth.

---

## Gateway (WebSocket)

The gateway is the real-time event stream. The protocol is **identical to Discord's gateway v10**.

### Connection Flow

1. **Connect** to `wss://<RIFT_HOST>/gateway/` via WebSocket.
2. **Receive HELLO** (opcode 10) with `heartbeat_interval` (currently 41250 ms).
3. **Send IDENTIFY** (opcode 2):
   ```json
   {
     "op": 2,
     "d": {
       "token": "your-bot-token-here",
       "intents": 513,
       "properties": {
         "os": "linux",
         "browser": "my-bot",
         "device": "my-bot"
       }
     }
   }
   ```
4. **Receive READY** (opcode 0, event name `READY`):
   ```json
   {
     "op": 0,
     "t": "READY",
     "s": 1,
     "d": {
       "v": 10,
       "user": { "id": "...", "username": "...", "bot": true, ... },
       "guilds": [{ "id": "...", "unavailable": true }],
       "session_id": "...",
       "application": { "id": "...", "flags": 0 }
     }
   }
   ```
5. **Receive GUILD_CREATE** events for each hub the bot is a member of (sent shortly after READY). Each contains channels, roles, and members — same shape as Discord.
6. **Send heartbeats** (opcode 1) at the interval from HELLO. The server closes the connection if no heartbeat arrives within ~3× the interval.

### Opcodes Supported

| Opcode | Name | Direction |
|---|---|---|
| 0 | Dispatch | Receive |
| 1 | Heartbeat | Send/Receive |
| 2 | Identify | Send |
| 3 | Status Update | Send |
| 6 | Resume | Send |
| 7 | Reconnect | Receive |
| 9 | Invalid Session | Receive |
| 10 | Hello | Receive |
| 11 | Heartbeat ACK | Receive |

### Gateway Events Dispatched to Bots

- `READY` — after successful IDENTIFY
- `RESUMED` — after a Resume
- `GUILD_CREATE` — one per hub the bot belongs to (includes channels, roles, members)
- `INTERACTION_CREATE` — when a user invokes one of the bot's slash commands (see below)

> **Note:** Rift does not currently relay all of Discord's events (e.g. MESSAGE_CREATE is not yet forwarded over the bot gateway). Bots that need to react to messages should use an HTTP interactions endpoint or poll via the REST API.

---

## REST API (Discord-Compatible)

All endpoints live under `/api/v10` (or `/api/v9`). Authentication is via `Authorization: Bot <token>` header.

### Endpoints Available

#### Gateway
| Method | Path | Description |
|---|---|---|
| GET | `/gateway` | Returns `{ "url": "wss://..." }` |
| GET | `/gateway/bot` | Returns gateway URL + shard info |

#### Application / Self
| Method | Path | Description |
|---|---|---|
| GET | `/applications/@me` | Get the bot's own application object |
| GET | `/users/@me` | Get the bot's own user object |
| GET | `/users/{userID}` | Get a user by ID |

#### Guilds (Hubs)
| Method | Path | Description |
|---|---|---|
| GET | `/guilds/{guildID}` | Get a hub (returned as a "guild" object) |
| GET | `/guilds/{guildID}/channels` | List channels (streams) in a hub |
| GET | `/guilds/{guildID}/members` | List members of a hub |
| GET | `/guilds/{guildID}/members/{userID}` | Get a single member |
| GET | `/guilds/{guildID}/roles` | List roles (ranks) in a hub |

#### Channels (Streams)
| Method | Path | Description |
|---|---|---|
| GET | `/channels/{channelID}` | Get a channel |
| GET | `/channels/{channelID}/messages` | Get messages in a channel |
| GET | `/channels/{channelID}/messages/{messageID}` | Get a single message |
| POST | `/channels/{channelID}/messages` | Send a message (`{ "content": "..." }`) |
| DELETE | `/channels/{channelID}/messages/{messageID}` | Delete a message |

#### Application Commands (Slash Commands)
| Method | Path | Description |
|---|---|---|
| PUT | `/applications/{appId}/commands` | Bulk-overwrite global commands |
| GET | `/applications/{appId}/commands` | List global commands |
| DELETE | `/applications/{appId}/commands/{commandId}` | Delete a command |
| PUT | `/applications/{appId}/guilds/{guildId}/commands` | Bulk-overwrite guild-specific commands |
| GET | `/applications/{appId}/guilds/{guildId}/commands` | List guild-specific commands |

---

## Terminology Mapping

Rift uses different names internally but the API translates them for Discord library compatibility:

| Discord Term | Rift Term | Notes |
|---|---|---|
| Guild | Hub | Rift communities |
| Channel | Stream | Text/voice channels within a hub |
| Role | Rank | Permission roles |
| `guild_id` | Hub ID | Same UUID, just different naming |
| `channel_id` | Stream ID | Same UUID |

---

## Slash Commands

### Registering Commands

Use the standard Discord command registration endpoints. Example with discord.py:

```python
# discord.py already calls PUT /applications/{app_id}/commands
# when you sync commands — this works on Rift as-is.
await bot.tree.sync()
```

Or manually via REST:

```
PUT /api/v10/applications/{appId}/commands
Authorization: Bot <token>
Content-Type: application/json

[
  {
    "name": "play",
    "description": "Play a song",
    "type": 1,
    "options": [
      {
        "name": "query",
        "description": "Song name or URL",
        "type": 3,
        "required": true
      }
    ]
  }
]
```

### Receiving Interactions

When a user types `/play` in the Rift frontend, Rift delivers the interaction to your bot via **one** of two methods (checked in order):

1. **HTTP Endpoint** — If your application has an `interactions_endpoint_url` configured, Rift POSTs the interaction payload there. The payload shape matches Discord's Interaction object.

2. **Gateway** — If no HTTP endpoint is set and the bot is connected via WebSocket, Rift dispatches an `INTERACTION_CREATE` event over the gateway.

#### Interaction Payload Shape

```json
{
  "id": "interaction-uuid",
  "application_id": "your-app-id",
  "type": 2,
  "data": {
    "id": "command-uuid",
    "name": "play",
    "type": 1,
    "options": [
      { "name": "query", "type": 3, "value": "never gonna give you up" }
    ]
  },
  "guild_id": "hub-uuid",
  "channel_id": "stream-uuid",
  "member": {
    "user": { "id": "invoking-user-uuid" }
  },
  "token": "interaction-uuid",
  "version": 1
}
```

#### HTTP Endpoint Response

If using the HTTP endpoint method, respond with:

```json
{
  "type": 4,
  "data": {
    "content": "Now playing: Never Gonna Give You Up"
  }
}
```

Rift will post the `data.content` as a message in the channel on behalf of the bot.

#### Gateway Method

If the interaction arrives via gateway, the bot should respond by calling `POST /channels/{channelID}/messages` to send its reply.

---

## Bot Presence (Online Status)

When a bot successfully IDENTIFYs on the gateway, Rift automatically sets its status to **online** (status=1) in the database and broadcasts a `presence_update` to all users who share a hub with the bot. When the gateway connection closes, the bot is set to **offline** (status=0).

Your bot does not need to do anything special to appear online — just stay connected to the gateway.

---

## How to Configure a Discord Bot Library for Rift

The exact method depends on the library, but the general approach is:

### discord.py

```python
import discord

RIFT_HOST = "https://lab1.riftapp.io"  # Your Rift backend URL

class RiftHTTPClient(discord.http.HTTPClient):
    DISCORD_API_BASE = f"{RIFT_HOST}/api/v10"

    # Override the URL builder
    async def static_login(self, token: str) -> None:
        self._HTTPClient__session = aiohttp.ClientSession()
        self.token = token
        # ... rest of login

# OR for newer discord.py, monkey-patch the Route base:
discord.http.Route.BASE = f"{RIFT_HOST}/api/v10"

# For the gateway URL, override get_gateway or get_bot_gateway:
# The /api/v10/gateway/bot endpoint already returns the correct wss:// URL
# pointing to your Rift instance, so if the REST base is correct, this
# should work automatically.

bot = commands.Bot(command_prefix="!", intents=discord.Intents.default())
```

### discord.js

```javascript
const { Client, REST } = require('discord.js');

const RIFT_HOST = 'https://lab1.riftapp.io';

const rest = new REST({ api: `${RIFT_HOST}/api` });
rest.setToken('your-rift-bot-token');

const client = new Client({
  intents: [],
  rest: { api: `${RIFT_HOST}/api` },
  ws: { gateway: `wss://lab1.riftapp.io/gateway/` },
});
```

### Raw WebSocket (any language)

1. `GET https://<RIFT_HOST>/api/v10/gateway/bot` with `Authorization: Bot <token>` header.
2. Read the `url` field from the JSON response.
3. Open a WebSocket to that URL.
4. Follow the gateway flow described above (HELLO → IDENTIFY → READY → heartbeat loop).

---

## Checklist: Porting a Discord Bot to Rift

Use this checklist to audit your bot's source code:

- [ ] **REST base URL** — No hard-coded `https://discord.com/api` or `https://discordapp.com/api`. Must be configurable or overridden to `https://<RIFT_HOST>/api/v10`.
- [ ] **Gateway URL** — No hard-coded `wss://gateway.discord.gg`. Must use the URL returned by `/gateway/bot` or be configurable to `wss://<RIFT_HOST>/gateway/`.
- [ ] **CDN URLs** — Discord CDN (`cdn.discordapp.com`) won't work for Rift assets. Avatar URLs returned by the Rift API are already full URLs — use them as-is.
- [ ] **Bot token** — Use the token from Rift's Developer Portal, not a Discord token. They are separate credentials.
- [ ] **Application ID** — Use the Rift application ID, not the Discord one. Available from `GET /applications/@me`.
- [ ] **Slash command sync** — Call `PUT /applications/{appId}/commands` against the Rift API to register commands. This must happen once (or on bot startup) for commands to appear in the Rift frontend.
- [ ] **Intents** — Rift accepts the intents field but does not gate events behind specific intents (all events the bot is entitled to are sent regardless). You can send any intents value.
- [ ] **Interaction responses** — If using an HTTP interactions endpoint, ensure it's reachable from the Rift backend server. If using gateway-based interactions, respond by sending a message via `POST /channels/{channelID}/messages`.
- [ ] **No Discord-specific features** — Rift does not support: threads, forums, stage channels, automod rules, scheduled events, stickers, or components (buttons/selects) yet. If your bot uses these, those features will silently fail or error.

---

## Environment Variable Recommendation

Keep your Rift connection details configurable:

```env
RIFT_API_BASE=https://lab1.riftapp.io/api/v10
RIFT_GATEWAY_URL=wss://lab1.riftapp.io/gateway/
RIFT_BOT_TOKEN=your-rift-bot-token-here
RIFT_APP_ID=your-rift-application-id
```

This way switching between Discord and Rift (or running on both simultaneously) is a config change, not a code change.

---

## Summary

| What | How |
|---|---|
| Protocol | Discord-compatible (v10 gateway + REST) |
| Auth | `Bot <token>` header / IDENTIFY payload |
| Gateway | `wss://<RIFT_HOST>/gateway/` |
| REST | `https://<RIFT_HOST>/api/v10/...` |
| Slash commands | Register via `PUT /applications/{appId}/commands`, receive via gateway `INTERACTION_CREATE` or HTTP endpoint |
| Messages | `POST /channels/{channelID}/messages` with `{ "content": "..." }` |
| Presence | Automatic — online when connected, offline when disconnected |
| Core change needed | Override all Discord URLs to point to your Rift instance |
