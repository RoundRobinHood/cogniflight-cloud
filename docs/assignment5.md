# Technology Stack Design Specification - Cogniflight Cloud Platform

**Module:** SEN381  
**Assessment:** Assignment 5  
**Total:** 20 Marks  
**Team:** PTA-AVIATION_PROJECT  
**Date:** October 2025  

---

## 1. Choice of Technology Stack [5 Marks]

### Selected Full-Stack Combination: Modern Cloud-Native Stack

We have chosen a modern cloud-native technology stack that combines high-performance backend services, real-time data processing, and scalable containerized deployment specifically optimized for aviation telemetry and pilot fatigue monitoring.

**Complete Technology Stack:**
- **Backend Framework:** Go with Gin Web Framework
- **Frontend Framework:** React 19.1 with Vite
- **Virtual Filesystem:** MongoDB 8.0 with GridFS for complete data storage
- **Time-Series Database:** InfluxDB 2.7 for telemetry
- **ML Engine:** Python with JSON-RPC communication
- **Message Broker:** Mosquitto 2.0 (MQTT with TLS)
- **Data Pipeline:** Telegraf 1.34
- **Container Orchestration:** Docker Compose
- **Reverse Proxy:** Traefik with automatic TLS

### Justification for Technology Stack Choice

**Real-Time Performance Requirements**
The Cogniflight platform processes continuous telemetry streams from multiple aircraft sensors in real-time. Go with the Gin framework was selected for its exceptional performance in handling concurrent connections and low-latency response times essential for aviation safety monitoring. The language's goroutines enable efficient processing of thousands of simultaneous telemetry streams without performance degradation.

**Innovative Virtual Filesystem Architecture**
Our unique approach implements a complete UNIX-like virtual filesystem within MongoDB using GridFS for binary storage. This revolutionary architecture stores all system data - user credentials, sessions, configurations, pilot profiles, and documents - as files and directories with granular permission controls. GridFS serves as the backbone for all file content storage, while MongoDB collections maintain the filesystem metadata, permissions, and directory structures. InfluxDB complements this by specializing in time-series telemetry data with built-in retention policies for high-frequency sensor streams.

**Industry-Standard Reliability**
Each technology in our stack has proven reliability in production environments. Go powers mission-critical infrastructure at major technology companies, MongoDB is the leading NoSQL database for enterprise applications, InfluxDB is the standard for IoT time-series data, and MQTT is the universally accepted protocol for telemetry transmission in aerospace and automotive industries.

**Development and Deployment Efficiency**
Docker Compose provides consistent development and production environments, eliminating "works on my machine" issues. The containerized architecture enables rapid deployment, easy scaling, and simplified updates. Traefik handles automatic TLS certificate management and load balancing, reducing operational overhead.

**Unified Data Management Through Virtual Filesystem**
The revolutionary virtual filesystem architecture unifies all data operations under a single paradigm. Every piece of data - from user profiles in `/home/username/user.profile` to authentication credentials in `/etc/passwd/` - is stored as files in GridFS with metadata in MongoDB. This approach provides consistent access control, versioning potential, and audit capabilities across all system operations, while maintaining the flexibility to integrate specialized services like Python ML engines through Unix sockets.

---

## 2. Front-End Technology Stack [5 Marks]

### Frontend Technologies and Tools

**React 19.1 with Vite Build System**

React serves as our primary frontend framework, leveraging its virtual DOM for efficient updates of real-time telemetry data. The component-based architecture enables modular development of aviation-specific interfaces including telemetry dashboards, pilot profiles, and alert management systems. Vite provides lightning-fast development with Hot Module Replacement, reducing build times by 70% compared to traditional bundlers.

**Key Frontend Dependencies:**
- **react-draggable & react-resizable-panels:** Enable operators to customize their monitoring dashboard layouts according to operational needs
- **lucide-react:** Provides optimized SVG icons for aviation-specific UI elements
- **@msgpack/msgpack:** Handles binary serialization for efficient telemetry data transmission over WebSocket connections
- **yaml:** Manages configuration files for different deployment environments

### UI Design Approach

**Component Architecture Philosophy**

The frontend implements a hierarchical component structure centered around the Desktop component that manages the main application state. The LoginScreen handles authentication, while specialized components manage different aspects of the aviation monitoring system. Each component is designed for reusability and maintainability, following React best practices.

**Responsive Design Implementation**

The interface adapts seamlessly from mobile devices (320px) to large control room displays (4K). The design prioritizes critical information visibility across all screen sizes, ensuring operators can monitor flight safety whether in the field on tablets or in control centers with multiple monitors. CSS Grid and Flexbox provide fluid layouts that automatically adjust to available screen real estate.

**State Management Strategy**

Local component state using React hooks (useState, useEffect) manages UI-specific data. Authentication state persists across components through prop drilling from the App component. Real-time data flows through WebSocket connections managed by the PipeCmdClient class, ensuring efficient updates without unnecessary re-renders.

### Frontend-Backend Integration

**WebSocket-Based Command System**

The frontend establishes a persistent WebSocket connection that handles virtually all system operations beyond authentication. The PipeCmdClient class manages command execution for file operations, data queries, telemetry retrieval, pilot management, and all other system functions. This WebSocket-first architecture eliminates the need for multiple REST endpoints, providing a single, efficient channel for all system interactions with low-latency bidirectional communication.

**Authentication and Session Management**

Cookie-based authentication ensures secure access to the system through session files stored in the virtual filesystem at `/etc/sess/`. The IsAuthorized function validates user sessions by checking session files, while the login system verifies credentials against `/etc/passwd/` files. Session cookies are managed by the browser and automatically included in all API requests, maintaining security without impacting user experience.

**API Communication Pattern**

The frontend uses REST endpoints solely for authentication (login, signup, logout), with all other operations conducted through the WebSocket connection. Once authenticated, the WebSocket becomes the primary communication channel for all system functions including filesystem operations, database queries, telemetry streaming, and command execution. All communications use JSON format, with msgpack binary serialization available for high-frequency data to reduce bandwidth usage.

### Performance Optimization Strategies

The application implements code splitting at the route level, loading components only when needed. React.memo prevents unnecessary re-renders of static components. The build process optimizes bundle size through tree shaking and minification. Service Workers could be implemented for offline functionality and improved caching, though not currently deployed.

---

## 3. Back-End Technology Stack [5 Marks]

### Programming Language and Framework

**Go with Gin Web Framework**

Go serves as our primary backend language, chosen for its exceptional concurrency model and performance characteristics. The Gin framework provides a lightweight, high-performance HTTP web framework with middleware support, routing, and JSON validation. Go's compiled nature ensures optimal performance for processing high-frequency telemetry data, while its strong typing prevents runtime errors critical in aviation safety systems.

**Backend Architecture Design**

The backend implements a modular architecture centered around a virtual filesystem paradigm. The filesystem package provides comprehensive file operations using GridFS for binary storage and MongoDB for metadata. The auth package validates credentials by reading from `/etc/passwd/` files in the virtual filesystem. The cmd package processes WebSocket commands that interact with the filesystem. This unified filesystem approach ensures all data operations follow consistent permission and access patterns.

### API Design and Implementation

**Minimal REST API with WebSocket-First Architecture**

The system uses a minimal REST API exclusively for session management operations: /login for user authentication, /signup for new user registration, /logout for session termination, and /check-mqtt-user for MQTT device authentication. All other system operations - from data queries to file operations - are handled through the WebSocket connection at /cmd-socket. This WebSocket-first approach provides persistent bidirectional communication for all primary system functions.

**Middleware Architecture**

The Gin framework's middleware pipeline ensures consistent request processing. Custom middleware includes jlogging for structured logging, authentication middleware for protecting routes, and trusted proxy configuration for proper client IP detection behind reverse proxies. This layered approach provides security, observability, and flexibility.

### Authentication and Authorization

**Virtual Filesystem-Based Authentication**

The system implements a revolutionary authentication mechanism where user credentials are stored as files within the virtual filesystem. Password files are stored in `/etc/passwd/` with bcrypt hashing, while sessions are maintained in `/etc/sess/`. This approach treats authentication as a filesystem operation, leveraging GridFS for secure credential storage and MongoDB for permission management. Bootstrap credentials initialize the filesystem with a root user, creating the foundational directory structure.

**Hierarchical Permission System**

Every file and directory in the virtual filesystem has granular permissions defined by tags (ReadTags, WriteTags, ExecuteTags, UpdatePermissionTags). This UNIX-inspired permission model enables sophisticated access control where users inherit permissions through tag-based roles. The system supports role hierarchies like "sysadmin", "user", and custom tags, providing flexible authorization that scales from individual files to entire directory trees.

### Scalability and Performance Features

**Virtual Filesystem Operations**

The backend maintains persistent connections to MongoDB and GridFS for filesystem operations, with the ML engine connected through Unix sockets. All data operations go through the virtual filesystem layer, ensuring consistent permission checking and audit trails. The filesystem Store struct manages both metadata in MongoDB collections and binary content in GridFS buckets. Operations include Lookup for path resolution, ReadFile/WriteFile for content management, and WriteDirectory for structure creation, all respecting tag-based permissions.

**JSON-RPC Communication**

Communication with the Python ML engine uses JSON-RPC over Unix sockets, providing low-latency inter-process communication. This approach eliminates network overhead for local ML processing while maintaining clean service boundaries. The plain object stream ensures efficient serialization without unnecessary overhead.

**Performance Monitoring**

Structured logging through jlogging provides detailed performance metrics and debugging information. The system monitors MongoDB connectivity and automatically handles reconnections. Health check endpoints could be easily added for orchestration platforms, though not currently implemented.

---

## 4. AI-Assistive Tools & Integration [5 Marks]

### OpenAI Terminal Assistant Integration

**Technology Stack for BOB (Terminal AI Assistant)**

Our AI-powered terminal assistant, BOB, leverages OpenAI's GPT-4 API to provide natural language interaction within the terminal environment. Activated via the \"activate bob\" command, BOB transforms the terminal from command-line interface to conversational interface. The integration includes OpenAI's GPT-4 model for natural language understanding, function calling to execute terminal operations, direct integration with the virtual filesystem for file operations, and permission validation through the tag-based system.

**Terminal-Based AI Assistant (BOB)**

The OpenAI-powered chatbot, activated through the command "activate bob" in our terminal application, transforms the command-line interface into a natural language interface. Once activated, BOB allows operators to interact with the system using conversational language instead of memorizing complex terminal commands. Users can query system status, execute functions, navigate the virtual filesystem, and perform operations through simple English commands rather than technical syntax.

### Terminal Integration and Natural Language Processing

**Command-Line Natural Language Interface**

BOB operates within the terminal application, converting natural language requests into system commands. After activation, users can type requests like "show me today's flights" or "check fatigue score for pilot Johnson" instead of complex command syntax. The assistant understands context from the current terminal session and translates conversational input into appropriate filesystem operations, database queries, or system commands.

**Function Execution Through Terminal**

BOB executes system functions by translating natural language into terminal commands that interact with the virtual filesystem and system APIs. Users can request operations like viewing files in the virtual filesystem ("show me the pilot profiles"), querying telemetry data ("get altitude data for flight AA123"), checking system status ("how many active flights right now"), and navigating directories ("go to the logs folder"). The assistant handles the technical command syntax behind the scenes.

**Terminal Context Awareness**

BOB maintains awareness of the terminal session state, including current directory in the virtual filesystem, user permissions based on their tags, recent command history, and active system connections. This context enables more intelligent responses and prevents users from executing unauthorized operations.

### Technical Implementation Architecture

**Terminal Application Interface**

The terminal application provides the primary interface for BOB, activated through the "activate bob" command. Once activated, the terminal enters natural language mode where user input is processed by OpenAI rather than the traditional command interpreter. The terminal maintains conversation history within the session, displays BOB's responses with appropriate formatting, and can seamlessly switch between natural language mode and traditional command mode.

**Backend Terminal-OpenAI Bridge**

The Go backend manages the integration between the terminal application and OpenAI API. When BOB is activated, the backend intercepts terminal input and routes it to OpenAI for processing. The system maintains terminal session context including current directory and user permissions, translates natural language into executable commands, validates operations against the virtual filesystem permissions, and returns both explanatory text and command results to the terminal.

**Function Calling for Terminal Operations**

OpenAI's function calling feature enables BOB to execute terminal operations programmatically. Available functions include filesystem navigation (cd, ls, pwd), file operations (read, write, create), database queries through the virtual filesystem, telemetry data retrieval from InfluxDB, and system status checks. BOB translates natural language requests into these function calls, executing them with proper permission checks through the tag-based system.

### ML Engine Architecture for Future Expansion

**Python ML Service Foundation**

The existing Python ML engine provides a foundation for future machine learning capabilities. The JSON-RPC server architecture supports easy addition of ML models for fatigue detection, predictive analytics for maintenance scheduling, anomaly detection in telemetry data, and pattern recognition for safety incidents. The modular handler system allows incremental addition of ML features without disrupting existing operations.

**Extensible Handler System**

The handler_imports.py structure enables plugin-style addition of new ML capabilities. Each handler can implement specific functions for different ML operations, from simple statistical analysis to complex neural network inference. The ThreadPoolExecutor ensures concurrent processing for multiple ML requests without blocking.

**Integration Points**

The ML engine connects to the main system through Unix sockets for low-latency communication, InfluxDB for accessing time-series telemetry data, MongoDB for retrieving pilot profiles and flight records, and the MQTT broker for real-time data streams. This comprehensive integration enables ML models to access all necessary data for accurate analysis.

### Benefits of AI Integration

**Enhanced User Experience**

The OpenAI chatbot dramatically improves user experience by reducing the time needed to find features or information, providing instant help without consulting documentation, enabling non-technical users to perform complex operations, and offering personalized assistance based on user role and preferences.

**Operational Efficiency**

AI assistance increases operational efficiency through faster task completion via natural language commands, reduced training time for new operators, fewer errors through guided task execution, and consistent best practices enforcement through intelligent suggestions.

**Scalable Support System**

The AI integration provides scalable support that's available 24/7 without human intervention, handles multiple user queries simultaneously, learns from common questions to improve responses, and reduces load on human support staff for routine queries.

**Future-Ready Architecture**

The current implementation establishes a foundation for advanced AI features including predictive analytics for proactive safety management, automated incident analysis and reporting, intelligent alert prioritization based on context, and continuous learning from operational data. The modular architecture ensures these capabilities can be added incrementally as the platform evolves.

---

## Conclusion

The Cogniflight Cloud platform's technology stack represents a carefully balanced selection of modern technologies optimized for real-time aviation safety monitoring with intelligent user assistance. Our stack combines Go's performance with React's flexibility, specialized databases for different data types, and OpenAI's advanced language models for natural user interaction.

The architecture delivers sub-second telemetry processing through efficient Go routines, innovative virtual filesystem storage using GridFS for all system data, real-time communication via WebSocket and MQTT, containerized deployment for consistent environments, and intelligent terminal assistance through our BOB implementation powered by OpenAI's GPT-4. Our unique virtual filesystem approach revolutionizes data management by treating all system components - from user credentials to pilot profiles - as files with granular permissions, while our custom BOB assistant (utilizing OpenAI's API) transforms the terminal experience by allowing natural language commands instead of technical syntax.

Through thoughtful technology selection and pragmatic implementation, the platform provides a robust foundation for aviation safety monitoring while maintaining flexibility for future enhancements. The modular, service-oriented design ensures each component can evolve independently, protecting the investment while enabling continuous improvement in both core functionality and AI-powered features.
