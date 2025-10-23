import { useState, Suspense, useEffect, useCallback } from "react";
import Taskbar from "./Taskbar";
import Window from "./Window";
import DesktopIcons from "./DesktopIcons";
import NotificationPanel from "./NotificationPanel";
import ContextMenu from "./ContextMenu";
import SystemContext from "./useSystem";
import appRegistry from "../config/appRegistry";
import { ConfirmProvider } from "../hooks/useConfirm.jsx";

function Desktop({ user, onLogout }) {
  const [windows, setWindows] = useState([]);
  const [nextZIndex, setNextZIndex] = useState(100);
  const [showNotifications, setShowNotifications] = useState(false);
  const [settingsLocked, setSettingsLocked] = useState(false);
  const [showLockPopup, setShowLockPopup] = useState(false);
  const [globalContextMenu, setGlobalContextMenu] = useState({
    isOpen: false,
    position: { x: 0, y: 0 },
    items: [],
  });
  const [systemState, setSystemState] = useState(() => {
    // Load pinned apps from localStorage or use defaults
    const savedPinnedTaskbar = localStorage.getItem("pinnedTaskbarApps");
    const savedPinnedDesktop = localStorage.getItem("pinnedDesktopApps");

    const defaultTaskbarApps = [
      "settings",
      "fileexplorer",
      "notepad",
      "users",
      "pilots",
      "flights",
    ];
    const defaultDesktopApps = [
      "settings",
      "fileexplorer",
      "notepad",
      "users",
      "pilots",
      "flights",
    ];
    console.log("Initializing systemState defaults", {
      defaultDesktopApps,
      defaultTaskbarApps,
    });

    return {
      userProfile: {
        ...user,  // Include all user data
        loginTime: user.loginTime || new Date().toISOString()
      },
      fileSystem: {
        currentPath: "/home/Documents",
        files: [
          { name: "Documents", type: "folder" },
          { name: "Reports", type: "folder" },
          { name: "FlightData", type: "folder" },
          {
            name: "readme.txt",
            type: "file",
            content: "Welcome to CogniFlight!",
          },
          { name: "notes.txt", type: "file", content: "Operational notes..." },
        ],
      },
      pinnedToTaskbar: savedPinnedTaskbar
        ? JSON.parse(savedPinnedTaskbar)
        : defaultTaskbarApps,
      pinnedToDesktop: savedPinnedDesktop
        ? JSON.parse(savedPinnedDesktop)
        : defaultDesktopApps,
      clipboard: "",
      notifications: [],
    };
  }, []);

  const updateSystemState = useCallback((path, value) => {
    setSystemState((prev) => {
      const newState = { ...prev };
      const keys = path.split(".");
      let current = newState;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newState;
    });
  }, []);

  const addNotification = useCallback((message, type = "info") => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString(),
    };
    setSystemState((prev) => ({
      ...prev,
      notifications: [...prev.notifications, notification],
    }));

    setTimeout(() => {
      setSystemState((prev) => ({
        ...prev,
        notifications: prev.notifications.filter(
          (n) => n.id !== notification.id
        ),
      }));
    }, 5000);
  }, []);

  const addToTaskbar = useCallback(
    (appId) => {
      setSystemState((prev) => {
        if (prev.pinnedToTaskbar.includes(appId)) {
          return prev; // Already pinned
        }
        const newPinned = [...prev.pinnedToTaskbar, appId];
        localStorage.setItem("pinnedTaskbarApps", JSON.stringify(newPinned));
        return { ...prev, pinnedToTaskbar: newPinned };
      });
      addNotification("App pinned to taskbar", "success");
    },
    [addNotification]
  );

  const removeFromTaskbar = useCallback(
    (appId) => {
      setSystemState((prev) => {
        const newPinned = prev.pinnedToTaskbar.filter((id) => id !== appId);
        localStorage.setItem("pinnedTaskbarApps", JSON.stringify(newPinned));
        return { ...prev, pinnedToTaskbar: newPinned };
      });
      addNotification("App removed from taskbar", "info");
    },
    [addNotification]
  );

  const addToDesktop = useCallback(
    (appId) => {
      setSystemState((prev) => {
        if (prev.pinnedToDesktop.includes(appId)) {
          return prev; // Already pinned
        }
        const newPinned = [...prev.pinnedToDesktop, appId];
        localStorage.setItem("pinnedDesktopApps", JSON.stringify(newPinned));
        return { ...prev, pinnedToDesktop: newPinned };
      });
      addNotification("App pinned to desktop", "success");
    },
    [addNotification]
  );

  const removeFromDesktop = useCallback(
    (appId) => {
      setSystemState((prev) => {
        const newPinned = prev.pinnedToDesktop.filter((id) => id !== appId);
        localStorage.setItem("pinnedDesktopApps", JSON.stringify(newPinned));
        return { ...prev, pinnedToDesktop: newPinned };
      });
      addNotification("App removed from desktop", "info");
    },
    [addNotification]
  );

  const showContextMenu = (position, items) => {
    setGlobalContextMenu({
      isOpen: true,
      position,
      items,
    });
  };

  const hideContextMenu = () => {
    setGlobalContextMenu((prev) => ({ ...prev, isOpen: false }));
  };

  // Check if critical user information is complete
  const checkCriticalInfo = useCallback(() => {
    const userProfile = systemState.userProfile
    const criticalFields = ['name', 'surname', 'email', 'phone']
    const isPilot = userProfile?.role?.toLowerCase() === 'pilot'

    if (isPilot) {
      criticalFields.push('license_number', 'license_expiry_date', 'total_flight_hours')
    }

    // Check if any critical field is missing or empty
    for (const field of criticalFields) {
      if (!userProfile[field] || userProfile[field] === '') {
        return false
      }
    }

    return true
  }, [systemState.userProfile])

  // Check if this is first login (check if critical fields are empty)
  const isFirstLogin = useCallback(() => {
    const userProfile = systemState.userProfile
    // If user has no name, surname, email or phone, it's likely first login/registration
    return !userProfile?.name || !userProfile?.surname || !userProfile?.email || !userProfile?.phone
  }, [systemState.userProfile])

  const openWindow = async (appType, title, instanceData = null) => {
    // Check if settings are locked and user is trying to open non-settings app
    if (settingsLocked && appType !== 'settings') {
      setShowLockPopup(true)
      setTimeout(() => setShowLockPopup(false), 4000)
      return
    }
    // Get app metadata from registry
    const metadata = appRegistry.getMetadata(appType);
    if (!metadata) {
      console.error(`App ${appType} not found in registry`);
      return;
    }

    // Preload the component
    await loadAppComponent(appType);

    const newWindow = {
      id: Date.now(),
      appType,
      title: title || metadata.defaultTitle,
      x: Math.random() * 200 + 100,
      y: Math.random() * 100 + 50,
      width: metadata.defaultSize?.width || 600,
      height: metadata.defaultSize?.height || 400,
      isMaximized: false,
      isMinimized: false,
      zIndex: nextZIndex,
      instanceData,
    };
    setWindows((prev) => [...prev, newWindow]);
    setNextZIndex((prev) => prev + 1);
    addNotification(`${title} opened`, "success");
  };

  const closeWindow = (id) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
  };

  const minimizeWindow = (id) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isMinimized: true } : w))
    );
  };

  const maximizeWindow = (id) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id
          ? {
              ...w,
              isMaximized: !w.isMaximized,
              isHalfSnapped: false,
              ...(w.isMaximized
                ? {
                    x: w.prevX,
                    y: w.prevY,
                    width: w.prevWidth,
                    height: w.prevHeight,
                  }
                : {
                    prevX: w.x,
                    prevY: w.y,
                    prevWidth: w.width,
                    prevHeight: w.height,
                    x: 0,
                    y: 0,
                    width: window.innerWidth,
                    height: window.innerHeight - 48,
                  }),
            }
          : w
      )
    );
  };

  const snapWindowToHalf = (id, side) => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight - 48; // Account for taskbar

    setWindows((prev) =>
      prev.map((w) =>
        w.id === id
          ? {
              ...w,
              isMaximized: false,
              isHalfSnapped: true,
              snapSide: side,
              prevX: w.isHalfSnapped ? w.prevX : w.x,
              prevY: w.isHalfSnapped ? w.prevY : w.y,
              prevWidth: w.isHalfSnapped ? w.prevWidth : w.width,
              prevHeight: w.isHalfSnapped ? w.prevHeight : w.height,
              x: side === "left" ? 0 : screenWidth / 2,
              y: 0,
              width: screenWidth / 2,
              height: screenHeight,
            }
          : w
      )
    );
  };

  const focusWindow = (id) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, zIndex: nextZIndex, isMinimized: false } : w
      )
    );
    setNextZIndex((prev) => prev + 1);
  };

  const updateWindowPosition = (id, x, y) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, x, y, isHalfSnapped: false } : w))
    );
  };

  const updateWindowSize = (id, width, height) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, width, height, isHalfSnapped: false } : w
      )
    );
  };

  // State to store loaded components
  const [loadedComponents, setLoadedComponents] = useState({});

  // Load app component dynamically
  const loadAppComponent = async (appType) => {
    if (loadedComponents[appType]) {
      return loadedComponents[appType];
    }

    try {
      const Component = await appRegistry.getComponent(appType);
      setLoadedComponents((prev) => ({ ...prev, [appType]: Component }));
      return Component;
    } catch (error) {
      console.error(`Failed to load app ${appType}:`, error);
      return null;
    }
  };

  // Effect to preload components for open windows
  useEffect(() => {
    windows.forEach((window) => {
      if (!loadedComponents[window.appType]) {
        loadAppComponent(window.appType);
      }
    });
  }, [windows, loadedComponents]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check for critical information on mount and open settings if needed
  useEffect(() => {
    const hasAllCriticalInfo = checkCriticalInfo()
    const firstLogin = isFirstLogin()

    if (!hasAllCriticalInfo || firstLogin) {
      setSettingsLocked(true)
      // Auto-open settings app and maximize it
      setTimeout(() => {
        openWindow('settings', 'Settings - Please Complete Your Profile').then(() => {
          // Find the settings window and maximize it
          setWindows(prev => {
            const settingsWindow = prev.find(w => w.appType === 'settings')
            if (settingsWindow) {
              return prev.map(w =>
                w.id === settingsWindow.id
                  ? {
                      ...w,
                      isMaximized: true,
                      prevX: w.x,
                      prevY: w.y,
                      prevWidth: w.width,
                      prevHeight: w.height,
                      x: 0,
                      y: 0,
                      width: window.innerWidth,
                      height: window.innerHeight - 48
                    }
                  : w
              )
            }
            return prev
          })
        })
      }, 500)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Monitor user data changes to unlock/lock settings based on critical info
  useEffect(() => {
    const hasAllCriticalInfo = checkCriticalInfo()

    if (settingsLocked && hasAllCriticalInfo) {
      // Unlock if all critical info is now present
      setSettingsLocked(false)
      addNotification('Profile complete! You can now access all features.', 'success')
    } else if (!settingsLocked && !hasAllCriticalInfo) {
      // Re-lock if critical info was removed
      setSettingsLocked(true)
      setShowLockPopup(true)
      setTimeout(() => setShowLockPopup(false), 4000)

      // Check if Settings app is open, if not, open it
      const hasSettingsOpen = windows.some(w => w.appType === 'settings')
      if (!hasSettingsOpen) {
        openWindow('settings', 'Settings - Please Complete Your Profile').then(() => {
          // Maximize the settings window
          setWindows(prev => {
            const settingsWindow = prev.find(w => w.appType === 'settings')
            if (settingsWindow) {
              return prev.map(w =>
                w.id === settingsWindow.id
                  ? {
                      ...w,
                      isMaximized: true,
                      prevX: w.x,
                      prevY: w.y,
                      prevWidth: w.width,
                      prevHeight: w.height,
                      x: 0,
                      y: 0,
                      width: window.innerWidth,
                      height: window.innerHeight - 48
                    }
                  : w
              )
            }
            return prev
          })
        })
      }

      addNotification('Critical information missing! Please complete your profile.', 'error')
    }
  }, [systemState.userProfile]) // eslint-disable-line react-hooks/exhaustive-deps

  const renderAppContent = (window) => {
    const { appType, instanceData } = window;
    const props = {
      windowId: window.id,
      instanceData,
      onUpdateInstance: (data) => {
        setWindows((prev) =>
          prev.map((w) =>
            w.id === window.id
              ? { ...w, instanceData: { ...w.instanceData, ...data } }
              : w
          )
        );
      },
    };

    const Component = loadedComponents[appType];

    if (!Component) {
      // Component not loaded yet, show loading
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "#999",
          }}
        >
          Loading {appType}...
        </div>
      );
    }

    return <Component {...props} />;
  };

  const systemContextValue = {
    systemState,
    updateSystemState,
    addNotification,
    openWindow,
    addToTaskbar,
    removeFromTaskbar,
    addToDesktop,
    removeFromDesktop,
    showContextMenu,
    hideContextMenu,
    setClipboard: (text) => updateSystemState("clipboard", text),
    getClipboard: () => systemState.clipboard,
    onLogout,
    showNotifications,
    setShowNotifications,
    settingsLocked,
    checkCriticalInfo,
    updateUserProfile: (updatedUser) => {
      // Update the user data in the Desktop component
      setSystemState(prev => ({
        ...prev,
        userProfile: { ...prev.userProfile, ...updatedUser }
      }))
    }
  };

  return (
    <ConfirmProvider>
      <SystemContext.Provider value={systemContextValue}>
        <div className="desktop">
          <DesktopIcons onOpenApp={openWindow} />

          {/* Toast Notifications - Show only recent ones as toasts */}
          <div
            style={{
              position: "fixed",
              top: "20px",
              right: "20px",
              zIndex: 9999,
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {systemState.notifications.slice(-3).map((notification) => (
              <div
                key={notification.id}
                style={{
                  background:
                    notification.type === "success"
                      ? "rgba(0, 128, 0, 0.9)"
                      : notification.type === "error"
                      ? "rgba(255, 0, 0, 0.9)"
                      : "rgba(0, 120, 212, 0.9)",
                  color: "white",
                  padding: "12px 16px",
                  borderRadius: "4px",
                  fontSize: "14px",
                  maxWidth: "300px",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  animation: "slideInFromTop 0.3s ease-out",
                }}
              >
                <div style={{ fontWeight: "bold" }}>{notification.message}</div>
                <div style={{ fontSize: "12px", opacity: 0.8 }}>
                  {notification.timestamp}
                </div>
              </div>
            ))}
          </div>

          {windows.map(
            (window) =>
              !window.isMinimized && (
                <Window
                  key={window.id}
                  {...window}
                  onClose={() => closeWindow(window.id)}
                  onMinimize={() => minimizeWindow(window.id)}
                  onMaximize={() => maximizeWindow(window.id)}
                  onFocus={() => focusWindow(window.id)}
                  onMove={(x, y) => updateWindowPosition(window.id, x, y)}
                  onResize={(width, height) =>
                    updateWindowSize(window.id, width, height)
                  }
                  onSnapToHalf={(side) => snapWindowToHalf(window.id, side)}
                >
                  {renderAppContent(window)}
                </Window>
              )
          )}

          <Taskbar
            windows={windows}
            onWindowClick={(id) => focusWindow(id)}
            onOpenApp={openWindow}
          />

          {/* Notification Panel - Outside desktop div so it covers entire screen */}
          <NotificationPanel
            isOpen={showNotifications}
            onClose={() => setShowNotifications(false)}
          />

          {/* Global Context Menu - Renders at the highest level */}
          <ContextMenu
            isOpen={globalContextMenu.isOpen}
            position={globalContextMenu.position}
            onClose={hideContextMenu}
            items={globalContextMenu.items}
          />

          {/* Settings Lock Popup */}
          {showLockPopup && (
            <div
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'linear-gradient(135deg, rgba(20, 20, 40, 0.98), rgba(40, 20, 60, 0.98))',
                border: '2px solid rgba(255, 100, 100, 0.5)',
                borderRadius: '12px',
                padding: '40px',
                maxWidth: '500px',
                zIndex: 99999,
                boxShadow: '0 0 50px rgba(255, 100, 100, 0.3), inset 0 0 30px rgba(255, 100, 100, 0.1)',
                backdropFilter: 'blur(10px)',
                animation: 'bounceIn 0.5s ease-out'
              }}
            >
              <div style={{
                fontSize: '48px',
                textAlign: 'center',
                marginBottom: '20px',
                filter: 'drop-shadow(0 0 10px rgba(255, 200, 0, 0.5))'
              }}>
                🚫✋😏
              </div>
              <h2 style={{
                color: '#FFD700',
                textAlign: 'center',
                marginBottom: '20px',
                fontSize: '24px',
                textShadow: '0 0 10px rgba(255, 215, 0, 0.5)'
              }}>
                Whoa there, eager beaver! 🦫
              </h2>
              <p style={{
                color: 'rgba(255, 255, 255, 0.9)',
                textAlign: 'center',
                fontSize: '16px',
                lineHeight: '1.6',
                marginBottom: '10px'
              }}>
                Before you can experience the <span style={{ color: '#FFD700', fontWeight: 'bold' }}>ABSOLUTE MAGNIFICENCE</span> of this system...
              </p>
              <p style={{
                color: 'rgba(255, 255, 255, 0.8)',
                textAlign: 'center',
                fontSize: '15px',
                lineHeight: '1.5',
                fontStyle: 'italic'
              }}>
                You kinda need to tell us who you are first! 📝
              </p>
              <p style={{
                color: '#FF69B4',
                textAlign: 'center',
                fontSize: '14px',
                marginTop: '20px',
                fontWeight: 'bold'
              }}>
                Complete your profile in Settings to unlock the awesomeness! 🚀
              </p>
              <div style={{
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.5)',
                textAlign: 'center',
                marginTop: '25px',
                fontFamily: 'monospace'
              }}>
                ERROR: USER_TOO_MYSTERIOUS_404
              </div>
            </div>
          )}
        </div>
      </SystemContext.Provider>
    </ConfirmProvider>
  );
}

export default Desktop;
