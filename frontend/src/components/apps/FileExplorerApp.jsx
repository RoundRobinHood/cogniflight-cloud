import { useState } from 'react'
import { FolderOpen, File, ChevronLeft, ChevronRight } from 'lucide-react'
import { useSystem } from '../useSystem'

function FileExplorerApp({ instanceData }) {
  const { systemState, openWindow, addNotification } = useSystem()
  const [currentPath, setCurrentPath] = useState(instanceData?.currentPath || systemState.fileSystem.currentPath)
  const [history, setHistory] = useState(instanceData?.history || [systemState.fileSystem.currentPath])
  const [historyIndex, setHistoryIndex] = useState(instanceData?.historyIndex || 0)

  const allFiles = systemState.fileSystem.files
  const folders = allFiles.filter(f => f.type === 'folder')
  const files = allFiles.filter(f => f.type === 'file')

  const navigateToFolder = (folderName) => {
    const newPath = `${currentPath}\\${folderName}`
    setCurrentPath(newPath)
    
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newPath)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
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
    if (file.type === 'file' && file.name.endsWith('.txt') && file.content !== undefined) {
      openWindow('notepad', `Notepad - ${file.name}`, {
        content: file.content,
        fileName: file.name
      })
      addNotification(`Opened ${file.name} in Notepad`, 'info')
    } else if (file.type === 'file') {
      addNotification(`Cannot open ${file.name} - no associated program`, 'error')
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '4px 12px',
          borderRadius: '4px',
          flex: 1,
          fontSize: '14px'
        }}>
          {currentPath}
        </div>
      </div>

      <div style={{ 
        flex: 1, 
        padding: '16px',
        overflow: 'auto'
      }}>
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
            </div>
          ))}
          
          {files.map(file => (
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
              {file.content && (
                <span style={{ fontSize: '10px', color: '#ccc', marginTop: '2px' }}>
                  {file.content.length} chars
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default FileExplorerApp