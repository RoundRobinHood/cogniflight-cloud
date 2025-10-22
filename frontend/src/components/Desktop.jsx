import { useState, Suspense, useEffect, useCallback } from "react";
import Taskbar from "./Taskbar";
import Window from "./Window";
import DesktopIcons from "./DesktopIcons";
import NotificationPanel from "./NotificationPanel";
import ContextMenu from "./ContextMenu";
import FatconAlert from "./FatconAlert";
import SystemContext from "./useSystem";
import appRegistry from "../config/appRegistry";
import { ConfirmProvider } from "../hooks/useConfirm.jsx";

function Desktop({ user, onLogout }) {
  const [windows, setWindows] = useState([]);
  const [nextZIndex, setNextZIndex] = useState(100);
  const [showNotifications, setShowNotifications] = useState(false);
  const [globalContextMenu, setGlobalContextMenu] = useState({
    isOpen: false,
    position: { x: 0, y: 0 },
    items: [],
  });
  const [globalFatconAlert, setGlobalFatconAlert] = useState({
    isOpen: false,
    levelData: null,
    previousLevel: null,
    newLevel: null,
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
        name: user.name,
        username: user.username,
        email: user.email || `${user.username}@cogniflight.com`,
        phone: user.phone,
        role: user.role,
        tags: user.tags,
        theme: "dark",
        notifications: true,
        loginTime: user.loginTime,
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

  const showFatconAlert = (levelData, previousLevel, newLevel) => {
    setGlobalFatconAlert({
      isOpen: true,
      levelData,
      previousLevel,
      newLevel,
    });
  };

  const hideFatconAlert = () => {
    setGlobalFatconAlert((prev) => ({ ...prev, isOpen: false }));
  };

  const openWindow = async (appType, title, instanceData = null) => {
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
    showFatconAlert,
    hideFatconAlert,
    setClipboard: (text) => updateSystemState("clipboard", text),
    getClipboard: () => systemState.clipboard,
    onLogout,
    showNotifications,
    setShowNotifications,
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

          {/* Global FATCON Alert - Renders at the highest level for full screen centering */}
          <FatconAlert
            isOpen={globalFatconAlert.isOpen}
            onClose={hideFatconAlert}
            levelData={globalFatconAlert.levelData}
            previousLevel={globalFatconAlert.previousLevel}
            newLevel={globalFatconAlert.newLevel}
          />
        </div>
      </SystemContext.Provider>
    </ConfirmProvider>
  );
}

export default Desktop;
