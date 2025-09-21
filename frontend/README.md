# Frontend

Modern React-based frontend with desktop-style interface, multi-window management, and integrated FATCON fleet-wide fatigue monitoring system.

## 🛩️ Project Overview

This frontend provides a comprehensive operations interface with:
- Fleet-wide pilot fatigue monitoring (FATCON system)
- Multi-application workspace with windowing system
- Real-time data visualization and monitoring
- Extensible application architecture
- Dynamic component loading

## 🚀 FATCON Fleet Monitoring System

Real-time fatigue assessment across entire fleet operations:

### **FATCON 5 - Minimal Risk** (Green)
- **Status**: Normal operations, baseline fatigue levels
- **Triggers**: 0-5% of monitored pilots showing fatigue indicators
- **Actions**: Standard monitoring, routine data collection

### **FATCON 4 - Low Risk** (Blue)
- **Status**: Slightly elevated fatigue detection
- **Triggers**: 6-15% of pilots showing mild fatigue indicators
- **Actions**: Increased monitoring frequency, advisory notifications to supervisors

### **FATCON 3 - Moderate Risk** (Yellow)
- **Status**: Notable fatigue patterns detected
- **Triggers**: 16-30% showing moderate fatigue, or key personnel affected
- **Actions**: Enhanced screening, crew rotation reviews, fatigue countermeasures activated

### **FATCON 2 - High Risk** (Orange)
- **Status**: Significant operational risk
- **Triggers**: 31-50% showing fatigue, or critical flight crew compromised
- **Actions**: Mandatory rest periods, backup crew activation, flight schedule adjustments

### **FATCON 1 - Critical Risk** (Red)
- **Status**: Immediate danger to flight safety
- **Triggers**: >50% severe fatigue, or multiple critical incidents
- **Actions**: Operations suspension, emergency crew replacement, immediate intervention protocols

## 🖥️ Desktop Environment Features

- **Multi-Window Management**: Run multiple applications simultaneously
- **Draggable/Resizable Windows**: Customize your workspace layout
- **Dynamic Taskbar**: Shows all active applications with real icons
- **Application Launcher**: Quick access with search functionality
- **Context Menus**: Right-click actions throughout the interface
- **Notification System**: Real-time alerts and updates
- **State Persistence**: Maintains user preferences and window states

## 🏗️ Technical Architecture

### Stack
- **React 18.3** with Hooks
- **Vite 7.1.6** for build tooling
- **Context API** for state management
- **Dynamic imports** for code splitting
- **Pure CSS** with modern features

### Project Structure
```
src/
├── components/
│   ├── Desktop.jsx             # Main workspace manager
│   ├── Window.jsx              # Window container component
│   ├── Taskbar.jsx             # Dynamic taskbar
│   ├── StartMenu.jsx           # Application launcher
│   ├── FatconWidget.jsx        # FATCON monitoring widget
│   ├── FatconAlert.jsx         # Alert system
│   ├── NotificationPanel.jsx   # Notifications
│   ├── ContextMenu.jsx         # Right-click menus
│   ├── useSystem.js            # System context hook
│   └── apps/                   # Application components
├── config/
│   └── appRegistry.js          # Dynamic app registration
└── index.css                   # Styling (1533 lines)
```

## 🔧 Creating New Applications

### Step 1: Create Your App Component

Create a new file `src/components/apps/YourApp.jsx`:

```javascript
import { useState } from 'react'
import { useSystem } from '../useSystem'

function YourApp({ windowId, instanceData }) {
  const { systemState, addNotification } = useSystem()
  
  // Local state for this window instance
  const [data, setData] = useState(instanceData?.data || {})
  
  // Access system-wide state
  const fatconLevel = systemState.fatconLevel
  
  // Send notifications
  const handleAction = () => {
    addNotification('Action completed', 'success')
  }
  
  return (
    <div style={{ padding: '20px', height: '100%' }}>
      <h2>Your Application</h2>
      {/* Your app content here */}
      <p>Current FATCON Level: {fatconLevel}</p>
      <button onClick={handleAction}>Perform Action</button>
    </div>
  )
}

export default YourApp
```

### Step 2: Register Your App

Add to `src/config/appRegistry.js`:

```javascript
// In the loadComponent function, add your app mapping:
const components = {
  // ... existing apps
  YourApp: () => import('../components/apps/YourApp')
}

// In initializeApps(), register your app:
this.register({
  id: 'yourapp',              // Unique identifier
  label: 'Your App',           // Display name
  icon: YourIcon,              // Import from lucide-react
  color: '#4285f4',            // Taskbar icon color
  component: 'YourApp',        // Component name
  defaultTitle: 'Your App',    // Window title
  defaultSize: {               // Default window dimensions
    width: 800,
    height: 600
  }
})
```

That's it! Your app will now:
- Appear in the Start Menu
- Be launchable from desktop (if pinned)
- Show in taskbar when opened
- Support multiple instances
- Have full window management capabilities

### Available System Hooks

The `useSystem()` hook provides access to:

```javascript
const {
  // State
  systemState,           // Global system state
  updateSystemState,     // Update system state
  
  // Notifications
  addNotification,       // Show notification
  
  // Window Management
  openWindow,           // Open new app window
  
  // App Management
  addToTaskbar,         // Pin app to taskbar
  removeFromTaskbar,    // Unpin from taskbar
  addToDesktop,         // Pin to desktop
  removeFromDesktop,    // Unpin from desktop
  
  // UI Controls
  showContextMenu,      // Show context menu
  showFatconAlert,      // Show FATCON alert
  
  // Data
  setClipboard,         // Set clipboard content
  getClipboard,         // Get clipboard content
  
  // Session
  onLogout             // Logout user
} = useSystem()
```

### App Development Best Practices

1. **State Management**
   - Use local state for window-specific data
   - Use system state for shared data
   - Preserve instanceData for window persistence

2. **Styling**
   - Follow existing design patterns
   - Use consistent spacing and colors
   - Ensure responsive layout within windows

3. **Performance**
   - Components are lazy-loaded automatically
   - Minimize re-renders with proper state management
   - Use memoization for expensive computations

4. **Error Handling**
   - Add try-catch blocks for async operations
   - Show user-friendly error notifications
   - Log errors for debugging

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint
```

The development server runs at `http://localhost:5173`

## 📊 Current Implementation Status

### ✅ Working Features
- Complete window management system
- Dynamic app loading with lazy imports
- FATCON monitoring widget
- Authentication system
- File management capabilities
- Notification system
- Context menus
- App pinning/unpinning
- State persistence

### ⚠️ Known Issues
- Window ID collisions with rapid creation (using Date.now())
- Memory leaks from uncleared timeouts (~5MB/hour)
- Z-index grows unbounded
- No error boundaries for crash recovery

## 🛠️ Configuration

### Environment Variables (when needed)
```env
VITE_API_URL=your_api_url
VITE_FATCON_UPDATE_INTERVAL=30000
```

### Adding Icons
Import icons from `lucide-react`:
```javascript
import { Brain, Activity, FileText } from 'lucide-react'
```

## 📝 Documentation

- **Architecture Details**: See `ARCHITECTURE_ANALYSIS.md`
- **Component Structure**: Documented inline
- **State Management**: Context-based with SystemContext

## 🤝 Contributing

1. Follow existing code patterns
2. Maintain ESLint compliance (0 errors)
3. Test window management thoroughly
4. Update documentation for new features
5. Ensure FATCON system integrity

---

**Version**: 1.0.0  
**Last Updated**: September 2025  
**Status**: In Development
