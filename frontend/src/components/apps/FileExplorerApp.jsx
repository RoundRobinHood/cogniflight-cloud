import { useState, useEffect, useRef } from 'react'
import { FolderOpen, File, ChevronLeft, ChevronRight, ChevronDown, ChevronRight as TreeChevronRight, Home, Loader2, ArrowUp, Folder } from 'lucide-react'
import { useSystem } from '../useSystem'
import { usePipeClient } from '../../api/socket'

function FileExplorerApp({ instanceData }) {
  const { openWindow, addNotification } = useSystem()
  const client = usePipeClient()
  const containerRef = useRef(null)

  const [currentPath, setCurrentPath] = useState(instanceData?.currentPath || '.')
  const [history, setHistory] = useState(instanceData?.history || ['.'])
  const [historyIndex, setHistoryIndex] = useState(instanceData?.historyIndex || 0)
  const [showTreeView, setShowTreeView] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [files, setFiles] = useState([])
  const [treeData, setTreeData] = useState(new Map())
  const [expandedFolders, setExpandedFolders] = useState(new Set(['.']))
  const [homeDirectory, setHomeDirectory] = useState('.')
  const [absolutePath, setAbsolutePath] = useState('')

  const folders = files.filter(f => f.type === 'directory')
  const regularFiles = files.filter(f => f.type === 'file')

  const navigateToFolder = (folderName) => {
    let newPath
    if (currentPath === '.' || currentPath === '') {
      newPath = folderName
    } else {
      newPath = `${currentPath}/${folderName}`
    }
    setCurrentPath(newPath)

    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newPath)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const navigateToPath = (path) => {
    setCurrentPath(path)
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(path)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const navigateUp = () => {
    if (currentPath === '.' || currentPath === '/') return

    let parentPath
    if (currentPath.includes('/')) {
      const parts = currentPath.split('/')
      parts.pop()
      parentPath = parts.join('/') || '/'
    } else {
      parentPath = '..'
    }

    navigateToPath(parentPath)
  }

  const getDisplayPath = (path) => {
    if (path === '.') return 'Home'
    if (path === '..') return 'Parent'
    return absolutePath || path
  }

  const getParentPath = (path) => {
    if (path === '.' || path === '/') return null
    if (path.includes('/')) {
      const parts = path.split('/')
      parts.pop()
      return parts.join('/') || '/'
    }
    return '..'
  }

  const navigateBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setCurrentPath(history[historyIndex - 1])
    }
  }

  const navigateForward = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setCurrentPath(history[historyIndex + 1])
    }
  }

  const handleFileClick = (file) => {
    if (file.type === 'file' && file.name.endsWith('.txt')) {
      openWindow('notepad', `Notepad - ${file.name}`, {
        fileName: file.name,
        filePath: currentPath === '.' ? file.name : `${currentPath}/${file.name}`
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
      const fileList = await client.ls(path)
      setFiles(fileList)

      // Get absolute path for display
      if (path === '.') {
        try {
          const pwdResult = await client.run_command('pwd')
          if (pwdResult.command_result === 0) {
            setAbsolutePath(pwdResult.output.trim())
            setHomeDirectory(pwdResult.output.trim())
          }
        } catch (err) {
          console.error('Error getting current directory:', err)
        }
      } else if (path === '..') {
        try {
          const pwdResult = await client.run_command(`cd '${path}' && pwd`)
          if (pwdResult.command_result === 0) {
            setAbsolutePath(pwdResult.output.trim())
          }
        } catch (err) {
          console.error('Error getting parent directory:', err)
        }
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
    navigateToPath('.')
  }

  const goToRoot = () => {
    navigateToPath('/')
  }

  useEffect(() => {
    if (client) {
      loadDirectory()
      loadTreeDirectory('.')
    }
  }, [client])

  useEffect(() => {
    if (client && currentPath) {
      loadDirectory(currentPath)
    }
  }, [currentPath, client])

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
          const fullPath = path === '.' ? dir.name : `${path}/${dir.name}`
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
                    e.target.style.background = 'rgba(255, 255, 255, 0.05)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPath !== fullPath) {
                    e.target.style.background = 'transparent'
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
          const fullPath = path === '.' ? file.name : `${path}/${file.name}`

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
                e.target.style.background = 'rgba(255, 255, 255, 0.03)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent'
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
          disabled={currentPath === '/' || (currentPath === '.' && !getParentPath(currentPath))}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: (currentPath === '/' || (currentPath === '.' && !getParentPath(currentPath))) ? 'not-allowed' : 'pointer',
            opacity: (currentPath === '/' || (currentPath === '.' && !getParentPath(currentPath))) ? 0.5 : 1
          }}
        >
          <ArrowUp size={16} />
        </button>
        <button
          onClick={goHome}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          <Home size={16} />
        </button>
        <button
          onClick={goToRoot}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: 'pointer'
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
                    e.target.style.background = 'rgba(255, 255, 255, 0.05)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPath !== '/') {
                    e.target.style.background = 'transparent'
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
                  color: currentPath === '.' ? '#FFD700' : '#fff',
                  background: currentPath === '.' ? 'rgba(255, 215, 0, 0.1)' : 'transparent',
                  transition: 'background 0.2s'
                }}
                onClick={() => navigateToPath('.')}
                onMouseEnter={(e) => {
                  if (currentPath !== '.') {
                    e.target.style.background = 'rgba(255, 255, 255, 0.05)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPath !== '.') {
                    e.target.style.background = 'transparent'
                  }
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFolder('.')
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
                  {expandedFolders.has('.') ?
                    <ChevronDown size={14} /> :
                    <TreeChevronRight size={14} />
                  }
                </button>
                <Home size={14} color="#FFD700" style={{ marginRight: '6px' }} />
                <span>Home</span>
              </div>
              {expandedFolders.has('.') && renderTreeNode('.', treeData.get('.'), 1)}
            </div>
          </div>
        )}

        <div style={{
          flex: 1,
          padding: '16px',
          overflow: 'auto'
        }}>
          {error ? (
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
        </div>
      </div>
    </div>
  )
}

export default FileExplorerApp