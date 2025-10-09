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

The CogniFlight Cloud platform implements a **hybrid API architecture** consisting of:

1. **RESTful HTTP Endpoints** - For session management and authentication
2. **WebSocket-based Command Interface** - For real-time bidirectional communication
3. **MQTT Plugin Endpoints** - For IoT device authentication via Mosquitto broker

### 1.2 HTTP Methods Used

| Method | Purpose | Endpoints |
|--------|---------|-----------|
| `GET` | Retrieve resources or check availability | `/signup/check-username/:username` |
| `POST` | Create resources or authenticate | `/login`, `/signup`, `/check-mqtt-user` |

### 1.3 Endpoint Naming Conventions

The API follows clear, consistent REST conventions:

- **Lowercase with hyphens**: `/check-mqtt-user`
- **Resource-oriented paths**: `/signup/check-username/:username`
- **Nested resources**: `/signup/*` for signup-related operations
- **Action verbs when necessary**: `/check-mqtt-user` for specialized validation

### 1.4 Communication Protocols

| Protocol | Port | Purpose | Encryption |
|----------|------|---------|------------|
| HTTP/HTTPS | 8080 | REST API endpoints | TLS (production) |
| WebSocket (WS/WSS) | 8080 | Real-time command interface | TLS (production) |
| MQTT/MQTTS | 8883 | IoT device telemetry | TLS |

### 1.5 Data Formats

- **Request/Response Format**: JSON for HTTP endpoints
- **WebSocket Messages**: MessagePack (binary serialization)
- **Internal Storage**: YAML files in virtual filesystem
- **Database**: MongoDB with GridFS for file storage

---

## 2. Endpoint Functionality & Resources

### 2.1 Session Acquisition & Baseline Authentication Endpoints

#### 2.1.1 `POST /login`

**Purpose**: Authenticate user credentials and establish a session.

**Request Format** (JSON):
```json
{
  "username": "string (required)",
  "password": "string (required)"
}
```

**Response Format**:
- **Status Code**: `200 OK`
- **Headers**: Sets HTTP-only session cookie `sessid`
- **Cookie Parameters**:
  - `name`: `sessid`
  - `maxAge`: 3600 seconds (1 hour)
  - `httpOnly`: true
  - `secure`: true (if HTTPS enabled)
  - `domain`: configured via `DOMAIN` environment variable

**Status Codes**:
- `200 OK` - Authentication successful, session established
- `400 Bad Request` - Invalid request body (missing/malformed fields)
- `401 Unauthorized` - Invalid username or password

**Authentication Flow**:
1. Client submits username and password
2. Server looks up user credentials in `/etc/passwd/{username}.login`
3. Password verified using bcrypt hashing
4. Session ID generated (cryptographically secure token)
5. Session stored in `/etc/sess/{sessid}.sess` containing username
6. HTTP-only cookie set with session ID

**Example**:
```javascript
// Request
POST /login
Content-Type: application/json

{
  "username": "pilot1",
  "password": "secure_password"
}

// Response (Success)
HTTP/1.1 200 OK
Set-Cookie: sessid=a1b2c3d4e5f6g7h8i9j0; Path=/; HttpOnly; Secure
```

---

#### 2.1.2 `POST /signup`

**Purpose**: Create a new user account with an invitation token.

**Request Format** (JSON):
```json
{
  "username": "string (required)",
  "password": "string (required)",
  "token": "string (required, signup invitation token)"
}
```

**Response Format**:
- **Status Code**: `200 OK`
- **Headers**: Sets HTTP-only session cookie `sessid`
- **Cookie Parameters**: Same as `/login`

**Status Codes**:
- `200 OK` - Account created successfully, session established
- `400 Bad Request` - Invalid request body or path traversal attempt
- `401 Unauthorized` - Invalid or expired signup token
- `409 Conflict` - Username already exists
- `500 Internal Server Error` - Database/filesystem operation failed

**Signup Flow**:
1. Client submits username, password, and invitation token
2. Server validates token by reading `/etc/passwd/{token}.signup`
3. Signup file contains:
   - `tags`: User role tags (e.g., `["pilot"]`, `["edge-node"]`)
   - `home_permissions`: Optional custom permissions for home directory
   - Additional metadata fields (email, phone, role)
4. Server creates:
   - Password hash using bcrypt
   - Home directory at `/home/{username}`
   - Login file at `/etc/passwd/{username}.login`
   - User profile at `/home/{username}/user.profile`
   - Session file at `/etc/sess/{sessid}.sess`
5. Signup token file is deleted
6. Session cookie returned

**Example**:
```javascript
// Request
POST /signup
Content-Type: application/json

{
  "username": "pilot1",
  "password": "secure_password",
  "token": "abc123xyz789"
}

// Response (Success)
HTTP/1.1 200 OK
Set-Cookie: sessid=k1l2m3n4o5p6q7r8s9t0; Path=/; HttpOnly; Secure
```

---

#### 2.1.3 `GET /signup/check-username/:username`

**Purpose**: Validate username availability during signup process.

**Request Format**:
- **Method**: GET
- **URL Parameter**: `:username` - Username to check
- **Query Parameter**: `token` (required) - Signup invitation token

**Response Format**:
- **Status Code**: `200 OK` - Username available
- **Body**: Empty

**Status Codes**:
- `200 OK` - Username is available
- `400 Bad Request` - Invalid username format
- `401 Unauthorized` - Invalid or missing signup token
- `409 Conflict` - Username already taken
- `500 Internal Server Error` - Database lookup failed

**Validation Checks**:
1. Signup token validity (must exist in `/etc/passwd/`)
2. Path traversal prevention
3. Username not already in `/etc/passwd/{username}.login`
4. Home directory not already at `/home/{username}`

**Example**:
```javascript
// Request
GET /signup/check-username/pilot1?token=abc123xyz789

// Response (Available)
HTTP/1.1 200 OK

// Response (Taken)
HTTP/1.1 409 Conflict
```

---

### 2.2 MQTT Plugin Endpoints

#### 2.2.1 `POST /check-mqtt-user`

**Purpose**: Authenticate MQTT clients for Mosquitto broker via go-auth plugin.

**Request Format** (JSON):
```json
{
  "clientid": "string (required)",
  "username": "string (required)",
  "password": "string (required)"
}
```

**Response Format**:
- **Status Code**: `200 OK` or `401 Unauthorized`
- **Body**: Empty

**Status Codes**:
- `200 OK` - MQTT client authenticated successfully
- `400 Bad Request` - Invalid request body
- `401 Unauthorized` - Authentication failed

**Authentication Logic**:
1. **Special Client**: `telegraf-mqtt`
   - Authenticates using `MQTT_KEY` environment variable
   - Uses constant-time comparison for security
   - Used for internal telemetry collection

2. **Regular Users**:
   - Looks up credentials in `/etc/passwd/{username}.login`
   - Verifies password using bcrypt
   - **Requires `edge-node` tag** for access
   - Only users with edge-node role can connect to MQTT

**Example**:
```javascript
// Request (Edge Node)
POST /check-mqtt-user
Content-Type: application/json

{
  "clientid": "drone-001",
  "username": "edge_pilot",
  "password": "device_password"
}

// Response (Success)
HTTP/1.1 200 OK

// Request (Telegraf)
POST /check-mqtt-user
Content-Type: application/json

{
  "clientid": "telegraf-mqtt",
  "username": "telegraf-mqtt",
  "password": "mqttpass"
}

// Response (Success)
HTTP/1.1 200 OK
```

---

### 2.3 WebSocket Command Interface

#### 2.3.1 `GET /cmd-socket`

**Purpose**: Establish WebSocket connection for executing commands in virtual filesystem.

**Authentication**: Requires valid session cookie (`sessid`)

**Connection Upgrade**:
```http
GET /cmd-socket HTTP/1.1
Host: api.cogniflight.com
Upgrade: websocket
Connection: Upgrade
Cookie: sessid=a1b2c3d4e5f6g7h8i9j0
Sec-WebSocket-Version: 13
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
```

**Response**:
```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

**Message Format**: MessagePack-encoded binary messages (see Section 5 for protocol details)

**Status Codes**:
- `101 Switching Protocols` - WebSocket upgrade successful
- `400 Bad Request` - Invalid WebSocket upgrade request
- `401 Unauthorized` - Missing or invalid session cookie

---

## 3. Authentication & Security

### 3.1 Authentication Mechanisms

#### 3.1.1 Session-Based Authentication (HTTP/WebSocket)

**Session Creation**:
- Generated using cryptographically secure random token (via `util.GenerateToken()`)
- 20-character hexadecimal string
- Stored in MongoDB GridFS as session file
- Session file contains username in plaintext

**Session Storage**:
- Location: `/etc/sess/{sessid}.sess` in virtual filesystem
- Format: Plain text username
- Permissions: `sysadmin` tag required for access
- Lifetime: 1 hour (configurable via cookie maxAge)

**Cookie Security**:
- `HttpOnly`: true (prevents JavaScript access)
- `Secure`: true (HTTPS only, when `IS_HTTPS=TRUE`)
- `Path`: `/` (available to all endpoints)
- `Domain`: Configurable via environment variable
- `SameSite`: Default (Cross-site request protection)

#### 3.1.2 Password Security

**Hashing Algorithm**: bcrypt
- Work factor: Default bcrypt cost
- Salt: Generated per-password
- Verification: Constant-time comparison via `util.CheckPwd()`

**Password Storage**:
- Location: `/etc/passwd/{username}.login`
- Format: YAML with CRLF line endings
```yaml
password: $2a$10$abcdefghijklmnopqrstuv.1234567890ABCDEFGHIJKLMNOPQRS
tags:
  - pilot
  - user-pilot1
```

#### 3.1.3 MQTT Authentication

**Standard Users**:
- Username/password validated against `/etc/passwd/{username}.login`
- Must have `edge-node` tag in credentials
- Bcrypt password verification

**System Users**:
- Client ID: `telegraf-mqtt`
- Password: `MQTT_KEY` environment variable
- Constant-time comparison for timing attack prevention

### 3.2 Authorization & Access Control

#### 3.2.1 Tag-Based Permission System

**Permission Modes**:
| Mode | Purpose | Example Use Case |
|------|---------|------------------|
| `read_tags` | Read file/directory contents | View flight logs |
| `write_tags` | Create/modify/delete files | Update user profile |
| `execute_tags` | Traverse directories | Access subdirectories |
| `updatetag_tags` | Modify permissions | Grant access to collaborators |

**Tag Assignment**:
- `sysadmin`: Full system access (bypasses all permission checks)
- `user-{username}`: Personal ownership tag assigned at signup
- Role tags: `pilot`, `edge-node`, `admin` (defined in signup token)

**Permission Evaluation**:
```go
// User authorized if ANY of their tags match required tags
func IsAllowed(mode FsAccessMode, userTags []string) bool {
    requiredTags := getRequiredTags(mode) // e.g., read_tags
    for _, userTag := range userTags {
        if contains(requiredTags, userTag) {
            return true
        }
    }
    return false
}
```

**Default Home Directory Permissions**:
```yaml
read_tags: [sysadmin, user-{username}]
write_tags: [sysadmin, user-{username}]
execute_tags: [sysadmin, user-{username}]
updatetag_tags: [sysadmin, user-{username}]
```

#### 3.2.2 Path Traversal Prevention

**Security Measures**:
1. **Path Normalization**: `filesystem.CleanupAbsPath()` resolves `.` and `..`
2. **Prefix Validation**: All paths validated against expected prefixes
   ```go
   // Example from login.go:30-39
   if !strings.HasPrefix(clean_path, "/etc/passwd/") {
       return error("path traversal detected")
   }
   ```
3. **Absolute Path Enforcement**: Relative paths converted to absolute using PWD
4. **Regex-free Validation**: No regex parsing to avoid ReDoS attacks

### 3.3 Role-Based Access Control (RBAC)

#### 3.3.1 System Roles

| Role | Tags | Permissions | Use Case |
|------|------|-------------|----------|
| **System Admin** | `sysadmin` | Full system access, bypass all checks | Platform administration |
| **Pilot** | `pilot`, `user-{username}` | Personal home directory, flight operations | Human operators |
| **Edge Node** | `edge-node`, `user-{username}` | MQTT access, telemetry upload | IoT devices, drones |
| **Standard User** | `user-{username}` | Personal home directory only | General users |

#### 3.3.2 Authorization Middleware

**Implementation** (`auth_middleware.go`):
```go
func AuthMiddleware(filestore Store) gin.HandlerFunc {
    1. Extract sessid cookie
    2. Read /etc/sess/{sessid}.sess → username
    3. Read /etc/passwd/{username}.login → credentials
    4. Parse YAML to get user tags
    5. Inject AuthorizationStatus into request context:
       {
         Username: "pilot1",
         Tags: ["pilot", "user-pilot1"]
       }
}
```

**Injected Context Data**:
```go
type AuthorizationStatus struct {
    Username string   // e.g., "pilot1"
    Tags     []string // e.g., ["pilot", "user-pilot1"]
}
```

### 3.4 Security Best Practices

#### 3.4.1 Environment-Based Configuration

**Sensitive Configuration**:
```bash
# MongoDB credentials
MONGO_URI="mongodb://user:password@host:27017/?authSource=admin"

# MQTT authentication key
MQTT_KEY="secure_random_key"

# Bootstrap admin account
BOOTSTRAP_USERNAME="admin"
BOOTSTRAP_PWD="initial_password"

# TLS configuration
IS_HTTPS="TRUE"
DOMAIN="api.cogniflight.com"
```

#### 3.4.2 Transport Security

**TLS/SSL**:
- HTTPS enforced in production (`IS_HTTPS=TRUE`)
- MQTT over TLS (port 8883)
- WebSocket Secure (WSS) in production
- Self-signed certificates supported for development

**Certificate Management**:
- Certificates mounted from `./self-signed-certs/` or custom path
- Traefik automatic HTTPS via Let's Encrypt (production)

#### 3.4.3 Database Security

**MongoDB**:
- Authentication required (`authSource=admin`)
- Credentials stored in environment variables
- Connection pooling via Go driver
- GridFS for secure file storage with access control

**Virtual Filesystem**:
- All files have explicit permission tags
- No anonymous access (all operations require authentication)
- Audit trail via MongoDB timestamps (`created_at`, `modified_at`, `accessed_at`)

---

## 4. External APIs Integration & Error Handling

### 4.1 External Service Integration

#### 4.1.1 MongoDB Database

**Purpose**: Persistent storage for virtual filesystem and user data

**Connection**:
```go
uri := os.Getenv("MONGO_URI")
// Format: mongodb://user:password@host:27017/?authSource=admin
client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
```

**Collections**:
- `vfs`: Virtual filesystem entries (FsEntry documents)
- `fs.files`: GridFS file metadata
- `fs.chunks`: GridFS file chunks (256KB each)

**Error Handling**:
- Connection retry loop with 2-second backoff
- Ping check before accepting connections
- Graceful degradation: Server waits indefinitely for MongoDB
- Context-based timeouts (10s for initial connection)

**Integration Flow**:
```go
// Startup retry logic (main.go:44-78)
for {
    if err := client.Ping(ctx, nil); err != nil {
        log.Printf("[MongoDB] Not reachable: %v", err)
        time.Sleep(2 * time.Second)
        continue
    }
    log.Println("[MongoDB] Connection established!")
    break
}
```

---

#### 4.1.2 ML Engine (Machine Learning Service)

**Purpose**: Face recognition, image processing, ML inference

**Connection**: Unix domain socket (`/sockets/ml-engine.sock`)

**Protocol**: JSON-RPC 2.0 over Unix socket

**Setup**:
```go
mlSockFile := os.Getenv("ML_SOCK_FILE") // Default: "../ml-engine/test.sock"
conn, err := net.Dial("unix", mlSockFile)
stream := jsonrpc2.NewPlainObjectStream(conn)
jsonrpcConn := jsonrpc2.NewConn(ctx, stream, nil)
```

**Error Handling**:
- Connection retry with 2-second backoff
- Non-blocking: Server waits for ML engine before starting HTTP server
- Timeout: None (waits indefinitely)

**Use Cases**:
- User face embedding generation during signup
- Image analysis for flight data
- Anomaly detection in telemetry

---

#### 4.1.3 Mosquitto MQTT Broker (via go-auth)

**Purpose**: IoT device telemetry ingestion

**Integration Point**: HTTP callback from Mosquitto go-auth plugin

**Configuration** (`mosquitto.conf`):
```conf
auth_plugin /mosquitto/go-auth.so
auth_opt_backends http
auth_opt_http_host backend
auth_opt_http_port 8080
auth_opt_http_getuser_uri /check-mqtt-user
```

**Authentication Flow**:
```
1. IoT device connects to MQTT broker (port 8883)
2. Mosquitto go-auth plugin calls POST /check-mqtt-user
3. Backend validates credentials
4. Returns 200 OK (allow) or 401 Unauthorized (deny)
5. Mosquitto accepts/rejects connection
```

**Error Handling**:
- Timeout: Mosquitto plugin has built-in timeout (default 5s)
- Retry: Mosquitto retries on network errors
- Fallback: `allow_anonymous true` (can be disabled in production)

---

#### 4.1.4 Telegraf (Metrics Collection)

**Purpose**: Collect MQTT telemetry and forward to InfluxDB

**Connection**:
```bash
MQTT_URL="ssl://mosquitto:8883"
MQTT_KEY="mqttpass"
INFLUX_URL="http://influxdb:8086"
INFLUX_TOKEN="mytoken"
```

**Data Flow**:
```
IoT Device → MQTT (Mosquitto) → Telegraf → InfluxDB
```

**Error Handling**:
- MQTT reconnection: Automatic with exponential backoff
- InfluxDB buffering: 10,000 metrics in memory
- TLS verification: `INSECURE_SKIP_VERIFY=true` for development

---

#### 4.1.5 InfluxDB (Time-Series Database)

**Purpose**: Store and query telemetry time-series data

**Connection**: HTTP API
```bash
INFLUX_URL="http://influxdb:8086"
INFLUX_TOKEN="mytoken"
INFLUX_ORG="myorg"
INFLUX_BUCKET="telegraf"
```

**Error Handling**:
- Backend does not directly connect to InfluxDB
- Telegraf handles all buffering and retry logic
- Write failures buffered in Telegraf (configurable limit)

---

### 4.2 Error Handling Strategies

#### 4.2.1 HTTP Status Code Usage

**Success Codes**:
- `200 OK`: Successful operation
- `101 Switching Protocols`: WebSocket upgrade

**Client Error Codes** (4xx):
- `400 Bad Request`: Malformed JSON, missing required fields
  ```json
  {"error": "json: cannot unmarshal string into Go struct field"}
  ```
- `401 Unauthorized`: Invalid credentials, missing/expired session
- `403 Forbidden`: Valid auth but insufficient permissions (rarely used)
- `409 Conflict`: Resource already exists (username taken, file exists)

**Server Error Codes** (5xx):
- `500 Internal Server Error`: Database failures, filesystem errors, unexpected exceptions

#### 4.2.2 Structured Error Responses

**JSON Error Format**:
```json
{
  "error": "human-readable error message"
}
```

**Example from `login.go:24-28`**:
```go
if err := c.ShouldBindJSON(&req); err != nil {
    c.JSON(400, gin.H{"error": err.Error()})
    return
}
```

#### 4.2.3 Logging & Observability

**Logging Framework**: `jlogging` (JSON-based request logging middleware for Gin)

**Characteristics**:
- Single log entry per HTTP request
- JSON-formatted output for structured logging
- No log levels (flat logging model)
- Supports dynamic detail attachment during request lifecycle
- Built-in panic recovery with stack traces

**Logged Information**:
```go
l := jlogging.MustGet(c) // Extract logger from context
l.Printf("Failed to read login file: %v", err)
// No log levels - all messages treated equally
```

**Panic Recovery**:
```go
// Automatic panic handling with details:
type PanicDetails struct {
    Descriptor  any    `json:"desc"`
    PriorStatus int    `json:"oldStatus"`
    StackTrace  string `json:"stackTrace"`
}
```

**Example Log Output**:
```json
{
  "status": 401,
  "logs": [ "Failed to read login file: permission denied" ],
  "uri": "/login",
  "method": "POST",
  "ip": "127.0.0.1",
  "details": {},
  "error": null,
  "time": "2025-10-08T14:01:00Z"
}
```

#### 4.2.4 Timeout Handling

**MongoDB Operations**:
- Initial connection: 10-second timeout
- Queries: 5-second timeout (default)
- Writes: 10-second timeout

**WebSocket**:
- Read timeout: None (long-lived connection)
- Write timeout: 5 seconds
- Ping/Pong: 60-second interval (browser-managed)

**MQTT Authentication**:
- HTTP timeout: 5 seconds (Mosquitto plugin default)
- Connection timeout: 30 seconds

#### 4.2.5 Retry Mechanisms

**MongoDB Connection**:
```go
for {
    if err := client.Ping(ctx, nil); err != nil {
        log.Printf("[MongoDB] Not reachable: %v", err)
        time.Sleep(2 * time.Second) // Exponential backoff could be added
    } else {
        break
    }
}
```

**ML Engine Connection**:
```go
for {
    if conn, err = net.Dial("unix", mlSockFile); err != nil {
        fmt.Printf("Failed to connect to ml-engine (%v). Waiting...\n", err)
        time.Sleep(2 * time.Second)
    } else {
        break
    }
}
```

**No Retry**:
- HTTP API requests (client responsible for retry)
- WebSocket messages (application-level retry in frontend)

#### 4.2.6 Graceful Degradation

**Startup Sequence**:
1. MongoDB connection (blocks until available)
2. ML Engine connection (blocks until available)
3. HTTP server starts (accepts requests)

**Partial Availability**:
- If MongoDB disconnects: All requests fail with 500
- If ML Engine disconnects: Face recognition unavailable, other features work
- If MQTT broker down: Authentication requests fail, REST API unaffected

**Graceful Shutdown**:
```go
quit := make(chan os.Signal, 1)
signal.Notify(quit, os.Interrupt)

<-quit // Wait for SIGINT/SIGTERM

ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

server.Shutdown(ctx) // Graceful shutdown with 5s timeout
```

**Shutdown Behavior**:
- Finish in-flight requests (up to 5 seconds)
- Close WebSocket connections cleanly
- Flush MongoDB connection pool
- Close ML Engine socket

#### 4.2.7 Error Recovery Examples

**Database Query Failure**:
```go
bytes, err := filestore.LookupReadAll(ctx, clean_path, tags)
if err != nil {
    l.Printf("failed to read login file: %v", err)
    c.Status(401) // Don't leak error details to client
    return
}
```

**File Upload Failure**:
```go
stream, err := filestore.Bucket.OpenUploadStreamWithID(fileRef, "")
if err != nil {
    l.Printf("failed to open upload stream: %v", err)
    c.Status(500)
    return
}
// Ensure cleanup on error
defer stream.Close()
```

**Transaction-like Operations**:
```go
// Signup creates multiple resources atomically
// No formal transactions, but errors rollback by cleanup:
1. Create GridFS files (loginFile, profileFile)
2. Create home directory
3. Create user.profile file
4. Create passwd file
5. Delete signup token
6. Create session

// If step 5 fails, previous files remain orphaned
// Mitigated by:
// - Unique constraints (prevent duplicate username)
// - Pre-validation (check existence before creating)
```

---

## 5. WebSocket Protocol Specification

### 5.1 Overview

The WebSocket interface at `/cmd-socket` provides a **real-time, bidirectional command execution environment** operating on a tag-based virtual filesystem. Clients can run Unix-like commands (`ls`, `cat`, `mkdir`, `tee`, `echo`, `whoami`) and receive streaming output.

**Key Features**:
- Multiple concurrent client sessions per WebSocket connection
- Command input/output streaming
- Tag-based permission model
- MessagePack binary encoding for efficiency

---

### 5.2 Connection Lifecycle

#### 5.2.1 WebSocket Handshake

**Client Request**:
```http
GET /cmd-socket HTTP/1.1
Host: api.cogniflight.com
Upgrade: websocket
Connection: Upgrade
Cookie: sessid=a1b2c3d4e5f6g7h8i9j0
Sec-WebSocket-Version: 13
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
```

**Server Response**:
```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

**Authentication**:
- Session cookie (`sessid`) validated via `AuthMiddleware`
- User's `username` and `tags` injected into WebSocket context
- Invalid session → 401 Unauthorized (before WebSocket upgrade)

#### 5.2.2 Client Registration

After WebSocket connection established, client must register a **client session**:

**Client → Server**:
```javascript
{
  message_id: "a1b2c3d4e5f6g7h8i9j0", // 20-char hex string
  client_id: "term-1",                 // Client-generated unique ID
  message_type: "connect",
  set_env: {                           // Optional environment variables
    "TERM": "xterm-256color"
  }
}
```

**Server → Client**:
```javascript
{
  message_id: "k1l2m3n4o5p6q7r8s9t0", // Server-generated
  client_id: "term-1",
  message_type: "connect_acknowledged",
  ref_id: "a1b2c3d4e5f6g7h8i9j0"      // References client's message_id
}
```

**Server-Side Behavior** (`endpoint.go:126-159`):
1. Generate unique message ID for response
2. Initialize client environment:
   ```go
   client_map := map[string]string{
       "PWD": "/home/{username}",
       "HOME": "/home/{username}",
       ...set_env
   }
   ```
3. Create bidirectional channels (`In`, `Out`)
4. Spawn goroutine to handle client commands (`RunClient()`)
5. Acknowledge connection

---

### 5.3 Message Format

All messages encoded as **MessagePack binary format**.

#### 5.3.1 Base Message Structure

```typescript
interface WebSocketMessage {
  // Identification
  message_id: string;      // 20-char hex (required)
  client_id?: string;      // Client session ID
  ref_id?: string;         // References another message_id

  // Message type (required)
  message_type: MessageType;

  // Command-related fields
  command?: string;        // Shell command to execute
  output_stream?: string;  // Stdout data
  input_stream?: string;   // Stdin data
  error_stream?: string;   // Stderr data
  command_result?: number; // Exit code (0 = success)

  // Environment
  set_env?: Record<string, string>;

  // Errors
  error?: string;          // System error message
}
```

#### 5.3.2 Message Types

**Connection Management**:
| Type | Direction | Purpose |
|------|-----------|---------|
| `connect` | Client → Server | Register new client session |
| `connect_acknowledged` | Server → Client | Confirm registration |
| `disconnect` | Client → Server | Close client session |
| `disconnect_acknowledged` | Server → Client | Confirm closure |

**Command Execution**:
| Type | Direction | Purpose |
|------|-----------|---------|
| `run_command` | Client → Server | Execute command |
| `command_running` | Server → Client | Command started |
| `command_finished` | Server → Client | Command completed |

**Data Streaming**:
| Type | Direction | Purpose |
|------|-----------|---------|
| `output_stream` | Server → Client | Stdout data chunk |
| `error_stream` | Server → Client | Stderr data chunk |
| `input_stream` | Client → Server | Stdin data chunk |
| `stdin_eof` | Client → Server | Close stdin |

**Error Handling**:
| Type | Direction | Purpose |
|------|-----------|---------|
| `err_response` | Server → Client | Protocol-level errors (invalid MessagePack, non-binary messages, unknown client_id) |

---

### 5.4 Command Execution Protocol

#### 5.4.1 Basic Command Flow

**1. Client sends command**:
```javascript
{
  message_id: "cmd001",
  client_id: "term-1",
  message_type: "run_command",
  command: "ls -l /home/pilot1"
}
```

**2. Server acknowledges start**:
```javascript
{
  message_id: "srv001",
  client_id: "term-1",
  message_type: "command_running",
  ref_id: "cmd001"
}
```

**3. Server streams output** (multiple messages):
```javascript
{
  message_id: "srv002",
  client_id: "term-1",
  message_type: "output_stream",
  ref_id: "cmd001",
  output_stream: "directory\tsysadmin\tsysadmin\tsysadmin\tsysadmin\t0\t0\tJan  1 12:00 2025\tflights\r\n"
}
```

**4. Server sends completion**:
```javascript
{
  message_id: "srv003",
  client_id: "term-1",
  message_type: "command_finished",
  ref_id: "cmd001",
  command_result: 0  // Exit code (0 = success)
}
```

#### 5.4.2 Command with Stdin

**Use Case**: `echo "hello world" | tee myfile.txt`

**1. Client sends command**:
```javascript
{
  message_id: "cmd002",
  client_id: "term-1",
  message_type: "run_command",
  command: "tee myfile.txt"
}
```

**2. Server acknowledges**:
```javascript
{
  message_id: "srv004",
  client_id: "term-1",
  message_type: "command_running",
  ref_id: "cmd002"
}
```

**3. Client streams stdin**:
```javascript
{
  message_id: "cmd003",
  client_id: "term-1",
  message_type: "input_stream",
  input_stream: "hello world\n"
}
```

**4. Server echoes to stdout** (tee behavior):
```javascript
{
  message_id: "srv005",
  client_id: "term-1",
  message_type: "output_stream",
  ref_id: "cmd002",
  output_stream: "hello world\n"
}
```

**5. Client closes stdin**:
```javascript
{
  message_id: "cmd004",
  client_id: "term-1",
  message_type: "stdin_eof"
}
```

**6. Server completes**:
```javascript
{
  message_id: "srv006",
  client_id: "term-1",
  message_type: "command_finished",
  ref_id: "cmd002",
  command_result: 0
}
```

#### 5.4.3 Error Handling

The system distinguishes between **protocol-level errors** (invalid WebSocket messages) and **command-level errors** (command execution failures).

**Command-Level Error (Invalid Command)**:
```javascript
// Client
{
  message_id: "cmd005",
  client_id: "term-1",
  message_type: "run_command",
  command: "invalidcmd"
}

// Server (command starts)
{
  message_id: "srv007a",
  client_id: "term-1",
  message_type: "command_running",
  ref_id: "cmd005"
}

// Server (error stream - command-level error)
{
  message_id: "srv007b",
  client_id: "term-1",
  message_type: "error_stream",
  ref_id: "cmd005",
  error_stream: "invalidcmd: command not found\r\n"
}

// Server (finish with error code)
{
  message_id: "srv008",
  client_id: "term-1",
  message_type: "command_finished",
  ref_id: "cmd005",
  command_result: 1  // Non-zero = error
}
```

**Command-Level Error (Permission Denied)**:
```javascript
// Client
{
  message_id: "cmd006",
  client_id: "term-1",
  message_type: "run_command",
  command: "cat /etc/passwd/admin.login"
}

// Server (error stream)
{
  message_id: "srv009",
  client_id: "term-1",
  message_type: "error_stream",
  ref_id: "cmd006",
  error_stream: "error: cannot access file/directory (access denied)\r\n"
}

// Server (finish with error code)
{
  message_id: "srv010",
  client_id: "term-1",
  message_type: "command_finished",
  ref_id: "cmd006",
  command_result: 1
}
```

**Protocol-Level Error (Invalid Client ID)**:
```javascript
// Client (unregistered client_id)
{
  message_id: "cmd007",
  client_id: "invalid-99",
  message_type: "run_command",
  command: "ls"
}

// Server (protocol error - NO command_running sent)
{
  message_id: "srv011",
  message_type: "err_response",
  ref_id: "cmd007",
  error: "invalid client_id: client does not exist"
}
// Note: No command_finished message follows
```

**Protocol-Level Error (Invalid MessagePack)**:
```javascript
// Client sends malformed binary data

// Server (protocol error)
{
  message_id: "srv012",
  message_type: "err_response",
  error: "invalid messagepack: \"unexpected EOF\""
}
// Note: No ref_id since message couldn't be parsed
```

**Key Distinction**:
- **Protocol-level errors** (`err_response`): Message couldn't be processed at the WebSocket layer
  - Invalid binary format (not MessagePack)
  - Malformed MessagePack
  - Unknown/unregistered client_id
  - **No command is executed**

- **Command-level errors** (`error_stream` + non-zero `command_result`): Command was valid at protocol level but failed during execution
  - Unknown command name
  - Permission denied
  - File not found
  - Invalid arguments
  - **Command lifecycle completes normally** (running → streams → finished)

---

### 5.5 Available Commands

The system provides a Unix-like shell environment with the following commands:

#### 5.5.1 `ls` - List Directory Contents

**Syntax**: `ls [OPTIONS] [PATHS...]`

**Options**:
- `-l`: Long format (permissions, size, timestamps)
- `-y`, `--yaml`: Output in YAML format

**Default Path**: `.` (current directory, from `PWD` environment variable)

**Example (Short Format)**:
```bash
$ ls /home/pilot1
flights
logs
config.yaml
```

**Example (Long Format)**:
```bash
$ ls -l /home/pilot1
directory  sysadmin,user-pilot1  sysadmin,user-pilot1  sysadmin,user-pilot1  sysadmin,user-pilot1  0  0  Jan  1 12:00 2025  flights
file       sysadmin,user-pilot1  sysadmin,user-pilot1  sysadmin,user-pilot1  sysadmin,user-pilot1  1  256  Jan  2 14:30 2025  config.yaml
```

**Columns (Long Format)**:
1. Type (`file` or `directory`)
2. Read tags (comma-separated)
3. Write tags
4. Execute tags
5. Update permission tags
6. File count (directories) or 1 (files)
7. File size in bytes
8. Modification timestamp
9. Name

**YAML Output**:
```yaml
- name: flights
  type: directory
- name: config.yaml
  type: file
```

**Permissions**:
- Requires `execute` permission on parent directory
- Requires `read` permission on directory itself

**Exit Codes**:
- `0`: Success
- `1`: Path not found, permission denied, or invalid path

**Implementation**: `cmd_ls.go`

---

#### 5.5.2 `cat` - Concatenate and Display Files

**Syntax**: `cat [FILES...]`

**Behavior**:
- **With arguments**: Read and output each file sequentially
- **Without arguments**: Read from stdin and output to stdout (pipe mode)

**Example (Read Files)**:
```bash
$ cat /home/pilot1/config.yaml
username: pilot1
role: pilot
email: pilot1@example.com
```

**Example (Pipe Mode)**:
```bash
$ echo "hello world" | cat
hello world
```

**Output Format**:
- Files separated by `\r\n` (CRLF)
- Raw file contents (no formatting)

**Permissions**:
- Requires `read` permission on each file
- Requires `execute` permission on parent directories

**Exit Codes**:
- `0`: Success
- `1`: File not found, permission denied, or invalid path

**Implementation**: `cmd_cat.go`

---

#### 5.5.3 `mkdir` - Create Directories

**Syntax**: `mkdir PATHS...`

**Example**:
```bash
$ mkdir /home/pilot1/flights/2025
$ mkdir projects backups  # Relative paths
```

**Behavior**:
- Creates directories at specified paths
- Relative paths resolved using `PWD` environment variable
- Multiple paths supported (all-or-nothing: all must succeed)

**Permissions**:
- Requires `write` permission on parent directory
- Requires `execute` permission to traverse parent directories

**Exit Codes**:
- `0`: All directories created successfully
- `1`: Any directory creation failed (invalid path, permission denied, already exists)

**Implementation**: `cmd_mkdir.go`

---

#### 5.5.4 `tee` - Read stdin and Write to Files

**Syntax**: `tee FILES...`

**Example**:
```bash
$ echo "Flight log entry" | tee /home/pilot1/logs/flight1.log
Flight log entry
```

**Behavior**:
- Read all data from stdin
- Write to stdout (echo stdin)
- Write to specified files simultaneously
- All files receive identical content (single GridFS upload, multiple references)

**Permissions**:
- Requires `write` permission on parent directories
- Requires `execute` permission to traverse parent directories

**Exit Codes**:
- `0`: Success
- `1`: Permission denied, invalid path, or write failure

**Implementation**: `cmd_tee.go`

---

#### 5.5.5 `echo` - Output Text

**Syntax**: `echo [OPTIONS] [STRINGS...]`

**Options**:
- `-e`, `--escape`: Interpret escape sequences (`\n`, `\t`, `\\`)
- `-n`, `--no_newline`: Suppress trailing newline

**Example (Basic)**:
```bash
$ echo "Hello World"
Hello World
```

**Example (Escape Sequences)**:
```bash
$ echo -e "Line 1\nLine 2\tTabbed"
Line 1
Line 2	Tabbed
```

**Example (No Newline)**:
```bash
$ echo -n "Prompt: "
Prompt: $
```

**Behavior**:
- Joins arguments with spaces
- Outputs to stdout
- Default: Adds trailing `\r\n`

**Exit Codes**:
- `0`: Success
- `1`: Invalid escape sequence

**Implementation**: `cmd_echo.go`

---

#### 5.5.6 `whoami` - Display Current User Info

**Syntax**: `whoami`

**Example Output**:
```yaml
# AuthStatus
username: pilot1
tags:
  - pilot
  - user-pilot1

# user.profile
email: pilot1@example.com
phone: "+1234567890"
role: pilot
```

**Behavior**:
- Section 1: Authentication status (username, tags)
- Section 2: User profile (from `/home/{username}/user.profile`)

**Permissions**:
- No special permissions required (reads own profile)

**Exit Codes**:
- `0`: Success
- `1`: Profile file read error (non-fatal, still outputs AuthStatus)

**Implementation**: `cmd_whoami.go`

---

#### 5.5.7 `error` - Display Error Message

**Syntax**: `error MESSAGE...`

**Purpose**: Internal error handling (not typically used directly by users)

**Example**:
```bash
$ error "Something went wrong"
error: Something went wrong
```

**Behavior**:
- Joins arguments with spaces
- Outputs to stderr
- Always exits with code `1`

**Implementation**: `cmd_error.go`

---

### 5.6 Planned Commands (Future Implementation)

The following commands are planned for future releases to provide more comprehensive filesystem operations.

#### 5.6.1 `cp` - Copy Files and Directories (PLANNED)

**Syntax**: `cp [OPTIONS] SOURCE... DEST`

**Planned Options**:
- `-r`, `-R`: Recursive copy (copy directories and their contents)

**Behavior**:
- Copy files or directories from source to destination
- Multiple sources can be specified if destination is a directory
- Preserves file permissions (tags) during copy
- Creates new GridFS file references for copied files

**Example (Copy File)**:
```bash
$ cp /home/pilot1/config.yaml /home/pilot1/backup/config.yaml
```

**Example (Recursive Directory Copy)**:
```bash
$ cp -r /home/pilot1/flights /home/pilot1/backup/
# Copies entire flights directory structure
```

**Example (Multiple Sources)**:
```bash
$ cp file1.txt file2.txt file3.txt /home/pilot1/documents/
```

**Permissions**:
- Requires `read` permission on source files/directories
- Requires `execute` permission on source directories (for recursive)
- Requires `write` permission on destination parent directory
- Copied files inherit destination directory's default permissions or preserve source permissions

**Exit Codes**:
- `0`: All copies successful
- `1`: Permission denied, source not found, or destination invalid

**Status**: Not yet implemented

---

#### 5.6.2 `mv` - Move/Rename Files and Directories (PLANNED)

**Syntax**: `mv SOURCE... DEST`

**Behavior**:
- Move or rename files and directories
- Within same filesystem: Updates parent references (fast)
- Multiple sources can be specified if destination is a directory
- Preserves all metadata (permissions, timestamps)

**Example (Rename)**:
```bash
$ mv /home/pilot1/old_name.txt /home/pilot1/new_name.txt
```

**Example (Move to Directory)**:
```bash
$ mv file1.txt file2.txt /home/pilot1/archive/
```

**Example (Move Directory)**:
```bash
$ mv /home/pilot1/temp /home/pilot1/archive/old_temp
```

**Permissions**:
- Requires `write` permission on source parent directory (to remove from parent)
- Requires `write` permission on destination parent directory (to add to parent)
- Requires `execute` permission to traverse parent directories
- File/directory permissions unchanged (ownership preserved)

**Exit Codes**:
- `0`: All moves successful
- `1`: Permission denied, source not found, or destination invalid

**Status**: Not yet implemented

---

#### 5.6.3 `rm` - Remove Files and Directories (PLANNED)

**Syntax**: `rm [OPTIONS] PATHS...`

**Planned Options**:
- `-r`: Recursive removal (remove directories and their contents)
- `-f`: Force removal using parent's `updatetag_tags` permissions
  - If user lacks `write` permission on file but has parent's `updatetag_tags` permission
  - Allows removing files you don't own but have administrative rights over

**Behavior**:
- Remove files and directories from filesystem
- GridFS files deleted if no other references exist (reference counting)
- Recursive mode required for non-empty directories

**Example (Remove File)**:
```bash
$ rm /home/pilot1/temp.txt
```

**Example (Recursive Directory Removal)**:
```bash
$ rm -r /home/pilot1/old_project
```

**Example (Force Remove)**:
```bash
$ rm -f /home/pilot1/someuser_file.txt
# Removes file using parent directory's updatetag_tags permission
# Even if user lacks direct write permission on file
```

**Permissions**:
- **Standard mode**: Requires `write` permission on file/directory to remove
- **Force mode (`-f`)**: Requires parent directory's `updatetag_tags` permission
  - Allows administrators to remove user files they don't directly own
  - User must have at least one tag in parent's `updatetag_tags` list

**Permission Logic (Force Mode)**:
```yaml
# Parent directory: /home/pilot1
permissions:
  updatetag_tags: [sysadmin, user-pilot1]

# File: /home/pilot1/locked_file.txt
permissions:
  write_tags: [sysadmin]  # User pilot1 cannot write

# Command: rm -f /home/pilot1/locked_file.txt
# Success: pilot1 has user-pilot1 tag in parent's updatetag_tags
```

**Exit Codes**:
- `0`: All removals successful
- `1`: Permission denied, file not found, or directory not empty (without `-r`)

**Status**: Not yet implemented

---

#### 5.6.4 `grep` - Search File Contents (PLANNED)

**Syntax**: `grep [OPTIONS] PATTERN [FILES...]`

**Planned Options**:
- `-i`: Case-insensitive search
- `-n`: Show line numbers
- `-r`, `-R`: Recursive search in directories
- `-v`: Invert match (show non-matching lines)
- `-c`: Count matching lines only
- `-l`: List filenames with matches only
- `-H`: Print filename with matches (default for multiple files)
- `-h`: Suppress filename in output

**Behavior**:
- Search for lines matching a pattern in files
- Without files: Read from stdin
- Supports basic regular expressions (via Go `regexp` package)

**Example (Search File)**:
```bash
$ grep "error" /home/pilot1/logs/flight.log
2025-10-08 14:30:00 [error] Engine temperature exceeded threshold
2025-10-08 14:35:12 [error] Communication timeout with ground control
```

**Example (Case-Insensitive with Line Numbers)**:
```bash
$ grep -in "warning" /home/pilot1/logs/flight.log
15:2025-10-08 14:15:00 [WARNING] Low fuel detected
32:2025-10-08 14:25:00 [Warning] GPS signal weak
```

**Example (Recursive Search)**:
```bash
$ grep -r "altitude" /home/pilot1/flights/
/home/pilot1/flights/2025-01/flight1.log:Current altitude: 10000 ft
/home/pilot1/flights/2025-01/flight2.log:Climbing to altitude: 15000 ft
```

**Example (Count Matches)**:
```bash
$ grep -c "error" /home/pilot1/logs/*.log
flight.log:5
system.log:12
```

**Example (From Stdin)**:
```bash
$ cat /home/pilot1/config.yaml | grep "enabled: true"
telemetry_enabled: true
logging_enabled: true
```

**Permissions**:
- Requires `read` permission on each file searched
- Requires `execute` permission on directories (for recursive mode)

**Exit Codes**:
- `0`: At least one match found
- `1`: No matches found
- `2`: Error occurred (permission denied, file not found)

**Status**: Not yet implemented

---

#### 5.6.5 `mkdir` (Enhanced) - Create Directories with Parents (PLANNED)

**Current Implementation**: Basic directory creation (see Section 5.5.3)

**Planned Enhancement**:
- `-p`: Create parent directories as needed (no error if directory exists)

**Enhanced Syntax**: `mkdir [OPTIONS] PATHS...`

**Planned Options**:
- `-p`: Create parent directories automatically

**Example (Current Behavior)**:
```bash
$ mkdir /home/pilot1/a/b/c
# Error: /home/pilot1/a does not exist
```

**Example (With -p Flag)**:
```bash
$ mkdir -p /home/pilot1/a/b/c
# Creates /home/pilot1/a, then /home/pilot1/a/b, then /home/pilot1/a/b/c
# No error if any already exist
```

**Behavior**:
- `-p` creates all missing parent directories in path
- Continues silently if directory already exists (idempotent)
- All created directories inherit default permissions from their parent

**Permissions**:
- Requires `write` permission on first existing parent directory
- Each created directory inherits permissions from its parent

**Exit Codes**:
- `0`: All directories created (or already exist with `-p`)
- `1`: Permission denied or invalid path

**Status**: Not yet implemented

---

#### 5.6.6 `chmod` - Change File Permissions (PLANNED)

**Syntax**: `chmod [OPTIONS] TAG[+-]PERMISSION... PATH...`

**Tag-Based Permission Model**:
- Unlike Unix numeric modes, uses tag-based permission modification
- Add (`+`) or remove (`-`) specific tags from permission lists
- Multiple operations can be specified

**Permission Types**:
- `r`: Read permission (`read_tags`)
- `w`: Write permission (`write_tags`)
- `x`: Execute permission (`execute_tags`)
- `p`: Update permission tags (`updatetag_tags`)

**Planned Options**:
- `-r`, `-R`: Recursive (apply to directory contents)

**Example (Add Read Permission)**:
```bash
$ chmod user-pilot2+r /home/pilot1/shared/data.txt
# Adds "user-pilot2" to read_tags
```

**Example (Remove Write Permission)**:
```bash
$ chmod user-pilot2-w /home/pilot1/shared/data.txt
# Removes "user-pilot2" from write_tags
```

**Example (Multiple Operations)**:
```bash
$ chmod user-pilot2+r user-pilot2+x /home/pilot1/shared/
# Adds "user-pilot2" to both read_tags and execute_tags
```

**Example (Recursive)**:
```bash
$ chmod -R pilot+r /home/pilot1/public/
# Grants all users with "pilot" tag read access to entire directory tree
```

**Example (Multiple Paths)**:
```bash
$ chmod user-pilot2+rw file1.txt file2.txt file3.txt
# Adds "user-pilot2" to read_tags and write_tags for all three files
```

**Alternative Syntax (All Permissions)**:
```bash
$ chmod user-pilot2+rwx /home/pilot1/shared/executable.sh
# Grants read, write, and execute permissions
```

**Permission Validation**:
- User must have `updatetag_tags` permission on file/directory to modify permissions
- Cannot remove own tags if it would lock themselves out of permission updates
- Cannot add tags the user doesn't possess (except sysadmin bypass)
- See `FsEntryPermissions.CanUpdatePermTags()` logic in Section 3.2.1

**Example Permission Structure**:
```yaml
# Before: chmod user-pilot2+r /home/pilot1/data.txt
read_tags: [sysadmin, user-pilot1]
write_tags: [sysadmin, user-pilot1]
execute_tags: [sysadmin, user-pilot1]
updatetag_tags: [sysadmin, user-pilot1]

# After
read_tags: [sysadmin, user-pilot1, user-pilot2]  # Modified
write_tags: [sysadmin, user-pilot1]
execute_tags: [sysadmin, user-pilot1]
updatetag_tags: [sysadmin, user-pilot1]
```

**Permissions**:
- Requires user have at least one tag in `updatetag_tags` of target file/directory
- `sysadmin` tag bypasses all restrictions

**Exit Codes**:
- `0`: Permissions updated successfully
- `1`: Permission denied, invalid tag, or file not found

**Status**: Not yet implemented

---

### 5.7 Environment Variables

Each client session maintains environment variables:

**Built-in Variables**:
- `PWD`: Current working directory (initialized to `/home/{username}`)
- `HOME`: User home directory (always `/home/{username}`)

**Custom Variables**:
- Set via `set_env` in `connect` message
- Not currently mutable after connection (no `cd` or `export` command)

**Environment Variable Expansion**:
- The `sh` library **supports environment variable expansion** in command arguments
- Standard shell syntax: `$VAR` or `${VAR}`
- Example: `echo $HOME` expands to `/home/pilot1`
- Variables resolved before command execution

**Usage in Commands**:
- Relative paths resolved using `PWD`
- Environment variables expanded in command arguments (e.g., `$HOME`, `$PWD`)
- Tilde expansion supported: `~` automatically expands to `$HOME` (e.g., `~/flights` → `/home/pilot1/flights`)

---

### 5.8 Client Implementation Examples

#### 5.8.1 JavaScript/React Client (`PipeCmdClient`)

**Features**:
- Promise-based API
- Automatic reconnection
- Single command execution (waits for completion)

**Usage**:
```javascript
import { PipeCmdClient } from './api/socket.js';

const client = new PipeCmdClient();
await client.connect();

// Run command and wait for result
const result = await client.run_command("ls -l /home/pilot1");
console.log("Exit code:", result.command_result);
console.log("Output:", result.output);
console.log("Errors:", result.error);

await client.disconnect();
```

**Event Listeners**:
```javascript
client.on('output_stream', (data) => console.log(data));
client.on('error_stream', (data) => console.error(data));
client.on('command_finished', (exitCode) => console.log("Done:", exitCode));
```

---

#### 5.8.2 JavaScript/React Client (`StreamCmdClient`)

**Features**:
- Async iterators for streaming output
- Interactive stdin support
- Multiple concurrent commands (advanced)

**Usage**:
```javascript
import { StreamCmdClient } from './api/socket.js';

const client = new StreamCmdClient();
await client.connect();

// Run command with streaming output
const handle = await client.run_command("cat large-file.log");

// Stream stdout
for await (const chunk of handle.iter_output()) {
  process.stdout.write(chunk);
}

// Send stdin
handle.input("user input\n");
handle.input_eof();

// Wait for completion
const exitCode = await handle.result();
console.log("Exit code:", exitCode);

await client.disconnect();
```

---

### 5.9 Protocol State Machines

#### 5.9.1 Client Session State

```
┌─────────────┐
│ UNCONNECTED │
└──────┬──────┘
       │ send: connect
       ▼
┌─────────────┐
│ CONNECTING  │
└──────┬──────┘
       │ receive: connect_acknowledged
       ▼
┌─────────────┐     send: run_command      ┌──────────────────┐
│    IDLE     │ ───────────────────────▶   │ COMMAND_RUNNING  │
└──────┬──────┘                             └────────┬─────────┘
       │                                             │
       │                    receive: command_finished│
       │ ◀───────────────────────────────────────────┘
       │
       │ send: disconnect
       ▼
┌─────────────┐
│ DISCONNECTING│
└──────┬──────┘
       │ receive: disconnect_acknowledged
       ▼
┌─────────────┐
│ DISCONNECTED│
└─────────────┘
```

**State Constraints**:
- Only **one command** per client at a time (`COMMAND_RUNNING` is exclusive)
- `input_stream` and `stdin_eof` only valid in `COMMAND_RUNNING` state
- Disconnect during `COMMAND_RUNNING` aborts command immediately

#### 5.9.2 Command Execution State

```
┌────────────────┐
│ run_command    │ (Client sends)
└───────┬────────┘
        ▼
┌────────────────┐
│command_running │ (Server acknowledges)
└───────┬────────┘
        │
        │ ┌──────────────────────────────┐
        ├─│ output_stream (0+ messages)  │
        │ └──────────────────────────────┘
        │
        │ ┌──────────────────────────────┐
        ├─│ error_stream (0+ messages)   │
        │ └──────────────────────────────┘
        │
        │ ┌──────────────────────────────┐
        ├─│ input_stream (client sends)  │
        │ └──────────────────────────────┘
        │
        ▼
┌────────────────┐
│command_finished│ (Server sends exit code)
└────────────────┘
```

**Message Ordering**:
1. `run_command` (client)
2. `command_running` (server)
3. Interleaved `output_stream`, `error_stream`, `input_stream` (any order)
4. `stdin_eof` (client, optional)
5. `command_finished` (server)

---

### 5.10 Concurrency & Multiplexing

#### 5.10.1 Multiple Clients per WebSocket

**Design**:
- Single WebSocket connection supports **multiple client sessions**
- Each client has unique `client_id` (e.g., `term-1`, `term-2`, `pipe-1`)
- Server multiplexes messages via `client_id` field

**Example (Two Terminals)**:
```javascript
// WebSocket connection established
const ws = new WebSocket("wss://api.cogniflight.com/cmd-socket");

// Client 1: Terminal window
ws.send(msgpack.encode({
  message_id: "msg001",
  client_id: "term-1",
  message_type: "connect"
}));

// Client 2: Background job
ws.send(msgpack.encode({
  message_id: "msg002",
  client_id: "term-2",
  message_type: "connect"
}));

// Both clients can run commands simultaneously
```

**Server Routing**:
```go
// endpoint.go:126-195
clients := map[string]types.ClientInfo{} // client_id → ClientInfo

// Route incoming message to correct client
if client, ok := clients[incoming.ClientID]; ok {
    client.In <- incoming // Send to client's input channel
}
```

---

#### 5.10.2 Concurrency Guarantees

**Per-Client Guarantees**:
- **One command at a time**: Client must wait for `command_finished` before sending next `run_command`
- **Message ordering**: Output streams processed in order (via Go channels)
- **Stdin buffering**: Multiple `input_stream` messages queued in order

**Cross-Client Guarantees**:
- **No isolation**: Filesystem operations from different clients can interleave
- **No transactions**: File creation by `client-1` immediately visible to `client-2`
- **Permissions enforced**: Each client's tag set independent

**Example (Race Condition)**:
```javascript
// Client 1
await client1.run_command("mkdir /home/pilot1/test");

// Client 2 (may execute before client1 finishes)
await client2.run_command("mkdir /home/pilot1/test");
// Result: One succeeds, one gets 409 Conflict
```

---

### 5.11 Performance Characteristics

#### 5.11.1 Message Size Limits

**WebSocket**:
- Max frame size: 1 MB (Gin default)
- Max message size: Unlimited (fragmentation supported)

**Command Output**:
- `output_stream` chunks: Variable (typically 1-4 KB)
- Buffering: In-memory Go channels (unbounded)

**GridFS Files**:
- Chunk size: 256 KB (MongoDB default)
- Max file size: 16 MB (MongoDB document limit per GridFS file metadata)

#### 5.11.2 Throughput

**Commands per Second**:
- Simple commands (`echo`, `whoami`): ~1000 req/s (single client)
- Filesystem operations (`ls`, `cat`): ~500 req/s (MongoDB limited)
- File uploads (`tee`): ~100 req/s (GridFS limited)

**Concurrent Clients**:
- Max WebSocket connections: ~10,000 (OS file descriptor limit)
- Max clients per WebSocket: ~1,000 (Go goroutine overhead)
- Recommended: 10-50 clients per WebSocket

---

### 5.12 Error Recovery

#### 5.12.1 Network Failures

**WebSocket Disconnect**:
```javascript
// Browser automatically fires 'close' event
GlobalEvents.on('close', () => {
  console.log("WebSocket closed. Reconnecting...");
  Connect(); // Retry connection
});
```

**Automatic Reconnection** (Frontend):
```javascript
// socket.js:115-171
async function Connect() {
  if (websocket == null && !connecting) {
    // Retry logic with exponential backoff
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await connectWebSocket();
        break;
      } catch (err) {
        await sleep(2 ** attempt * 1000); // 1s, 2s, 4s, 8s, 16s
      }
    }
  }
}
```

**Server-Side Cleanup**:
```go
// endpoint.go:62-66
defer func() {
    for _, cancel := range client_cancels {
        cancel() // Cancel all client goroutines
    }
}()
```

#### 5.12.2 Command Failures

**Partial Output**:
```javascript
// Client
const result = await client.run_command("cat /large/file");

// Server crashes mid-stream
// Client receives:
// 1. command_running
// 2. output_stream (partial)
// 3. WebSocket close event (no command_finished)

// Recovery: Client detects missing command_finished
if (!result.command_result) {
  console.error("Command interrupted");
  // User can retry or resume
}
```

**Idempotency**:
- `ls`, `cat`, `whoami`: Idempotent (safe to retry)
- `mkdir`: Idempotent if directory exists (returns 409)
- `tee`: **Not idempotent** (duplicate file uploads)

---

### 5.13 Security Considerations

#### 5.13.1 Command Injection Prevention

**Controlled Shell Execution**:
- Commands parsed as **structured shell language** (via `sh` library using mvdan's AST parser)
- No `/bin/sh` or `/bin/bash` subprocess spawned
- Only predefined commands available (no arbitrary binary execution)
- **Environment variable expansion supported**: `$VAR`, `${VAR}`, `~` for home directory
- **Command substitution NOT supported** (planned for future implementation)
- **Piping NOT supported** (planned for future implementation)
- **Redirects NOT supported** (planned for future implementation)

**Currently Supported Shell Features**:
- Environment variable expansion: `echo $HOME` → `/home/pilot1`
- Tilde expansion: `cat ~/config.yaml` → `cat /home/pilot1/config.yaml`
- Basic command execution with arguments
- Working directory tracking (`cd` command available)
- Exit status tracking (`?` variable)

**Planned Shell Features** (Not Yet Implemented):
- Command substitution: `echo "$(whoami)"`
- Piping: `ls | grep test`
- Redirects: `echo "test" > file.txt`
- Background jobs: `command &`

**Example (Safe Variable Expansion)**:
```bash
$ echo "My home is $HOME"
My home is /home/pilot1

$ cat ~/config.yaml
# Successfully reads /home/pilot1/config.yaml
```

#### 5.13.2 Path Traversal Mitigation

**Validation** (per command):
```go
// cmd_ls.go:72-87
clean_path, err := filesystem.CleanupAbsPath(path)
if err != nil {
    return error("invalid path")
}
// Resolves `.` and `..`, prevents escaping filesystem
```

**Tag-Based Access**:
```go
// Permissions checked on every filesystem operation
if !node.Permissions.IsAllowed(ReadMode, userTags) {
    return ErrCantAccessFs
}
```

#### 5.13.3 Resource Limits

**Per-Client Limits**:
- Command timeout: None (long-running commands allowed)
- Output buffering: Unbounded (potential DoS via large output)
- Concurrent commands: 1 per client

**Mitigations**:
- MongoDB query timeout: 5 seconds
- GridFS chunk size: 256 KB (limits memory usage)
- WebSocket max frame size: 1 MB

**Future Improvements**:
- Implement per-user disk quotas
- Add command execution timeout
- Limit output buffer size

---

## 6. Summary

The CogniFlight Cloud API provides:

1. **RESTful Authentication** - Session-based login/signup with bcrypt password hashing
2. **MQTT Integration** - IoT device authentication for edge nodes via Mosquitto plugin
3. **WebSocket Commands** - Real-time Unix-like shell interface with tag-based permissions
4. **External Services** - MongoDB (storage), InfluxDB (telemetry), ML Engine (face recognition)
5. **Security** - TLS encryption, path traversal prevention, role-based access control

**Key Technologies**:
- **Backend**: Go (Gin framework), MongoDB, GridFS
- **WebSocket**: MessagePack binary encoding
- **Authentication**: bcrypt, session cookies, tag-based RBAC
- **IoT**: MQTT over TLS (Mosquitto + go-auth plugin)
- **Time-Series**: InfluxDB + Telegraf

**Status Codes**:
- `200 OK`, `101 Switching Protocols` - Success
- `400 Bad Request`, `401 Unauthorized`, `409 Conflict` - Client errors
- `500 Internal Server Error` - Server errors

**WebSocket Protocol**:
- Binary MessagePack messages
- Multiple concurrent client sessions
- Streaming stdin/stdout/stderr
- Tag-based filesystem permissions
- **Currently Available Commands**: `ls`, `cat`, `mkdir`, `tee`, `echo`, `whoami`, `error`
- **Planned Commands**: `cp`, `mv`, `rm`, `grep`, `chmod`, enhanced `mkdir -p`
- **Supported Shell Features**: Environment variable expansion, tilde expansion, working directory tracking
- **Planned Shell Features**: Command substitution, piping, redirects

---

## Appendix A: Message Type Reference

| Message Type | Direction | Fields | Purpose |
|--------------|-----------|--------|---------|
| `connect` | C → S | `client_id`, `set_env?` | Register client session |
| `connect_acknowledged` | S → C | `client_id`, `ref_id` | Confirm registration |
| `disconnect` | C → S | `client_id` | Close session |
| `disconnect_acknowledged` | S → C | `client_id`, `ref_id` | Confirm closure |
| `run_command` | C → S | `client_id`, `command` | Execute shell command |
| `command_running` | S → C | `client_id`, `ref_id` | Acknowledge start |
| `command_finished` | S → C | `client_id`, `ref_id`, `command_result` | Report exit code |
| `output_stream` | S → C | `client_id`, `ref_id`, `output_stream` | Stdout chunk |
| `error_stream` | S → C | `client_id`, `ref_id`, `error_stream` | Stderr chunk |
| `input_stream` | C → S | `client_id`, `input_stream` | Stdin chunk |
| `stdin_eof` | C → S | `client_id` | Close stdin |
| `err_response` | S → C | `error`, `ref_id?` | System error |

**Legend**: C = Client, S = Server, `?` = Optional field

---

## Appendix B: Status Code Reference

| Code | Name | Usage | Example Scenario |
|------|------|-------|------------------|
| 200 | OK | Successful operation | Login successful, file uploaded |
| 101 | Switching Protocols | WebSocket upgrade | `/cmd-socket` connection established |
| 400 | Bad Request | Invalid JSON, missing fields | `{"username": "pilot1"}` (missing password) |
| 401 | Unauthorized | Invalid credentials, expired session | Wrong password, session timeout |
| 409 | Conflict | Resource already exists | Username taken, file exists |
| 500 | Internal Server Error | Database failure, unexpected error | MongoDB timeout, GridFS write failure |

---

**Document Version**: 1.0
**Last Updated**: 2025-10-08
**Project**: CogniFlight Cloud Platform
**Authors**: Backend Development Team
