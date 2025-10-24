import { useState, useEffect, useRef } from 'react'
import { Monitor, Circle } from 'lucide-react'
import { useStreamClient } from '../api/socket.js'
import { useSystem } from './useSystem'
import IntruderAlert from './IntruderAlert'

function EdgeNodesWidget({ onClick }) {
  const client = useStreamClient()
  const [edgeNodes, setEdgeNodes] = useState({})
  const [isConnected, setIsConnected] = useState(false)
  const [intruderAlert, setIntruderAlert] = useState(null)
  const mqttCommandHandleRef = useRef(null)
  const intruderDetectedRef = useRef({})
  const { addNotification } = useSystem()

  // Get the complete list of edge nodes from the edge-nodes command
  useEffect(() => {
    if (!client) return

    const loadEdgeNodesList = async () => {
      try {
        const commandHandle = await client.run_command('edge-nodes')
        let output = ''

        for await (const chunk of commandHandle.iter_output()) {
          output += chunk
        }

        // Parse the \r\n delimited list
        const nodeNames = output
          .split(/\r?\n/)
          .map(name => name.trim())
          .filter(name => name.length > 0)

        // Initialize all nodes as offline
        const initialNodes = {}
        nodeNames.forEach(nodeName => {
          initialNodes[nodeName] = {
            edge_username: nodeName,
            isStreaming: false,
            lastUpdate: null
          }
        })

        setEdgeNodes(initialNodes)
      } catch (error) {
        console.error('Failed to load edge nodes list:', error)
      }
    }

    loadEdgeNodesList()
  }, [client])

  // Start MQTT streaming to track active nodes
  useEffect(() => {
    if (!client) return

    const startStreaming = async () => {
      try {
        setIsConnected(true)
        const commandHandle = await client.run_command('mqtt')
        mqttCommandHandleRef.current = commandHandle

        for await (const yamlDoc of commandHandle.iter_yaml_output()) {
          if (yamlDoc && yamlDoc.edge_username) {
            setEdgeNodes(prev => {
              const updated = { ...prev }
              const nodeId = yamlDoc.edge_username

              // Update existing node or add new one if discovered via MQTT
              if (!updated[nodeId]) {
                updated[nodeId] = {
                  edge_username: nodeId,
                  payload: yamlDoc.payload || {},
                  timestamp: yamlDoc.timestamp,
                  isStreaming: true,
                  lastUpdate: Date.now()
                }
              } else {
                updated[nodeId] = {
                  ...updated[nodeId],
                  payload: yamlDoc.payload || {},
                  timestamp: yamlDoc.timestamp,
                  isStreaming: true,
                  lastUpdate: Date.now()
                }
              }

              return updated
            })
          }
        }
      } catch (error) {
        console.error('Failed to start MQTT streaming for edge nodes widget:', error)
      }
    }

    startStreaming()

    // Mark offline nodes periodically based on 30-second rule
    const offlineInterval = setInterval(() => {
      const now = Date.now()
      setEdgeNodes(prev => {
        const updated = { ...prev }
        Object.keys(updated).forEach(nodeId => {
          // If node has never sent data or hasn't sent data in 30 seconds, mark as offline
          if (!updated[nodeId].lastUpdate || now - updated[nodeId].lastUpdate > 30000) {
            updated[nodeId].isStreaming = false
          }
        })
        return updated
      })
    }, 5000)

    return () => {
      clearInterval(offlineInterval)
      if (mqttCommandHandleRef.current && mqttCommandHandleRef.current.command_running) {
        try {
          mqttCommandHandleRef.current.interrupt()
        } catch (error) {
          console.error('Failed to interrupt MQTT stream:', error)
        }
      }
    }
  }, [client])

  // Monitor for intruder_detected state and trigger global alert
  useEffect(() => {
    Object.values(edgeNodes).forEach(node => {
      const nodeId = node.edge_username
      const systemState = node.payload?.system_state

      // Check if this node has intruder_detected state
      if (systemState === 'intruder_detected') {
        // Only trigger alert if we haven't already alerted for this node
        if (!intruderDetectedRef.current[nodeId]) {
          console.log(`[GLOBAL INTRUDER ALERT] Tsotsi detected on node: ${nodeId}`)

          // Mark this node as having triggered an alert
          intruderDetectedRef.current[nodeId] = true

          // Set the intruder alert state to show the popup
          setIntruderAlert(node)

          // Send a system notification
          addNotification(`🚨 TSOTSI DETECTED on ${nodeId}!`, 'error')
        }
      } else {
        // If the state is no longer intruder_detected, reset the flag
        // This allows the alert to trigger again if the state changes back to intruder_detected
        if (intruderDetectedRef.current[nodeId]) {
          intruderDetectedRef.current[nodeId] = false
        }
      }
    })
  }, [edgeNodes, addNotification])

  const totalNodes = Object.keys(edgeNodes).length
  const activeNodes = Object.values(edgeNodes).filter(node => node.isStreaming).length

  // Determine status color
  const getStatusColor = () => {
    if (!isConnected) return '#666'
    if (activeNodes === 0) return '#ef4444' // Red - no nodes
    if (activeNodes < totalNodes) return '#eab308' // Yellow - some offline
    return '#22c55e' // Green - all online
  }

  const statusColor = getStatusColor()

  return (
    <>
      <div
        className="edge-nodes-widget"
        onClick={onClick}
        style={{
          cursor: onClick ? 'pointer' : 'default',
          borderColor: `${statusColor}33`
        }}
      >
        <div className="edge-nodes-icon" style={{ color: statusColor }}>
          <Monitor size={16} />
        </div>
        <div className="edge-nodes-count">
          <div className="edge-nodes-active">{activeNodes}</div>
          <div className="edge-nodes-total">/ {totalNodes}</div>
        </div>
        <div className="edge-nodes-details">
          <div className="edge-nodes-label">Edge Nodes</div>
          <div className="edge-nodes-status" style={{ color: statusColor }}>
            <Circle size={6} fill={statusColor} />
            <span>
              {!isConnected ? 'Connecting...' :
               activeNodes === 0 ? 'No nodes' :
               activeNodes === totalNodes ? 'All online' :
               `${activeNodes} active`}
            </span>
          </div>
        </div>
      </div>

      {/* Global Intruder Alert Popup */}
      {intruderAlert && (
        <IntruderAlert
          nodeData={intruderAlert}
          onDismiss={() => setIntruderAlert(null)}
          onViewDetails={() => {
            // Open dashboard to view details
            if (onClick) onClick()
            setIntruderAlert(null)
          }}
        />
      )}
    </>
  )
}

export default EdgeNodesWidget
