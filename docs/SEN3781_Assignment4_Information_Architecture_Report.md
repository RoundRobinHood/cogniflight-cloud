# CogniFlight Cloud Platform - Information Architecture & UX/UI Design Report

## SEN3781 Assignment 4 - Group Project Submission

---

## Executive Summary

CogniFlight Cloud is an advanced aviation management platform that provides a comprehensive desktop-style web application for flight operations, pilot management, and real-time edge node monitoring. This report details the information architecture and UX/UI design for the platform, focusing on creating an intuitive, responsive, and accessible interface that serves multiple user roles including ground control operators, flight managers, pilots, and system administrators.

The platform leverages a unique desktop paradigm within a web browser, following a desktop-first approach optimized for control center operations and professional aviation management workstations. Each application is designed to perform its specific function independently, with the FATCON widget providing critical fatigue monitoring exclusively for ground control operations to manage system-wide pilot fatigue situations.

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
│   │   ├── FATCON Widget (Ground Control Only)
│   │   ├── Pinned Applications
│   │   ├── Active Windows
│   │   ├── System Tray
│   │   └── Notification Bell
│   │
│   ├── Window Management System
│   │   ├── Draggable Windows
│   │   ├── Resizable Frames
│   │   ├── Minimize/Maximize/Close
│   │   └── Snap-to-Edge
│   │
│   └── Alert & Notification System
│       ├── FATCON Critical Alerts (Ground Control)
│       ├── Toast Notifications
│       ├── Modal Dialogs
│       └── Notification Panel
│
└── Core Applications (Independent Functionality)
    ├── Dashboard
    │   ├── Live Edge Node Monitoring
    │   ├── Risk Priority Display
    │   ├── Real-time Telemetry
    │   ├── Alert Management
    │   └── Adaptive Grid Layout
    │
    ├── MLEngine
    │   ├── Function List
    │   ├── Function Search
    │   ├── Parameter Input
    │   ├── Execution Engine
    │   └── Results Display
    │
    ├── Flights
    │   ├── Flight List
    │   ├── Flight Details
    │   ├── Status Monitoring
    │   ├── Flight History
    │   └── Report Generation
    │
    ├── Pilots
    │   ├── Pilot Registry
    │   ├── Certification Management
    │   ├── Schedule Tracking
    │   ├── Performance Metrics
    │   └── Pilot Invitation
    │
    ├── Users
    │   ├── User Management
    │   ├── Role Assignment
    │   ├── Permission Control
    │   ├── Activity Monitoring
    │   └── User Invitation
    │
    └── Settings
        ├── Profile Configuration
        ├── System Preferences
        ├── Display Options
        ├── Notification Preferences
        └── Integration Settings
```

### 1.2 Navigation Hierarchy Levels

**Level 0: Authentication**
- Entry point validation
- Role determination
- Session initialization

**Level 1: Desktop Environment**
- Primary workspace
- FATCON monitoring (Ground Control role only)
- Application launcher
- System notifications

**Level 2: Application Layer**
- Independent applications
- Focused functionality per app
- Self-contained operations

**Level 3: Feature Components**
- App-specific functions
- Specialized operations
- Data management

---

## 2. TASK FLOWS - User Journey Mappings

### 2.1 Ground Control Operator Task Flow: System-Wide Fatigue Monitoring

```
Start → Login (Ground Control Role) → Desktop Loads with FATCON Widget
→ FATCON Widget Shows System-Wide Pilot Fatigue Status
→ Monitor Overall Fatigue Levels Across All Active Pilots
→ FATCON Level Becomes Critical (Too Many Fatigued Pilots)
→ Alert Popup: "Critical Fatigue Threshold Exceeded"
→ View Alert: "18 pilots at critical fatigue, system capacity exceeded"
→ Initiate Emergency Protocols → Adjust Operations
→ Ground Flights if Necessary → Request Backup Crews
→ Monitor Recovery → Continue Operations
```

**Decision Points:**
- System fatigue threshold exceeded
- Emergency protocol activation
- Flight grounding decisions
- Crew reassignment priorities
- Recovery monitoring

### 2.2 Data Analyst Task Flow: MLEngine Function Execution

```
Start → Login → Open MLEngine App
→ Search for Analysis Function
→ Select Function from List
→ View Function Description
→ Enter Parameters in Input Fields
→ Execute Function
→ View Results
→ Export Results
→ Close MLEngine
```

**Decision Points:**
- Function selection
- Parameter validation
- Result interpretation
- Export format

### 2.3 Administrator Task Flow: User Management

```
Start → Login → Open Users App
→ View User List
→ Search/Filter for User
→ Select User to View Details
→ Modify Role/Permissions
→ Save Changes
→ Invite New User if Needed
→ Monitor User Activity
```

**Decision Points:**
- User role assignment
- Permission levels
- Invitation approval
- Activity review

### 2.4 Pilot Manager Task Flow: Pilot Management

```
Start → Login → Open Pilots App
→ View Pilot Registry
→ Check Certifications Status
→ Review Performance Metrics
→ Schedule Pilot Assignments
→ Invite New Pilots
→ Update Pilot Records
```

**Decision Points:**
- Certification validity
- Performance thresholds
- Schedule conflicts
- Invitation criteria

### 2.5 Flight Operations Task Flow: Flight Monitoring

```
Start → Login → Open Flights App
→ View Flight List
→ Select Flight for Details
→ Monitor Flight Status
→ View Flight Information
→ Generate Flight Report
→ Export Report Data
```

**Decision Points:**
- Flight selection
- Report parameters
- Export format
- Status monitoring

---

## 3. LOW-FIDELITY WIREFRAMES - Key Interface Designs

### 3.1 Desktop Environment with FATCON Widget (Ground Control View)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CogniFlight Cloud Desktop - Ground Control                         - □ X    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                    ┌──────────────────────────────────┐                     │
│                    │ ⚠ CRITICAL FATIGUE ALERT ⚠      │                     │
│                    ├──────────────────────────────────┤                     │
│                    │ System Fatigue Level: CRITICAL   │                     │
│                    │                                  │                     │
│                    │ 18 pilots at critical fatigue    │                     │
│                    │ 12 pilots at high fatigue        │                     │
│                    │ System capacity: EXCEEDED        │                     │
│                    │                                  │                     │
│                    │ Required Actions:                │                     │
│                    │ • Ground non-critical flights    │                     │
│                    │ • Activate reserve crews         │                     │
│                    │ • Redistribute flight schedule   │                     │
│                    │                                  │                     │
│                    │ [Initiate Protocol] [Details]    │                     │
│                    └──────────────────────────────────┘                     │
│                                                                              │
│  Desktop Icons:                                                             │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐              │
│  │ Dash │  │  ML  │  │Flight│  │Pilots│  │Users │  │ Set  │              │
│  │board │  │Engine│  │      │  │      │  │      │  │tings │              │
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘              │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│[Start]│[FATCON:CRITICAL▼]│Dashboard│MLEngine│Flights│      🔔(5) 10:24 AM  │
└─────────────────────────────────────────────────────────────────────────────┘
         ↑
    FATCON Widget showing system-wide fatigue status
```

### 3.2 FATCON Widget States (Ground Control Only)

```
Normal Operations:              Warning Level:                  Critical Level:
┌─────────────────┐            ┌─────────────────┐            ┌─────────────────┐
│ FATCON: NORMAL  │            │ FATCON: WARNING │            │FATCON: CRITICAL│
│ Active: 156     │            │ Active: 156     │            │ Active: 156     │
│ Fatigued: 8     │            │ Fatigued: 35    │            │ Fatigued: 48    │
│ Capacity: OK    │            │ Capacity: 78%   │            │ Capacity: OVER  │
└─────────────────┘            └─────────────────┘            └─────────────────┘
     (Green)                        (Yellow)                        (Red)

Expanded Widget View (Ground Control Click):
┌──────────────────────────────────┐
│ System Fatigue Management        │
├──────────────────────────────────┤
│ Total Active Pilots: 156         │
│ Critical Fatigue: 18 (11.5%)     │
│ High Fatigue: 30 (19.2%)         │
│ Medium Fatigue: 45 (28.8%)       │
│ Low Fatigue: 63 (40.4%)          │
│                                  │
│ System Status: CRITICAL          │
│ Capacity: 135% (EXCEEDED)        │
│                                  │
│ Recommended Actions:             │
│ • Immediate crew rotation        │
│ • Flight consolidation           │
│ • Emergency reserves activation  │
│                                  │
│ [Open Dashboard] [Protocols]     │
└──────────────────────────────────┘
```

### 3.3 Desktop Environment (Regular User View - No FATCON)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CogniFlight Cloud Desktop                                          - □ X    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Desktop Icons:                                                             │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐              │
│  │ Dash │  │  ML  │  │Flight│  │Pilots│  │Users │  │ Set  │              │
│  │board │  │Engine│  │      │  │      │  │      │  │tings │              │
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘              │
│                                                                              │
│                                                                              │
│                                                                              │
│                                                                              │
│                                                                              │
│                                                                              │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Start] │ Dashboard │ MLEngine │ Flights │               🔔(2) 10:24 AM    │
└─────────────────────────────────────────────────────────────────────────────┘
         Note: No FATCON widget for non-ground control users
```

### 3.4 Dashboard Application

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Dashboard                                                          - □ X   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Edge Node Monitoring                                       [Settings ⚙]     │
├─────────────────────────────────────────────────────────────────────────────┤
│ Active Nodes: 47 | High Risk: 8 | Critical: 3 | Offline: 2                │
│                                                                              │
│ HIGH PRIORITY NODES                                                         │
│ ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│ │ NODE: JFK-01  ⚠⚠⚠│  │ NODE: LAX-03  ⚠⚠│  │ NODE: ORD-07   ⚠│         │
│ │ ALT: 35,000 ft   │  │ ALT: 28,500 ft   │  │ ALT: 31,200 ft   │         │
│ │ SPEED: 485 kts   │  │ SPEED: 510 kts   │  │ SPEED: 475 kts   │         │
│ │ STATUS: WEATHER  │  │ STATUS: TRAFFIC  │  │ STATUS: NORMAL   │         │
│ │ [View] [Alert]   │  │ [View] [Alert]   │  │ [View] [Monitor] │         │
│ └──────────────────┘  └──────────────────┘  └──────────────────┘         │
│                                                                              │
│ STANDARD MONITORING                                                         │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │
│ │DFW-12  │ │ATL-09  │ │BOS-04  │ │SEA-15  │ │PHX-08  │ │DEN-11  │       │
│ │Risk:35%│ │Risk:28%│ │Risk:22%│ │Risk:20%│ │Risk:18%│ │Risk:15%│       │
│ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘       │
│                                                                              │
│ [Auto-Layout: ON] [Risk Threshold: 70%] [Refresh Rate: 1s]                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.5 MLEngine Application

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ MLEngine                                                           - □ X   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Search functions...                                                   🔍] │
│                                                                              │
│  Filter: [All Categories ▼]  Sort: [Name ▼]                               │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────┐        │
│  │ Risk Analysis                                                  │        │
│  │ Comprehensive safety risk assessment for flights               │        │
│  │                                                          [View>]│        │
│  └────────────────────────────────────────────────────────────────┘        │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────┐        │
│  │ Route Optimization                                              │        │
│  │ Calculate optimal flight paths based on multiple factors       │        │
│  │                                                          [View>]│        │
│  └────────────────────────────────────────────────────────────────┘        │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────┐        │
│  │ Weather Prediction                                              │        │
│  │ Advanced weather forecasting for flight planning               │        │
│  │                                                          [View>]│        │
│  └────────────────────────────────────────────────────────────────┘        │
│                                                                              │
│  Showing 3 of 23 functions                                    [Load More]  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.6 MLEngine Function Detail View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ MLEngine - Risk Analysis                                          - □ X   │
├─────────────────────────────────────────────────────────────────────────────┤
│ [← Back to Functions]                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ Description:                                                                │
│ Comprehensive safety risk assessment for flights based on multiple          │
│ factors including weather, traffic, aircraft condition, and route.          │
│                                                                              │
│ Input Parameters:                                                           │
│                                                                              │
│ Flight ID *         [_____________________________________________]         │
│ Departure Airport * [_____________________________________________]         │
│ Arrival Airport *   [_____________________________________________]         │
│ Departure Time *    [_____________________________________________]         │
│ Aircraft Type       [_____________________________________________]         │
│                                                                              │
│ Expected Output:                                                            │
│ • Risk Score (0-100)                                                       │
│ • Risk Category (Low/Medium/High/Critical)                                 │
│ • Contributing Factors                                                      │
│ • Recommendations                                                           │
│                                                                              │
│                            [Execute Function]                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.7 Flights Application

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Flights                                                            - □ X   │
├───────┬────────┬───────────┬──────────────────────────────────────────────┤
│ Live  │ History │ Reports   │                                              │
├───────┴────────┴───────────┴──────────────────────────────────────────────┤
│ [Search: _______________] [Filter ▼] [Export] [Generate Report]            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ ┌─┬────────┬──────────┬────────┬────────┬─────────┬────────┬──────┬─────┐│
│ │□│Flight  │Route     │Depart  │Arrive  │Aircraft │Pilot   │Status│Risk ││
│ ├─┼────────┼──────────┼────────┼────────┼─────────┼────────┼──────┼─────┤│
│ │□│CF1234  │JFK → LAX │14:30   │17:45   │A320-214 │Smith.J │En Air│ Low ││
│ │□│CF1235  │LAX → ORD │15:45   │21:30   │B737-800 │Doe.J   │Board │ Med ││
│ │□│CF1236  │ORD → DFW │16:20   │18:45   │A321-200 │Wilson.R│Ready │ Low ││
│ │□│CF1237  │DFW → ATL │17:00   │20:15   │B757-200 │Brown.M │Sched │ Low ││
│ └─┴────────┴──────────┴────────┴────────┴─────────┴────────┴──────┴─────┘│
│                                                                              │
│ [View Details] [Monitor] [Generate Report] [Export Data]                   │
│                                                                              │
│ Showing 4 of 247 flights                           Pages: [1] 2 3 ... 42   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.8 Pilots Application

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Pilots                                                             - □ X    │
├─────────────────────────────────────────────────────────────────────────────┤
│ [+ Invite Pilot] [Import] [Export] [Search: _____________]                 │
│ Filter: [All ▼] [Available ▼] [Certified ▼] [Base ▼]                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ Total: 156 | Available: 42 | On Duty: 89 | Rest: 25                       │
│                                                                              │
│ ┌─┬──────────────┬────────┬───────────┬──────────┬─────────┬──────┬──────┐│
│ │□│Name          │License │Aircraft   │Hours     │Status   │Base  │Action││
│ ├─┼──────────────┼────────┼───────────┼──────────┼─────────┼──────┼──────┤│
│ │□│John Smith    │ATP-234 │A320, A350 │8,542     │Available│JFK   │[View]││
│ │□│Jane Doe      │CPL-567 │B737, B757 │3,256     │On Duty  │LAX   │[View]││
│ │□│Bob Wilson    │ATP-890 │A320, A380 │12,450    │Rest     │ORD   │[View]││
│ │□│Alice Brown   │CPL-123 │B737       │2,100     │Available│DFW   │[View]││
│ │□│Mike Johnson  │ATP-456 │A350, B777 │9,800     │On Duty  │ATL   │[View]││
│ └─┴──────────────┴────────┴───────────┴──────────┴─────────┴──────┴──────┘│
│                                                                              │
│ [View Selected] [Update Status] [Generate Report]                          │
│                                                                              │
│ Showing 5 of 156 pilots                            Pages: [1] 2 3 ... 23   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.9 Users Application

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Users                                                              - □ X    │
├─────────────────────────────────────────────────────────────────────────────┤
│ [+ Invite User] [Import] [Export] [Search: _____________] [Filter: All ▼]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ Active: 87 | Pending: 3 | Inactive: 12                                     │
│                                                                              │
│ ┌─┬──────────────┬──────────────────┬──────────┬─────────┬──────┬───────┐│
│ │□│Name          │Email             │Role      │Status   │Last  │Actions││
│ ├─┼──────────────┼──────────────────┼──────────┼─────────┼──────┼───────┤│
│ │□│John Smith    │j.smith@cf.com    │Ground Ctl│Active   │2 hrs │[⋮]   ││
│ │□│Jane Doe      │j.doe@cf.com      │Manager   │Active   │5 min │[⋮]   ││
│ │□│Bob Wilson    │b.wilson@cf.com   │Analyst   │Active   │1 day │[⋮]   ││
│ │□│Alice Brown   │a.brown@cf.com    │Operator  │Active   │3 hrs │[⋮]   ││
│ └─┴──────────────┴──────────────────┴──────────┴─────────┴──────┴───────┘│
│                                                                              │
│ [Change Role] [Deactivate] [Reset Password]                                │
│                                                                              │
│ Showing 4 of 102 users                              Pages: [1] 2 3 ... 15  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.10 Settings Application

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Settings                                                           - □ X   │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────┬────────────────────────────────────────────┐          │
│ │ Categories       │ Profile Settings                            │          │
│ ├──────────────────┤                                            │          │
│ │ ▼ Profile        │ Personal Information                        │          │
│ │   • Personal     │                                            │          │
│ │   • Password     │ Full Name:    [John Doe_______________]    │          │
│ │                  │ Email:        [john.doe@cogniflight.com]  │          │
│ │ ▶ System         │ Department:   [Operations ▼]              │          │
│ │                  │ Role:         Ground Control (read-only)   │          │
│ │ ▶ Display        │                                            │          │
│ │                  │ Change Password                            │          │
│ │ ▶ Notifications  │ Current:      [••••••••••••••••••••]      │          │
│ │                  │ New:          [____________________]      │          │
│ │ ▶ Integration    │ Confirm:      [____________________]      │          │
│ │                  │                                            │          │
│ │                  │ [Save Changes] [Cancel]                    │          │
│ └──────────────────┴────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. RESPONSIVE DESIGN STRATEGY

### 4.1 Desktop-First Optimization

**Primary Design Targets:**
```css
/* Desktop-First Breakpoints */
- Control Center: 2560px+ (4K monitors)
- Workstation: 1920px - 2559px  
- Standard: 1280px - 1919px
- Compact: 1024px - 1279px
- Tablet: 768px - 1023px (Emergency only)
```

### 4.2 FATCON Widget Display Rules

**Role-Based Display:**
- Ground Control Users: FATCON widget always visible in taskbar
- Other Users: No FATCON widget displayed
- Widget updates every 15 seconds with system-wide data
- Expandable for detailed fatigue breakdown

### 4.3 Application Window Management

```
Window Snap Zones:
┌─────────────────────────────────┐
│         Full Screen            │
├────────────┬────────────────────┤
│ Left Half  │   Right Half       │
├────────────┼────────────────────┤
│  Quarter   │    Quarter         │
├────────────┼────────────────────┤
│  Quarter   │    Quarter         │
└────────────┴────────────────────┘
```

---

## 5. TECHNICAL IMPLEMENTATION

### 5.1 FATCON System Architecture (Ground Control Only)

```javascript
// FATCON Widget - Ground Control Operations
class FatconWidget {
  constructor(userRole) {
    // Only initialize for ground control role
    if (userRole !== 'GROUND_CONTROL') {
      return null;
    }
    
    this.systemFatigue = {
      totalPilots: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      systemCapacity: 100
    };
    
    this.updateInterval = 15000; // 15 seconds
    this.criticalThreshold = 15; // Max critical pilots before alert
  }
  
  calculateSystemCapacity() {
    // Calculate if system can handle current fatigue levels
    const criticalWeight = 3;
    const highWeight = 2;
    const mediumWeight = 1;
    
    const load = (this.systemFatigue.criticalCount * criticalWeight) +
                 (this.systemFatigue.highCount * highWeight) +
                 (this.systemFatigue.mediumCount * mediumWeight);
    
    const capacity = (load / this.systemFatigue.totalPilots) * 100;
    
    return {
      percentage: capacity,
      status: capacity > 100 ? 'EXCEEDED' : capacity > 80 ? 'WARNING' : 'NORMAL'
    };
  }
  
  checkCriticalThreshold() {
    if (this.systemFatigue.criticalCount > this.criticalThreshold) {
      this.triggerCriticalAlert({
        level: 'CRITICAL',
        message: 'System fatigue capacity exceeded',
        criticalPilots: this.systemFatigue.criticalCount,
        totalFatigued: this.systemFatigue.criticalCount + this.systemFatigue.highCount,
        requiredActions: [
          'Ground non-critical flights',
          'Activate reserve crews',
          'Redistribute schedule'
        ]
      });
    }
  }
}
```

### 5.2 Independent Application Architecture

```javascript
// Each app is completely self-contained
class DashboardApp {
  constructor() {
    this.name = 'Dashboard';
    this.data = {};
    this.api = '/api/dashboard';
  }
  
  async init() {
    // Load dashboard-specific data
    this.data = await fetch(this.api + '/nodes').then(r => r.json());
    this.render();
  }
  
  // Dashboard only focuses on edge nodes
  monitorNodes() {
    // Edge node monitoring logic
  }
}

class MLEngineApp {
  constructor() {
    this.name = 'MLEngine';
    this.functions = [];
    this.api = '/api/ml';
  }
  
  async init() {
    // Load ML functions
    this.functions = await fetch(this.api + '/functions').then(r => r.json());
    this.render();
  }
  
  // MLEngine only focuses on function execution
  executeFunction(id, params) {
    // ML execution logic
  }
}

class FlightsApp {
  constructor() {
    this.name = 'Flights';
    this.flights = [];
    this.api = '/api/flights';
  }
  
  // Flights only manages flight operations
  manageFlight(flightId) {
    // Flight management logic
  }
}

// No shared state between apps
// Each app manages its own domain
```

### 5.3 Role-Based UI Rendering

```javascript
// Desktop component with role-based FATCON
class Desktop {
  constructor(user) {
    this.user = user;
    this.apps = this.loadApps();
    this.fatconWidget = null;
    
    // Only create FATCON widget for ground control
    if (this.user.role === 'GROUND_CONTROL') {
      this.fatconWidget = new FatconWidget(this.user.role);
    }
  }
  
  renderTaskbar() {
    const taskbarElements = [
      this.renderStartButton(),
      this.user.role === 'GROUND_CONTROL' ? this.renderFatconWidget() : null,
      this.renderPinnedApps(),
      this.renderActiveWindows(),
      this.renderSystemTray()
    ].filter(Boolean);
    
    return taskbarElements;
  }
  
  renderFatconWidget() {
    if (!this.fatconWidget) return null;
    
    return `
      <div class="fatcon-widget">
        <div class="fatcon-level">FATCON: ${this.fatconWidget.getLevel()}</div>
        <div class="fatcon-status">${this.fatconWidget.getStatus()}</div>
      </div>
    `;
  }
}
```

### 5.4 Alert System for Critical Operations

```javascript
// Alert system primarily for ground control operations
class AlertManager {
  constructor() {
    this.alerts = [];
  }
  
  showFatconCriticalAlert(data) {
    // Critical system-wide fatigue alert
    const alert = {
      type: 'FATCON_CRITICAL',
      priority: 'HIGHEST',
      title: 'Critical Fatigue Alert',
      content: {
        systemStatus: data.status,
        affectedPilots: data.criticalPilots,
        totalFatigued: data.totalFatigued,
        capacity: data.capacity,
        actions: data.requiredActions
      },
      requiresAcknowledgment: true,
      timestamp: Date.now()
    };
    
    this.displayModal(alert);
    this.logCriticalEvent(alert);
    this.notifyOperationsTeam(alert);
  }
  
  showToast(message, type) {
    // Standard notifications for all users
    const toast = {
      message: message,
      type: type,
      duration: 5000
    };
    
    this.displayToast(toast);
  }
}
```

---

## 6. USER EXPERIENCE DESIGN

### 6.1 Ground Control Operations Focus

**FATCON System Benefits:**
- Real-time system-wide fatigue monitoring
- Proactive alert system for capacity issues
- Clear escalation protocols
- Centralized fatigue management
- Emergency response capabilities

**Operational Flow:**
1. Continuous monitoring of all active pilots
2. Automatic threshold detection
3. Alert generation when limits exceeded
4. Protocol activation options
5. Recovery monitoring

### 6.2 Application Specialization

**Each App's Focus:**
- **Dashboard:** Edge node monitoring only
- **MLEngine:** Function execution only
- **Flights:** Flight management only
- **Pilots:** Pilot records only
- **Users:** User administration only
- **Settings:** Personal preferences only

**Benefits of Separation:**
- Clear purpose for each application
- Reduced complexity
- Easier training
- Better performance
- Simpler maintenance

---

## 7. TESTING & QUALITY ASSURANCE

### 7.1 FATCON System Testing

**Ground Control Specific Tests:**
- System capacity calculations
- Threshold breach detection
- Alert generation timing
- Protocol activation flow
- Recovery monitoring accuracy

### 7.2 Application Independence Testing

**Isolation Tests:**
- Each app functions without others
- No shared dependencies
- Independent data fetching
- Separate error handling
- Isolated state management

### 7.3 Performance Targets

```javascript
const performanceMetrics = {
  fatconUpdate: '<100ms',
  capacityCalculation: '<50ms',
  alertGeneration: '<200ms',
  appLaunch: '<1s',
  dataRefresh: '<500ms',
  windowRendering: '60fps'
}
```

---

## CONCLUSION

The CogniFlight Cloud platform delivers a sophisticated aviation management system with specialized applications for distinct operational needs. The FATCON widget provides critical system-wide fatigue monitoring exclusively for ground control operations, enabling proactive management of pilot fatigue at a system level when capacity thresholds are exceeded.

Key design principles:
- **FATCON Widget**: Exclusive to ground control for system-wide fatigue management
- **Independent Applications**: Each app performs one function excellently
- **No Inter-App Dependencies**: Clean separation of concerns
- **Role-Based Features**: UI adapts to user role and responsibilities
- **Professional Desktop Environment**: Optimized for control center operations

This architecture ensures that ground control can effectively manage critical system-wide fatigue situations while other users focus on their specific operational tasks through dedicated, purpose-built applications.

---

**Document Version:** 1.0  
**Last Updated:** September 2024  
**Project Team:** CogniFlight Development Team  
**Course:** SEN3781 - Software Engineering  
**Institution:** Belgium Campus iTversity