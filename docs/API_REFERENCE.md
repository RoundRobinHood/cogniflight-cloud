# Cogniflight Cloud API Reference

Complete API documentation for all Cogniflight Cloud services.

## Table of Contents

- [WebSocket Command Interface](#websocket-command-interface)
- [REST API](#rest-api)
- [ML Engine RPC Methods](#ml-engine-rpc-methods)
- [MQTT Topics](#mqtt-topics)

---

## WebSocket Command Interface

The backend exposes a WebSocket-based command interface that provides shell-like access to system operations.

### Connection

**Endpoint**: `ws://localhost:8080/cmd-socket`

**Authentication**: Requires valid session cookie (obtained via `/login`)

**Protocol**: Text-based, newline-delimited commands and responses

### Command Format

Commands follow shell-like syntax, which generally looks like:
```bash
command_name [options] [arguments]
```

The exact argument format depends on the specific command. We also support various bash-like syntax, such as logical operators (&&, ||) and pipes (|).

Our system operates exclusively on CRLF, because this simplifies terminal display.
Automated responses are returned in YAML or JSON format, while interactive commands or arguments return plaintext with color.

---

### Authentication Commands

#### `whoami`

Get current user information.

**Usage**: `whoami`

**Permissions**: Any authenticated user

**Response**:
```yaml
# session info
username: john_doe
tags:
  - user
  - pilot

# user.profile
role: pilot
name: John
surname: Doe
email: john@example.com
phone: +1234567890
```

#### `logout`

End the current session.

**Usage**: `logout`

**Permissions**: Any authenticated user

**Response**: Session no longer valid, client refreshes to kick the user out.

---

### Filesystem Commands

#### `ls`

List directory contents.

**Usage**: `ls [paths...]`

**Permissions**: Based on directory execute permissions

**Options**:
- No path: Lists current working directory (PWD)
- Path(s): Lists specified directory(s)
- "-y" flag: output has YAML
- "-l" flag: long-format response (including timestamps, permissions, etc)

**Response**:
```yaml
- name: documents
  type: directory
  permissions:
    read_tags: [user]
    write_tags: [user]
    execute_tags: [user]
  modified: 2024-10-23T10:30:00Z

- name: config.yaml
  type: file
  size: 1024
  permissions:
    read_tags: [user, sysadmin]
    write_tags: [sysadmin]
  modified: 2024-10-23T09:15:00Z
```

#### `cat`

Read file contents.

**Usage**: `cat [-n] [file_paths...]`

**Permissions**: Requires read permission on file

**Options**:
- No arguments: Copies from input to output
- One or more paths: Print all paths, with optional newlines between them
- "-n" flag: disable added newlines for more "raw" output

**Response**: Raw file contents or received user input

**Example**:
```bash
cat /home/admin/settings.yaml
```

#### `mkdir`

Create a new directory.

**Usage**: `mkdir [-p] <directory_paths...>`

**Permissions**: Requires write permission on parent directory

**Options**:
- "-p" flag: tells mkdir to try and create parent directories if they don't exist, and not to fail if the directories already exist.

**Response**: Blank or error

#### `rm`

Remove a file or directory.

**Usage**: `rm [-rf] <paths...>`

**Permissions**: Requires write permission on parent directory(s)

**Options**:
- "-r" flag: allows deletion of folders
- "-f" flag: overrides permissions if the user has update tag permissions on the parent directory(s)

**Response**: Blank or error

#### `mv`

Move or rename a file/directory.

**Usage**: `mv <sources...> <destination>`

**Permissions**: Requires write permission on both source and destination parent directories

#### `copy` / `cp`

Copy a file or directory.

**Usage**: `copy [-r] <sources...> <destination>`

**Permissions**: Requires read on source, write on destination parent

**Options**:
- "-r" flag: allow copying directories

#### `chmod`

Change file/directory permissions.

**Usage**: `chmod [-R] <mode> <file_paths...>`

**Permission Types**:
- `read`, 'r' - Set read tags
- `write`, 'w' - Set write tags
- `execute`, 'x' - Set execute/traverse tags
- `updatetag`, 'p' - Set permission update tags

**Permissions**: Requires updatetag permission, and ownership of the tag names being added or removed for updatetag tags (unless you're sysadmin)

**Mode string**: "<tag_name><+-><perms...>"
- This string describes how the command should update permissions on the relevant files
- The tag_name is what gets added/removed, and it's done so against specific permissions.
- For example, to give a user access to read and traverse their own home directory: `chmod -R user-Username+rx /home/Username` (user-Username is the tag, and we "+" read and execute)

**Options**:
- Mode string
- "-R" flag: tells chmod to perform the permission update recursively (otherwise it only affects the target directory itself)

**Example**:
```bash
chmod -R user-rwxp /etc
```

---

### User Management Commands

#### `pilots`

List all pilots in the system.

**Usage**: `pilots`

**Permissions**: `sysadmin` or `atc` tags required

**Response**:
```
pilot1
pilot2
pilot3
```

#### `edge-nodes`

List all edge nodes (cockpit devices).

**Usage**: `edge-nodes`

**Permissions**: `sysadmin`, `atc`, or `data-analyst` tags required

**Response**:
```
N420HH
N737BA
N123XY
```

#### `clients`

List active client connections in the current socket session.

**Usage**: `clients`

**Permissions**: Anyone is allowed (it's your own session)

**Response**:
```yaml
- client_id: abc123
  username: admin
  connected_at: 2024-10-23T08:00:00Z
  status: active

- client_id: def456
  username: atc_operator
  connected_at: 2024-10-23T09:30:00Z
  status: active
```

#### `sockets`

List all active WebSocket sessions with client details.

**Usage**: `sockets`

**Permissions**: `sysadmin` tag required

**Response**:
```yaml
- socket_id: ws-001
  connect_timestamp: 2024-10-23T08:00:00Z
  clients:
    - client_id: client-abc123
      username: admin
      tags: [user, sysadmin]
      logs:
        - "whoami"
        - "ls /home"
        - "pilots --verbose"
```

---

### Telemetry & Monitoring Commands

#### `mqtt`

Subscribe to edge node telemetry stream.

**Usage**: `mqtt`

**Permissions**: `sysadmin`, `atc`, or `data-analyst` tags required

**Response**: Continuous stream of telemetry messages in YAML format

**Example**:
```bash
mqtt
```

**Stream Output**:
```yaml
---
edge_username: N420HH
payload:
  pilot_username: pilot1
  flight_id: FLT001
  timestamp: 2024-10-23T10:45:30Z
  fusion_score: 0.23
  heart_rate: 75
  avg_ear: 0.28
  altitude: 10500
  roll: 2.3
  pitch: -1.5
  yaw: 180.2
  system_state: normal
---
edge_username: N420HH
payload:
  # ... next telemetry packet
```

#### `flux`

Execute InfluxDB Flux query and stream results.

**Usage**: `flux` and send query over stdin

**Permissions**: `sysadmin` or `data-analyst` tags required

**Query Format**: Single-line or multi-line Flux query

**Response**: Streaming query results

**Example**:
```bash
echo 'from(bucket:"telegraf") |> range(start: -1h) |> filter(fn: (r) => r.topic == "cogniflight/telemetry/N420HH"' | flux
```

---

### ML Engine Commands

#### `embed`

Generate face embeddings for images.

**Usage**: `embed <image_file_paths...>`

**Permissions**: `sysadmin`, `data-analyst`, `atc`, or `edge-node` tags required

**Response**: (every image has a b64 embedding on its own line
```
abcdefg0123456789...
abcdefg0123456789...
```

#### `ml-rpc`

Call ML engine RPC methods directly.

**Usage**: `ml-rpc <method_name> [options...]`

**Permissions**: `sysadmin`, `data-analyst`, or `atc` tags required

**Example**:
```bash
ml-rpc analyze_edge_fatigue --edge_username N420HH --lookback_minutes 10
```

**Response**: Method-specific YAML output after conversion from JSON-RPC

---

### Utility Commands

#### `echo`

Echo text to output.

**Usage**: `echo [-en] <text...>`

**Permissions**: Any authenticated user

**Options**:
- "-e" flag: tells command to escape strings (e.g., turn '\n' into a newline)
- "-n" flag: tells echo not to write a newline after the output text

#### `help`

Display available commands.

**Usage**: `help`

**Permissions**: Any authenticated user

#### `heartbeat`

Server heartbeat loop (used to ensure the server is still alive, and that context cancellation works).
It prints a piece of text in a closed loop until told to stop.

**Usage**: `heartbeat [--delay ms] [print_text...]`

**Permissions**: Any authenticated user

**Options**:
- "--delay" flag: updates the delay, default is half a second (500ms)
- Positional arguments: if arguments are present, positional arguments are printed instead of "beep" 

**Response**: Continuous stream of text on new lines, with overrides from options
```
beep
beep
...
^C
# stopped
```

#### `tee`

Write stdin to file and stdout.

**Usage**: `command | tee <file_paths...>`

**Permissions**: Requires write permission on file paths

#### `hex`

Convert data to hexadecimal representation.

**Usage**: `command | hex`

#### `b64`

Base64 encode.

**Usage**: `command | b64`

#### `crypto-rand`

Generate cryptographically secure random bytes.

**Usage**: `crypto-rand <byte_count>`

---

## REST API

### Authentication Endpoints

#### `POST /login`

Authenticate user and create session.

**Request Body**:
```json
{
  "username": "john_doe",
  "password": "secret_password"
}
```

**Response**: Success - 200, no response body

Sets `session` cookie with authentication token.

**Response**: Failure - 401

---

#### `POST /signup`

Create new user account.

**Request Body**:
```json
{
  "token": "invite_token_from_email",
  "username": "new_user",
  "password": "secure_password"
}
```

**Response**: Success - 201, no response body

**Response** (Failure - 400):
```json
{
  "error": "Required field 'username' is missing"
}
```

---

#### `GET /signup/check-username/:username?token=...`

Check if username is available.

**URL Parameters**:
- `username`: Username to check

**Query Parameters**:
- `token`: Signup token

**Response**: Available - 200

**Response**: Taken - 409

---

### Internal Endpoints

#### `POST /check-mqtt-user`

MQTT broker authentication callback (internal use only).

**Request Body**:
```json
{
  "client_id": "backend_internal_...",
  "username": "edge_node_username",
  "password": "mqtt_password"
}
```

**Response**: Authorized - 200

**Response**: Unauthorized - 403

---

#### `POST /hi`

Simple health check endpoint.

**Response** (200):
```
hello
```

---

## ML Engine RPC Methods

The ML Engine exposes JSON-RPC 2.0 methods over Unix socket (`/sockets/ml-engine.sock`).

### Connection

**Protocol**: JSON-RPC 2.0 over Unix socket

**Socket Path**: `/sockets/ml-engine.sock` (configurable via `ML_SOCK_FILE` env var)

**Message Format**: Newline-delimited JSON (NDJSON)

---

### `generate_face_embedding`

Generate 512-dimensional face embedding from image using InsightFace.
This is used by the backend through a helper function with GridFS to facilitate backend-context interactions with the file-system (for the `embed` command)

**Parameters**:
- `image_bytes` (string|bytes): Base64-encoded or raw image bytes
- `detection_threshold` (float, optional): Minimum confidence for face detection (default: 0.5)

**Request**:
```json
{
  "jsonrpc": "2.0",
  "method": "generate_face_embedding",
  "params": {
    "image_bytes": "iVBORw0KGgoAAAANSUhEUgAA...",
    "detection_threshold": 0.6
  },
  "id": 1
}
```

**Response** (Success):
```json
{
  "jsonrpc": "2.0",
  "result": {
    "success": true,
    "embedding": [0.123, -0.456, 0.789, ...],
    "confidence": 0.95,
    "face_count": 1
  },
  "id": 1
}
```

**Response** (Failure):
```json
{
  "jsonrpc": "2.0",
  "result": {
    "success": false,
    "error": "No face detected in image",
    "face_count": 0
  },
  "id": 1
}
```

**Use Cases**:
- User profile photo upload (Settings app)
- Edge node face authentication
- Pilot identity verification

---

### `analyze_edge_fatigue`

Analyze edge node telemetry from InfluxDB and provide intelligent fatigue reasoning.

**Parameters**:
- `edge_username` (string): Edge node identifier (e.g., "N420HH")
- `lookback_minutes` (int, optional): Time window for trend analysis (default: 10)

**Request**:
```json
{
  "jsonrpc": "2.0",
  "method": "analyze_edge_fatigue",
  "params": {
    "edge_username": "N420HH",
    "lookback_minutes": 15
  },
  "id": 2
}
```

**Response** (Success with data):
```json
{
  "jsonrpc": "2.0",
  "result": {
    "edge_username": "N420HH",
    "status": "Analyzed",
    "successful": true,
    "fusion_score": 0.34,
    "criticality": "moderate",
    "reasoning": [
      "Fusion score of 0.34 indicates moderate fatigue level",
      "Average EAR (0.21) below normal threshold - possible drowsiness",
      "3 microsleep events detected in last 15 minutes - CRITICAL",
      "Heart rate stable at 78 BPM - within normal range",
      "Yawn count (5) elevated - moderate concern"
    ],
    "trend_summary": {
      "fusion_score_trend": "increasing",
      "ear_trend": "decreasing",
      "heart_rate_trend": "stable",
      "microsleep_events": 3,
      "yawn_events": 5
    },
    "environmental": {
      "altitude": 10500,
      "temperature": 22.5,
      "humidity": 45,
      "status": "normal"
    },
    "recommendations": [
      "Alert pilot - microsleep events detected",
      "Monitor closely - fatigue indicators increasing",
      "Consider rest break if flight duration permits"
    ]
  },
  "id": 2
}
```

**Response** (No data):
```json
{
  "jsonrpc": "2.0",
  "result": {
    "edge_username": "N420HH",
    "status": "No data found",
    "successful": false,
    "reasoning": [
      "No telemetry data found for edge node 'N420HH' in the last 15 minutes"
    ]
  },
  "id": 2
}
```

**Analyzed Metrics**:
- **Visual Fatigue**: EAR (Eye Aspect Ratio), microsleeps, blink rate, yawning
- **Physiological**: Heart rate, HRV (RMSSD), HR trends, stress index
- **Environmental**: Temperature, humidity, altitude, pressure
- **Fusion Score**: Multi-factor fatigue assessment (0.0 = alert, 1.0 = critical)

**Criticality Levels**:
- `normal`: Fusion score < 0.25
- `caution`: Fusion score 0.25 - 0.40
- `moderate`: Fusion score 0.40 - 0.60
- `critical`: Fusion score > 0.60

**Use Cases**:
- Real-time dashboard fatigue analysis
- ATC operator decision support
- Historical trend analysis
- Alert generation for critical events

---

## MQTT Topics

### Telemetry Topic Structure

**Pattern**: `cogniflight/telemetry/{edge_username}`

**Example**: `cogniflight/telemetry/N420HH`

**QoS**: 1 (At least once delivery)

**Payload Format**: JSON

---

### Telemetry Message Schema

```json
{
  "pilot_username": "pilot1",
  "flight_id": "FLT001",
  "timestamp": 1698062730,

  "accel_x": 0.12,
  "accel_y": -0.05,
  "accel_z": 9.81,

  "gyro_x": 0.02,
  "gyro_y": -0.01,
  "gyro_z": 0.03,

  "altitude": 10500.0,
  "pressure": 1013.25,
  "temperature": 22.5,
  "humidity": 45.0,

  "heart_rate": 75,
  "rr_interval": 800,
  "baseline_deviation": 50,
  "rmssd": 45.3,
  "hr_trend": 2.1,
  "stress_index": 0.35,

  "avg_ear": 0.28,
  "mar": 0.15,
  "eyes_closed": false,
  "closure_duration": 0.0,
  "microsleep_count": 0,
  "blink_rate": 15,

  "yawning": false,
  "yawn_count": 2,
  "yawn_duration": 0.0,

  "fusion_score": 0.23,
  "confidence": 0.92,
  "is_critical_event": false,

  "system_state": "normal",
  "state_message": "All systems operational",

  "roll": 2.3,
  "pitch": -1.5,
  "yaw": 180.2
}
```

### Field Descriptions

**Identity**:
- `pilot_username`: Currently logged-in pilot
- `flight_id`: Active flight identifier
- `timestamp`: Unix timestamp

**IMU Data**:
- `accel_{x,y,z}`: Accelerometer readings (m/s²)
- `gyro_{x,y,z}`: Gyroscope readings (rad/s)

**Environmental**:
- `altitude`: Altitude in meters
- `pressure`: Atmospheric pressure (hPa)
- `temperature`: Temperature (°C)
- `humidity`: Relative humidity (%)

**Cardiovascular**:
- `heart_rate`: Heart rate (BPM)
- `rr_interval`: RR interval (ms)
- `baseline_deviation`: Deviation from baseline (ms)
- `rmssd`: Root mean square of successive differences (HRV metric)
- `hr_trend`: Heart rate trend (BPM change)
- `stress_index`: Stress index (0.0 - 1.0)

**Visual Fatigue**:
- `avg_ear`: Average Eye Aspect Ratio (lower = more closed)
- `mar`: Mouth Aspect Ratio (higher = more open)
- `eyes_closed`: Boolean flag
- `closure_duration`: Continuous eye closure duration (seconds)
- `microsleep_count`: Count of microsleep events
- `blink_rate`: Blinks per minute

**Yawning**:
- `yawning`: Currently yawning (boolean)
- `yawn_count`: Total yawn count
- `yawn_duration`: Current yawn duration (seconds)

**Fusion Analysis**:
- `fusion_score`: Multi-factor fatigue score (0.0 - 1.0)
- `confidence`: Prediction confidence (0.0 - 1.0)
- `is_critical_event`: Critical fatigue event flag

**System Status**:
- `system_state`: System state (normal, alert_moderate, alert_high)
- `state_message`: Human-readable status message

**Attitude**:
- `roll`: Roll angle (degrees)
- `pitch`: Pitch angle (degrees)
- `yaw`: Yaw angle (degrees)

---

## Authentication & Authorization

### Permission System

Cogniflight Cloud uses a tag-based permission system:

- **Tags**: Users are assigned tags (e.g., `user`, `sysadmin`, `atc`, `pilot`, `edge-node`, `data-analyst`)
- **Resources**: Files and directories have permission tags for read, write, execute, and updatetag operations
- **Authorization**: Access granted when user has at least one matching tag

### Role-Based Access Control

**System Administrator** (`sysadmin`):
- Full system access
- User management
- All commands and endpoints

**Air Traffic Controller** (`atc`):
- View pilots and edge nodes
- Monitor telemetry
- Dashboard access

**Data Analyst** (`data-analyst`):
- InfluxDB query access
- Historical data analysis
- ML engine access

**Pilot** (`pilot`):
- Own profile access

**Edge Node** (`edge-node`):
- Telemetry publishing
- Face embedding generation

---

## Error Codes

### HTTP Status Codes

- `200 OK`: Success
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request format
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Operation violates server schema
- `500 Internal Server Error`: Server error

### WebSocket Error Codes

Commands return exit codes:
- `0`: Success
- `1`: General error
- Non-zero: Command-specific error

### JSON-RPC Error Codes

- `-32700`: Parse error
- `-32600`: Invalid request
- `-32601`: Method not found
- `-32602`: Invalid params
- `-32603`: Internal error
