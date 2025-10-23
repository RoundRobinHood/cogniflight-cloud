<img src="cogniflight-logo.png" align="right" width="80" alt="Cogniflight Logo">

# Cogniflight Cloud

Cloud services and infrastructure for Cogniflight: ingesting and processing device telemetry, storing fatigue analytics, and exposing secure endpoints for visualization and alerting.

## Overview

Cogniflight Cloud is a comprehensive aviation fatigue monitoring platform that provides real-time telemetry processing, ML-powered fatigue analysis, and intuitive dashboards for air traffic controllers and system administrators. Built on a Service-Oriented Architecture (SOA), the system integrates edge devices (cockpit monitoring units) with cloud services to detect pilot fatigue in real-time using multimodal sensor fusion.

### Key Capabilities

- **Real-time Telemetry Processing**: MQTT-based ingestion of edge node telemetry data including physiological metrics (heart rate, HRV), visual fatigue indicators (EAR, yawning), and environmental data
- **ML-Powered Analysis**: Face embedding generation for seamless authentication and intelligent reasoning over telemetry streams for fatigue detection
- **Live Dashboard**: Real-time visualization of edge node status with attitude indicators, fusion score graphs, and critical alert monitoring
- **User Management**: Role-based access control with pilots, ATC operators, data analysts, and system administrators
- **Virtual Filesystem**: Tag-based permission system for secure data access and multi-tenancy
- **Time-Series Analytics**: InfluxDB integration for historical trend analysis and reporting

## Architecture

Cogniflight Cloud is built as a Service-Oriented Architecture (SOA) with the following components:

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  Desktop UI • Terminal • Dashboard • User/Pilot/Flight Apps     │
└────────────────────────────┬────────────────────────────────────┘
                             │ WebSocket + REST
┌────────────────────────────┴────────────────────────────────────┐
│                      Backend (Go + Gin)                          │
│  • WebSocket Command Interface  • Authentication/Authorization  │
│  • Virtual Filesystem (MongoDB) • MQTT Telemetry Listener       │
│  • InfluxDB Query Streaming     • ML Engine Integration         │
└──┬─────────────┬─────────────┬──────────────┬───────────────────┘
   │             │             │              │
   ▼             ▼             ▼              ▼
┌──────┐   ┌──────────┐   ┌────────┐   ┌──────────────────────┐
│MongoDB│   │ InfluxDB │   │ MQTT   │   │  ML Engine (Python)  │
│       │   │          │   │Mosquitto   │  • Face Embeddings   │
│ VFS + │   │Telemetry │   │ Broker │   │  • Telemetry Analysis│
│GridFS │   │  + Logs  │   └────────┘   │  • Fatigue Reasoning │
└───────┘   └─────▲────┘        ▲        └──────────────────────┘
                  │             │
                  │    ┌────────┴────────┐
                  └────┤   Telegraf      │
                       │  (MQTT → Influx)│
                       └─────────────────┘
                              ▲
                              │ MQTT Telemetry
                     ┌────────┴─────────┐
                     │   Edge Nodes     │
                     │ (Cockpit Devices)│
                     └──────────────────┘
```

### SOA Design Principles

The system follows Service-Oriented Architecture principles with:

- **Loose Coupling**: Services communicate through well-defined interfaces (WebSocket, REST, JSON-RPC, MQTT)
- **Service Contracts**: Clear API contracts between frontend, backend, and ML services
- **Autonomy**: Each service can be developed, deployed, and scaled independently
- **Reusability**: Backend services expose reusable commands and ML engine provides general-purpose RPC methods
- **Discoverability**: Services register and expose capabilities through standardized protocols
- **Interoperability**: JSON/YAML data formats and standard protocols enable cross-service communication

### Component Details

#### Backend (Go)
- **Framework**: Gin web framework with WebSocket support
- **Virtual Filesystem**: Tag-based permission system stored in MongoDB with GridFS for file storage
- **Command Interface**: Shell-like command execution over WebSocket (ls, cat, pilots, edge-nodes, flux, etc.)
- **MQTT Integration**: Subscribes to `cogniflight/telemetry/+` topics for real-time edge node data
- **ML Engine RPC**: JSON-RPC over Unix socket for face embeddings and telemetry analysis
- **Authentication**: JWT-based session management with bcrypt password hashing

#### Frontend (React)
- **Desktop-Style UI**: Windows-based interface with draggable/resizable windows and taskbar
- **Applications**:
  - **Edge Node Dashboard**: Real-time telemetry visualization with attitude indicators, fusion scores, and alerts
  - **Users App**: User management and profile editing (sysadmin only)
  - **Pilots App**: Pilot information and license management
  - **Flights App**: Flight tracking and historical data
  - **Terminal**: WebSocket-based shell interface to backend commands
  - **Settings**: User profile management with face embedding upload
  - **File Explorer**: Virtual filesystem navigation
- **Real-time Updates**: WebSocket connection for live telemetry streaming

#### ML Engine (Python)
- **Face Embeddings** (`face_embedding_handlers.py`):
  - InsightFace integration for generating 512-dimensional face embeddings
  - Used for seamless face authentication on edge nodes
  - Stores embeddings in MongoDB GridFS
- **Telemetry Analysis** (`reasoning.py`):
  - Analyzes MQTT telemetry streams from InfluxDB
  - Provides reasoning for fusion scores and fatigue indicators
  - Detects critical events (microsleeps, stress, cardiac anomalies)
  - Generates actionable insights for ATC operators
- **Communication**: JSON-RPC 2.0 over Unix socket

#### MQTT Broker (Mosquitto)
- TLS-encrypted connections (port 8883)
- Custom authentication via backend HTTP endpoint
- Topic structure: `cogniflight/telemetry/{edge_username}`

#### Time-Series Database (InfluxDB)
- Stores telemetry data via Telegraf MQTT consumer
- Bucket: `telegraf`, Measurement: `mqtt_consumer`
- Fields: fusion_score, heart_rate, EAR, altitude, attitude (roll/pitch/yaw), etc.

#### Document Database (MongoDB)
- **Collections**:
  - `vfs`: Virtual filesystem entries with tag-based permissions
  - `fs.files` / `fs.chunks`: GridFS for file storage
- **Schema**: Hierarchical filesystem with directories and files, each with read/write/execute/updatetag permission tags

## Prerequisites

- **Docker** 20.10+ and **Docker Compose** v2.0+
- **TLS Certificates** (or use provided self-signed certs for development)
- **OpenAI API Key** (for chatbot functionality in terminal)

## Quickstart

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/cogniflight-cloud.git
cd cogniflight-cloud
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```bash
# MongoDB
MONGO_PWD=your_secure_password

# InfluxDB
INFLUXDB_TOKEN=your_influx_token
INFLUXDB_ORG=myorg
INFLUXDB_BUCKET=telegraf

# MQTT
MQTT_KEY=your_mqtt_password
SERVER_DOMAIN=localhost
INSECURE_SKIP_VERIFY_MQTT=true

# Backend Bootstrap User
BOOTSTRAP_USERNAME=admin
BOOTSTRAP_EMAIL=admin@example.com
BOOTSTRAP_PHONE=+1234567890
BOOTSTRAP_PWD=admin_password

# OpenAI (for terminal chatbot)
OPENAI_API_KEY=sk-...

# Environment
ENV=development
```

### 3. Launch Services

Start all services with Docker Compose profiles:

```bash
# Start MongoDB
docker compose --profile mongo up -d

# Start MQTT broker
docker compose --profile mqtt-broker up -d

# Start InfluxDB and Telegraf (for telemetry ingestion)
docker compose --profile receive_mqtt up -d

# Start backend and ML engine
docker compose --profile backend up -d

# Access the application
open http://localhost:5173
```

Or start everything at once:

```bash
docker compose --profile mongo --profile mqtt-broker --profile receive_mqtt --profile backend up -d
```

### 4. Login

Navigate to `http://localhost:5173` and login with your bootstrap credentials:
- **Username**: `admin` (from BOOTSTRAP_USERNAME)
- **Password**: `admin_password` (from BOOTSTRAP_PWD)

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb://ohno:{MONGO_PWD}@mongo:27017/?authSource=admin` |
| `MONGO_PWD` | MongoDB root password | `rootpass` |
| `INFLUX_URL` | InfluxDB HTTP endpoint | `http://influxdb:8086` |
| `INFLUX_TOKEN` | InfluxDB authentication token | `mytoken` |
| `INFLUX_ORG` | InfluxDB organization | `myorg` |
| `INFLUX_BUCKET` | InfluxDB bucket for telemetry | `telegraf` |
| `MQTT_URL` | MQTT broker URL | `ssl://mosquitto:8883` |
| `MQTT_KEY` | MQTT authentication key | `mqttpass` |
| `SERVER_DOMAIN` | Public domain for TLS | `localhost` |
| `BOOTSTRAP_USERNAME` | Initial admin username | - |
| `BOOTSTRAP_EMAIL` | Initial admin email | - |
| `BOOTSTRAP_PHONE` | Initial admin phone | - |
| `BOOTSTRAP_PWD` | Initial admin password | - |
| `OPENAI_API_KEY` | OpenAI API key for chatbot | - |

### TLS Certificates

For production deployment, place your TLS certificates in the `./self-signed-certs/` directory:
- `fullchain.pem`: Full certificate chain
- `privkey.pem`: Private key

Or use environment variables:
```bash
TLS_CERTFILE_PATH=/path/to/fullchain.pem
TLS_KEYFILE_PATH=/path/to/privkey.pem
```

### Docker Compose Profiles

- `mongo`: MongoDB database
- `mqtt-broker`: Mosquitto MQTT broker
- `receive_mqtt`: InfluxDB + Telegraf for telemetry ingestion
- `backend`: Backend API + ML engine
- `ml-engine`: ML engine only
- `rest-api`: Backend API only

## API Reference

For complete API documentation including WebSocket commands, REST endpoints, ML Engine RPC methods, and MQTT topics, see [API_REFERENCE.md](docs/API_REFERENCE.md).

## Development

### Backend Development

```bash
cd backend
go mod download
go run . # or use Docker with watch mode
```

Backend runs on port 8080.

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

Frontend dev server runs on port 5173 with hot reload.

### ML Engine Development

```bash
cd ml-engine
pip install -r requirements.txt
python server.py
```

ML engine listens on Unix socket at `./test.sock`.

## Project Structure

```
cogniflight-cloud/
├── backend/             # Go backend service
│   ├── cmd/            # WebSocket commands
│   ├── auth/           # Authentication handlers
│   ├── filesystem/     # Virtual filesystem implementation
│   ├── influx/         # InfluxDB streaming
│   ├── chatbot/        # OpenAI integration
│   ├── client/         # WebSocket client handling
│   ├── types/          # Shared types
│   └── main.go         # Entry point
├── frontend/           # React frontend
│   └── src/
│       ├── components/ # UI components
│       │   └── apps/  # Application windows
│       ├── api/       # Backend API clients
│       └── styles/    # CSS modules
├── ml-engine/          # Python ML service
│   └── handlers/      # RPC method handlers
├── mosquitto/          # MQTT broker config
├── docs/              # Documentation
├── docker-compose.yml  # Service orchestration
├── mongo-init.js      # MongoDB initialization
└── telegraf.conf      # Telegraf configuration
```

## Contributing

See [PROJECT_CHARTER.pdf](docs/PROJECT_CHARTER.pdf) for project scope and [TEAM_COLLABORATION.md](docs/TEAM_COLLABORATION.md) for team structure.

### Development Workflow

1. Create feature branch from `main`
2. Make changes with descriptive commits
3. Test locally with Docker Compose
4. Submit pull request for review

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Team

This project was developed by a collaborative team. See [TEAM_COLLABORATION.md](docs/TEAM_COLLABORATION.md) for detailed team structure and contributions.
