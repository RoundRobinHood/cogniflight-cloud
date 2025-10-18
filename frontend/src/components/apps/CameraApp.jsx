import { useState, useRef, useEffect } from 'react'
import { Camera, RotateCcw, Image as ImageIcon } from 'lucide-react'
import { usePipeClient, StringIterator, BinaryIterator } from '../../api/socket'
import { useSystem } from '../useSystem'

function CameraApp({ windowId }) {
  const { addNotification } = useSystem()
  const client = usePipeClient()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [capturedImage, setCapturedImage] = useState(null)
  const [fileName, setFileName] = useState('')
  const [showFileNamePrompt, setShowFileNamePrompt] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [savedPhotos, setSavedPhotos] = useState([])
  const [showGallery, setShowGallery] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)

  // Auto-start camera on mount
  useEffect(() => {
    startCamera()

    // Cleanup on unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Load existing photos on mount
  useEffect(() => {
    if (client) {
      loadPhotos()
    }
  }, [client])

  // Re-attach stream to video element when it becomes visible again
  useEffect(() => {
    if (!capturedImage && stream && videoRef.current) {
      videoRef.current.srcObject = stream
    }
  }, [capturedImage, stream])

  // Start camera automatically
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      })
      setStream(mediaStream)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (err) {
      console.error('Error accessing camera:', err)
      addNotification('Failed to access camera. Please grant camera permissions.', 'error')
    }
  }

  // Capture photo
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Get image as data URL
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9)
    setCapturedImage(imageDataUrl)

    // Generate default filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    setFileName(`photo_${timestamp}.jpg`)
    setShowFileNamePrompt(true)
  }

  // Save photo to file system
  const savePhoto = async () => {
    if (!capturedImage || !client || !fileName.trim()) return

    try {
      setIsSaving(true)

      // Convert data URL to base64 string (remove data:image/jpeg;base64, prefix)
      const base64Data = capturedImage.split(',')[1]

      // Decode base64 to binary data in JavaScript
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      // Ensure .jpg extension
      const finalFileName = fileName.endsWith('.jpg') ? fileName : `${fileName}.jpg`

      // Save using tee command - pipe binary data directly into tee
      // Use BinaryIterator to send raw bytes without UTF-8 encoding
      const result = await client.run_command(
        `tee ~/${finalFileName}`,
        BinaryIterator(bytes)
      )

      if (result.command_result === 0) {
        addNotification(`Photo saved as ${finalFileName}`, 'success')

        // Add to saved photos list with the base64 data
        setSavedPhotos(prev => [...prev, {
          filename: finalFileName,
          data: capturedImage,
          timestamp: new Date().toISOString()
        }])

        setCapturedImage(null)
        setShowFileNamePrompt(false)
        setFileName('')
      } else {
        addNotification('Failed to save photo', 'error')
        console.error('Save error:', result.error)
      }
    } catch (err) {
      addNotification('Failed to save photo', 'error')
      console.error('Save error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Load saved photos from filesystem
  const loadPhotos = async () => {
    if (!client) return

    try {
      // List all .jpg files in home directory
      const result = await client.run_command(
        `ls ~/*.jpg 2>/dev/null || true`,
        StringIterator('')
      )

      if (result.command_result === 0 && result.output.trim()) {
        const files = result.output.trim().split('\n').filter(f => f)

        // Load each photo
        const photos = []
        for (const filepath of files) {
          const filename = filepath.split('/').pop()
          const readResult = await client.run_command(
            `cat ${filepath}`,
            StringIterator('')
          )

          if (readResult.command_result === 0 && readResult.output) {
            // Convert binary output to base64
            const base64 = btoa(readResult.output)
            photos.push({
              filename,
              data: `data:image/jpeg;base64,${base64}`,
              timestamp: new Date().toISOString()
            })
          }
        }

        setSavedPhotos(photos)
      }
    } catch (err) {
      console.error('Error loading photos:', err)
    }
  }

  // Retake photo
  const retakePhoto = () => {
    setCapturedImage(null)
    setShowFileNamePrompt(false)
    setFileName('')
  }

  // Handle Enter key to save
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && fileName.trim() && !isSaving) {
      savePhoto()
    }
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--glass-bg-dark)',
      color: 'var(--text-primary)'
    }}>
      {/* Camera view / Preview area */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
        background: '#000',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 0
      }}>
        {!capturedImage ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block'
            }}
          />
        ) : (
          <img
            src={capturedImage}
            alt="Captured"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        )}

        {/* Capture button overlay at bottom center */}
        {!capturedImage && !showGallery && (
          <div style={{
            position: 'absolute',
            bottom: '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10
          }}>
            <button
              onClick={capturePhoto}
              style={{
                width: '70px',
                height: '70px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'white',
                border: '5px solid var(--color-accent-green)',
                borderRadius: '50%',
                color: 'var(--color-accent-green)',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)'
                e.currentTarget.style.background = 'var(--color-accent-green)'
                e.currentTarget.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.background = 'white'
                e.currentTarget.style.color = 'var(--color-accent-green)'
              }}
            >
              <Camera size={32} />
            </button>
          </div>
        )}

        {/* Gallery button overlay at bottom right */}
        {!capturedImage && savedPhotos.length > 0 && !showGallery && (
          <div style={{
            position: 'absolute',
            bottom: '32px',
            right: '32px',
            zIndex: 10
          }}>
            <button
              onClick={() => setShowGallery(true)}
              style={{
                width: '50px',
                height: '50px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255, 255, 255, 0.9)',
                border: 'none',
                borderRadius: '8px',
                color: 'var(--color-primary)',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'white'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)'}
            >
              <ImageIcon size={24} />
            </button>
          </div>
        )}

        {/* Gallery view */}
        {showGallery && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.95)',
            zIndex: 20,
            overflow: 'auto',
            padding: '16px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h3 style={{ margin: 0, color: 'white' }}>Saved Photos ({savedPhotos.length})</h3>
              <button
                onClick={() => {
                  setShowGallery(false)
                  setSelectedPhoto(null)
                }}
                style={{
                  padding: '8px 16px',
                  background: 'var(--glass-bg-light)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>

            {selectedPhoto ? (
              <div>
                <button
                  onClick={() => setSelectedPhoto(null)}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--glass-bg-light)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '4px',
                    color: 'white',
                    cursor: 'pointer',
                    marginBottom: '16px'
                  }}
                >
                  ← Back to Gallery
                </button>
                <img
                  src={selectedPhoto.data}
                  alt={selectedPhoto.filename}
                  style={{
                    width: '100%',
                    maxHeight: 'calc(100% - 80px)',
                    objectFit: 'contain',
                    borderRadius: '8px'
                  }}
                />
                <p style={{ color: 'white', marginTop: '8px', textAlign: 'center' }}>
                  {selectedPhoto.filename}
                </p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: '16px'
              }}>
                {savedPhotos.map((photo, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedPhoto(photo)}
                    style={{
                      cursor: 'pointer',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      aspectRatio: '1',
                      background: 'var(--glass-bg-light)',
                      transition: 'transform 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <img
                      src={photo.data}
                      alt={photo.filename}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      {/* File name prompt and save controls */}
      {showFileNamePrompt && (
        <div style={{
          padding: '16px',
          borderTop: '1px solid var(--glass-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          background: 'rgba(255, 255, 255, 0.05)'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <label style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              fontWeight: 'var(--font-medium)'
            }}>
              File name:
            </label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              onKeyPress={handleKeyPress}
              autoFocus
              placeholder="Enter filename..."
              style={{
                padding: '8px 12px',
                background: 'var(--glass-bg-light)',
                border: '1px solid var(--glass-border)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center'
          }}>
            <button
              onClick={savePhoto}
              disabled={isSaving || !fileName.trim()}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--color-primary)',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: (isSaving || !fileName.trim()) ? 'not-allowed' : 'pointer',
                opacity: (isSaving || !fileName.trim()) ? 0.6 : 1
              }}
            >
              <Camera size={16} />
              {isSaving ? 'Saving...' : 'Save'}
            </button>

            <button
              onClick={retakePhoto}
              disabled={isSaving}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--glass-bg-light)',
                border: '1px solid var(--glass-border)',
                borderRadius: '4px',
                color: 'white',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.6 : 1
              }}
            >
              <RotateCcw size={16} />
              Retake
            </button>
          </div>
        </div>
      )}

      {/* Status bar */}
      <div style={{
        padding: '6px 12px',
        borderTop: '1px solid var(--glass-border)',
        fontSize: '12px',
        color: 'var(--text-tertiary)',
        background: 'rgba(255, 255, 255, 0.02)',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <span>Window ID: {windowId}</span>
        <span>Status: {stream ? '🟢 Camera Active' : '⚫ Camera Off'}</span>
      </div>
    </div>
  )
}

export default CameraApp
