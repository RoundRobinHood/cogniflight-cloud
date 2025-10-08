# API Design Specification
**CogniFlight Cloud Platform**

---

## Table of Contents
1. [API Structure and Protocol](#1-api-structure-and-protocol)
2. [Endpoint Functionality & Resources](#2-endpoint-functionality--resources)
3. [Authentication & Security](#3-authentication--security)
4. [External APIs Integration & Error Handling](#4-external-apis-integration--error-handling)
5. [WebSocket Protocol Specification](#5-websocket-protocol-specification)

---

## 1. API Structure and Protocol

### 1.1 Architecture Overview

**Hybrid API Architecture**:
- **RESTful HTTP** - Session management and authentication
- **WebSocket** - Real-time bidirectional command interface
- **MQTT Plugin** - IoT device authentication via Mosquitto broker

**Communication Protocols**:
| Protocol | Port | Purpose | Encryption |
|----------|------|---------|------------|
| HTTP/HTTPS | 8080 | REST API endpoints | TLS (production) |
| WebSocket (WS/WSS) | 8080 | Command interface | TLS (production) |
| MQTT/MQTTS | 8883 | IoT telemetry | TLS |

**Data Formats**:
- HTTP: JSON request/response
- WebSocket: MessagePack binary encoding
- Storage: YAML files in virtual filesystem
- Database: MongoDB with GridFS

**HTTP Methods**:
- `GET` - Retrieve resources (e.g., `/signup/check-username/:username`)
- `POST` - Create resources or authenticate (e.g., `/login`, `/signup`)

**Naming Conventions**:
- Lowercase with hyphens: `/check-mqtt-user`
- Resource-oriented: `/signup/check-username/:username`
- Nested for related operations: `/signup/*`

---

## 2. Endpoint Functionality & Resources

### 2.1 Authentication Endpoints

#### `POST /login`
Authenticate user and create session.

**Request**:
```json
{"username": "string", "password": "string"}
```

**Response**: `200 OK` with `sessid` cookie (1 hour, HttpOnly, Secure)

**Flow**: Lookup credentials in `/etc/passwd/{username}.login` → Verify bcrypt hash → Generate session token → Store in `/etc/sess/{sessid}.sess` → Set cookie

**Status Codes**: `200` (success), `400` (invalid body), `401` (bad credentials)

---

#### `POST /signup`
Create account with invitation token.

**Request**:
```json
{"username": "string", "password": "string", "token": "string"}
```

**Response**: `200 OK` with `sessid` cookie

**Flow**: Validate token (`/etc/passwd/{token}.signup`) → Parse tags and metadata → Hash password → Create home directory (`/home/{username}`) → Create login file → Create profile → Delete token → Create session

**Status Codes**: `200` (success), `400` (invalid), `401` (bad token), `409` (username exists), `500` (error)

---

#### `GET /signup/check-username/:username?token=<token>`
Check username availability.

**Response**: `200 OK` (available), `401` (bad token), `409` (taken), `500` (error)

**Validates**: Token exists, username not in `/etc/passwd/`, home directory not in `/home/`

---

### 2.2 MQTT Plugin Endpoint

#### `POST /check-mqtt-user`
Authenticate MQTT clients (called by Mosquitto go-auth plugin).

**Request**:
```json
{"clientid": "string", "username": "string", "password": "string"}
```

**Response**: `200` (allow), `400`/`401` (deny)

**Logic**:
- Special client `telegraf-mqtt`: Authenticates with `MQTT_KEY` env variable (constant-time comparison)
- Regular users: Verify password + require `edge-node` tag

---

### 2.3 WebSocket Endpoint

#### `GET /cmd-socket`
Establish WebSocket for command execution.

**Authentication**: Requires valid `sessid` cookie

**Upgrade**: Standard WebSocket handshake → `101 Switching Protocols`

**Message Format**: MessagePack binary (see Section 5)

---

## 3. Authentication & Security

### 3.1 Session Management

**Session Creation**:
- 20-character hex token (cryptographically secure)
- Stored in `/etc/sess/{sessid}.sess` (contains username)
- Cookie: HttpOnly, Secure (HTTPS), 1-hour lifetime

**Password Security**:
- Bcrypt hashing with automatic salt
- Constant-time verification (`util.CheckPwd()`)
- Stored in `/etc/passwd/{username}.login` as YAML

---

### 3.2 Tag-Based Access Control (RBAC)

**Permission Modes**:
| Mode | Field | Purpose |
|------|-------|---------|
| Read | `read_tags` | View file contents |
| Write | `write_tags` | Modify/delete files |
| Execute | `execute_tags` | Traverse directories |
| UpdatePerm | `updatetag_tags` | Change permissions |

**Authorization**: User authorized if **any** of their tags match required tags for operation

**System Roles**:
- `sysadmin` - Full access, bypasses all checks
- `pilot` - Human operators
- `edge-node` - IoT devices (MQTT access)
- `user-{username}` - Personal ownership tag

**Default Home Permissions**:
```yaml
read_tags: [sysadmin, user-{username}]
write_tags: [sysadmin, user-{username}]
execute_tags: [sysadmin, user-{username}]
updatetag_tags: [sysadmin, user-{username}]
```

**Permission Update Rules** (`FsEntryPermissions.CanUpdatePermTags()`):
1. User must have `updatetag_tags` permission
2. Cannot add tags user doesn't possess
3. Cannot remove tags user doesn't possess
4. Cannot remove all own tags (prevents lockout)

---

### 3.3 Security Measures

**Path Traversal Prevention**:
- All paths normalized via `filesystem.CleanupAbsPath()` (resolves `.` and `..`)
- Prefix validation against expected directory
- No regex (avoids ReDoS attacks)

**Transport Security**:
- TLS/SSL for HTTPS, WSS, MQTTS in production
- Traefik reverse proxy with Let's Encrypt
- Self-signed certificates supported for development

**Environment Configuration**:
```bash
MONGO_URI="mongodb://user:password@host:27017/?authSource=admin"
MQTT_KEY="secure_random_key"
BOOTSTRAP_USERNAME/PWD="initial_admin"
IS_HTTPS="TRUE"
DOMAIN="api.cogniflight.com"
```

---

## 4. External APIs Integration & Error Handling

### 4.1 External Services

#### MongoDB
**Purpose**: Virtual filesystem storage

**Connection**: `mongodb://user:password@host:27017/?authSource=admin`

**Collections**:
- `vfs` - Filesystem entries (FsEntry documents)
- `fs.files` - GridFS file metadata
- `fs.chunks` - GridFS file chunks (256KB each)

**Error Handling**: Retry loop with 2s backoff until reachable, 10s initial timeout, 5s query timeout

---

#### ML Engine
**Purpose**: Face recognition, image processing

**Connection**: Unix socket (`/sockets/ml-engine.sock`), JSON-RPC 2.0

**Error Handling**: Retry loop with 2s backoff until connected

---

#### Mosquitto MQTT
**Purpose**: IoT telemetry ingestion

**Integration**: HTTP callback to `/check-mqtt-user` via go-auth plugin

**Config**:
```conf
auth_opt_http_host backend
auth_opt_http_port 8080
auth_opt_http_getuser_uri /check-mqtt-user
```

---

#### Telegraf + InfluxDB
**Purpose**: Time-series telemetry storage

**Flow**: IoT Device → MQTT → Telegraf → InfluxDB

**Telegraf Config**: MQTT subscriber forwarding to InfluxDB with buffering (10k metrics)

---

### 4.2 Error Handling Strategy

**HTTP Status Codes**:
- `200 OK`, `101 Switching Protocols` - Success
- `400 Bad Request` - Malformed JSON, missing fields
- `401 Unauthorized` - Invalid credentials, expired session
- `409 Conflict` - Resource exists
- `500 Internal Server Error` - Database/filesystem errors

**Error Response Format**:
```json
{"error": "human-readable message"}
```

**Logging** (`jlogging`):
- JSON-formatted per-request logs
- No log levels (flat model)
- Automatic panic recovery with stack traces
- Example: `{"status": 401, "message": "Failed to read login file", "path": "/login"}`

**Retry Mechanisms**:
- MongoDB/ML Engine: Infinite retry with 2s backoff
- HTTP/WebSocket: No automatic retry (client responsibility)

**Graceful Shutdown**:
- 5-second timeout for in-flight requests
- Clean WebSocket closure
- MongoDB connection flush

---

## 5. WebSocket Protocol Specification

### 5.1 Connection & Registration

**Handshake**:
```http
GET /cmd-socket HTTP/1.1
Upgrade: websocket
Cookie: sessid=...
```

**Client Registration**:
```javascript
// Client → Server
{
  message_id: "20-char-hex",
  client_id: "term-1",  // Client-generated
  message_type: "connect",
  set_env: {"TERM": "xterm-256color"}  // Optional
}

// Server → Client
{
  message_id: "20-char-hex",
  client_id: "term-1",
  message_type: "connect_acknowledged",
  ref_id: "client-message-id"
}
```

**Environment Initialized**:
- `PWD`: `/home/{username}`
- `HOME`: `/home/{username}`
- Custom vars from `set_env`

---

### 5.2 Message Format

**Structure** (MessagePack binary):
```typescript
interface WebSocketMessage {
  message_id: string;        // 20-char hex (required)
  client_id?: string;
  ref_id?: string;           // References another message_id
  message_type: MessageType; // See below

  // Command fields
  command?: string;
  output_stream?: string;
  input_stream?: string;
  error_stream?: string;
  command_result?: number;   // Exit code

  // Environment/errors
  set_env?: Record<string, string>;
  error?: string;
}
```

**Message Types**:
| Type | Direction | Purpose |
|------|-----------|---------|
| `connect` | C→S | Register client |
| `connect_acknowledged` | S→C | Confirm registration |
| `disconnect` | C→S | Close client |
| `disconnect_acknowledged` | S→C | Confirm closure |
| `run_command` | C→S | Execute command |
| `command_running` | S→C | Command started |
| `command_finished` | S→C | Command done (+ exit code) |
| `output_stream` | S→C | Stdout chunk |
| `error_stream` | S→C | Stderr chunk |
| `input_stream` | C→S | Stdin chunk |
| `stdin_eof` | C→S | Close stdin |
| `err_response` | S→C | Protocol error |

---

### 5.3 Command Execution Flow

**Basic Command**:
```
Client: run_command → Server: command_running
                   → Server: output_stream (0+ times)
                   → Server: error_stream (0+ times)
                   → Server: command_finished (exit code)
```

**With Stdin**:
```
Client: run_command → Server: command_running
Client: input_stream → Server: output_stream (tee echoes)
Client: stdin_eof   → Server: command_finished
```

---

### 5.4 Error Types

**Protocol-Level Errors** (`err_response`): Message invalid at WebSocket layer
- Invalid MessagePack encoding
- Non-binary WebSocket frame
- Unknown/unregistered `client_id`
- **No command executed**

**Command-Level Errors** (`error_stream` + non-zero `command_result`): Command failed during execution
- Unknown command name
- Permission denied
- File not found
- **Command lifecycle completes**: running → streams → finished

**Example (Protocol Error)**:
```javascript
{message_type: "err_response", error: "invalid client_id: client does not exist"}
// No command_running or command_finished
```

**Example (Command Error)**:
```javascript
{message_type: "command_running"}
{message_type: "error_stream", error_stream: "permission denied\r\n"}
{message_type: "command_finished", command_result: 1}
```

---

### 5.5 Currently Available Commands

#### `ls [OPTIONS] [PATHS...]`
List directory contents.

**Options**: `-l` (long format), `-y/--yaml` (YAML output)

**Long Format Columns**: type | read_tags | write_tags | execute_tags | updatetag_tags | count | size | modified | name

**Permissions**: Requires `execute` on parent, `read` on directory

---

#### `cat [FILES...]`
Display file contents (or stdin if no args).

**Permissions**: Requires `read` on files

---

#### `mkdir PATHS...`
Create directories.

**Permissions**: Requires `write` on parent

---

#### `tee FILES...`
Read stdin, write to stdout and files.

**Behavior**: Single GridFS upload, multiple filesystem references

**Permissions**: Requires `write` on parent directories

---

#### `echo [OPTIONS] [STRINGS...]`
Output text.

**Options**: `-e/--escape` (interpret escapes), `-n/--no_newline`

---

#### `whoami`
Display user info (AuthStatus + user.profile).

---

#### `error MESSAGE...`
Internal error command (outputs to stderr, exit code 1).

---

### 5.6 Planned Commands

#### `cp [OPTIONS] SOURCE... DEST` (PLANNED)
Copy files/directories.

**Options**: `-r/-R` (recursive)

**Behavior**: Creates new GridFS references, preserves/inherits permissions

---

#### `mv SOURCE... DEST` (PLANNED)
Move/rename files/directories.

**Behavior**: Updates parent references (fast), preserves metadata

---

#### `rm [OPTIONS] PATHS...` (PLANNED)
Remove files/directories.

**Options**:
- `-r` (recursive)
- `-f` (force using parent's `updatetag_tags` - allows admins to remove files they don't own)

**Force Mode Logic**:
```yaml
# Parent: /home/pilot1 has updatetag_tags: [sysadmin, user-pilot1]
# File: /home/pilot1/locked has write_tags: [sysadmin]
# Command: rm -f locked
# Success: user has user-pilot1 in parent's updatetag_tags
```

---

#### `grep [OPTIONS] PATTERN [FILES...]` (PLANNED)
Search file contents (basic regex via Go `regexp`).

**Options**: `-i` (case-insensitive), `-n` (line numbers), `-r/-R` (recursive), `-v` (invert), `-c` (count), `-l` (filenames only), `-H/-h` (show/hide filenames)

---

#### `mkdir -p PATHS...` (PLANNED)
Enhanced mkdir with parent creation.

**Behavior**: Creates missing parents, idempotent (no error if exists)

---

#### `chmod [OPTIONS] TAG[+-]PERMISSION... PATH...` (PLANNED)
Change file permissions (tag-based).

**Options**: `-r/-R` (recursive)

**Permission Types**: `r` (read), `w` (write), `x` (execute), `p` (updatetag)

**Syntax**: `chmod user-pilot2+r /home/pilot1/shared.txt` (adds user-pilot2 to read_tags)

**Multiple Ops**: `chmod user-pilot2+r user-pilot2+x /path`

**Validation**: Uses `CanUpdatePermTags()` logic - cannot add/remove tags user doesn't possess, cannot lock self out

---

### 5.7 Shell Features

**Supported** (via `sh` library using mvdan's AST parser):
- Environment variable expansion: `$VAR`, `${VAR}`
- Tilde expansion: `~` → `$HOME`
- Working directory tracking (`cd` command)
- Exit status tracking (`?` variable)

**Planned** (not yet implemented):
- Command substitution: `$(cmd)`
- Piping: `cmd1 | cmd2`
- Redirects: `cmd > file`
- Background jobs: `cmd &`

**Security**: No `/bin/sh` subprocess, only predefined commands, parsed as structured AST

---

### 5.8 Concurrency & Performance

**Multiplexing**: Single WebSocket supports multiple clients (multiplexed by `client_id`)

**Per-Client Limits**:
- One command at a time (must wait for `command_finished`)
- Message ordering preserved (Go channels)
- Stdin buffering in order

**Cross-Client**:
- No isolation (filesystem ops interleave)
- No transactions
- Permissions enforced independently

**Throughput** (estimated):
- Simple commands: ~1000 req/s
- Filesystem ops: ~500 req/s (MongoDB limited)
- File uploads: ~100 req/s (GridFS limited)

**Message Limits**:
- WebSocket frame: 1 MB max
- GridFS chunk: 256 KB
- Output buffering: Unbounded (potential DoS)

---

### 5.9 Error Recovery

**WebSocket Disconnect**: Frontend auto-reconnects with exponential backoff (1s, 2s, 4s, 8s, 16s)

**Partial Command**: If connection drops mid-command, client detects missing `command_finished` and can retry

**Idempotency**:
- `ls`, `cat`, `whoami`: Idempotent (safe to retry)
- `mkdir`: Idempotent if exists (409)
- `tee`, planned `cp`: Not idempotent

---

## 6. Summary

**Architecture**:
- RESTful HTTP (auth) + WebSocket (commands) + MQTT (IoT)
- MongoDB (storage) + InfluxDB (telemetry) + ML Engine (ML)

**Authentication**:
- Bcrypt passwords, session cookies (HttpOnly, 1hr)
- Tag-based RBAC with 4 permission modes
- Path traversal prevention, TLS encryption

**WebSocket Protocol**:
- MessagePack binary encoding
- Multiple client sessions per connection
- 12 message types for command execution
- 7 current commands + 6 planned commands
- Environment expansion, tilde expansion supported
- Piping/substitution/redirects planned

**Error Handling**:
- JSON error responses for HTTP
- Protocol vs command-level errors for WebSocket
- Retry logic for MongoDB/ML Engine
- Graceful shutdown (5s timeout)

**Status Codes**: `200/101` (success), `400/401/409` (client errors), `500` (server errors)

---

## Appendix: Quick Reference

**Message Types**:
| Type | Dir | Purpose |
|------|-----|---------|
| connect | C→S | Register client |
| connect_acknowledged | S→C | Confirm registration |
| run_command | C→S | Execute command |
| command_running | S→C | Started |
| command_finished | S→C | Done (exit code) |
| output_stream | S→C | Stdout |
| error_stream | S→C | Stderr |
| input_stream | C→S | Stdin |
| stdin_eof | C→S | Close stdin |
| disconnect | C→S | Close client |
| disconnect_acknowledged | S→C | Confirm closure |
| err_response | S→C | Protocol error |

**Commands**:
- **Current**: ls, cat, mkdir, tee, echo, whoami, error
- **Planned**: cp, mv, rm, grep, chmod, mkdir -p

**Permissions**:
- read_tags (view), write_tags (modify), execute_tags (traverse), updatetag_tags (chmod)

---

**Document Version**: 2.0 (Condensed)
**Last Updated**: 2025-10-08
**Project**: CogniFlight Cloud Platform
