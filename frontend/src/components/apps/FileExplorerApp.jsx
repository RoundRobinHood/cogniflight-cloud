import { useState, useEffect, useRef } from 'react'
import { FolderOpen, File, ChevronLeft, ChevronRight, ChevronDown, ChevronRight as TreeChevronRight, Home, Loader2, ArrowUp, Folder } from 'lucide-react'
import { useSystem } from '../useSystem'
import { usePipeClient } from '../../api/socket'

function FileExplorerApp({ instanceData }) {
  const { openWindow, addNotification } = useSystem()
  const client = usePipeClient()
  const containerRef = useRef(null)

  const [currentPath, setCurrentPath] = useState(instanceData?.currentPath || '~')
  const [history, setHistory] = useState(instanceData?.history || ['~'])
  const [historyIndex, setHistoryIndex] = useState(instanceData?.historyIndex || 0)
  const [showTreeView, setShowTreeView] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [files, setFiles] = useState([])
  const [treeData, setTreeData] = useState(new Map())
  const [expandedFolders, setExpandedFolders] = useState(new Set(['~']))
  const [homeDirectory, setHomeDirectory] = useState('')
  const [absolutePath, setAbsolutePath] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)

  const folders = files.filter(f => f.type === 'directory')
  const regularFiles = files.filter(f => f.type === 'file')

  const navigateToFolder = (folderName) => {
    let newPath
    if (currentPath === '.' || currentPath === '') {
      newPath = folderName
    } else if (currentPath === '/') {
      newPath = `/${folderName}`
    } else if (currentPath === '~') {
      newPath = `~/${folderName}`
    } else {
      newPath = `${currentPath}/${folderName}`
    }
    navigateToPath(newPath)
  }

  const navigateToPath = (path) => {
    // Clear current files immediately to show loading state
    setFiles([])
    setError(null)

    setCurrentPath(path)
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(path)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const navigateUp = () => {
    if (currentPath === '.' || currentPath === '/' || currentPath === '~') return

    let parentPath
    if (currentPath.startsWith('~/')) {
      const parts = currentPath.split('/')
      parts.pop()
      parentPath = parts.join('/') || '~'
    } else if (currentPath.includes('/')) {
      const parts = currentPath.split('/')
      parts.pop()
      parentPath = parts.join('/') || '/'
    } else {
      parentPath = '..'
    }

    navigateToPath(parentPath)
  }

  const getDisplayPath = (path) => {
    if (path === '.') return homeDirectory ? `~` : 'Home'
    if (path === '~') return '~'
    if (path === '..') return 'Parent'

    const displayPath = absolutePath || path
    if (homeDirectory && displayPath.startsWith(homeDirectory)) {
      return displayPath.replace(homeDirectory, '~')
    }
    return displayPath
  }


  const queryHomeDirectory = async () => {
    if (!client) return

    try {
      const result = await client.run_command('echo -n $HOME')
      if (result.command_result === 0 && result.output.trim()) {
        const homePath = result.output.trim()
        setHomeDirectory(homePath)
        console.log('Home directory set to:', homePath)
      }
    } catch (err) {
      console.error('Error querying home directory:', err)
    }
    // Always mark as initialized, even if query failed
    setIsInitialized(true)
  }

  const getParentPath = (path) => {
    if (path === '.' || path === '/' || path === '~') return null
    if (path.startsWith('~/')) {
      const parts = path.split('/')
      parts.pop()
      return parts.join('/') || '~'
    }
    if (path.includes('/')) {
      const parts = path.split('/')
      parts.pop()
      return parts.join('/') || '/'
    }
    return '..'
  }

  const navigateBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      const newPath = history[newIndex]
      setHistoryIndex(newIndex)

      // Clear files and error immediately for loading state
      setFiles([])
      setError(null)
      setCurrentPath(newPath)
    }
  }

  const navigateForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      const newPath = history[newIndex]
      setHistoryIndex(newIndex)

      // Clear files and error immediately for loading state
      setFiles([])
      setError(null)
      setCurrentPath(newPath)
    }
  }

  const handleFileClick = (file) => {
    if (file.type === 'file' && file.name.endsWith('.txt')) {
      openWindow('notepad', `Notepad - ${file.name}`, {
        fileName: file.name,
        filePath: (currentPath === '.' || currentPath === '~') ? file.name :
                 currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`
      })
      addNotification(`Opened ${file.name} in Notepad`, 'info')
    } else if (file.type === 'file') {
      addNotification(`Cannot open ${file.name} - no associated program`, 'error')
    }
  }

  const loadDirectory = async (path = currentPath) => {
    if (!client) return

    setLoading(true)
    setError(null)

    try {
      // Backend understands tilde paths, so we can use them directly
      const fileList = await client.ls(path)
      setFiles(fileList)

      // Get absolute path for display - run this AFTER ls completes
      try {
        let pwdCommand
        if (path === '.') {
          pwdCommand = 'echo $PWD'
        } else {
          // Use supported backend syntax: cd path; echo $PWD
          pwdCommand = `cd ${path}; echo $PWD`
        }

        const pwdResult = await client.run_command(pwdCommand)
        if (pwdResult.command_result === 0) {
          setAbsolutePath(pwdResult.output.trim())
        }
      } catch (err) {
        console.error('Error getting current directory:', err)
      }

      if (!treeData.has(path)) {
        setTreeData(prev => new Map(prev).set(path, fileList))
      }
    } catch (err) {
      console.error('Error loading directory:', err)
      setError(`Failed to load directory: ${err.message}`)
      addNotification(`Failed to load directory: ${err.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadTreeDirectory = async (path) => {
    if (!client || treeData.has(path)) return

    try {
      // Backend understands tilde paths directly
      const fileList = await client.ls(path)
      setTreeData(prev => new Map(prev).set(path, fileList))
    } catch (err) {
      console.error('Error loading tree directory:', err)
    }
  }

  const toggleFolder = async (path) => {
    const newExpanded = new Set(expandedFolders)
    if (expandedFolders.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
      await loadTreeDirectory(path)
    }
    setExpandedFolders(newExpanded)
  }

  const goHome = () => {
    if (currentPath !== '~' && currentPath !== '.') {
      navigateToPath('~')
    }
  }

  const goToRoot = () => {
    if (currentPath !== '/') {
      navigateToPath('/')
    }
  }

  useEffect(() => {
    if (client && !isInitialized) {
      // Query home directory first, then load initial directory sequentially
      queryHomeDirectory().then(async () => {
        await loadDirectory()
        await loadTreeDirectory('~')
      })
    }
  }, [client, isInitialized])

  useEffect(() => {
    if (client && currentPath && isInitialized) {
      loadDirectory(currentPath)
    }
  }, [currentPath, client, isInitialized])

  // Sync expanded folders when navigating
  useEffect(() => {
    if (currentPath && !expandedFolders.has(currentPath)) {
      // Auto-expand current path in tree if it's not already expanded
      const pathsToExpand = []

      if (currentPath.startsWith('~/')) {
        pathsToExpand.push('~')
        const parts = currentPath.split('/')
        let buildPath = '~'
        for (let i = 1; i < parts.length; i++) {
          buildPath += '/' + parts[i]
          pathsToExpand.push(buildPath)
        }
      } else if (currentPath.startsWith('/') && currentPath !== '/') {
        pathsToExpand.push('/')
        const parts = currentPath.split('/').filter(p => p)
        let buildPath = ''
        for (const part of parts) {
          buildPath += '/' + part
          pathsToExpand.push(buildPath)
        }
      }

      if (pathsToExpand.length > 0) {
        setExpandedFolders(prev => {
          const newSet = new Set(prev)
          pathsToExpand.forEach(path => newSet.add(path))
          return newSet
        })
      }
    }
  }, [currentPath, expandedFolders])

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth
        setShowTreeView(width >= 800)
      }
    }

    handleResize()
    const resizeObserver = new ResizeObserver(handleResize)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => resizeObserver.disconnect()
  }, [])

  const renderTreeNode = (path, items, level = 0) => {
    if (!items) return null

    const directories = items.filter(item => item.type === 'directory')
    const files = items.filter(item => item.type === 'file')

    return (
      <>
        {/* Render directories first */}
        {directories.map(dir => {
          const fullPath = path === '.' ? dir.name :
                          path === '/' ? `/${dir.name}` :
                          path === '~' ? `~/${dir.name}` :
                          `${path}/${dir.name}`
          const isExpanded = expandedFolders.has(fullPath)
          const childItems = treeData.get(fullPath)

          return (
            <div key={`dir-${fullPath}`}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px 8px',
                  paddingLeft: `${8 + level * 16}px`,
                  cursor: 'pointer',
                  borderRadius: '4px',
                  fontSize: '13px',
                  color: currentPath === fullPath ? '#FFD700' : '#fff',
                  background: currentPath === fullPath ? 'rgba(255, 215, 0, 0.1)' : 'transparent',
                  transition: 'background 0.2s'
                }}
                onClick={() => navigateToPath(fullPath)}
                onMouseEnter={(e) => {
                  if (currentPath !== fullPath) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPath !== fullPath) {
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFolder(fullPath)
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    padding: '0',
                    marginRight: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {isExpanded ?
                    <ChevronDown size={14} /> :
                    <TreeChevronRight size={14} />
                  }
                </button>
                <Folder size={14} color="#FFD700" style={{ marginRight: '6px' }} />
                <span>{dir.name}</span>
              </div>
              {isExpanded && childItems && (
                <div>
                  {renderTreeNode(fullPath, childItems, level + 1)}
                </div>
              )}
            </div>
          )
        })}

        {/* Render files */}
        {files.map(file => {
          const fullPath = path === '.' ? file.name :
                          path === '/' ? `/${file.name}` :
                          path === '~' ? `~/${file.name}` :
                          `${path}/${file.name}`

          return (
            <div
              key={`file-${fullPath}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '4px 8px',
                paddingLeft: `${8 + level * 16 + 18}px`, // Extra indent for files
                cursor: 'default',
                borderRadius: '4px',
                fontSize: '13px',
                color: '#ccc',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <File size={14} color={file.name.endsWith('.txt') ? '#FFD700' : '#87CEEB'} style={{ marginRight: '6px' }} />
              <span>{file.name}</span>
            </div>
          )
        })}
      </>
    )
  }

  return (
    <div ref={containerRef} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '8px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <button
          onClick={navigateBack}
          disabled={historyIndex === 0}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: historyIndex === 0 ? 'not-allowed' : 'pointer',
            opacity: historyIndex === 0 ? 0.5 : 1
          }}
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={navigateForward}
          disabled={historyIndex === history.length - 1}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: historyIndex === history.length - 1 ? 'not-allowed' : 'pointer',
            opacity: historyIndex === history.length - 1 ? 0.5 : 1
          }}
        >
          <ChevronRight size={16} />
        </button>
        <button
          onClick={navigateUp}
          disabled={!getParentPath(currentPath)}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: !getParentPath(currentPath) ? 'not-allowed' : 'pointer',
            opacity: !getParentPath(currentPath) ? 0.5 : 1
          }}
        >
          <ArrowUp size={16} />
        </button>
        <button
          onClick={goHome}
          disabled={currentPath === '~' || currentPath === '.'}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: (currentPath === '~' || currentPath === '.') ? 'not-allowed' : 'pointer',
            opacity: (currentPath === '~' || currentPath === '.') ? 0.5 : 1
          }}
        >
          <Home size={16} />
        </button>
        <button
          onClick={goToRoot}
          disabled={currentPath === '/'}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: currentPath === '/' ? 'not-allowed' : 'pointer',
            opacity: currentPath === '/' ? 0.5 : 1
          }}
        >
          /
        </button>
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '4px 12px',
          borderRadius: '4px',
          flex: 1,
          fontSize: '14px'
        }}>
          {getDisplayPath(currentPath)}
        </div>
        {loading && <Loader2 size={16} className="animate-spin" style={{ color: '#FFD700' }} />}
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {showTreeView && (
          <div style={{
            width: '250px',
            borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(255, 255, 255, 0.02)',
            overflow: 'auto'
          }}>
            <div style={{
              padding: '12px 8px 8px 8px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '13px',
              fontWeight: 'bold',
              color: '#FFD700'
            }}>
              Directory Tree
            </div>
            <div style={{ padding: '8px 0' }}>
              {/* Root directory */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  fontSize: '13px',
                  color: currentPath === '/' ? '#FFD700' : '#fff',
                  background: currentPath === '/' ? 'rgba(255, 215, 0, 0.1)' : 'transparent',
                  transition: 'background 0.2s'
                }}
                onClick={() => navigateToPath('/')}
                onMouseEnter={(e) => {
                  if (currentPath !== '/') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPath !== '/') {
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFolder('/')
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    padding: '0',
                    marginRight: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {expandedFolders.has('/') ?
                    <ChevronDown size={14} /> :
                    <TreeChevronRight size={14} />
                  }
                </button>
                <Folder size={14} color="#FFD700" style={{ marginRight: '6px' }} />
                <span>/</span>
              </div>
              {expandedFolders.has('/') && renderTreeNode('/', treeData.get('/'), 1)}

              {/* Home directory */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  fontSize: '13px',
                  color: (currentPath === '.' || currentPath === '~') ? '#FFD700' : '#fff',
                  background: (currentPath === '.' || currentPath === '~') ? 'rgba(255, 215, 0, 0.1)' : 'transparent',
                  transition: 'background 0.2s'
                }}
                onClick={() => navigateToPath('~')}
                onMouseEnter={(e) => {
                  if (currentPath !== '.' && currentPath !== '~') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPath !== '.' && currentPath !== '~') {
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFolder('~')
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    padding: '0',
                    marginRight: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {expandedFolders.has('~') ?
                    <ChevronDown size={14} /> :
                    <TreeChevronRight size={14} />
                  }
                </button>
                <Home size={14} color="#FFD700" style={{ marginRight: '6px' }} />
                <span>~</span>
              </div>
              {expandedFolders.has('~') && renderTreeNode('~', treeData.get('~'), 1)}
            </div>
          </div>
        )}

        <div style={{
          flex: 1,
          padding: '16px',
          overflow: 'auto',
          position: 'relative'
        }}>
          {loading && files.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              color: '#FFD700'
            }}>
              <Loader2 size={32} className="animate-spin" style={{ marginBottom: '12px' }} />
              <span>Loading directory...</span>
            </div>
          ) : error ? (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: '#ff6b6b',
              background: 'rgba(255, 107, 107, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 107, 107, 0.3)'
            }}>
              {error}
            </div>
          ) : files.length === 0 ? (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: '#ccc',
              fontStyle: 'italic'
            }}>
              This directory is empty
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: '16px'
            }}>
              {folders.map(folder => (
                <div
                  key={folder.name}
                  onClick={() => navigateToFolder(folder.name)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '4px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                  <FolderOpen size={48} color="#FFD700" />
                  <span style={{ marginTop: '8px', fontSize: '12px', textAlign: 'center' }}>
                    {folder.name}
                  </span>
                  <span style={{ fontSize: '10px', color: '#ccc', marginTop: '2px' }}>
                    {folder.file_count > 1 ? `${folder.file_count} items` : '1 item'}
                  </span>
                </div>
              ))}

              {regularFiles.map(file => (
                <div
                  key={file.name}
                  onClick={() => handleFileClick(file)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '4px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                  <File size={48} color={file.name.endsWith('.txt') ? "#FFD700" : "#87CEEB"} />
                  <span style={{ marginTop: '8px', fontSize: '12px', textAlign: 'center' }}>
                    {file.name}
                  </span>
                  <span style={{ fontSize: '10px', color: '#ccc', marginTop: '2px' }}>
                    {file.file_size < 1024 ? `${file.file_size} B` :
                     file.file_size < 1024 * 1024 ? `${Math.round(file.file_size / 1024)} KB` :
                     `${Math.round(file.file_size / (1024 * 1024))} MB`}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Loading overlay for when updating existing directory */}
          {loading && files.length > 0 && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                color: '#FFD700'
              }}>
                <Loader2 size={32} className="animate-spin" style={{ marginBottom: '12px' }} />
                <span>Loading directory...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FileExplorerApp