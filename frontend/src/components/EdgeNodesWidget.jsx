import { useState, useEffect, useRef } from 'react'
import { Monitor, Circle } from 'lucide-react'
import { useStreamClient, usePipeClient } from '../api/socket.js'
import { useSystem } from './useSystem'
import IntruderAlert from './IntruderAlert'
import FlightOfflineAlert from './FlightOfflineAlert'

function EdgeNodesWidget({ onClick }) {
  const client = useStreamClient() // For MQTT streaming
  const commandClient = usePipeClient() // For one-off commands like finish-flight
  const [edgeNodes, setEdgeNodes] = useState({})
  const [isConnected, setIsConnected] = useState(false)
  const [intruderAlert, setIntruderAlert] = useState(null)
  const [flightOfflineAlert, setFlightOfflineAlert] = useState(null)
  const mqttCommandHandleRef = useRef(null)
  const intruderDetectedRef = useRef({})
  const offlineFlightsPromptedRef = useRef({}) // Track which flights we've already prompted for
  const activeFlightsRef = useRef({}) // Track active flights with their data
  const { addNotification, systemState } = useSystem()

  // Check if user has pilot tag and role
  const userTags = systemState?.userProfile?.tags || []
  const userRole = systemState?.userProfile?.role
  const isPilot = userTags.includes('pilot')
  const isAtcOrAdmin = userRole === 'atc' || userRole === 'sysadmin'

  // Get the complete list of edge nodes from the edge-nodes command
  useEffect(() => {
    if (!client || isPilot) return

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
  }, [client, isPilot])

  // Start MQTT streaming to track active nodes
  useEffect(() => {
    if (!client || isPilot) return

    const startStreaming = async () => {
      try {
        setIsConnected(true)
        const commandHandle = await client.run_command('mqtt')
        mqttCommandHandleRef.current = commandHandle

        for await (const yamlDoc of commandHandle.iter_yaml_output()) {
          if (yamlDoc && yamlDoc.edge_username) {
            const nodeId = yamlDoc.edge_username
            const payload = yamlDoc.payload || {}
            const flightId = payload.flight_id

            // Track active flights
            if (flightId && payload.pilot_username) {
              activeFlightsRef.current[flightId] = {
                flight_id: flightId,
                edge_username: nodeId,
                pilot_username: payload.pilot_username,
                lastUpdate: Date.now(),
                lastPayload: payload,
                isActive: true
              }
            }

            setEdgeNodes(prev => {
              const updated = { ...prev }

              // Update existing node or add new one if discovered via MQTT
              if (!updated[nodeId]) {
                updated[nodeId] = {
                  edge_username: nodeId,
                  payload: payload,
                  timestamp: yamlDoc.timestamp,
                  isStreaming: true,
                  lastUpdate: Date.now()
                }
              } else {
                updated[nodeId] = {
                  ...updated[nodeId],
                  payload: payload,
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
  }, [client, isPilot])

  // Monitor for intruder_detected state and trigger global alert
  useEffect(() => {
    if (isPilot) return

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
  }, [edgeNodes, addNotification, isPilot])

  // Monitor for offline flights and trigger finish-flight prompt (only for ATC/admin)
  useEffect(() => {
    if (!isAtcOrAdmin) return

    const checkInterval = setInterval(() => {
      const now = Date.now()

      // Check all tracked flights
      Object.keys(activeFlightsRef.current).forEach(flightId => {
        const flightData = activeFlightsRef.current[flightId]

        // Check if flight has been offline for more than 30 seconds
        if (flightData.isActive && now - flightData.lastUpdate > 30000) {
          // Mark as inactive
          flightData.isActive = false

          // Only prompt if we haven't already prompted for this flight
          if (!offlineFlightsPromptedRef.current[flightId]) {
            console.log(`[FLIGHT OFFLINE] Flight ${flightId} has gone offline`)

            // Mark this flight as prompted
            offlineFlightsPromptedRef.current[flightId] = true

            // Show the offline flight alert
            setFlightOfflineAlert(flightData)

            // Send a system notification
            addNotification(`✈️ Flight ${flightId} connection lost`, 'warning')
          }
        }
      })
    }, 5000) // Check every 5 seconds

    return () => clearInterval(checkInterval)
  }, [isAtcOrAdmin, addNotification])

  // Handle finish-flight command
  const handleFinishFlight = async (flightId) => {
    try {
      console.log(`[FINISH FLIGHT] Running finish-flight command for ${flightId}`)

      // Use separate commandClient to avoid conflict with streaming MQTT client
      const result = await commandClient.run_command(`finish-flight ${flightId}`)

      console.log(`[FINISH FLIGHT] Command result:`, result)

      if (result.command_result === 0) {
        addNotification(`Flight ${flightId} marked as finished`, 'success')

        // Remove from active flights
        delete activeFlightsRef.current[flightId]
        delete offlineFlightsPromptedRef.current[flightId]

        // Close the alert
        setFlightOfflineAlert(null)
      } else {
        // Non-zero exit code - determine the error message
        let errorMsg

        if (result.error && result.error.trim()) {
          // Backend provided an error message (already finished, permissions, etc.)
          errorMsg = result.error.trim()
        } else {
          // Empty error with non-zero status - flight_id doesn't exist
          errorMsg = `Flight ID "${flightId}" does not exist`
        }

        console.error(`[FINISH FLIGHT] Command failed (status ${result.command_result}):`, errorMsg)
        addNotification(errorMsg, 'error')
        throw new Error(errorMsg)
      }
    } catch (error) {
      console.error(`[FINISH FLIGHT] Exception:`, error)

      // Re-throw to let FlightOfflineAlert handle the UI state
      throw error
    }
  }

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

  // If user is a pilot, show access denied
  if (isPilot) {
    return (
      <div
        className="edge-nodes-widget"
        style={{
          cursor: 'default',
          borderColor: '#ff000033',
          opacity: 0.7
        }}
      >
        <div className="edge-nodes-icon" style={{ color: '#ff0000' }}>
          <Monitor size={16} />
        </div>
        <div className="edge-nodes-details" style={{ flex: 1, textAlign: 'center' }}>
          <div className="edge-nodes-label">Edge Nodes</div>
          <div className="edge-nodes-status" style={{ color: '#ff0000' }}>
            <span>Access Denied</span>
          </div>
        </div>
      </div>
    )
  }

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

      {/* Flight Offline Alert Popup (only for ATC/admin) */}
      {isAtcOrAdmin && flightOfflineAlert && (
        <FlightOfflineAlert
          flightData={flightOfflineAlert}
          onFinishFlight={handleFinishFlight}
          onDismiss={() => setFlightOfflineAlert(null)}
        />
      )}
    </>
  )
}

export default EdgeNodesWidget
