import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useStreamClient, PipeCmdClient } from '../../api/socket.js'
import { useSystem } from '../useSystem'
import { parse } from 'yaml'

// Import shared visualization components
import {
  AttitudeIndicator,
  Gauge,
  StatusIndicator,
  Accelerometer,
  FusionScoreGraph
} from './visualizations/FlightVisualizations'

// Helper function to detect if pilot data exists
function hasPilotData(payload) {
  if (!payload) return false

  // Check for vision data
  const hasVisionData =
    payload.blink_rate !== null && payload.blink_rate !== undefined ||
    payload.microsleep_count !== null && payload.microsleep_count !== undefined ||
    payload.eyes_closed !== null && payload.eyes_closed !== undefined ||
    payload.closure_duration !== null && payload.closure_duration !== undefined ||
    payload.yawning !== null && payload.yawning !== undefined ||
    payload.yawn_count !== null && payload.yawn_count !== undefined ||
    payload.yawn_duration !== null && payload.yawn_duration !== undefined

  // Check for heart rate data
  const hasHeartRateData = payload.heart_rate !== null && payload.heart_rate !== undefined

  // Need at least vision data OR heart rate data to indicate pilot is detected
  return hasVisionData || hasHeartRateData
}

// Edge Node Card Component
function EdgeNodeCard({ nodeData, onClick, criticality }) {
  const payload = nodeData?.payload || {}
  const isOnline = nodeData?.isStreaming || false
  const mlAnalysis = nodeData?.mlAnalysis || null
  const pilotDetected = hasPilotData(payload)

  // Determine alert status based on system state and fusion scores (only when pilot detected)
  const getAlertStatus = () => {
    if (!isOnline) return 'offline'
    if (payload.system_state === 'alert_high') return 'critical'
    if (payload.system_state === 'alert_moderate') return 'warning'
    // Only check fusion scores if pilot is detected
    if (pilotDetected) {
      if (payload.fusion_score >= 0.75) return 'critical'
      if (payload.fusion_score >= 0.50) return 'warning'
      if (payload.fusion_score >= 0.25) return 'caution'
    }
    return 'normal'
  }

  const alertStatus = getAlertStatus()
  const statusColors = {
    offline: '#666',
    normal: '#00ff00',
    caution: '#FFD700',
    warning: '#FFA500',
    critical: '#ff0000'
  }

  const statusColor = statusColors[alertStatus]

  return (
    <div
      onClick={onClick}
      style={{
        background: `linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)`,
        border: `2px solid ${statusColor}`,
        borderRadius: '10px',
        padding: '15px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: `0 4px 15px rgba(0,0,0,0.3), 0 0 20px ${statusColor}22`,
        position: 'relative',
        minHeight: '200px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-5px)'
        e.currentTarget.style.boxShadow = `0 8px 25px rgba(0,0,0,0.4), 0 0 30px ${statusColor}44`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = `0 4px 15px rgba(0,0,0,0.3), 0 0 20px ${statusColor}22`
      }}
    >
      {/* Status indicator */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        background: statusColor,
        boxShadow: `0 0 10px ${statusColor}`,
        animation: alertStatus !== 'normal' && alertStatus !== 'offline' ? 'pulse 2s infinite' : 'none'
      }} />

      {/* Header */}
      <div style={{
        borderBottom: '1px solid #333',
        paddingBottom: '8px',
        marginBottom: '5px'
      }}>
        <h3 style={{
          margin: 0,
          color: '#00ffff',
          fontSize: '16px',
          fontWeight: 'bold'
        }}>
          {nodeData.edge_username || 'Unknown Node'}
        </h3>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '5px'
        }}>
          <span style={{
            fontSize: '12px',
            color: '#888'
          }}>
            {payload.pilot_username || 'No Pilot'}
          </span>
          <span style={{
            fontSize: '11px',
            padding: '2px 8px',
            background: `${statusColor}22`,
            border: `1px solid ${statusColor}`,
            borderRadius: '10px',
            color: statusColor,
            fontWeight: 'bold'
          }}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
          {isOnline && !pilotDetected && (
            <span style={{
              fontSize: '10px',
              padding: '2px 6px',
              background: '#88888822',
              border: '1px solid #888',
              borderRadius: '8px',
              color: '#888',
              marginLeft: '5px'
            }}>
              NO PILOT
            </span>
          )}
        </div>
      </div>

      {/* Metrics Display */}
      {pilotDetected ? (
        /* Pilot-specific metrics */
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          fontSize: '12px'
        }}>
          {/* Fusion Score */}
          <div style={{
            background: '#00000044',
            padding: '8px',
            borderRadius: '5px',
            textAlign: 'center'
          }}>
            <div style={{ color: '#888', marginBottom: '5px' }}>Fatigue Score</div>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: payload.fusion_score >= 0.75 ? '#ff0000' :
                     payload.fusion_score >= 0.50 ? '#FFA500' :
                     payload.fusion_score >= 0.25 ? '#FFD700' : '#00ff00'
            }}>
              {payload.fusion_score !== null && payload.fusion_score !== undefined
                ? `${(payload.fusion_score * 100).toFixed(0)}%`
                : 'N/A'}
            </div>
          </div>

          {/* Confidence */}
          <div style={{
            background: '#00000044',
            padding: '8px',
            borderRadius: '5px',
            textAlign: 'center'
          }}>
            <div style={{ color: '#888', marginBottom: '5px' }}>Confidence</div>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#ff00ff'
            }}>
              {payload.confidence !== null && payload.confidence !== undefined
                ? `${(payload.confidence * 100).toFixed(0)}%`
                : 'N/A'}
            </div>
          </div>

          {/* Heart Rate */}
          <div style={{
            background: '#00000044',
            padding: '8px',
            borderRadius: '5px'
          }}>
            <span style={{ color: '#888' }}>Heart Rate:</span>
            <span style={{
              float: 'right',
              color: payload.heart_rate > 150 ? '#ff0000' : '#fff',
              fontWeight: payload.heart_rate > 150 ? 'bold' : 'normal'
            }}>
              {payload.heart_rate || 'N/A'} BPM
            </span>
          </div>

          {/* Microsleeps */}
          <div style={{
            background: '#00000044',
            padding: '8px',
            borderRadius: '5px'
          }}>
            <span style={{ color: '#888' }}>Microsleeps:</span>
            <span style={{
              float: 'right',
              color: payload.microsleep_count > 0 ? '#ff0000' : '#00ff00',
              fontWeight: payload.microsleep_count > 0 ? 'bold' : 'normal'
            }}>
              {payload.microsleep_count !== null && payload.microsleep_count !== undefined
                ? payload.microsleep_count
                : 'N/A'}
            </span>
          </div>
        </div>
      ) : (
        /* Environmental/Flight metrics when no pilot */
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          fontSize: '12px'
        }}>
          {/* Temperature */}
          <div style={{
            background: '#00000044',
            padding: '8px',
            borderRadius: '5px',
            textAlign: 'center'
          }}>
            <div style={{ color: '#888', marginBottom: '5px' }}>Temperature</div>
            <div style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#00aaff'
            }}>
              {payload.temperature !== null && payload.temperature !== undefined
                ? `${payload.temperature}°C`
                : 'N/A'}
            </div>
          </div>

          {/* Altitude */}
          <div style={{
            background: '#00000044',
            padding: '8px',
            borderRadius: '5px',
            textAlign: 'center'
          }}>
            <div style={{ color: '#888', marginBottom: '5px' }}>Altitude</div>
            <div style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#ffaa00'
            }}>
              {payload.altitude !== null && payload.altitude !== undefined
                ? `${payload.altitude}m`
                : 'N/A'}
            </div>
          </div>

          {/* Humidity */}
          <div style={{
            background: '#00000044',
            padding: '8px',
            borderRadius: '5px'
          }}>
            <span style={{ color: '#888' }}>Humidity:</span>
            <span style={{
              float: 'right',
              color: '#00ff88',
              fontWeight: 'bold'
            }}>
              {payload.humidity !== null && payload.humidity !== undefined
                ? `${payload.humidity}%`
                : 'N/A'}
            </span>
          </div>

          {/* Pressure */}
          <div style={{
            background: '#00000044',
            padding: '8px',
            borderRadius: '5px'
          }}>
            <span style={{ color: '#888' }}>Pressure:</span>
            <span style={{
              float: 'right',
              color: '#aa00ff',
              fontWeight: 'bold'
            }}>
              {payload.pressure !== null && payload.pressure !== undefined
                ? `${payload.pressure} hPa`
                : 'N/A'}
            </span>
          </div>
        </div>
      )}

      {/* ML Reasoning - Only show if pilot is detected */}
      {pilotDetected && mlAnalysis && mlAnalysis.reasoning && mlAnalysis.reasoning.length > 0 && (
        <div style={{
          borderTop: '1px solid #333',
          paddingTop: '8px',
          marginTop: '5px',
          fontSize: '11px',
          color: '#FFD700',
          fontStyle: 'italic'
        }}>
          <div style={{ marginBottom: '3px', color: '#888' }}>ML Analysis:</div>
          {mlAnalysis.reasoning.map((reason, idx) => (
            <div key={idx} style={{
              padding: '2px 0',
              color: mlAnalysis.immediate_action_required ? '#ff0000' : '#00ff00'
            }}>
              • {reason}
            </div>
          ))}
        </div>
      )}

      {/* Criticality Score */}
      <div style={{
        borderTop: '1px solid #333',
        paddingTop: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '11px'
      }}>
        <span style={{ color: '#666' }}>
          Criticality: {criticality.toFixed(2)}
        </span>
        <span style={{ color: '#666' }}>
          {payload.flight_id ? `Flight: ${payload.flight_id}` : 'No Active Flight'}
        </span>
      </div>
    </div>
  )
}

// Detailed View Component with full flight monitoring dashboard
function EdgeNodeDetailedView({ nodeData, onClose }) {
  const payload = nodeData?.payload || {}
  const [fusionScoreHistory, setFusionScoreHistory] = useState(nodeData.fusionHistory || [])
  const mlAnalysis = nodeData?.mlAnalysis || null
  const pilotDetected = hasPilotData(payload)

  // Update fusion score history whenever nodeData changes (live updates)
  useEffect(() => {
    if (nodeData.fusionHistory) {
      setFusionScoreHistory(nodeData.fusionHistory)
    }
  }, [nodeData.fusionHistory, nodeData.payload])

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: '#0a0a0a',
      zIndex: 1000,
      overflow: 'auto'
    }}>
      <div style={{
        width: '100%',
        minHeight: '100%',
        padding: '15px',
        boxSizing: 'border-box'
      }}>
        {/* Header with close button */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '15px',
          borderBottom: '2px solid #333',
          paddingBottom: '10px'
        }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '22px',
              background: 'linear-gradient(135deg, #00ffff 0%, #0080ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              {nodeData.edge_username || 'Unknown Node'} - Flight Monitor
            </h1>
            <div style={{
              display: 'flex',
              gap: '15px',
              alignItems: 'center',
              marginTop: '10px'
            }}>
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
                  background: payload.system_state === 'alert_high' ? '#ff000022' :
                             payload.system_state === 'alert_moderate' ? '#FFA50022' : '#00ff0022',
                  border: `1px solid ${payload.system_state === 'alert_high' ? '#ff0000' :
                                       payload.system_state === 'alert_moderate' ? '#FFA500' : '#00ff00'}`,
                  borderRadius: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: payload.system_state === 'alert_high' ? '#ff0000' :
                               payload.system_state === 'alert_moderate' ? '#FFA500' : '#00ff00',
                    animation: 'pulse 2s infinite'
                  }} />
                  {payload.system_state.replace(/_/g, ' ').toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: '#ff0000',
              color: '#fff',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'background 0.3s'
            }}
            onMouseEnter={e => e.target.style.background = '#cc0000'}
            onMouseLeave={e => e.target.style.background = '#ff0000'}
          >
            Close
          </button>
        </div>

        {/* Full flight monitoring dashboard */}
        <div>
          {/* Pilot Monitoring Section - Only show when pilot detected */}
          {pilotDetected && (
            <>
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
                  <FusionScoreGraph history={fusionScoreHistory} />
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
                          color: payload.fusion_score < 0.25 ? '#00ff00' :
                                 payload.fusion_score < 0.50 ? '#FFD700' :
                                 payload.fusion_score < 0.75 ? '#FFA500' : '#FF0000',
                          fontWeight: 'bold',
                          fontSize: '24px'
                        }}>
                          {(payload.fusion_score * 100).toFixed(1)}%
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
            </>
          )}

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

            {/* Cardiovascular Vitals - Only show when pilot detected */}
            {pilotDetected && (
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
            )}

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

            {/* Environment */}
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

          {/* ML Engine Analysis Card - Only show if pilot is detected */}
          {pilotDetected && mlAnalysis && (
            <div style={{
              background: 'linear-gradient(135deg, #1a1a2e22 0%, #16213e22 100%)',
              padding: '15px',
              borderRadius: '10px',
              border: mlAnalysis.immediate_action_required ? '2px solid #ff0000' : '1px solid #333',
              marginBottom: '20px',
              boxShadow: mlAnalysis.immediate_action_required ? '0 0 20px rgba(255, 0, 0, 0.3)' : 'none'
            }}>
              <h3 style={{
                color: '#00ffff',
                marginBottom: '15px',
                marginTop: '5px',
                textAlign: 'center',
                fontSize: '16px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '10px'
              }}>
                ML ENGINE ANALYSIS
                {mlAnalysis.immediate_action_required && (
                  <span style={{
                    fontSize: '12px',
                    padding: '4px 12px',
                    background: '#ff000022',
                    border: '1px solid #ff0000',
                    borderRadius: '5px',
                    color: '#ff0000',
                    fontWeight: 'bold',
                    animation: 'pulse 2s infinite'
                  }}>
                    ⚠ IMMEDIATE ACTION REQUIRED
                  </span>
                )}
              </h3>

              {/* Top Row: Key Metrics */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '10px',
                marginBottom: '15px'
              }}>
                <div style={{
                  padding: '10px',
                  background: '#00000044',
                  borderRadius: '5px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: '#888', fontSize: '12px', marginBottom: '5px' }}>Confidence</div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: mlAnalysis.confidence >= 0.8 ? '#00ff00' : mlAnalysis.confidence >= 0.5 ? '#FFD700' : '#FFA500'
                  }}>
                    {(mlAnalysis.confidence * 100).toFixed(0)}%
                  </div>
                </div>

                <div style={{
                  padding: '10px',
                  background: '#00000044',
                  borderRadius: '5px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: '#888', fontSize: '12px', marginBottom: '5px' }}>Criticality</div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: mlAnalysis.criticality === 'critical' ? '#ff0000' :
                           mlAnalysis.criticality === 'high' ? '#FFA500' :
                           mlAnalysis.criticality === 'elevated' ? '#FFD700' : '#00ff00'
                  }}>
                    {mlAnalysis.criticality ? mlAnalysis.criticality.toUpperCase() : 'N/A'}
                  </div>
                </div>

                <div style={{
                  padding: '10px',
                  background: '#00000044',
                  borderRadius: '5px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: '#888', fontSize: '12px', marginBottom: '5px' }}>Fusion Score</div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: mlAnalysis.fusion_score >= 0.75 ? '#ff0000' :
                           mlAnalysis.fusion_score >= 0.50 ? '#FFA500' :
                           mlAnalysis.fusion_score >= 0.25 ? '#FFD700' : '#00ff00'
                  }}>
                    {mlAnalysis.fusion_score !== null && mlAnalysis.fusion_score !== undefined
                      ? `${(mlAnalysis.fusion_score * 100).toFixed(0)}%`
                      : 'N/A'}
                  </div>
                </div>

                <div style={{
                  padding: '10px',
                  background: '#00000044',
                  borderRadius: '5px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: '#888', fontSize: '12px', marginBottom: '5px' }}>Data Age</div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: mlAnalysis.data_age_seconds > 60 ? '#FFA500' : mlAnalysis.data_age_seconds > 120 ? '#ff0000' : '#00ff00'
                  }}>
                    {mlAnalysis.data_age_seconds !== null && mlAnalysis.data_age_seconds !== undefined
                      ? `${mlAnalysis.data_age_seconds.toFixed(1)}s`
                      : 'N/A'}
                  </div>
                  <div style={{ color: '#666', fontSize: '10px', marginTop: '3px' }}>
                    {payload.collection_time && `Live: ${Math.floor((Date.now() / 1000) - payload.collection_time)}s ago`}
                  </div>
                </div>
              </div>

              {/* Reasoning Section */}
              {mlAnalysis.reasoning && mlAnalysis.reasoning.length > 0 && (
                <div style={{
                  background: '#00000044',
                  padding: '12px',
                  borderRadius: '5px',
                  marginBottom: '15px',
                  border: '1px solid #333'
                }}>
                  <div style={{
                    color: '#00ffff',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    marginBottom: '10px'
                  }}>
                    REASONING:
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px'
                  }}>
                    {mlAnalysis.reasoning.map((reason, idx) => (
                      <div key={idx} style={{
                        padding: '5px 10px',
                        background: mlAnalysis.immediate_action_required ? '#ff000011' : '#00ff0011',
                        borderLeft: `3px solid ${mlAnalysis.immediate_action_required ? '#ff0000' : '#00ff00'}`,
                        color: '#fff',
                        fontSize: '13px'
                      }}>
                        • {reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trend Summary */}
              {mlAnalysis.trend_summary && (
                <div style={{
                  background: '#00000044',
                  padding: '12px',
                  borderRadius: '5px',
                  border: '1px solid #333'
                }}>
                  <div style={{
                    color: '#00ffff',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    marginBottom: '10px'
                  }}>
                    TREND SUMMARY:
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '10px'
                  }}>
                    {Object.entries(mlAnalysis.trend_summary).map(([key, value]) => {
                      const isPositive = value && typeof value === 'string' && value.startsWith('+')
                      const isNegative = value && typeof value === 'string' && value.startsWith('-')
                      return (
                        <div key={key} style={{
                          padding: '8px',
                          background: '#00000066',
                          borderRadius: '5px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span style={{ color: '#888', fontSize: '12px' }}>
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                          </span>
                          <span style={{
                            color: isPositive ? '#ff6666' : isNegative ? '#66ff66' : '#fff',
                            fontWeight: 'bold',
                            fontSize: '13px'
                          }}>
                            {value}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Analysis Metadata */}
              <div style={{
                marginTop: '15px',
                fontSize: '11px',
                color: '#666'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <div>
                    Status: <span style={{ color: mlAnalysis.successful ? '#00ff00' : '#ff0000', fontWeight: 'bold' }}>
                      {mlAnalysis.successful ? 'SUCCESS' : 'FAILED'}
                    </span>
                  </div>
                  {mlAnalysis.timestamp && (
                    <div>
                      Analysis Time: {new Date(mlAnalysis.timestamp).toLocaleString()}
                    </div>
                  )}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: '#555',
                  fontStyle: 'italic',
                  paddingTop: '5px',
                  borderTop: '1px solid #333'
                }}>
                  Note: ML Engine reads from InfluxDB. "Data Age" reflects database latency, while "Live" shows MQTT stream age.
                </div>
              </div>
            </div>
          )}

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
      </div>
    </div>
  )
}

// Main Dashboard Component
function EdgeNodeDashboardApp() {
  const client = useStreamClient()
  const [edgeNodes, setEdgeNodes] = useState({})
  const [selectedNode, setSelectedNode] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const mqttCommandHandleRef = useRef(null)
  const mlClientRef = useRef(null)
  const mlAnalysisInProgressRef = useRef({}) // Track which nodes are currently being analyzed
  const { addNotification } = useSystem()

  // Initialize ML analysis client
  useEffect(() => {
    const mlClient = new PipeCmdClient()
    mlClient.connect()
    mlClientRef.current = mlClient

    return () => {
      if (mlClientRef.current) {
        mlClientRef.current.disconnect().catch(err => console.error('Failed to disconnect ML client:', err))
      }
    }
  }, [])

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
            payload: {},
            timestamp: null,
            isStreaming: false,
            fusionHistory: [],
            lastUpdate: null
          }
        })

        setEdgeNodes(initialNodes)
      } catch (error) {
        console.error('Failed to load edge nodes list:', error)
        addNotification('Failed to load edge nodes list', 'error')
      }
    }

    loadEdgeNodesList()
  }, [client, addNotification])

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
            const nodeId = yamlDoc.edge_username

            setEdgeNodes(prev => {
              const updated = { ...prev }

              // Initialize or update node data
              if (!updated[nodeId]) {
                // New node discovered via MQTT (not in edge-nodes list)
                updated[nodeId] = {
                  edge_username: nodeId,
                  payload: yamlDoc.payload || {},
                  timestamp: yamlDoc.timestamp,
                  isStreaming: true,
                  fusionHistory: [],
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

              // Track fusion score history
              if (yamlDoc.payload && yamlDoc.payload.fusion_score !== null && yamlDoc.payload.confidence !== null) {
                updated[nodeId].fusionHistory = [
                  ...(updated[nodeId].fusionHistory || []),
                  {
                    fusion_score: yamlDoc.payload.fusion_score,
                    confidence: yamlDoc.payload.confidence
                  }
                ].slice(-120) // Keep last 120 points
              }

              return updated
            })

            // Trigger ML analysis only when pilot data is detected
            if (yamlDoc.payload && hasPilotData(yamlDoc.payload)) {
              // Only analyze nodes that have active pilot monitoring with vision or heart rate data
              fetchMLAnalysis(nodeId)
            }
          }
        }
      } catch (error) {
        console.error('Failed to start MQTT streaming:', error)
        addNotification('Failed to connect to edge nodes stream', 'error')
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
  }, [client, addNotification])

  // Calculate criticality and sort nodes (memoized to prevent unnecessary recalculations)
  const sortedNodes = useMemo(() => {
    return Object.values(edgeNodes).map(node => {
      const fusionScore = node.payload?.fusion_score || 0
      const confidence = node.payload?.confidence || 0
      const criticality = fusionScore * confidence
      return { ...node, criticality }
    }).sort((a, b) => b.criticality - a.criticality)
  }, [edgeNodes])

  // Update selected node with live data if it's currently being viewed
  useEffect(() => {
    if (selectedNode?.edge_username && edgeNodes[selectedNode.edge_username]) {
      setSelectedNode(edgeNodes[selectedNode.edge_username])
    }
  }, [edgeNodes, selectedNode?.edge_username])

  // Fetch ML analysis for a specific edge node
  const fetchMLAnalysis = useCallback(async (edgeUsername) => {
    if (!mlClientRef.current) {
      console.log(`[ML Analysis] ML client not ready yet`)
      return
    }

    // Prevent multiple simultaneous requests for the same node
    if (mlAnalysisInProgressRef.current[edgeUsername]) {
      console.log(`[ML Analysis] Analysis already in progress for ${edgeUsername}, skipping`)
      return
    }

    mlAnalysisInProgressRef.current[edgeUsername] = true

    try {
      console.log(`[ML Analysis] Fetching analysis for ${edgeUsername}...`)
      const result = await mlClientRef.current.run_command(`ml-rpc analyze_edge_fatigue --edge_username ${edgeUsername}`)

      console.log(`[ML Analysis] ${edgeUsername} - Exit code: ${result.command_result}`)
      if (result.error) {
        console.log(`[ML Analysis] ${edgeUsername} - Stderr:`, result.error)
      }

      if (result.command_result === 0 && result.output.trim().length > 0) {
        try {
          const analysis = parse(result.output)
          console.log(`[ML Analysis] ${edgeUsername} - Parsed result:`, analysis)

          setEdgeNodes(prev => {
            const updated = { ...prev }
            if (updated[edgeUsername]) {
              updated[edgeUsername] = {
                ...updated[edgeUsername],
                mlAnalysis: analysis
              }
            }
            return updated
          })
        } catch (parseError) {
          console.error(`[ML Analysis] Failed to parse for ${edgeUsername}:`, parseError)
          console.error(`[ML Analysis] Raw output:`, result.output)
        }
      } else {
        console.log(`[ML Analysis] ${edgeUsername} - No valid output (result=${result.command_result}, output length=${result.output.length})`)
      }
    } catch (error) {
      console.error(`[ML Analysis] Failed to fetch for ${edgeUsername}:`, error)
    } finally {
      // Always clear the in-progress flag when done
      mlAnalysisInProgressRef.current[edgeUsername] = false
    }
  }, [])

  // Note: ML analysis is now triggered reactively when MQTT data arrives
  // See the MQTT streaming effect above where fetchMLAnalysis is called

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#0a0a0a',
      color: '#fff',
      padding: '20px',
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
        marginBottom: '20px',
        borderBottom: '2px solid #333',
        paddingBottom: '15px'
      }}>
        <h1 style={{
          margin: '0 0 10px 0',
          fontSize: '28px',
          background: 'linear-gradient(135deg, #00ffff 0%, #0080ff 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Edge Node Dashboard
        </h1>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{
            fontSize: '14px',
            color: '#888'
          }}>
            Active Nodes: <span style={{ color: '#00ffff', fontWeight: 'bold' }}>
              {Object.values(edgeNodes).filter(n => n.isStreaming).length}
            </span> / {Object.keys(edgeNodes).length}
          </div>
          <div style={{
            padding: '5px 15px',
            background: isConnected ? '#00ff0022' : '#ff000022',
            border: `2px solid ${isConnected ? '#00ff00' : '#ff0000'}`,
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </div>
        </div>
      </div>

      {/* Grid of Edge Nodes */}
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
            <div>Connecting to edge nodes...</div>
          </div>
        </div>
      ) : sortedNodes.length === 0 ? (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '400px',
          color: '#888'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', marginBottom: '10px' }}>No edge nodes detected</div>
            <div style={{ fontSize: '14px' }}>Waiting for edge node connections...</div>
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          {sortedNodes.map((node) => (
            <EdgeNodeCard
              key={node.edge_username}
              nodeData={node}
              criticality={node.criticality}
              onClick={() => setSelectedNode(node)}
            />
          ))}
        </div>
      )}

      {/* Detailed View */}
      {selectedNode && (
        <EdgeNodeDetailedView
          nodeData={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  )
}

export default EdgeNodeDashboardApp