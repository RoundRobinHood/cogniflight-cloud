import {
  Settings,
  FolderOpen,
  FileText,
  Terminal,
  Camera,
  UserSquare2,
  Users,
  Plane,
  Monitor,
} from "lucide-react";

// Lazy load components for better performance
const loadComponent = (componentName) => {
  const components = {
    SettingsApp: () => import("../components/apps/SettingsApp"),
    FileExplorerApp: () => import("../components/apps/FileExplorerApp"),
    NotepadApp: () => import("../components/apps/NotepadApp"),
    TerminalApp: () => import("../components/apps/TerminalApp"),
    CameraApp: () => import("../components/apps/CameraApp"),
    UsersApp: () => import("../components/apps/UsersApp"),
    PilotsApp: () => import("../components/apps/PilotsApp.jsx"),
    InviteUserApp: () => import("../components/apps/InviteUserApp.jsx"),
    UserPermissionsApp: () =>
      import("../components/apps/UserPermissionsApp.jsx"),
    FlightsApp: () => import("../components/apps/FlightsApp.jsx"),
    FlightsReport: () => import("../components/apps/FlightsReport.jsx"),

    EdgeNodeDashboardApp: () =>
      import("../components/apps/EdgeNodeDashboardApp"),
  };
  return components[componentName];
};

// Single source of truth for all app configuration
class AppRegistry {
  constructor() {
    this.apps = new Map();
    this.initializeApps();
  }

  initializeApps() {
    // Register all apps in one place
    this.register({
      id: "settings",
      label: "Settings",
      icon: Settings,
      color: "#0078d4",
      component: "SettingsApp",
      defaultTitle: "Settings",
      defaultSize: { width: 600, height: 400 },
    });

    this.register({
      id: "fileexplorer",
      label: "File Explorer",
      icon: FolderOpen,
      color: "#FFD700",
      component: "FileExplorerApp",
      defaultTitle: "File Explorer",
      defaultSize: { width: 800, height: 500 },
    });

    this.register({
      id: "notepad",
      label: "Notepad",
      icon: FileText,
      color: "#28ca42",
      component: "NotepadApp",
      defaultTitle: "Notepad",
      defaultSize: { width: 700, height: 450 },
    });

    this.register({
      id: "terminal",
      label: "Terminal",
      icon: Terminal,
      color: "#000000",
      component: "TerminalApp",
      defaultTitle: "Terminal",
      defaultSize: { width: 700, height: 450 },
    });

    this.register({
      id: "camera",
      label: "Camera",
      icon: Camera,
      color: "#ff6b6b",
      component: "CameraApp",
      defaultTitle: "Camera",
      defaultSize: { width: 800, height: 600 },
    });

    this.register({
      id: "users",
      label: "Users",
      icon: UserSquare2,
      color: "#7c3aed",
      component: "UsersApp",
      defaultTitle: "Users",
      defaultSize: { width: 900, height: 620 },
      //Hide from non-admin users in Desktop
      visibleWhen: (systemState) => systemState.userProfile.role === "sysadmin",
    });

    this.register({
      id: "pilots",
      label: "Pilots",
      icon: Users,
      color: "#1e90ff",
      component: "PilotsApp",
      defaultTitle: "Pilots",
      defaultSize: { width: 800, height: 550 },
      visibleWhen: (systemState) =>
        systemState.userProfile.role === "sysadmin" ||
        systemState.userProfile.role === "atc",
    });

    this.register({
      id: "invite-user",
      label: "Invite User",
      icon: UserSquare2,
      color: "#0078d4",
      component: "InviteUserApp",
      defaultTitle: "Invite New User",
      defaultSize: { width: 500, height: 420 },
      // Do not show this on desktop
      visibleWhen: () => false,
    });

     this.register({
      id: "user-permissions",
      label: "User Permissions",
      icon: UserSquare2,
      color: "#228be6",
      component: "UserPermissionsApp",
      defaultTitle: "User Permissions",
      defaultSize: { width: 600, height: 500 },
      // Do not show this on desktop
      visibleWhen: () => false,
    });

    this.register({
      id: "flights",
      label: "Flights",
      icon: Plane,
      color: "#4dabf7",
      component: "FlightsApp",
      defaultTitle: "Flights",
      defaultSize: { width: 800, height: 600 },
      visibleWhen: (systemState) =>
        systemState.userProfile.role === "sysadmin" ||
        systemState.userProfile.role === "atc",
      //|| systemState.userProfile.role==="data-analyst"
    });

    this.register({
      id: "flight-report",
      label: "Flight Report",
      icon: FileText,
      color: "#228be6",
      component: "FlightsReport",
      defaultTitle: "Flight Report",
      defaultSize: { width: 800, height: 600 },
      // Hidden from desktop icons, only opened from FlightsApp
      visibleWhen: () => false,
    });

    this.register({
      id: "edgenodedashboard",
      label: "Edge Dashboard",
      icon: Monitor,
      color: "#ff00ff",
      component: "EdgeNodeDashboardApp",
      defaultTitle: "Edge Node Dashboard",
      defaultSize: { width: 1400, height: 900 },
      visibleWhen: (systemState) =>
        systemState.userProfile.role === "sysadmin" ||
        systemState.userProfile.role === "atc",
    });
  }

  register(appConfig) {
    if (!appConfig.id) {
      throw new Error("App must have an ID");
    }

    this.apps.set(appConfig.id, {
      ...appConfig,
      componentLoader: loadComponent(appConfig.component),
    });
  }

  getApp(appId) {
    return this.apps.get(appId);
  }

  //show apps based on what the logged in user's role is
  getAllApps(systemState) {
    return Array.from(this.apps.values())
      .filter((app) => !app.visibleWhen || app.visibleWhen(systemState))
      .map((app) => ({
        id: app.id,
        label: app.label,
        icon: app.icon,
        color: app.color,
      }));
  }

  async getComponent(appId) {
    const app = this.apps.get(appId);
    if (!app) {
      throw new Error(`App ${appId} not found`);
    }

    const module = await app.componentLoader();
    return module.default;
  }

  getMetadata(appId) {
    const app = this.apps.get(appId);
    if (!app) return null;

    return {
      id: app.id,
      label: app.label,
      defaultTitle: app.defaultTitle,
      defaultSize: app.defaultSize,
    };
  }
}

// Export singleton instance
const appRegistry = new AppRegistry();

export default appRegistry;
