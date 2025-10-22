import { useState, useEffect, useRef } from 'react'
import { Monitor, Circle } from 'lucide-react'
import { useStreamClient } from '../api/socket.js'

function EdgeNodesWidget({ onClick }) {
  const client = useStreamClient()
  const [edgeNodes, setEdgeNodes] = useState({})
  const [isConnected, setIsConnected] = useState(false)
  const mqttCommandHandleRef = useRef(null)

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
                  isStreaming: true,
                  lastUpdate: Date.now()
                }
              } else {
                updated[nodeId] = {
                  ...updated[nodeId],
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
  )
}

export default EdgeNodesWidget
