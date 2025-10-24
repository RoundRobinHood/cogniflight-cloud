import { createPortal } from 'react-dom'

// Intruder Alert Component - Global Alert for Intruder Detection
function IntruderAlert({ nodeData, onDismiss, onViewDetails }) {
  if (!nodeData) return null

  const payload = nodeData?.payload || {}

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.95)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      animation: 'fadeIn 0.3s ease-in'
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
          20%, 40%, 60%, 80% { transform: translateX(10px); }
        }
        @keyframes flashRed {
          0%, 100% { background: rgba(255, 0, 0, 0.2); }
          50% { background: rgba(255, 0, 0, 0.4); }
        }
      `}</style>

      <div style={{
        background: 'linear-gradient(135deg, #1a0000 0%, #330000 100%)',
        border: '4px solid #ff0000',
        borderRadius: '20px',
        padding: '40px',
        maxWidth: '700px',
        width: '90%',
        boxShadow: '0 0 50px rgba(255, 0, 0, 0.8), 0 0 100px rgba(255, 0, 0, 0.5)',
        animation: 'shake 0.5s ease-in-out, flashRed 2s infinite',
        position: 'relative'
      }}>
        {/* Alert Icon */}
        <div style={{
          textAlign: 'center',
          fontSize: '100px',
          marginBottom: '20px',
          animation: 'pulse 1.5s infinite'
        }}>
          🚨
        </div>

        {/* Main Alert Text */}
        <h1 style={{
          margin: '0 0 20px 0',
          fontSize: '48px',
          color: '#ff0000',
          textAlign: 'center',
          fontWeight: 'bold',
          textShadow: '0 0 20px rgba(255, 0, 0, 0.8)',
          letterSpacing: '2px'
        }}>
          ⚠ TSOTSI DETECTED ⚠
        </h1>

        {/* Subtitle */}
        <div style={{
          textAlign: 'center',
          fontSize: '20px',
          color: '#ffaaaa',
          marginBottom: '30px',
          fontWeight: 'bold'
        }}>
          UNAUTHORIZED INTRUDER DETECTED
        </div>

        {/* Edge Node Details */}
        <div style={{
          background: '#00000066',
          border: '2px solid #ff0000',
          borderRadius: '10px',
          padding: '20px',
          marginBottom: '30px'
        }}>
          <h3 style={{
            margin: '0 0 15px 0',
            color: '#ff6666',
            fontSize: '18px',
            borderBottom: '1px solid #ff000066',
            paddingBottom: '10px'
          }}>
            EDGE NODE DETAILS
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '15px',
            fontSize: '14px'
          }}>
            <div>
              <div style={{ color: '#888', marginBottom: '5px' }}>Edge Node:</div>
              <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '16px' }}>
                {nodeData.edge_username || 'Unknown'}
              </div>
            </div>

            <div>
              <div style={{ color: '#888', marginBottom: '5px' }}>Status:</div>
              <div style={{ color: '#ff0000', fontWeight: 'bold', fontSize: '16px' }}>
                {payload.system_state ? payload.system_state.toUpperCase() : 'INTRUDER_DETECTED'}
              </div>
            </div>

            <div>
              <div style={{ color: '#888', marginBottom: '5px' }}>Pilot:</div>
              <div style={{ color: '#fff', fontWeight: 'bold' }}>
                {payload.pilot_username || 'N/A'}
              </div>
            </div>

            <div>
              <div style={{ color: '#888', marginBottom: '5px' }}>Flight ID:</div>
              <div style={{ color: '#fff', fontWeight: 'bold' }}>
                {payload.flight_id || 'N/A'}
              </div>
            </div>

            <div>
              <div style={{ color: '#888', marginBottom: '5px' }}>Location:</div>
              <div style={{ color: '#fff', fontWeight: 'bold' }}>
                {payload.altitude ? `${payload.altitude}m altitude` : 'N/A'}
              </div>
            </div>

            <div>
              <div style={{ color: '#888', marginBottom: '5px' }}>Detection Time:</div>
              <div style={{ color: '#fff', fontWeight: 'bold' }}>
                {payload.collection_time
                  ? new Date(payload.collection_time * 1000).toLocaleTimeString()
                  : 'N/A'}
              </div>
            </div>
          </div>

          {/* Additional Critical Info */}
          {(payload.temperature || payload.heart_rate) && (
            <div style={{
              marginTop: '15px',
              paddingTop: '15px',
              borderTop: '1px solid #ff000066'
            }}>
              <div style={{ color: '#888', marginBottom: '10px', fontSize: '12px' }}>
                ADDITIONAL TELEMETRY:
              </div>
              <div style={{
                display: 'flex',
                gap: '20px',
                flexWrap: 'wrap',
                fontSize: '13px'
              }}>
                {payload.heart_rate && (
                  <div>
                    <span style={{ color: '#888' }}>Heart Rate: </span>
                    <span style={{ color: '#ff6666', fontWeight: 'bold' }}>
                      {payload.heart_rate} BPM
                    </span>
                  </div>
                )}
                {payload.temperature && (
                  <div>
                    <span style={{ color: '#888' }}>Temperature: </span>
                    <span style={{ color: '#fff', fontWeight: 'bold' }}>
                      {payload.temperature}°C
                    </span>
                  </div>
                )}
                {payload.pressure && (
                  <div>
                    <span style={{ color: '#888' }}>Pressure: </span>
                    <span style={{ color: '#fff', fontWeight: 'bold' }}>
                      {payload.pressure} hPa
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '15px',
          justifyContent: 'center'
        }}>
          <button
            onClick={onViewDetails}
            style={{
              padding: '15px 30px',
              background: '#ff0000',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 0 20px rgba(255, 0, 0, 0.5)'
            }}
            onMouseEnter={e => {
              e.target.style.background = '#cc0000'
              e.target.style.transform = 'scale(1.05)'
            }}
            onMouseLeave={e => {
              e.target.style.background = '#ff0000'
              e.target.style.transform = 'scale(1)'
            }}
          >
            VIEW FULL DETAILS
          </button>

          <button
            onClick={onDismiss}
            style={{
              padding: '15px 30px',
              background: '#333',
              color: '#fff',
              border: '2px solid #666',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseEnter={e => {
              e.target.style.background = '#444'
              e.target.style.borderColor = '#888'
            }}
            onMouseLeave={e => {
              e.target.style.background = '#333'
              e.target.style.borderColor = '#666'
            }}
          >
            DISMISS
          </button>
        </div>

        {/* Warning Message */}
        <div style={{
          marginTop: '20px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#ff6666',
          fontStyle: 'italic'
        }}>
          ⚠ This alert indicates unauthorized access detected by the edge node
        </div>
      </div>
    </div>,
    document.body
  )
}

export default IntruderAlert
