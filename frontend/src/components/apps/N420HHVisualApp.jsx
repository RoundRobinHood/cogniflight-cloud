import { useEffect, useState, useRef } from 'react'
import { useStreamClient } from '../../api/socket.js'
import { useSystem } from '../useSystem'

// Attitude Indicator Component (Artificial Horizon)
function AttitudeIndicator({ pitch = 0, roll = 0 }) {
  const isDisconnected = pitch === null || pitch === undefined || roll === null || roll === undefined
  const pitchClamped = isDisconnected ? 0 : Math.max(-90, Math.min(90, pitch))
  const rollClamped = isDisconnected ? 0 : Math.max(-180, Math.min(180, roll))

  return (
    <div style={{
      width: '300px',
      height: '300px',
      position: 'relative',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      boxShadow: '0 10px 40px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,255,255,0.1)',
      overflow: 'hidden',
      border: '3px solid #00ffff'
    }}>
      {/* Sky and Ground */}
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '200%',
        top: '50%',
        left: '50%',
        transform: `translate(-50%, -50%) rotate(${rollClamped}deg) translateY(${pitchClamped * 2}px)`,
        transition: 'transform 0.3s ease-out'
      }}>
        {/* Sky */}
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '50%',
          top: 0,
          background: 'linear-gradient(to bottom, #87CEEB 0%, #4A90E2 100%)'
        }} />
        {/* Ground */}
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '50%',
          bottom: 0,
          background: 'linear-gradient(to bottom, #8B4513 0%, #654321 100%)'
        }} />
        {/* Horizon Line */}
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '2px',
          top: '50%',
          background: 'white',
          boxShadow: '0 0 10px rgba(255,255,255,0.8)'
        }} />
      </div>

      {/* Fixed Aircraft Symbol */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10
      }}>
        <div style={{
          width: '120px',
          height: '4px',
          background: '#FFD700',
          position: 'absolute',
          top: '-2px',
          left: '-60px',
          boxShadow: '0 0 10px rgba(255,215,0,0.8)'
        }} />
        <div style={{
          width: '4px',
          height: '20px',
          background: '#FFD700',
          position: 'absolute',
          top: '-10px',
          left: '-2px',
          boxShadow: '0 0 10px rgba(255,215,0,0.8)'
        }} />
      </div>

      {/* Roll Scale */}
      <svg style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none'
      }}>
        {/* Roll markings */}
        {[-60, -30, -20, -10, 0, 10, 20, 30, 60].map(angle => {
          const rad = (angle - 90) * Math.PI / 180
          const x1 = 150 + 140 * Math.cos(rad)
          const y1 = 150 + 140 * Math.sin(rad)
          const x2 = 150 + (angle % 30 === 0 ? 125 : 130) * Math.cos(rad)
          const y2 = 150 + (angle % 30 === 0 ? 125 : 130) * Math.sin(rad)

          return (
            <line
              key={angle}
              x1={x1} y1={y1}
              x2={x2} y2={y2}
              stroke="white"
              strokeWidth={angle === 0 ? "3" : "2"}
              opacity={angle === 0 ? 1 : 0.7}
            />
          )
        })}

        {/* Roll pointer */}
        <polygon
          points="150,10 145,20 155,20"
          fill="#FFD700"
          transform={`rotate(${rollClamped} 150 150)`}
          style={{ filter: 'drop-shadow(0 0 5px rgba(255,215,0,0.8))' }}
        />
      </svg>

      {/* Pitch and Roll Values */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center',
        color: isDisconnected ? '#ff0000' : 'white',
        fontSize: '12px',
        fontFamily: 'monospace',
        textShadow: '0 0 10px rgba(0,0,0,0.8)'
      }}>
        {isDisconnected ? (
          <div style={{ fontWeight: 'bold' }}>⚠ SENSOR DISCONNECTED</div>
        ) : (
          <div>
            <div>PITCH: {pitch.toFixed(1)}°</div>
            <div>ROLL: {roll.toFixed(1)}°</div>
          </div>
        )}
      </div>

      {/* Disconnection overlay */}
      {isDisconnected && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(255, 0, 0, 0.2)',
          borderRadius: '50%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5,
          border: '3px solid #ff0000',
          boxShadow: '0 0 30px rgba(255, 0, 0, 0.5), inset 0 0 30px rgba(255, 0, 0, 0.3)',
          animation: 'pulse 2s infinite'
        }}>
          <div style={{
            fontSize: '72px',
            color: '#ff0000',
            textShadow: '0 0 20px rgba(255,0,0,0.8)',
            animation: 'pulse 2s infinite'
          }}>⚠</div>
          <div style={{
            fontSize: '14px',
            color: '#ff0000',
            fontWeight: 'bold',
            marginTop: '10px',
            textShadow: '0 0 10px rgba(255,0,0,0.8)'
          }}>SENSOR OFFLINE</div>
        </div>
      )}
    </div>
  )
}

// Gauge Component for metrics
function Gauge({ value, max, label, unit, color = '#00ff00', danger = false }) {
  const isDisconnected = value === null || value === undefined
  const displayValue = isDisconnected ? 0 : value
  const percentage = (displayValue / max) * 100

  return (
    <div style={{
      width: '150px',
      height: '150px',
      position: 'relative',
      marginBottom: '10px'
    }}>
      <svg width="150" height="150">
        {/* Background arc */}
        <circle
          cx="75"
          cy="75"
          r="60"
          fill="none"
          stroke={isDisconnected ? '#ff0000' : '#333'}
          strokeWidth="10"
          strokeDasharray="188.5 188.5"
          strokeDashoffset="94.25"
          transform="rotate(90 75 75)"
        />
        {/* Value arc */}
        {!isDisconnected && (
          <circle
            cx="75"
            cy="75"
            r="60"
            fill="none"
            stroke={danger ? '#ff0000' : color}
            strokeWidth="10"
            strokeDasharray={`${percentage * 1.885} 188.5`}
            strokeDashoffset="94.25"
            transform="rotate(90 75 75)"
            style={{
              transition: 'stroke-dasharray 0.5s ease',
              filter: `drop-shadow(0 0 10px ${danger ? 'rgba(255,0,0,0.5)' : `${color}88`})`
            }}
          />
        )}
      </svg>

      {/* Center text */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        color: isDisconnected ? '#ff0000' : (danger ? '#ff0000' : '#fff')
      }}>
        {isDisconnected ? (
          <div>
            <div style={{
              fontSize: '36px',
              fontWeight: 'bold',
              animation: 'pulse 2s infinite'
            }}>⚠</div>
            <div style={{ fontSize: '9px', marginTop: '5px' }}>OFFLINE</div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{displayValue}</div>
            <div style={{ fontSize: '10px', opacity: 0.7 }}>{unit}</div>
          </div>
        )}
      </div>

      {/* Label */}
      <div style={{
        position: 'absolute',
        bottom: '-20px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '12px',
        color: isDisconnected ? '#ff0000' : '#888',
        whiteSpace: 'nowrap',
        fontWeight: isDisconnected ? 'bold' : 'normal'
      }}>
        {label}
      </div>

      {/* Red border for disconnected */}
      {isDisconnected && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          border: '3px solid #ff0000',
          borderRadius: '50%',
          boxShadow: '0 0 20px rgba(255, 0, 0, 0.5), inset 0 0 20px rgba(255, 0, 0, 0.2)',
          pointerEvents: 'none',
          animation: 'pulse 2s infinite'
        }} />
      )}
    </div>
  )
}

// Status Indicator
function StatusIndicator({ status, message }) {
  if (!status) return null

  const statusColors = {
    alert_moderate: '#FFA500',
    alert_high: '#FF0000',
    alert_low: '#00FF00',
    connected: '#00FF00',
    disconnected: '#FF0000'
  }

  const color = statusColors[status] || '#888'

  return (
    <div style={{
      padding: '10px 20px',
      background: `linear-gradient(135deg, ${color}22 0%, ${color}11 100%)`,
      border: `2px solid ${color}`,
      borderRadius: '10px',
      boxShadow: `0 0 20px ${color}44`,
      marginBottom: '20px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <div style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: color,
          animation: 'pulse 2s infinite',
          boxShadow: `0 0 10px ${color}`
        }} />
        <span style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>
          {status.replace(/_/g, ' ').toUpperCase()}
        </span>
      </div>
      {message && (
        <div style={{ color: '#ccc', fontSize: '12px', marginTop: '5px' }}>
          {message}
        </div>
      )}
    </div>
  )
}

// 3D Accelerometer Visualization
function Accelerometer({ x = 0, y = 0, z = 0 }) {
  const isDisconnected = x === null || x === undefined || y === null || y === undefined || z === null || z === undefined
  const safeX = isDisconnected ? 0 : x
  const safeY = isDisconnected ? 0 : y
  const safeZ = isDisconnected ? 0 : z
  const maxG = 10
  const normalizeValue = (val) => Math.max(-1, Math.min(1, val / maxG))

  return (
    <div style={{
      width: '200px',
      height: '200px',
      position: 'relative',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      borderRadius: '10px',
      padding: '20px',
      border: '2px solid #00ffff',
      boxShadow: '0 5px 20px rgba(0,0,0,0.5)'
    }}>
      <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        transform: 'preserve-3d',
        transformStyle: 'preserve-3d'
      }}>
        {/* 3D Box representation */}
        <div style={{
          position: 'absolute',
          width: '80px',
          height: '80px',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) rotateX(${safeY * 30}deg) rotateY(${safeX * 30}deg)`,
          transformStyle: 'preserve-3d',
          transition: 'transform 0.3s ease-out'
        }}>
          {/* Box faces */}
          <div style={{
            position: 'absolute',
            width: '80px',
            height: '80px',
            background: `rgba(0, 255, 255, ${0.3 + Math.abs(safeZ) * 0.3})`,
            border: '2px solid #00ffff',
            transform: 'translateZ(40px)'
          }} />
          <div style={{
            position: 'absolute',
            width: '80px',
            height: '80px',
            background: `rgba(0, 255, 255, ${0.3 + Math.abs(safeZ) * 0.3})`,
            border: '2px solid #00ffff',
            transform: 'translateZ(-40px) rotateY(180deg)'
          }} />
        </div>

        {/* G-Force values */}
        <div style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          right: '0',
          color: isDisconnected ? '#ff0000' : '#fff',
          fontSize: '10px',
          fontFamily: 'monospace',
          display: 'flex',
          justifyContent: 'space-around'
        }}>
          {isDisconnected ? (
            <span>⚠ SENSOR DISCONNECTED</span>
          ) : (
            <>
              <span>X: {safeX.toFixed(2)}g</span>
              <span>Y: {safeY.toFixed(2)}g</span>
              <span>Z: {safeZ.toFixed(2)}g</span>
            </>
          )}
        </div>
      </div>

      <div style={{
        position: 'absolute',
        top: '5px',
        left: '5px',
        color: isDisconnected ? '#ff0000' : '#00ffff',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        ACCELEROMETER
      </div>

      {/* Disconnection overlay */}
      {isDisconnected && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(255, 0, 0, 0.2)',
          borderRadius: '10px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5,
          border: '3px solid #ff0000',
          boxShadow: '0 0 30px rgba(255, 0, 0, 0.5), inset 0 0 30px rgba(255, 0, 0, 0.3)',
          animation: 'pulse 2s infinite'
        }}>
          <div style={{
            fontSize: '48px',
            color: '#ff0000',
            textShadow: '0 0 20px rgba(255,0,0,0.8)',
            animation: 'pulse 2s infinite'
          }}>⚠</div>
          <div style={{
            fontSize: '12px',
            color: '#ff0000',
            fontWeight: 'bold',
            marginTop: '5px',
            textShadow: '0 0 10px rgba(255,0,0,0.8)'
          }}>OFFLINE</div>
        </div>
      )}
    </div>
  )
}

// Fusion Score Graph Component
function FusionScoreGraph({ history = [] }) {
  const maxPoints = 120 // Show last 120 data points on desktop
  const displayHistory = history.slice(-maxPoints)

  if (displayHistory.length === 0) {
    return (
      <div style={{
        width: '100%',
        height: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#888',
        fontSize: '14px'
      }}>
        Waiting for fusion score data...
      </div>
    )
  }

  const width = 1200  // Optimal width for desktop without overstretching
  const height = 200
  const padding = { top: 20, right: 80, bottom: 30, left: 50 }
  const graphWidth = width - padding.left - padding.right
  const graphHeight = height - padding.top - padding.bottom

  // Create path for fusion score (converted to percentage)
  const fusionPoints = displayHistory.map((item, index) => {
    const value = item.fusion_score !== null && item.fusion_score !== undefined ? item.fusion_score : null
    if (value === null) return null
    const x = padding.left + (index / Math.max(1, displayHistory.length - 1)) * graphWidth
    const y = padding.top + graphHeight - (value * graphHeight) // 0-1 scale
    return { x, y, value }
  }).filter(p => p !== null)

  // Create path for confidence (as percentage 0-1)
  const confidencePoints = displayHistory.map((item, index) => {
    const value = item.confidence !== null && item.confidence !== undefined ? item.confidence : null
    if (value === null) return null
    const x = padding.left + (index / Math.max(1, displayHistory.length - 1)) * graphWidth
    const y = padding.top + graphHeight - (value * graphHeight) // 0-1 scale
    return { x, y, value }
  }).filter(p => p !== null)

  const fusionPathData = fusionPoints.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ')

  const confidencePathData = confidencePoints.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ')

  return (
    <div style={{
      width: '100%',
      height: '200px',
      background: '#0a0a0a',
      borderRadius: '10px',
      padding: '10px',
      border: '1px solid #333',
      overflow: 'visible'
    }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        {/* Background grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((val, i) => {
          const y = padding.top + graphHeight - (val * graphHeight)
          return (
            <line
              key={`grid-${i}`}
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="#333"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
          )
        })}

        {/* Fatigue level markers */}
        {/* Mild fatigue line at 25% */}
        <line
          x1={padding.left}
          y1={padding.top + graphHeight - (0.25 * graphHeight)}
          x2={width - padding.right}
          y2={padding.top + graphHeight - (0.25 * graphHeight)}
          stroke="#FFD700"
          strokeWidth="2"
          strokeDasharray="5,5"
        />
        <text
          x={padding.left + 5}
          y={padding.top + graphHeight - (0.25 * graphHeight) - 5}
          fill="#FFD700"
          fontSize="10"
          fontWeight="bold"
        >
          MILD (25%)
        </text>

        {/* Moderate fatigue line at 50% */}
        <line
          x1={padding.left}
          y1={padding.top + graphHeight - (0.50 * graphHeight)}
          x2={width - padding.right}
          y2={padding.top + graphHeight - (0.50 * graphHeight)}
          stroke="#FFA500"
          strokeWidth="2"
          strokeDasharray="5,5"
        />
        <text
          x={padding.left + 5}
          y={padding.top + graphHeight - (0.50 * graphHeight) - 5}
          fill="#FFA500"
          fontSize="10"
          fontWeight="bold"
        >
          MODERATE (50%)
        </text>

        {/* Severe fatigue line at 75% */}
        <line
          x1={padding.left}
          y1={padding.top + graphHeight - (0.75 * graphHeight)}
          x2={width - padding.right}
          y2={padding.top + graphHeight - (0.75 * graphHeight)}
          stroke="#FF0000"
          strokeWidth="2"
          strokeDasharray="5,5"
        />
        <text
          x={padding.left + 5}
          y={padding.top + graphHeight - (0.75 * graphHeight) - 5}
          fill="#FF0000"
          fontSize="10"
          fontWeight="bold"
        >
          SEVERE (75%)
        </text>

        {/* Axes */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="#666"
          strokeWidth="2"
        />
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="#666"
          strokeWidth="2"
        />

        {/* Y-axis labels (as percentages) */}
        {[0, 0.25, 0.5, 0.75, 1].map((val, i) => {
          const y = padding.top + graphHeight - (val * graphHeight)
          return (
            <text
              key={`ylabel-${i}`}
              x={padding.left - 10}
              y={y + 5}
              fill="#888"
              fontSize="10"
              textAnchor="end"
            >
              {(val * 100).toFixed(0)}%
            </text>
          )
        })}

        {/* Data line with gradient fill */}
        <defs>
          <linearGradient id="fusionGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00ffff" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#00ffff" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="confidenceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ff00ff" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ff00ff" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Area under fusion score curve */}
        {fusionPoints.length > 0 && (
          <path
            d={`${fusionPathData} L ${fusionPoints[fusionPoints.length - 1].x} ${height - padding.bottom} L ${fusionPoints[0].x} ${height - padding.bottom} Z`}
            fill="url(#fusionGradient)"
          />
        )}

        {/* Fusion Score Line */}
        {fusionPoints.length > 0 && (
          <path
            d={fusionPathData}
            fill="none"
            stroke="#00ffff"
            strokeWidth="3"
            style={{ filter: 'drop-shadow(0 0 5px rgba(0,255,255,0.5))' }}
          />
        )}

        {/* Confidence Line */}
        {confidencePoints.length > 0 && (
          <path
            d={confidencePathData}
            fill="none"
            stroke="#ff00ff"
            strokeWidth="3"
            strokeDasharray="5,5"
            style={{ filter: 'drop-shadow(0 0 5px rgba(255,0,255,0.5))' }}
          />
        )}

        {/* Fusion Score data points */}
        {fusionPoints.map((p, i) => (
          <circle
            key={`fusion-point-${i}`}
            cx={p.x}
            cy={p.y}
            r="3"
            fill="#00ffff"
            stroke="#0a0a0a"
            strokeWidth="1"
          >
            <title>Fusion: {(p.value * 100).toFixed(1)}%</title>
          </circle>
        ))}

        {/* Confidence data points */}
        {confidencePoints.map((p, i) => (
          <circle
            key={`conf-point-${i}`}
            cx={p.x}
            cy={p.y}
            r="3"
            fill="#ff00ff"
            stroke="#0a0a0a"
            strokeWidth="1"
          >
            <title>Confidence: {(p.value * 100).toFixed(1)}%</title>
          </circle>
        ))}

        {/* Legend */}
        <g transform={`translate(${width - padding.right + 10}, ${padding.top})`}>
          <line x1="0" y1="10" x2="20" y2="10" stroke="#00ffff" strokeWidth="3" />
          <text x="25" y="14" fill="#00ffff" fontSize="10">Fusion Score</text>

          <line x1="0" y1="30" x2="20" y2="30" stroke="#ff00ff" strokeWidth="3" strokeDasharray="5,5" />
          <text x="25" y="34" fill="#ff00ff" fontSize="10">Confidence</text>
        </g>

        {/* X-axis label */}
        <text
          x={width / 2}
          y={height - 5}
          fill="#888"
          fontSize="12"
          textAnchor="middle"
        >
          Time (last {displayHistory.length} readings)
        </text>

        {/* Y-axis label */}
        <text
          x={15}
          y={height / 2}
          fill="#888"
          fontSize="12"
          textAnchor="middle"
          transform={`rotate(-90 15 ${height / 2})`}
        >
          Percentage (%)
        </text>
      </svg>
    </div>
  )
}

function N420HHVisualApp() {
  const client = useStreamClient()
  const [data, setData] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const commandHandleRef = useRef(null)
  const { addNotification } = useSystem()
  const [fusionScoreHistory, setFusionScoreHistory] = useState([])

  useEffect(() => {
    if (!client) return

    const startStreaming = async () => {
      try {
        setIsConnected(true)
        const commandHandle = await client.run_command('mqtt')
        commandHandleRef.current = commandHandle
        setIsStreaming(true)

        for await (const yamlDoc of commandHandle.iter_yaml_output()) {
          if (yamlDoc) {
            setData(yamlDoc)

            // Track fusion score and confidence history
            if (yamlDoc.payload) {
              setFusionScoreHistory(prev => [...prev, {
                fusion_score: yamlDoc.payload.fusion_score,
                confidence: yamlDoc.payload.confidence
              }])
            }
          }
        }

        setIsStreaming(false)
      } catch (error) {
        console.error('Failed to start MQTT streaming:', error)
        addNotification('Failed to connect to edge node stream', 'error')
        setIsStreaming(false)
      }
    }

    startStreaming()

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

  const payload = data?.payload || {}

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#0a0a0a',
      color: '#fff',
      padding: '15px',
      boxSizing: 'border-box',
      overflow: 'auto',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }}>
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px',
        borderBottom: '2px solid #333',
        paddingBottom: '10px'
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '22px',
          background: 'linear-gradient(135deg, #00ffff 0%, #0080ff 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          N420HH Flight Monitor
        </h1>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '14px', color: '#888' }}>
            Pilot: <span style={{ color: '#fff' }}>{payload.pilot_username || 'N/A'}</span>
          </span>
          {payload.flight_id && (
            <span style={{
              fontSize: '12px',
              color: '#00ffff',
              padding: '4px 10px',
              background: '#00ffff22',
              border: '1px solid #00ffff',
              borderRadius: '5px'
            }}>
              Flight: {payload.flight_id}
            </span>
          )}
          {payload.system_state && (
            <div style={{
              fontSize: '12px',
              color: '#fff',
              padding: '4px 12px',
              background: payload.system_state === 'alert_high' ? '#ff000022' : (payload.system_state === 'alert_moderate' ? '#FFA50022' : '#00ff0022'),
              border: `1px solid ${payload.system_state === 'alert_high' ? '#ff0000' : (payload.system_state === 'alert_moderate' ? '#FFA500' : '#00ff00')}`,
              borderRadius: '5px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: payload.system_state === 'alert_high' ? '#ff0000' : (payload.system_state === 'alert_moderate' ? '#FFA500' : '#00ff00'),
                animation: 'pulse 2s infinite'
              }} />
              {payload.system_state.replace(/_/g, ' ').toUpperCase()}
            </div>
          )}
          <div style={{
            padding: '4px 12px',
            background: isStreaming ? '#00ff0022' : '#ff000022',
            border: `2px solid ${isStreaming ? '#00ff00' : '#ff0000'}`,
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 'bold'
          }}>
            {isStreaming ? 'LIVE' : 'OFFLINE'}
          </div>
        </div>
      </div>

      {!isConnected ? (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '400px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div className="spinner" style={{
              width: '50px',
              height: '50px',
              border: '3px solid #333',
              borderTop: '3px solid #00ffff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }} />
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
            <div>Connecting to edge node...</div>
          </div>
        </div>
      ) : !data ? (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '400px',
          color: '#888'
        }}>
          Waiting for telemetry data...
        </div>
      ) : (
        <div>
          {/* Top Row: Fusion Score Graph + Vision Monitoring */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: '20px',
            marginBottom: '20px'
          }}>
            {/* Fusion Score Graph */}
            <div style={{
              background: 'linear-gradient(135deg, #1a1a2e22 0%, #16213e22 100%)',
              padding: '15px',
              borderRadius: '10px',
              border: '1px solid #333'
            }}>
              <h3 style={{ color: '#00ffff', marginBottom: '15px', marginTop: '5px', textAlign: 'center', fontSize: '16px' }}>
                FATIGUE FUSION SCORE - TIME SERIES
              </h3>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <FusionScoreGraph history={fusionScoreHistory} />
              </div>
              <div style={{
                marginTop: '15px',
                display: 'flex',
                justifyContent: 'center',
                gap: '40px',
                flexWrap: 'wrap'
              }}>
                {payload.fusion_score !== null && payload.fusion_score !== undefined && (
                  <div style={{
                    textAlign: 'center',
                    fontSize: '14px',
                    color: '#888'
                  }}>
                    <div style={{ marginBottom: '5px', color: '#00ffff' }}>Current Fusion Score</div>
                    <div style={{
                      color: payload.fusion_score < 0.25 ? '#00ff00' : (payload.fusion_score < 0.50 ? '#FFD700' : (payload.fusion_score < 0.75 ? '#FFA500' : '#FF0000')),
                      fontWeight: 'bold',
                      fontSize: '24px'
                    }}>
                      {(payload.fusion_score * 100).toFixed(1)}%
                    </div>
                    <div style={{ marginTop: '5px', fontSize: '12px' }}>
                      ({payload.fusion_score < 0.25 ? 'Normal' : (payload.fusion_score < 0.50 ? 'Mild Fatigue' : (payload.fusion_score < 0.75 ? 'Moderate Fatigue' : 'Severe Fatigue'))})
                    </div>
                  </div>
                )}
                {payload.confidence !== null && payload.confidence !== undefined && (
                  <div style={{
                    textAlign: 'center',
                    fontSize: '14px',
                    color: '#888'
                  }}>
                    <div style={{ marginBottom: '5px', color: '#ff00ff' }}>Prediction Confidence</div>
                    <div style={{
                      color: '#ff00ff',
                      fontWeight: 'bold',
                      fontSize: '24px'
                    }}>
                      {(payload.confidence * 100).toFixed(1)}%
                    </div>
                    <div style={{ marginTop: '5px', fontSize: '12px' }}>
                      Model v{payload.predictor_version || 'N/A'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Vision Monitoring */}
            <div style={{
              background: 'linear-gradient(135deg, #1a1a2e22 0%, #16213e22 100%)',
              padding: '15px',
              borderRadius: '10px',
              border: '1px solid #333'
            }}>
              <h3 style={{ color: '#00ffff', marginBottom: '15px', marginTop: '5px', textAlign: 'center', fontSize: '16px' }}>
                VISION MONITORING
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                fontSize: '13px'
              }}>
                <div style={{ padding: '10px', background: '#00000044', borderRadius: '5px' }}>
                  <span style={{ color: '#888' }}>Blink Rate:</span>
                  <span style={{
                    float: 'right',
                    color: payload.blink_rate === null || payload.blink_rate === undefined ? '#ff0000' : '#fff'
                  }}>
                    {payload.blink_rate !== null && payload.blink_rate !== undefined ? `${payload.blink_rate}/min` : '⚠ NO DATA'}
                  </span>
                </div>
                <div style={{ padding: '10px', background: '#00000044', borderRadius: '5px' }}>
                  <span style={{ color: '#888' }}>Microsleeps:</span>
                  <span style={{
                    float: 'right',
                    color: payload.microsleep_count === null || payload.microsleep_count === undefined ? '#ff0000' : (payload.microsleep_count > 0 ? '#ff0000' : '#00ff00'),
                    fontWeight: 'bold'
                  }}>
                    {payload.microsleep_count !== null && payload.microsleep_count !== undefined ? payload.microsleep_count : '⚠ NO DATA'}
                  </span>
                </div>
                <div style={{ padding: '10px', background: '#00000044', borderRadius: '5px' }}>
                  <span style={{ color: '#888' }}>Eyes Closed:</span>
                  <span style={{
                    float: 'right',
                    color: payload.eyes_closed === null || payload.eyes_closed === undefined ? '#ff0000' : (payload.eyes_closed ? '#ff0000' : '#00ff00'),
                    fontWeight: 'bold'
                  }}>
                    {payload.eyes_closed !== null && payload.eyes_closed !== undefined ? (payload.eyes_closed ? 'YES' : 'NO') : '⚠ NO DATA'}
                  </span>
                </div>
                <div style={{ padding: '10px', background: '#00000044', borderRadius: '5px' }}>
                  <span style={{ color: '#888' }}>Closure Duration:</span>
                  <span style={{
                    float: 'right',
                    color: payload.closure_duration === null || payload.closure_duration === undefined ? '#ff0000' : '#fff'
                  }}>
                    {payload.closure_duration !== null && payload.closure_duration !== undefined ? `${payload.closure_duration}ms` : '⚠ NO DATA'}
                  </span>
                </div>
                <div style={{ padding: '10px', background: '#00000044', borderRadius: '5px' }}>
                  <span style={{ color: '#888' }}>Yawning:</span>
                  <span style={{
                    float: 'right',
                    color: payload.yawning === null || payload.yawning === undefined ? '#ff0000' : (payload.yawning ? '#FFA500' : '#00ff00'),
                    fontWeight: 'bold'
                  }}>
                    {payload.yawning !== null && payload.yawning !== undefined ? (payload.yawning ? 'YES' : 'NO') : '⚠ NO DATA'}
                  </span>
                </div>
                <div style={{ padding: '10px', background: '#00000044', borderRadius: '5px' }}>
                  <span style={{ color: '#888' }}>Yawn Count:</span>
                  <span style={{
                    float: 'right',
                    color: payload.yawn_count === null || payload.yawn_count === undefined ? '#ff0000' : (payload.yawn_count > 0 ? '#FFA500' : '#fff'),
                    fontWeight: payload.yawn_count > 0 ? 'bold' : 'normal'
                  }}>
                    {payload.yawn_count !== null && payload.yawn_count !== undefined ? payload.yawn_count : '⚠ NO DATA'}
                  </span>
                </div>
                <div style={{ padding: '10px', background: '#00000044', borderRadius: '5px' }}>
                  <span style={{ color: '#888' }}>Yawn Duration:</span>
                  <span style={{
                    float: 'right',
                    color: payload.yawn_duration === null || payload.yawn_duration === undefined ? '#ff0000' : '#fff'
                  }}>
                    {payload.yawn_duration !== null && payload.yawn_duration !== undefined ? `${payload.yawn_duration}ms` : '⚠ NO DATA'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Dashboard Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '20px',
            marginBottom: '20px'
          }}>
            {/* Attitude Indicator */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'linear-gradient(135deg, #1a1a2e22 0%, #16213e22 100%)',
              padding: '15px',
              borderRadius: '10px',
              border: '1px solid #333'
            }}>
              <h3 style={{ color: '#00ffff', marginBottom: '15px', marginTop: '5px', fontSize: '16px' }}>ATTITUDE</h3>
              <AttitudeIndicator pitch={payload.pitch} roll={payload.roll} />
            </div>

            {/* Cardiovascular Vitals */}
            <div style={{
              background: 'linear-gradient(135deg, #1a1a2e22 0%, #16213e22 100%)',
              padding: '15px',
              borderRadius: '10px',
              border: '1px solid #333'
            }}>
              <h3 style={{ color: '#00ffff', marginBottom: '15px', marginTop: '5px', textAlign: 'center', fontSize: '16px' }}>
                CARDIOVASCULAR
              </h3>
              <div style={{
                display: 'flex',
                justifyContent: 'space-around',
                flexWrap: 'wrap'
              }}>
                <Gauge
                  value={payload.heart_rate}
                  max={200}
                  label="HEART RATE"
                  unit="BPM"
                  color="#ff0066"
                  danger={payload.heart_rate && payload.heart_rate > 150}
                />
                <Gauge
                  value={payload.stress_index !== null && payload.stress_index !== undefined ? Math.round(payload.stress_index * 100) : null}
                  max={100}
                  label="STRESS"
                  unit="%"
                  color="#ffaa00"
                  danger={payload.stress_index && payload.stress_index > 0.7}
                />
              </div>
              <div style={{
                marginTop: '15px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                fontSize: '13px'
              }}>
                <div style={{ padding: '10px', background: '#00000044', borderRadius: '5px' }}>
                  <span style={{ color: '#888' }}>RR Interval:</span>
                  <span style={{
                    float: 'right',
                    color: payload.rr_interval === null || payload.rr_interval === undefined ? '#ff0000' : '#fff'
                  }}>
                    {payload.rr_interval !== null && payload.rr_interval !== undefined ? `${payload.rr_interval.toFixed(3)}s` : '⚠ NO DATA'}
                  </span>
                </div>
                <div style={{ padding: '10px', background: '#00000044', borderRadius: '5px' }}>
                  <span style={{ color: '#888' }}>RMSSD:</span>
                  <span style={{
                    float: 'right',
                    color: payload.rmssd === null || payload.rmssd === undefined ? '#ff0000' : '#fff'
                  }}>
                    {payload.rmssd !== null && payload.rmssd !== undefined ? payload.rmssd.toFixed(2) : '⚠ NO DATA'}
                  </span>
                </div>
                <div style={{ padding: '10px', background: '#00000044', borderRadius: '5px' }}>
                  <span style={{ color: '#888' }}>HR Trend:</span>
                  <span style={{
                    float: 'right',
                    color: payload.hr_trend === null || payload.hr_trend === undefined ? '#ff0000' : (payload.hr_trend > 0 ? '#ff6666' : '#66ff66')
                  }}>
                    {payload.hr_trend !== null && payload.hr_trend !== undefined ? `${payload.hr_trend > 0 ? '+' : ''}${payload.hr_trend.toFixed(2)}` : '⚠ NO DATA'}
                  </span>
                </div>
                <div style={{ padding: '10px', background: '#00000044', borderRadius: '5px' }}>
                  <span style={{ color: '#888' }}>Baseline Deviation:</span>
                  <span style={{
                    float: 'right',
                    color: payload.baseline_deviation === null || payload.baseline_deviation === undefined ? '#ff0000' : '#fff'
                  }}>
                    {payload.baseline_deviation !== null && payload.baseline_deviation !== undefined ? payload.baseline_deviation.toFixed(3) : '⚠ NO DATA'}
                  </span>
                </div>
              </div>
            </div>

            {/* Accelerometer */}
            <div style={{
              background: 'linear-gradient(135deg, #1a1a2e22 0%, #16213e22 100%)',
              padding: '15px',
              borderRadius: '10px',
              border: '1px solid #333',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <h3 style={{ color: '#00ffff', marginBottom: '15px', marginTop: '5px', fontSize: '16px' }}>G-FORCES</h3>
              <Accelerometer
                x={payload.accel_x}
                y={payload.accel_y}
                z={payload.accel_z}
              />

              {/* Gyroscope data */}
              <div style={{
                marginTop: '15px',
                width: '100%',
                padding: '10px',
                background: '#00000044',
                borderRadius: '5px'
              }}>
                <div style={{ color: '#00ffff', fontSize: '12px', marginBottom: '10px' }}>
                  GYROSCOPE (deg/s)
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '12px' }}>
                  <span style={{
                    color: payload.gyro_x === null || payload.gyro_x === undefined ? '#ff0000' : '#fff'
                  }}>
                    X: {payload.gyro_x !== null && payload.gyro_x !== undefined ? payload.gyro_x.toFixed(3) : '⚠'}
                  </span>
                  <span style={{
                    color: payload.gyro_y === null || payload.gyro_y === undefined ? '#ff0000' : '#fff'
                  }}>
                    Y: {payload.gyro_y !== null && payload.gyro_y !== undefined ? payload.gyro_y.toFixed(3) : '⚠'}
                  </span>
                  <span style={{
                    color: payload.gyro_z === null || payload.gyro_z === undefined ? '#ff0000' : '#fff'
                  }}>
                    Z: {payload.gyro_z !== null && payload.gyro_z !== undefined ? payload.gyro_z.toFixed(3) : '⚠'}
                  </span>
                </div>
              </div>
            </div>

            {/* Environment (Combined Environmental + Flight Data) */}
            <div style={{
              background: 'linear-gradient(135deg, #1a1a2e22 0%, #16213e22 100%)',
              padding: '15px',
              borderRadius: '10px',
              border: '1px solid #333'
            }}>
              <h3 style={{ color: '#00ffff', marginBottom: '15px', marginTop: '5px', textAlign: 'center', fontSize: '16px' }}>
                ENVIRONMENT
              </h3>
              <div style={{
                display: 'flex',
                justifyContent: 'space-around',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <Gauge
                  value={payload.temperature}
                  max={50}
                  label="TEMPERATURE"
                  unit="°C"
                  color="#00aaff"
                />
                <Gauge
                  value={payload.humidity}
                  max={100}
                  label="HUMIDITY"
                  unit="%"
                  color="#00ff88"
                />
                <Gauge
                  value={payload.altitude}
                  max={5000}
                  label="ALTITUDE"
                  unit="m"
                  color="#ffaa00"
                />
                <Gauge
                  value={payload.pressure}
                  max={1100}
                  label="PRESSURE"
                  unit="hPa"
                  color="#aa00ff"
                />
              </div>
            </div>
          </div>

          {/* Timestamp */}
          <div style={{
            textAlign: 'center',
            color: '#666',
            fontSize: '12px',
            marginTop: '20px'
          }}>
            Last Update: {payload.collection_time ?
              new Date(payload.collection_time * 1000).toLocaleString() :
              'N/A'
            }
          </div>
        </div>
      )}
    </div>
  )
}

export default N420HHVisualApp