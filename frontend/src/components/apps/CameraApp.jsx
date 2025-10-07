import { useState, useRef, useEffect } from 'react'
import { Camera, CameraOff, Download, RotateCcw } from 'lucide-react'
import { usePipeClient, StringIterator } from '../../api/socket'
import { useSystem } from '../useSystem'

function CameraApp({ windowId }) {
  const { addNotification } = useSystem()
  const client = usePipeClient()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [capturedImage, setCapturedImage] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deviceId, setDeviceId] = useState(null)
  const [devices, setDevices] = useState([])

  // Get available camera devices
  useEffect(() => {
    const getCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter(device => device.kind === 'videoinput')
        setDevices(videoDevices)
        if (videoDevices.length > 0 && !deviceId) {
          setDeviceId(videoDevices[0].deviceId)
        }
      } catch (err) {
        console.error('Error enumerating devices:', err)
      }
    }
    getCameras()
  }, [])

  // Start camera
  const startCamera = async () => {
    try {
      const constraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
        audio: false
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      setStream(mediaStream)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }

      setIsCameraOn(true)
      addNotification('Camera started', 'success')
    } catch (err) {
      console.error('Error accessing camera:', err)
      addNotification('Failed to access camera', 'error')
    }
  }

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
      setIsCameraOn(false)
      addNotification('Camera stopped', 'info')
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

    addNotification('Photo captured', 'success')
  }

  // Save photo to file system
  const savePhoto = async () => {
    if (!capturedImage || !client) return

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

      // Convert binary data to string for piping to tee
      const binaryStr = String.fromCharCode.apply(null, bytes)

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `photo_${timestamp}.jpg`

      // Save using tee command - pipe binary data directly into tee
      const result = await client.run_command(
        `tee ~/${filename}`,
        StringIterator(binaryStr)
      )

      if (result.command_result === 0) {
        addNotification(`Photo saved as ${filename}`, 'success')
        setCapturedImage(null) // Clear captured image after saving
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

  // Download photo locally
  const downloadPhoto = () => {
    if (!capturedImage) return

    const link = document.createElement('a')
    link.href = capturedImage
    link.download = `photo_${new Date().toISOString()}.jpg`
    link.click()

    addNotification('Photo downloaded', 'success')
  }

  // Retake photo
  const retakePhoto = () => {
    setCapturedImage(null)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--glass-bg-dark)',
      color: 'var(--text-primary)'
    }}>
      {/* Toolbar */}
      <div style={{
        padding: '12px',
        borderBottom: '1px solid var(--glass-border)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(255, 255, 255, 0.05)'
      }}>
        {!isCameraOn ? (
          <button
            onClick={startCamera}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--color-primary)',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Camera size={16} />
            Start Camera
          </button>
        ) : (
          <button
            onClick={stopCamera}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--color-accent-red)',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <CameraOff size={16} />
            Stop Camera
          </button>
        )}

        {devices.length > 1 && (
          <select
            value={deviceId || ''}
            onChange={(e) => {
              setDeviceId(e.target.value)
              if (isCameraOn) {
                stopCamera()
                setTimeout(() => startCamera(), 100)
              }
            }}
            style={{
              padding: '8px',
              background: 'var(--glass-bg-light)',
              border: '1px solid var(--glass-border)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              fontSize: '14px'
            }}
          >
            {devices.map((device, idx) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${idx + 1}`}
              </option>
            ))}
          </select>
        )}

        {isCameraOn && !capturedImage && (
          <button
            onClick={capturePhoto}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--color-accent-green)',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              marginLeft: 'auto'
            }}
          >
            <Camera size={16} />
            Capture Photo
          </button>
        )}
      </div>

      {/* Camera view / Preview area */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                display: isCameraOn ? 'block' : 'none'
              }}
            />
            {!isCameraOn && (
              <div style={{
                textAlign: 'center',
                color: 'var(--text-tertiary)'
              }}>
                <Camera size={64} style={{ marginBottom: '16px' }} />
                <p>Click "Start Camera" to begin</p>
              </div>
            )}
          </>
        ) : (
          <img
            src={capturedImage}
            alt="Captured"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain'
            }}
          />
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      {/* Action buttons for captured image */}
      {capturedImage && (
        <div style={{
          padding: '16px',
          borderTop: '1px solid var(--glass-border)',
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.05)'
        }}>
          <button
            onClick={savePhoto}
            disabled={isSaving}
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
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.6 : 1
            }}
          >
            <Camera size={16} />
            {isSaving ? 'Saving...' : 'Save to ~/'}
          </button>

          <button
            onClick={downloadPhoto}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--color-accent-green)',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            <Download size={16} />
            Download
          </button>

          <button
            onClick={retakePhoto}
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
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={16} />
            Retake
          </button>
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
        <span>Status: {isCameraOn ? '🟢 Camera Active' : '⚫ Camera Off'}</span>
      </div>
    </div>
  )
}

export default CameraApp
