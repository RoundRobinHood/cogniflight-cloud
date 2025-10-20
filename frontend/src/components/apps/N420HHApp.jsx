import { useEffect, useState, useRef } from 'react'
import { useStreamClient } from '../../api/socket.js'
import { useSystem } from '../useSystem'

function N420HHApp() {
  const client = useStreamClient()
  const [data, setData] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const commandHandleRef = useRef(null)
  const { addNotification } = useSystem()

  // Start MQTT streaming when client connects
  useEffect(() => {
    if (!client) return

    const startStreaming = async () => {
      try {
        setIsConnected(true)

        // Run the mqtt command to start streaming
        const commandHandle = await client.run_command('mqtt')
        commandHandleRef.current = commandHandle
        setIsStreaming(true)

        // Stream YAML data using iter_yaml_output
        for await (const yamlDoc of commandHandle.iter_yaml_output()) {
          if (yamlDoc) {
            setData(yamlDoc)
          }
        }

        // Command finished
        setIsStreaming(false)
      } catch (error) {
        console.error('Failed to start MQTT streaming:', error)
        addNotification('Failed to connect to edge node stream', 'error')
        setIsStreaming(false)
      }
    }

    startStreaming()

    // Cleanup function
    return () => {
      if (commandHandleRef.current && commandHandleRef.current.command_running) {
        try {
          commandHandleRef.current.interrupt()
        } catch (error) {
          console.error('Failed to interrupt MQTT stream:', error)
        }
      }
    }
  }, [client, addNotification])

  // Format timestamp if present
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A'
    try {
      return new Date(timestamp).toLocaleString()
    } catch {
      return timestamp
    }
  }

  // Recursive function to render nested data
  const renderDataValue = (value, depth = 0) => {
    if (value === null || value === undefined) {
      return <span style={{ color: '#888' }}>null</span>
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      return (
        <div style={{ marginLeft: depth > 0 ? '20px' : '0' }}>
          {Object.entries(value).map(([key, val]) => (
            <div key={key} style={{ marginBottom: '4px' }}>
              <span style={{ color: '#FFD700', fontWeight: 'bold' }}>{key}:</span>{' '}
              {typeof val === 'object' ?
                renderDataValue(val, depth + 1) :
                <span style={{ color: '#fff' }}>{String(val)}</span>
              }
            </div>
          ))}
        </div>
      )
    }

    if (Array.isArray(value)) {
      return (
        <div style={{ marginLeft: depth > 0 ? '20px' : '0' }}>
          {value.map((item, index) => (
            <div key={index} style={{ marginBottom: '4px' }}>
              <span style={{ color: '#888' }}>[{index}]</span>{' '}
              {typeof item === 'object' ?
                renderDataValue(item, depth + 1) :
                <span style={{ color: '#fff' }}>{String(item)}</span>
              }
            </div>
          ))}
        </div>
      )
    }

    return <span style={{ color: '#fff' }}>{String(value)}</span>
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#1e1e1e',
      color: '#fff',
      padding: '20px',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: '14px',
      overflow: 'auto'
    }}>
      {/* Header */}
      <div style={{
        borderBottom: '2px solid #444',
        paddingBottom: '10px',
        marginBottom: '20px'
      }}>
        <h2 style={{ margin: '0 0 10px 0', color: '#00ff00' }}>N420HH Edge Node Stream</h2>
        <div style={{ display: 'flex', gap: '20px', fontSize: '12px' }}>
          <span>
            Status: {' '}
            <span style={{
              color: isStreaming ? '#00ff00' : (isConnected ? '#FFD700' : '#ff0000'),
              fontWeight: 'bold'
            }}>
              {isStreaming ? 'STREAMING' : (isConnected ? 'CONNECTED' : 'DISCONNECTED')}
            </span>
          </span>
          {data && data.timestamp && (
            <span>
              Last Update: <span style={{ color: '#00bfff' }}>{formatTimestamp(data.timestamp)}</span>
            </span>
          )}
        </div>
      </div>

      {/* Data Display */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {!isConnected ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            color: '#888'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: '10px', fontSize: '16px' }}>Connecting to edge node...</div>
              <div style={{ fontSize: '12px' }}>Waiting for MQTT stream</div>
            </div>
          </div>
        ) : !data ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            color: '#888'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: '10px', fontSize: '16px' }}>Waiting for data...</div>
              <div style={{ fontSize: '12px' }}>Stream is active</div>
            </div>
          </div>
        ) : (
          <div style={{
            backgroundColor: '#2a2a2a',
            padding: '15px',
            borderRadius: '5px',
            border: '1px solid #444'
          }}>
            <div style={{ marginBottom: '10px', color: '#00bfff', fontWeight: 'bold' }}>
              Current Data:
            </div>
            {renderDataValue(data)}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        borderTop: '1px solid #444',
        paddingTop: '10px',
        marginTop: '20px',
        fontSize: '11px',
        color: '#666'
      }}>
        Live YAML stream from edge node via MQTT
      </div>
    </div>
  )
}

export default N420HHApp