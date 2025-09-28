# CogniFlight Cloud Platform - Information Architecture & UX/UI Design Report

## SEN3781 Assignment 4 - Group Project Submission

---

## Executive Summary

CogniFlight Cloud is an advanced aviation management platform that provides a comprehensive desktop-style web application for flight operations, pilot management, and real-time edge node monitoring. This report details the information architecture and UX/UI design for the platform, focusing on creating an intuitive, responsive, and accessible interface that serves multiple user roles including ground control operators, flight managers, pilots, and system administrators.

The platform leverages a unique desktop paradigm within a web browser, following a desktop-first approach optimized for control center operations and professional aviation management workstations. The system provides familiar desktop interaction patterns while delivering powerful aviation management capabilities through modular applications, with special emphasis on ML-powered analytics and live edge node monitoring for critical aviation safety operations.

---

## 1. SITEMAP - System Architecture & Navigation Hierarchy

### 1.1 Overall Platform Structure

```
CogniFlight Cloud Platform
│
├── Authentication Layer
│   ├── Login Screen (Two-Step Authentication)
│   ├── Session Management
│   └── Role-Based Access Control
│
├── Desktop Environment
│   ├── Desktop Canvas
│   │   ├── Application Icons
│   │   ├── Context Menus
│   │   └── Theme Selection (Galaxy/Blue)
│   │
│   ├── Taskbar
│   │   ├── Start Menu
│   │   ├── Pinned Applications
│   │   ├── Active Windows
│   │   ├── System Tray
│   │   └── Alert Notifications
│   │
│   └── Window Management System
│       ├── Draggable Windows
│       ├── Resizable Frames
│       ├── Minimize/Maximize/Close
│       └── Snap-to-Edge
│
└── Core Applications
    ├── Dashboard (Edge Node Monitor)
    │   ├── Live Node Grid
    │   ├── Risk Priority Display
    │   ├── Telemetry Streams
    │   ├── Alert Management
    │   └── Adaptive Layout System
    │
    ├── ML Engine
    │   ├── Function List View
    │   │   ├── Search Bar
    │   │   ├── Function Cards (Name & Description)
    │   │   └── Category Filter
    │   ├── Function Detail View
    │   │   ├── Description Section
    │   │   ├── Input Parameters Section
    │   │   ├── Output Format Section
    │   │   └── Execute Button
    │   └── Results View
    │       ├── Execution Status
    │       ├── Results Display
    │       └── Export Options
    │
    ├── Flights Management
    │   ├── Flight Schedule
    │   ├── Route Planning
    │   ├── Aircraft Assignment
    │   ├── Status Tracking
    │   └── Historical Data
    │
    ├── Pilots Management
    │   ├── Pilot List View
    │   │   ├── Search & Filter
    │   │   ├── Pilot Cards/Table
    │   │   └── Quick Actions
    │   ├── Pilot Detail View
    │   │   ├── Personal Information
    │   │   ├── Certifications
    │   │   ├── Flight History
    │   │   └── Performance Metrics
    │   └── Pilot Invitation
    │       ├── Invitation Form
    │       ├── Bulk Import
    │       └── Pending Invitations
    │
    ├── Users & Access Control
    │   ├── User List View
    │   │   ├── Search & Filter
    │   │   ├── User Table
    │   │   └── Bulk Actions
    │   ├── User Detail View
    │   │   ├── Profile Information
    │   │   ├── Role Assignment
    │   │   ├── Permissions Matrix
    │   │   └── Activity Log
    │   └── User Invitation
    │       ├── Invitation Form
    │       ├── Role Selection
    │       └── Pending Invitations
    │
    └── Settings
        ├── Profile Settings
        │   ├── Personal Information
        │   ├── Change Password
        │   └── Avatar Upload
        ├── System Preferences
        │   ├── Theme Selection
        │   ├── Language Settings
        │   └── Time Zone
        ├── Display Settings
        │   ├── Monitor Configuration
        │   ├── Window Defaults
        │   └── Font Size
        ├── Notification Settings
        │   ├── Alert Types
        │   ├── Sound Configuration
        │   └── Email Preferences
        └── Integration Settings
            ├── API Keys
            ├── External Services
            └── Data Export
```

### 1.2 Navigation Hierarchy Levels

**Level 0: Authentication**
- Entry point validation
- Role-based routing
- Session establishment

**Level 1: Desktop Environment**
- Application launcher
- Multi-window workspace
- System-wide notifications

**Level 2: Application Layer**
- Specialized app interfaces
- Inter-app data sharing
- Context-aware operations

**Level 3: Feature Components**
- Function-specific interfaces
- Data manipulation tools
- Real-time visualizations

**Level 4: Actions & Operations**
- Execute ML functions
- Monitor edge nodes
- Manage resources
- Generate reports

---

## 2. TASK FLOWS - User Journey Mappings

### 2.1 Ground Control Operator Task Flow: Monitoring High-Risk Edge Nodes

```
Start → Login → Desktop Loads → Dashboard Auto-Opens 
→ System Analyzes Edge Node Risk Levels → Adaptive Grid Arranges High-Risk Nodes 
→ Operator Views Live Telemetry on Multiple Monitors → Receives Alert for Critical Node 
→ Click Node for Detailed View in New Window → Assess Situation 
→ Open ML Engine in Adjacent Window → Search for Analysis Function
→ Execute Risk Analysis → View Results → Take Action 
→ Continue Monitoring → System Re-prioritizes Display
```

**Decision Points:**
- Risk threshold exceeded (alert/monitor)
- Node connection status (online/offline)
- Window arrangement preference
- ML function selection for analysis
- Action required (immediate/scheduled)
- Display optimization (resize/rearrange)

### 2.2 Data Analyst Task Flow: ML Function Discovery and Execution

```
Start → Login → Desktop → Open ML Engine App
→ View Function List → Use Search Bar to Find Function
→ Browse Function Cards (Name + Description) → Click Desired Function
→ View Function Details Page → Read Input/Output Documentation
→ Enter Values in Input Text Fields → Click Execute Button
→ View Execution Progress → Results Display in Same Window
→ Review Results → Export or Save for Later Use
```

**Decision Points:**
- Search vs browse for function
- Function selection based on description
- Input validation requirements
- Execution confirmation
- Results meet expectations
- Export format selection

### 2.3 Administrator Task Flow: Managing System Users

```
Start → Login → Desktop → Open Users App
→ View User List with Roles → Search/Filter for Specific User
→ Click User to View Details → Review Permissions and Activity
→ Modify Role Assignment → Save Changes
→ Click "Invite User" → Fill Invitation Form → Select Role
→ Send Invitation → Monitor Pending Invitations
→ User Accepts → Verify in User List
```

**Decision Points:**
- User search criteria
- Role assignment appropriateness
- Permission level requirements
- Invitation method (email/link)
- Approval workflow needed
- Bulk operations required

### 2.4 Flight Operations Manager Task Flow: Managing Pilots

```
Start → Login → Desktop → Open Pilots App
→ View Pilot List → Filter by Availability/Certification
→ Click Pilot for Details → Review Flight History and Certifications
→ Check Performance Metrics → Assign to Flight
→ Click "Invite Pilot" → Enter Pilot Information
→ Upload Certifications → Send Invitation
→ Track Onboarding Status → Activate Pilot Profile
```

**Decision Points:**
- Pilot search filters
- Certification validity
- Performance thresholds
- Assignment compatibility
- Invitation information completeness
- Document verification required

### 2.5 User Task Flow: Personalizing Settings

```
Start → Login → Desktop → Open Settings App
→ Navigate Through Setting Categories → Select Profile Settings
→ Update Personal Information → Change Theme to Galaxy
→ Navigate to Display Settings → Configure Multi-Monitor Setup
→ Set Notification Preferences → Configure Alert Sounds
→ Save All Settings → Settings Apply System-Wide
→ Close Settings → Continue Working
```

**Decision Points:**
- Setting category selection
- Theme preference
- Display configuration needs
- Notification frequency
- Sound preferences
- Save vs discard changes

---

## 3. LOW-FIDELITY WIREFRAMES - Key Interface Designs

### 3.1 Desktop Environment - Multi-Window Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CogniFlight Cloud Desktop                                          - □ X    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐        │
│  │ Dashboard - Ground Control    │  │ ML Engine                    │        │
│  ├──────────────────────────────┤  ├──────────────────────────────┤        │
│  │ Active: 47 | High Risk: 8    │  │ [Search functions...]        │        │
│  │ ┌────┐ ┌────┐ ┌────┐ ┌────┐ │  │ ┌────────────────────────┐   │        │
│  │ │JFK │ │LAX │ │ORD│ │DFW │ │  │ │ Risk Analysis          │   │        │
│  │ │ ⚠⚠ │ │ ⚠⚠ │ │ ⚠ │ │    │ │  │ │ Analyzes flight risk   │   │        │
│  │ └────┘ └────┘ └────┘ └────┘ │  │ └────────────────────────┘   │        │
│  │ ┌────┐ ┌────┐ ┌────┐ ┌────┐ │  │ ┌────────────────────────┐   │        │
│  │ │ATL │ │BOS │ │SEA │ │PHX │ │  │ │ Weather Prediction     │   │        │
│  │ │    │ │    │ │    │ │    │ │  │ │ Forecasts weather      │   │        │
│  │ └────┘ └────┘ └────┘ └────┘ │  │ └────────────────────────┘   │        │
│  └──────────────────────────────┘  └──────────────────────────────┘        │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │ Flights Management                                     - □ X │          │
│  ├──────────────────────────────────────────────────────────────┤          │
│  │ CF1234  JFK-LAX  14:30  A320  Active  [Details]             │          │
│  │ CF1235  LAX-ORD  15:45  B737  Boarding [Details]            │          │
│  └──────────────────────────────────────────────────────────────┘          │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Start] │ Dashboard │ ML Engine │ Flights │ Pilots │ Users │ Settings│10:24│
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Settings Application

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Settings                                                           - □ X   │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────┬────────────────────────────────────────────┐          │
│ │ Categories       │ Profile Settings                            │          │
│ ├──────────────────┤                                            │          │
│ │ ▼ Profile        │ ┌──────────────────────────────────────┐   │          │
│ │   • Personal     │ │ Personal Information                  │   │          │
│ │   • Password     │ ├──────────────────────────────────────┤   │          │
│ │   • Avatar       │ │                                      │   │          │
│ │                  │ │ Full Name:                           │   │          │
│ │ ▶ System         │ │ [John Doe_____________________]      │   │          │
│ │                  │ │                                      │   │          │
│ │ ▶ Display        │ │ Email:                               │   │          │
│ │                  │ │ [john.doe@cogniflight.com____]      │   │          │
│ │                  │ │                                      │   │          │
│ │ ▶ Notifications  │ │ Phone:                               │   │          │
│ │                  │ │ [+1 555-0123__________________]      │   │          │
│ │                  │ │                                      │   │          │
│ │ ▶ Integration    │ │ Department:                          │   │          │
│ │                  │ │ [Operations ▼]                       │   │          │
│ │                  │ │                                      │   │          │
│ │                  │ │ Job Title:                           │   │          │
│ │                  │ │ [Ground Control Operator______]      │   │          │
│ │                  │ │                                      │   │          │
│ │                  │ │ Employee ID:                         │   │          │
│ │                  │ │ [CF-2024-1234] (read-only)          │   │          │
│ │                  │ │                                      │   │          │
│ │                  │ └──────────────────────────────────────┘   │          │
│ │                  │                                            │          │
│ │                  │ [Save Changes] [Cancel]                   │          │
│ └──────────────────┴────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Settings - System Preferences

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Settings                                                           - □ X   │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────┬────────────────────────────────────────────┐          │
│ │ Categories       │ System Preferences                         │          │
│ ├──────────────────┤                                            │          │
│ │ ▶ Profile        │ ┌──────────────────────────────────────┐   │          │
│ │                  │ │ Theme Selection                      │   │          │
│ │ ▼ System         │ ├──────────────────────────────────────┤   │          │
│ │   • Theme        │ │                                      │   │          │
│ │   • Language     │ │ ( ) Blue Theme                       │   │          │
│ │   • Time Zone    │ │     Classic professional blue       │   │          │
│ │                  │ │                                      │   │          │
│ │ ▶ Display        │ │ (•) Galaxy Theme                     │   │          │
│ │                  │ │     Modern space-inspired dark      │   │          │
│ │                  │ │                                      │   │          │
│ │ ▶ Notifications  │ │ ( ) High Contrast                    │   │          │
│ │                  │ │     Optimized for bright environments│   │          │
│ │ ▶ Integration    │ └──────────────────────────────────────┘   │          │
│ │                  │                                            │          │
│ │                  │ ┌──────────────────────────────────────┐   │          │
│ │                  │ │ Language Settings                    │   │          │
│ │                  │ ├──────────────────────────────────────┤   │          │
│ │                  │ │                                      │   │          │
│ │                  │ │ Display Language: [English (US) ▼]  │   │          │
│ │                  │ │                                      │   │          │
│ │                  │ │ Date Format:      [MM/DD/YYYY ▼]    │   │          │
│ │                  │ │                                      │   │          │
│ │                  │ │ Number Format:    [1,234.56 ▼]      │   │          │
│ │                  │ └──────────────────────────────────────┘   │          │
│ │                  │                                            │          │
│ │                  │ ┌──────────────────────────────────────┐   │          │
│ │                  │ │ Time Zone                            │   │          │
│ │                  │ ├──────────────────────────────────────┤   │          │
│ │                  │ │                                      │   │          │
│ │                  │ │ Time Zone: [UTC-5 Eastern Time ▼]   │   │          │
│ │                  │ │                                      │   │          │
│ │                  │ │ [✓] Automatically adjust for DST    │   │          │
│ │                  │ └──────────────────────────────────────┘   │          │
│ │                  │                                            │          │
│ │                  │ [Save Changes] [Cancel]                   │          │
│ └──────────────────┴────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.4 Settings - Notification Preferences

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Settings                                                           - □ X   │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────┬────────────────────────────────────────────┐          │
│ │ Categories       │ Notification Settings                      │          │
│ ├──────────────────┤                                            │          │
│ │ ▶ Profile        │ ┌──────────────────────────────────────┐   │          │
│ │                  │ │ Alert Types                          │   │          │
│ │ ▶ System         │ ├──────────────────────────────────────┤   │          │
│ │                  │ │                                      │   │          │
│ │ ▶ Display        │ │ [✓] Critical Alerts (Always On)     │   │          │
│ │                  │ │     System failures, emergencies    │   │          │
│ │ ▼ Notifications  │ │                                      │   │          │
│ │   • Alert Types  │ │ [✓] High Priority Alerts            │   │          │
│ │   • Sounds       │ │     Risk threshold exceeded         │   │          │
│ │   • Email        │ │                                      │   │          │
│ │                  │ │ [✓] Medium Priority Alerts          │   │          │
│ │ ▶ Integration    │ │     Schedule changes, updates       │   │          │
│ │                  │ │                                      │   │          │
│ │                  │ │ [ ] Low Priority Notifications      │   │          │
│ │                  │ │     General information             │   │          │
│ │                  │ └──────────────────────────────────────┘   │          │
│ │                  │                                            │          │
│ │                  │ ┌──────────────────────────────────────┐   │          │
│ │                  │ │ Sound Configuration                  │   │          │
│ │                  │ ├──────────────────────────────────────┤   │          │
│ │                  │ │                                      │   │          │
│ │                  │ │ Master Volume: [========|==] 80%    │   │          │
│ │                  │ │                                      │   │          │
│ │                  │ │ Critical: [Alarm ▼] [Test]          │   │          │
│ │                  │ │ High:     [Chime ▼] [Test]          │   │          │
│ │                  │ │ Medium:   [Ding ▼]  [Test]          │   │          │
│ │                  │ │ Low:      [None ▼]  [Test]          │   │          │
│ │                  │ └──────────────────────────────────────┘   │          │
│ │                  │                                            │          │
│ │                  │ ┌──────────────────────────────────────┐   │          │
│ │                  │ │ Email Preferences                    │   │          │
│ │                  │ ├──────────────────────────────────────┤   │          │
│ │                  │ │                                      │   │          │
│ │                  │ │ [✓] Email critical alerts           │   │          │
│ │                  │ │ [✓] Daily summary report            │   │          │
│ │                  │ │ [ ] All notifications               │   │          │
│ │                  │ └──────────────────────────────────────┘   │          │
│ │                  │                                            │          │
│ │                  │ [Save Changes] [Cancel] [Test Alerts]  │          │
│ └──────────────────┴────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.5 Users Management - List View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Users & Access Control                                            - □ X    │
├─────────────────────────────────────────────────────────────────────────────┤
│ [+ Invite User] [Import Users] [Export] [Search: _____________] [Filter ▼] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ Active Users: 87 | Pending: 3 | Inactive: 12                              │
│                                                                              │
│ ┌─┬──────────────┬──────────────────┬──────────┬─────────┬──────┬───────┐│
│ │□│Name          │Email             │Role      │Status   │Last  │Actions││
│ ├─┼──────────────┼──────────────────┼──────────┼─────────┼──────┼───────┤│
│ │□│John Smith    │j.smith@cf.com    │Admin     │Active   │2 hrs │[⋮]   ││
│ │□│Jane Doe      │j.doe@cf.com      │Manager   │Active   │5 min │[⋮]   ││
│ │□│Bob Wilson    │b.wilson@cf.com   │Analyst   │Active   │1 day │[⋮]   ││
│ │□│Alice Brown   │a.brown@cf.com    │Operator  │Active   │3 hrs │[⋮]   ││
│ │□│Mike Davis    │m.davis@cf.com    │Analyst   │Pending  │Never │[⋮]   ││
│ │□│Sarah Miller  │s.miller@cf.com   │Manager   │Active   │12 hrs│[⋮]   ││
│ │□│Tom Johnson   │t.johnson@cf.com  │Admin     │Inactive │30 day│[⋮]   ││
│ └─┴──────────────┴──────────────────┴──────────┴─────────┴──────┴───────┘│
│                                                                              │
│ Bulk Actions: [Change Role ▼] [Deactivate] [Delete] [Resend Invitations]  │
│                                                                              │
│ Showing 7 of 102 users                         Pages: [1] 2 3 4 ... 15 [>] │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.6 Users Management - Detail View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Users & Access Control - Jane Doe                                 - □ X    │
├─────────────────────────────────────────────────────────────────────────────┤
│ [← Back to List]  [Edit User]  [Reset Password]  [Deactivate]  [Delete]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ ┌────────────────────────┬─────────────────────────────────────┐           │
│ │ Profile Information    │ Access & Permissions                │           │
│ ├────────────────────────┼─────────────────────────────────────┤           │
│ │                        │                                     │           │
│ │ Name: Jane Doe         │ Current Role: [Manager ▼]          │           │
│ │ Email: j.doe@cf.com    │                                     │           │
│ │ Phone: +1 555-0124     │ ┌─────────────────────────────────┐│           │
│ │ Department: Operations │ │ Permissions                     ││           │
│ │ Employee ID: CF-1002   │ ├─────────────────────────────────┤│           │
│ │ Status: Active ●       │ │ Dashboard           [✓] View    ││           │
│ │ Joined: Jan 15, 2024   │ │                     [✓] Edit    ││           │
│ │ Last Login: 5 min ago  │ │ ML Engine           [✓] View    ││           │
│ │                        │ │                     [✓] Execute ││           │
│ │ ┌──────────────────┐   │ │ Flights             [✓] View    ││           │
│ │ │     [Avatar]     │   │ │                     [✓] Edit    ││           │
│ │ │                  │   │ │ Pilots              [✓] View    ││           │
│ │ │   Jane Doe      │   │ │                     [ ] Edit    ││           │
│ │ └──────────────────┘   │ │ Users               [✓] View    ││           │
│ │                        │ │                     [ ] Edit    ││           │
│ │                        │ │ Settings            [✓] View    ││           │
│ │                        │ │                     [✓] Edit    ││           │
│ │                        │ └─────────────────────────────────┘│           │
│ └────────────────────────┴─────────────────────────────────────┘           │
│                                                                              │
│ ┌───────────────────────────────────────────────────────────────┐          │
│ │ Recent Activity                                               │          │
│ ├───────────────────────────────────────────────────────────────┤          │
│ │ • 5 min ago    - Logged in from 192.168.1.100                │          │
│ │ • 2 hours ago  - Executed ML function: Risk Analysis         │          │
│ │ • 3 hours ago  - Modified flight CF1234                      │          │
│ │ • Yesterday    - Updated personal settings                   │          │
│ │ • 2 days ago   - Exported flight reports                     │          │
│ └───────────────────────────────────────────────────────────────┘          │
│                                                                              │
│ [Save Changes] [Cancel]                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.7 Users Management - Invite New User

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Users & Access Control - Invite New User                          - □ X    │
├─────────────────────────────────────────────────────────────────────────────┤
│ [← Back to List]                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ ┌────────────────────────────────────────────────────────────────┐         │
│ │ User Information                                               │         │
│ ├────────────────────────────────────────────────────────────────┤         │
│ │                                                                │         │
│ │ Email Address *                                                │         │
│ │ [_________________________________________________________]    │         │
│ │                                                                │         │
│ │ First Name *                                                   │         │
│ │ [_________________________________________________________]    │         │
│ │                                                                │         │
│ │ Last Name *                                                    │         │
│ │ [_________________________________________________________]    │         │
│ │                                                                │         │
│ │ Department                                                     │         │
│ │ [Select Department ▼]                                          │         │
│ │                                                                │         │
│ │ Employee ID                                                    │         │
│ │ [_________________________________________________________]    │         │
│ └────────────────────────────────────────────────────────────────┘         │
│                                                                              │
│ ┌────────────────────────────────────────────────────────────────┐         │
│ │ Role Assignment                                                │         │
│ ├────────────────────────────────────────────────────────────────┤         │
│ │                                                                │         │
│ │ Select Role *                                                  │         │
│ │                                                                │         │
│ │ ( ) Administrator - Full system access                         │         │
│ │ ( ) Manager - Manage operations and view reports               │         │
│ │ (•) Analyst - Execute ML functions and view data              │         │
│ │ ( ) Operator - Monitor dashboard and manage flights            │         │
│ │ ( ) Viewer - Read-only access to system                       │         │
│ │                                                                │         │
│ │ Custom Message (Optional)                                      │         │
│ │ ┌──────────────────────────────────────────────────────────┐  │         │
│ │ │Welcome to CogniFlight Cloud. You've been invited to join│  │         │
│ │ │our aviation management platform...                       │  │         │
│ │ └──────────────────────────────────────────────────────────┘  │         │
│ └────────────────────────────────────────────────────────────────┘         │
│                                                                              │
│ [Send Invitation] [Send & Add Another] [Cancel]                            │
│                                                                              │
│ ┌────────────────────────────────────────────────────────────────┐         │
│ │ Pending Invitations (3)                                       │         │
│ ├────────────────────────────────────────────────────────────────┤         │
│ │ • m.davis@cf.com    - Sent 2 days ago    [Resend] [Cancel]   │         │
│ │ • k.white@cf.com    - Sent 5 days ago    [Resend] [Cancel]   │         │
│ │ • r.green@cf.com    - Sent 7 days ago    [Resend] [Cancel]   │         │
│ └────────────────────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.8 Pilots Management - List View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Pilots Management                                                 - □ X    │
├─────────────────────────────────────────────────────────────────────────────┤
│ [+ Invite Pilot] [Import] [Export] [Search: _____________]                 │
│                                                                              │
│ Filter: [All ▼] [Available ▼] [Certified for: ▼] [Base Location: ▼]       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ Active Pilots: 156 | Available: 42 | On Duty: 89 | Rest: 25               │
│                                                                              │
│ ┌─┬──────────────┬────────┬───────────┬──────────┬─────────┬──────┬──────┐│
│ │□│Name          │License │Aircraft   │Hours     │Status   │Base  │Action││
│ ├─┼──────────────┼────────┼───────────┼──────────┼─────────┼──────┼──────┤│
│ │□│John Smith    │ATP-234 │A320, A350 │8,542     │Available│JFK   │[View]││
│ │□│Jane Doe      │CPL-567 │B737, B757 │3,256     │On Duty  │LAX   │[View]││
│ │□│Bob Wilson    │ATP-890 │A320, A380 │12,450    │Rest     │ORD   │[View]││
│ │□│Alice Brown   │CPL-123 │B737       │2,100     │Available│DFW   │[View]││
│ │□│Mike Johnson  │ATP-456 │A350, B777 │9,800     │On Duty  │ATL   │[View]││
│ │□│Sarah Davis   │CPL-789 │A320       │1,850     │Training │BOS   │[View]││
│ │□│Tom Miller    │ATP-012 │B747, A380 │15,200    │Available│SEA   │[View]││
│ └─┴──────────────┴────────┴───────────┴──────────┴─────────┴──────┴──────┘│
│                                                                              │
│ Quick Stats:                                                                │
│ ├─ Average Flight Hours: 6,742                                             │
│ ├─ Certifications Expiring (30 days): 8                                    │
│ └─ Performance Average: 94.2%                                              │
│                                                                              │
│ Showing 7 of 156 pilots                        Pages: [1] 2 3 4 ... 23 [>] │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.9 Pilots Management - Detail View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Pilots Management - John Smith                                    - □ X    │
├─────────────────────────────────────────────────────────────────────────────┤
│ [← Back to List]  [Edit]  [Schedule]  [Performance Report]  [Export]       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ ┌────────────────────────┬─────────────────────────────────────┐           │
│ │ Personal Information   │ Certifications & Qualifications     │           │
│ ├────────────────────────┼─────────────────────────────────────┤           │
│ │                        │                                     │           │
│ │ Name: John Smith       │ ┌─────────────────────────────────┐│           │
│ │ Employee ID: P-1001    │ │ License       Status   Expires ││           │
│ │ License #: ATP-234567  │ ├─────────────────────────────────┤│           │
│ │ Base: JFK              │ │ ATP           Active   12/2025 ││           │
│ │ Status: Available ●    │ │ Medical 1st   Active   03/2025 ││           │
│ │                        │ │ A320 Type     Active   06/2025 ││           │
│ │ Contact:               │ │ A350 Type     Active   09/2025 ││           │
│ │ Email: j.smith@cf.com  │ │ ETOPS         Active   01/2026 ││           │
│ │ Phone: +1 555-0125     │ │ CAT III       Active   04/2025 ││           │
│ │ Emergency: +1 555-0126 │ └─────────────────────────────────┘│           │
│ │                        │                                     │           │
│ │ ┌──────────────────┐   │ Aircraft Qualified:                │           │
│ │ │     [Photo]      │   │ • Airbus A320 Family               │           │
│ │ │                  │   │ • Airbus A350                      │           │
│ │ │   John Smith    │   │                                     │           │
│ │ └──────────────────┘   │ Languages: English, Spanish        │           │
│ └────────────────────────┴─────────────────────────────────────┘           │
│                                                                              │
│ ┌───────────────────────────────────────────────────────────────┐          │
│ │ Flight Statistics                                            │          │
│ ├───────────────────────────────────────────────────────────────┤          │
│ │                                                              │          │
│ │ Total Flight Hours: 8,542        This Month: 85             │          │
│ │ Total Landings: 4,271           This Year: 892              │          │
│ │ Night Hours: 2,856              Career Flights: 2,847       │          │
│ │                                                              │          │
│ │ Performance Score: 96.5/100     Safety Record: Excellent    │          │
│ │ On-Time Rate: 94.8%            Fuel Efficiency: A+          │          │
│ └───────────────────────────────────────────────────────────────┘          │
│                                                                              │
│ ┌───────────────────────────────────────────────────────────────┐          │
│ │ Recent Flights                                               │          │
│ ├───────────────────────────────────────────────────────────────┤          │
│ │ • CF1234  JFK→LAX  Sep 29  A320  5.5 hrs  On Time          │          │
│ │ • CF1198  LAX→JFK  Sep 28  A320  5.2 hrs  On Time          │          │
│ │ • CF1156  JFK→ORD  Sep 27  A350  2.8 hrs  On Time          │          │
│ │ • CF1089  ORD→JFK  Sep 26  A350  2.5 hrs  Early            │          │
│ └───────────────────────────────────────────────────────────────┘          │
│                                                                              │
│ [View Full History] [Download Records]                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.10 Pilots Management - Invite New Pilot

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Pilots Management - Invite New Pilot                              - □ X    │
├─────────────────────────────────────────────────────────────────────────────┤
│ [← Back to List]                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ ┌────────────────────────────────────────────────────────────────┐         │
│ │ Pilot Information                                              │         │
│ ├────────────────────────────────────────────────────────────────┤         │
│ │                                                                │         │
│ │ Email Address *                                                │         │
│ │ [_________________________________________________________]    │         │
│ │                                                                │         │
│ │ First Name *                Last Name *                       │         │
│ │ [_________________________]  [__________________________]    │         │
│ │                                                                │         │
│ │ License Number *             License Type *                   │         │
│ │ [_________________________]  [ATP ▼]                          │         │
│ │                                                                │         │
│ │ Base Location *              Employee ID                      │         │
│ │ [Select Base ▼]              [__________________________]    │         │
│ └────────────────────────────────────────────────────────────────┘         │
│                                                                              │
│ ┌────────────────────────────────────────────────────────────────┐         │
│ │ Certifications                                                 │         │
│ ├────────────────────────────────────────────────────────────────┤         │
│ │                                                                │         │
│ │ Medical Certificate                                            │         │
│ │ Class: [1st ▼]  Number: [___________]  Expires: [MM/DD/YYYY]  │         │
│ │                                                                │         │
│ │ Aircraft Type Ratings                                          │         │
│ │ [✓] A320 Family    [ ] A350    [ ] A380                      │         │
│ │ [✓] B737 Family    [ ] B777    [ ] B747                      │         │
│ │                                                                │         │
│ │ Additional Qualifications                                      │         │
│ │ [✓] ETOPS    [ ] CAT III    [ ] Instructor    [ ] Examiner   │         │
│ │                                                                │         │
│ │ Upload Documents                                               │         │
│ │ ┌──────────────────────────────────────────────────────────┐  │         │
│ │ │ Drag files here or [Browse Files]                       │  │         │
│ │ │ Accepted: PDF, JPG, PNG (Max 10MB each)                 │  │         │
│ │ └──────────────────────────────────────────────────────────┘  │         │
│ └────────────────────────────────────────────────────────────────┘         │
│                                                                              │
│ ┌────────────────────────────────────────────────────────────────┐         │
│ │ Experience Summary                                            │         │
│ ├────────────────────────────────────────────────────────────────┤         │
│ │                                                                │         │
│ │ Total Flight Hours *         Previous Airline                 │         │
│ │ [_________________________]  [__________________________]    │         │
│ │                                                                │         │
│ │ Notes (Optional)                                               │         │
│ │ ┌──────────────────────────────────────────────────────────┐  │         │
│ │ │                                                          │  │         │
│ │ └──────────────────────────────────────────────────────────┘  │         │
│ └────────────────────────────────────────────────────────────────┘         │
│                                                                              │
│ [Send Invitation] [Save as Draft] [Cancel]                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. RESPONSIVE DESIGN STRATEGY

### 4.1 Desktop-First Optimization

**Primary Design Targets:**
```css
/* Desktop-First Breakpoints */
- Control Center Displays: 2560px+ (4K monitors)
- Professional Workstations: 1920px - 2559px
- Standard Desktop: 1280px - 1919px
- Compact Desktop: 1024px - 1279px
- Tablet (Emergency Access): 768px - 1023px
```

### 4.2 Application-Specific Responsive Behaviors

**Settings App:**
- Large displays: Sidebar navigation with wide content area
- Standard displays: Collapsible sidebar
- Compact displays: Tab-based navigation

**Users Management:**
- 4K displays: Show 8 columns in table view
- Full HD: Show 6 essential columns
- Standard: Show 4 primary columns with actions menu

**Pilots Management:**
- Large displays: Side-by-side detail panels
- Standard displays: Stacked detail sections
- Compact: Accordion-style information panels

---

## 5. TECHNICAL IMPLEMENTATION

### 5.1 Settings Application Architecture

```javascript
// Settings Manager
class SettingsManager {
  constructor() {
    this.categories = [
      { id: 'profile', label: 'Profile', icon: 'user' },
      { id: 'system', label: 'System', icon: 'settings' },
      { id: 'display', label: 'Display', icon: 'monitor' },
      { id: 'notifications', label: 'Notifications', icon: 'bell' },
      { id: 'integration', label: 'Integration', icon: 'link' }
    ]
    this.currentCategory = 'profile'
    this.unsavedChanges = false
  }
  
  loadSettings() {
    return fetch('/api/settings/user')
      .then(res => res.json())
      .then(data => this.applySettings(data))
  }
  
  saveSettings(settings) {
    this.validateSettings(settings)
    return fetch('/api/settings/user', {
      method: 'PUT',
      body: JSON.stringify(settings)
    })
  }
  
  applyTheme(theme) {
    document.body.className = `theme-${theme}`
    localStorage.setItem('theme', theme)
  }
}
```

### 5.2 Users Management System

```javascript
// User Management Controller
class UserManagement {
  constructor() {
    this.users = []
    this.roles = ['admin', 'manager', 'analyst', 'operator', 'viewer']
    this.filters = {
      status: 'all',
      role: 'all',
      search: ''
    }
  }
  
  async inviteUser(userData) {
    const invitation = {
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      department: userData.department,
      customMessage: userData.message,
      invitedBy: currentUser.id,
      invitedAt: Date.now()
    }
    
    const response = await fetch('/api/users/invite', {
      method: 'POST',
      body: JSON.stringify(invitation)
    })
    
    return response.json()
  }
  
  updateUserRole(userId, newRole) {
    return fetch(`/api/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role: newRole })
    })
  }
  
  generatePermissionMatrix(role) {
    const permissions = {
      admin: { all: true },
      manager: {
        dashboard: ['view', 'edit'],
        mlEngine: ['view', 'execute'],
        flights: ['view', 'edit'],
        pilots: ['view', 'edit'],
        users: ['view'],
        settings: ['view', 'edit']
      },
      analyst: {
        dashboard: ['view'],
        mlEngine: ['view', 'execute'],
        flights: ['view'],
        pilots: ['view'],
        users: [],
        settings: ['view']
      },
      operator: {
        dashboard: ['view', 'edit'],
        mlEngine: ['view'],
        flights: ['view', 'edit'],
        pilots: ['view'],
        users: [],
        settings: ['view']
      },
      viewer: {
        dashboard: ['view'],
        mlEngine: [],
        flights: ['view'],
        pilots: ['view'],
        users: [],
        settings: []
      }
    }
    
    return permissions[role] || permissions.viewer
  }
}
```

### 5.3 Pilots Management System

```javascript
// Pilot Management Controller
class PilotManagement {
  constructor() {
    this.pilots = []
    this.certificationTypes = [
      'ATP', 'CPL', 'Medical 1st', 'Medical 2nd',
      'A320 Type', 'A350 Type', 'B737 Type', 'B777 Type',
      'ETOPS', 'CAT III', 'Instructor', 'Examiner'
    ]
    this.bases = ['JFK', 'LAX', 'ORD', 'DFW', 'ATL', 'BOS', 'SEA']
  }
  
  async invitePilot(pilotData) {
    const invitation = {
      personalInfo: {
        email: pilotData.email,
        firstName: pilotData.firstName,
        lastName: pilotData.lastName,
        employeeId: pilotData.employeeId
      },
      license: {
        number: pilotData.licenseNumber,
        type: pilotData.licenseType,
        medicalClass: pilotData.medicalClass,
        medicalExpiry: pilotData.medicalExpiry
      },
      qualifications: {
        aircraftTypes: pilotData.aircraftTypes,
        additionalCerts: pilotData.additionalCerts
      },
      experience: {
        totalHours: pilotData.totalHours,
        previousAirline: pilotData.previousAirline
      },
      base: pilotData.base,
      documents: pilotData.uploadedDocuments,
      invitedAt: Date.now()
    }
    
    const response = await fetch('/api/pilots/invite', {
      method: 'POST',
      body: JSON.stringify(invitation)
    })
    
    return response.json()
  }
  
  calculatePilotStats(pilot) {
    return {
      totalHours: pilot.flights.reduce((sum, f) => sum + f.duration, 0),
      thisMonth: this.getMonthlyHours(pilot),
      performanceScore: this.calculatePerformance(pilot),
      onTimeRate: this.calculateOnTimeRate(pilot),
      safetyRecord: this.evaluateSafetyRecord(pilot)
    }
  }
  
  checkCertificationExpiry(pilot) {
    const expiringCerts = []
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    const now = Date.now()
    
    pilot.certifications.forEach(cert => {
      const daysUntilExpiry = (cert.expiryDate - now) / (24 * 60 * 60 * 1000)
      if (daysUntilExpiry <= 30) {
        expiringCerts.push({
          name: cert.name,
          daysRemaining: Math.floor(daysUntilExpiry)
        })
      }
    })
    
    return expiringCerts
  }
}
```

---

## CONCLUSION

The CogniFlight Cloud platform delivers a sophisticated desktop-first aviation management system with comprehensive user interfaces for all core applications. The Settings app provides intuitive personal and system configuration options with clear categorization. The Users Management system offers robust access control with role-based permissions and streamlined invitation workflows. The Pilots Management application enables efficient pilot roster management with detailed tracking of certifications, performance metrics, and flight history.

These applications, combined with the ML Engine's simple function discovery interface and the adaptive Dashboard for real-time edge node monitoring, create a complete aviation operations platform. The consistent desktop-first design philosophy, multi-window support, and professional-grade features ensure maximum productivity for control center operations while maintaining clarity and efficiency in all user interactions.

The low-fidelity wireframes demonstrate a clear information hierarchy and intuitive navigation patterns across all applications, ensuring users can efficiently manage complex aviation operations with confidence and precision.

---

**Document Version:** 1.0  
**Last Updated:** September 2024  
**Project Team:** CogniFlight Development Team  
**Course:** SEN3781 - Software Engineering  
**Institution:** Belgium Campus iTversity