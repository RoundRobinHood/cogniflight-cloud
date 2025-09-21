import { Settings, FolderOpen, FileText } from 'lucide-react'

// Lazy load components for better performance
const loadComponent = (componentName) => {
  const components = {
    SettingsApp: () => import('../components/apps/SettingsApp'),
    FileExplorerApp: () => import('../components/apps/FileExplorerApp'),
    NotepadApp: () => import('../components/apps/NotepadApp')
  }
  return components[componentName]
}

// Single source of truth for all app configuration
class AppRegistry {
  constructor() {
    this.apps = new Map()
    this.initializeApps()
  }

  initializeApps() {
    // Register all apps in one place
    this.register({
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      color: '#0078d4',
      component: 'SettingsApp',
      defaultTitle: 'Settings',
      defaultSize: { width: 600, height: 400 }
    })

    this.register({
      id: 'fileexplorer',
      label: 'File Explorer',
      icon: FolderOpen,
      color: '#FFD700',
      component: 'FileExplorerApp',
      defaultTitle: 'File Explorer',
      defaultSize: { width: 800, height: 500 }
    })

    this.register({
      id: 'notepad',
      label: 'Notepad',
      icon: FileText,
      color: '#28ca42',
      component: 'NotepadApp',
      defaultTitle: 'Notepad',
      defaultSize: { width: 700, height: 450 }
    })
  }

  register(appConfig) {
    if (!appConfig.id) {
      throw new Error('App must have an ID')
    }
    
    this.apps.set(appConfig.id, {
      ...appConfig,
      componentLoader: loadComponent(appConfig.component)
    })
  }

  getApp(appId) {
    return this.apps.get(appId)
  }

  getAllApps() {
    return Array.from(this.apps.values()).map(app => ({
      id: app.id,
      label: app.label,
      icon: app.icon,
      color: app.color
    }))
  }

  async getComponent(appId) {
    const app = this.apps.get(appId)
    if (!app) {
      throw new Error(`App ${appId} not found`)
    }
    
    const module = await app.componentLoader()
    return module.default
  }

  getMetadata(appId) {
    const app = this.apps.get(appId)
    if (!app) return null
    
    return {
      id: app.id,
      label: app.label,
      defaultTitle: app.defaultTitle,
      defaultSize: app.defaultSize
    }
  }
}

// Export singleton instance
const appRegistry = new AppRegistry()

export default appRegistry