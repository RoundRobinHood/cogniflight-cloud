import { useState, useEffect, useRef, useCallback } from 'react'
import { useSystem } from '../useSystem'
import { usePipeClient } from '../../api/socket'
import { Save, Copy, FileText, AlertCircle, Loader2 } from 'lucide-react'
import { StringIterator } from '../../api/socket'

function NotepadApp({ windowId, instanceData }) {
  const { addNotification, setClipboard, openWindow } = useSystem()
  const client = usePipeClient()
  const [content, setContent] = useState('')
  const [fileName, setFileName] = useState(instanceData?.fileName || 'untitled.txt')
  const [filePath, setFilePath] = useState(instanceData?.filePath || '')
  const [isDirty, setIsDirty] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)
  const [draftKey, setDraftKey] = useState('')
  const autosaveTimeoutRef = useRef(null)

  const clearDraft = useCallback(async () => {
    if (!client || !draftKey) return

    try {
      const draftPath = `~/.notepad/${draftKey}.draft`
      await client.run_command(`rm -f "${draftPath}"`)
    } catch (err) {
      console.error('Failed to clear draft:', err)
    }
  }, [client, draftKey])

  const loadFileContent = useCallback(async () => {
    if (!client || !filePath) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await client.run_command(`cat "${filePath}"`)
      if (result.command_result === 0) {
        setContent(result.output)
        setIsDirty(false)
        // Clear any existing draft when file is loaded successfully
        if (draftKey) {
          clearDraft()
        }
      } else {
        // File doesn't exist, start with empty content
        setContent('')
        setIsDirty(false)
        addNotification(`File "${fileName}" not found - creating new file`, 'info')
      }
    } catch (err) {
      setError(`Failed to load file: ${err.message}`)
      addNotification(`Failed to load file: ${err.message}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }, [client, filePath, draftKey, clearDraft, fileName, addNotification])

  const saveDraft = useCallback(async () => {
    if (!client || !draftKey || !content) return

    try {
      // Ensure ~/.notepad directory exists
      await client.run_command('mkdir -p ~/.notepad')

      // Save draft file
      const draftPath = `~/.notepad/${draftKey}.draft`
      await client.run_command(`tee "${draftPath}"`, StringIterator(content))
    } catch (err) {
      console.error('Failed to save draft:', err)
    }
  }, [client, draftKey, content])

  const loadDraft = useCallback(async (key) => {
    if (!client || !key) return

    try {
      const draftPath = `~/.notepad/${key}.draft`
      const result = await client.run_command(`cat "${draftPath}"`)
      if (result.command_result === 0 && result.output.trim()) {
        setContent(result.output)
        setIsDirty(true)
        addNotification('Draft restored', 'info')
      }
    } catch {
      // Draft doesn't exist, that's fine
    }
  }, [client, addNotification])

  // Initialize draft key and load file content on mount
  useEffect(() => {
    if (filePath) {
      const key = filePath.replace(/[^a-zA-Z0-9]/g, '_')
      setDraftKey(key)
      loadFileContent()
    } else {
      const key = fileName.replace(/[^a-zA-Z0-9]/g, '_')
      setDraftKey(key)
      // For new files, check for existing draft
      loadDraft(key)
    }
  }, [filePath, fileName, loadFileContent, loadDraft])

  // Auto-save draft functionality
  useEffect(() => {
    if (isDirty && draftKey) {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current)
      }

      autosaveTimeoutRef.current = setTimeout(() => {
        saveDraft()
      }, 2000) // Auto-save after 2 seconds of inactivity
    }

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current)
      }
    }
  }, [content, isDirty, draftKey, saveDraft])

  const handleContentChange = (e) => {
    setContent(e.target.value)
    setIsDirty(true)
  }

  const handleSave = async () => {
    if (!client) {
      addNotification('Backend connection not available', 'error')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const targetPath = filePath || fileName

      // Save file using tee command
      const result = await client.run_command(`tee "${targetPath}"`, StringIterator(content))

      if (result.command_result === 0) {
        setIsDirty(false)
        setFilePath(targetPath) // Update filePath if it was empty
        addNotification(`File "${fileName}" saved`, 'success')

        // Clear draft after successful save
        if (draftKey) {
          clearDraft()
        }
      } else {
        throw new Error(result.error || 'Save failed')
      }
    } catch (err) {
      setError(`Failed to save file: ${err.message}`)
      addNotification(`Failed to save file: ${err.message}`, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCopyAll = () => {
    setClipboard(content)
    addNotification('Content copied to clipboard', 'info')
  }

  const handleNewFile = () => {
    openWindow('notepad', 'Notepad - New Document', {
      fileName: 'untitled.txt',
      filePath: ''
    })
  }


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
          placeholder="Enter filename..."
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
          disabled={isSaving || !isDirty}
          className="btn"
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: isDirty && !isSaving ? '#0078d4' : 'rgba(255, 255, 255, 0.1)',
            opacity: isSaving || !isDirty ? 0.6 : 1,
            cursor: isSaving || !isDirty ? 'not-allowed' : 'pointer'
          }}
        >
          {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          {isSaving ? 'Saving...' : 'Save'}
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
          <FileText size={12} style={{ marginRight: '4px' }} />
          New
        </button>


        {filePath && (
          <span style={{ fontSize: '11px', color: '#ccc', marginLeft: '8px' }}>
            {filePath}
          </span>
        )}

        {isDirty && (
          <span style={{ fontSize: '12px', color: '#ffbd2e', marginLeft: 'auto' }}>
            • Unsaved changes {draftKey && '(auto-draft saved)'}
          </span>
        )}

        {isLoading && (
          <Loader2 size={12} className="animate-spin" style={{ color: '#0078d4' }} />
        )}
      </div>

      {/* Error display */}
      {error && (
        <div style={{
          padding: '8px 16px',
          background: 'rgba(255, 107, 107, 0.1)',
          borderBottom: '1px solid rgba(255, 107, 107, 0.3)',
          color: '#ff6b6b',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex' }}>
        {/* Text editor */}
        <div style={{ flex: 1, padding: '16px', position: 'relative' }}>
          {isLoading ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '50%',
              flexDirection: 'column',
              color: '#ccc'
            }}>
              <Loader2 size={32} className="animate-spin" style={{ marginBottom: '12px' }} />
              <span>Loading file...</span>
            </div>
          ) : (
            <textarea
              value={content}
              onChange={handleContentChange}
              placeholder={filePath ? `Editing ${fileName}...` : "Start typing or create a new file..."}
              disabled={isSaving}
              style={{
                width: '100%',
                height: '100%',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                color: 'white',
                padding: '12px',
                fontSize: '14px',
                fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                resize: 'none',
                outline: 'none',
                opacity: isSaving ? 0.7 : 1
              }}
            />
          )}
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
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span>Window ID: {windowId}</span>
          {filePath && <span>Path: {filePath}</span>}
          {!client && <span style={{ color: '#ff6b6b' }}>• Backend disconnected</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span>Characters: {content.length}</span>
          <span>Lines: {content.split('\n').length}</span>
          {draftKey && isDirty && <span style={{ color: '#ffbd2e' }}>• Draft saved</span>}
        </div>
      </div>
    </div>
  )
}

export default NotepadApp