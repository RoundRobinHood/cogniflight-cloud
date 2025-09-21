import { useState } from 'react'
import { useSystem } from '../useSystem'
import { Save, Copy, Folder } from 'lucide-react'

function NotepadApp({ windowId, instanceData }) {
  const { systemState, updateSystemState, addNotification, setClipboard, openWindow } = useSystem()
  const [content, setContent] = useState(instanceData?.content || '')
  const [fileName, setFileName] = useState(instanceData?.fileName || 'untitled.txt')
  const [isDirty, setIsDirty] = useState(false)

  const handleContentChange = (e) => {
    setContent(e.target.value)
    setIsDirty(true)
  }

  const handleSave = () => {
    const existingFiles = systemState.fileSystem.files
    const fileIndex = existingFiles.findIndex(f => f.name === fileName)
    
    if (fileIndex >= 0) {
      const newFiles = [...existingFiles]
      newFiles[fileIndex] = { ...newFiles[fileIndex], content }
      updateSystemState('fileSystem.files', newFiles)
    } else {
      const newFile = { name: fileName, type: 'file', content }
      updateSystemState('fileSystem.files', [...existingFiles, newFile])
    }
    
    setIsDirty(false)
    addNotification(`File "${fileName}" saved`, 'success')
  }

  const handleCopyAll = () => {
    setClipboard(content)
    addNotification('Content copied to clipboard', 'info')
  }

  const handleOpenFile = (file) => {
    if (file.type === 'file' && file.content !== undefined) {
      openWindow('notepad', `Notepad - ${file.name}`, {
        content: file.content,
        fileName: file.name
      })
    }
  }

  const handleNewFile = () => {
    openWindow('notepad', 'Notepad - New Document', {
      content: '',
      fileName: 'untitled.txt'
    })
  }

  const textFiles = systemState.fileSystem.files.filter(f => f.type === 'file' && f.content !== undefined)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{
        padding: '8px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(255, 255, 255, 0.05)'
      }}>
        <input
          type="text"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '4px',
            color: 'white',
            padding: '4px 8px',
            fontSize: '12px',
            width: '150px'
          }}
        />
        
        <button
          onClick={handleSave}
          className="btn"
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: isDirty ? '#0078d4' : 'rgba(255, 255, 255, 0.1)'
          }}
        >
          <Save size={12} />
          Save
        </button>
        
        <button
          onClick={handleCopyAll}
          className="btn"
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(255, 255, 255, 0.1)'
          }}
        >
          <Copy size={12} />
          Copy All
        </button>
        
        <button
          onClick={handleNewFile}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          New
        </button>

        {isDirty && (
          <span style={{ fontSize: '12px', color: '#ffbd2e' }}>
            • Unsaved changes
          </span>
        )}
      </div>

      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex' }}>
        {/* File list sidebar */}
        <div style={{
          width: '200px',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(255, 255, 255, 0.02)',
          padding: '8px'
        }}>
          <h4 style={{ marginBottom: '8px', fontSize: '12px', color: '#ccc' }}>
            <Folder size={12} style={{ marginRight: '4px' }} />
            Text Files
          </h4>
          {textFiles.map((file, index) => (
            <div
              key={index}
              onClick={() => handleOpenFile(file)}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                cursor: 'pointer',
                borderRadius: '4px',
                marginBottom: '2px',
                background: file.name === fileName ? 'rgba(0, 120, 212, 0.3)' : 'transparent',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => {
                if (file.name !== fileName) {
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                }
              }}
              onMouseLeave={(e) => {
                if (file.name !== fileName) {
                  e.target.style.background = 'transparent'
                }
              }}
            >
              📄 {file.name}
            </div>
          ))}
        </div>

        {/* Text editor */}
        <div style={{ flex: 1, padding: '16px' }}>
          <textarea
            value={content}
            onChange={handleContentChange}
            placeholder="Start typing..."
            style={{
              width: '100%',
              height: '100%',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              color: 'white',
              padding: '12px',
              fontSize: '14px',
              fontFamily: 'monospace',
              resize: 'none',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Status bar */}
      <div style={{
        padding: '4px 8px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        fontSize: '11px',
        color: '#ccc',
        background: 'rgba(255, 255, 255, 0.02)',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <span>Window ID: {windowId}</span>
        <span>Characters: {content.length}</span>
      </div>
    </div>
  )
}

export default NotepadApp