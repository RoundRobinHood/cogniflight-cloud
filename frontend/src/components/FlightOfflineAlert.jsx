import { createPortal } from 'react-dom'
import { useState } from 'react'

// Flight Offline Alert Component - Prompt to finish offline flights
function FlightOfflineAlert({ flightData, onFinishFlight, onDismiss }) {
  const [isFinishing, setIsFinishing] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  if (!flightData) return null

  const handleFinish = async () => {
    setIsFinishing(true)
    setErrorMessage(null) // Clear any previous error
    try {
      await onFinishFlight(flightData.flight_id)
      // Success - parent will close the alert
    } catch (error) {
      console.error('Failed to finish flight:', error)
      setErrorMessage(error.message || 'Unknown error occurred')
      setIsFinishing(false)
    }
  }

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.92)',
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
        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>

      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        border: '3px solid #ffa500',
        borderRadius: '20px',
        padding: '40px',
        maxWidth: '600px',
        width: '90%',
        boxShadow: '0 0 40px rgba(255, 165, 0, 0.5), 0 0 80px rgba(255, 165, 0, 0.3)',
        animation: 'slideIn 0.4s ease-out',
        position: 'relative'
      }}>
        {/* Alert Icon */}
        <div style={{
          textAlign: 'center',
          fontSize: '80px',
          marginBottom: '20px',
          animation: 'pulse 2s infinite'
        }}>
          ✈️
        </div>

        {/* Main Alert Text */}
        <h1 style={{
          margin: '0 0 15px 0',
          fontSize: '32px',
          color: '#ffa500',
          textAlign: 'center',
          fontWeight: 'bold',
          textShadow: '0 0 15px rgba(255, 165, 0, 0.6)'
        }}>
          Flight Connection Lost
        </h1>

        {/* Subtitle */}
        <div style={{
          textAlign: 'center',
          fontSize: '16px',
          color: '#aaa',
          marginBottom: '30px',
          fontWeight: '500'
        }}>
          Edge node has stopped streaming data for over 30 seconds
        </div>

        {/* Flight Details */}
        <div style={{
          background: '#00000044',
          border: '2px solid #ffa50066',
          borderRadius: '12px',
          padding: '25px',
          marginBottom: '30px'
        }}>
          <h3 style={{
            margin: '0 0 18px 0',
            color: '#ffa500',
            fontSize: '16px',
            borderBottom: '1px solid #ffa50044',
            paddingBottom: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Flight Details
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '15px',
            fontSize: '14px'
          }}>
            <div>
              <div style={{ color: '#888', marginBottom: '6px', fontSize: '12px' }}>Flight ID:</div>
              <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '16px' }}>
                {flightData.flight_id || 'N/A'}
              </div>
            </div>

            <div>
              <div style={{ color: '#888', marginBottom: '6px', fontSize: '12px' }}>Edge Node:</div>
              <div style={{ color: '#00ffff', fontWeight: 'bold', fontSize: '16px' }}>
                {flightData.edge_username || 'Unknown'}
              </div>
            </div>

            <div>
              <div style={{ color: '#888', marginBottom: '6px', fontSize: '12px' }}>Pilot:</div>
              <div style={{ color: '#fff', fontWeight: 'bold' }}>
                {flightData.pilot_username || 'N/A'}
              </div>
            </div>

            <div>
              <div style={{ color: '#888', marginBottom: '6px', fontSize: '12px' }}>Last Seen:</div>
              <div style={{ color: '#ff6666', fontWeight: 'bold' }}>
                {flightData.lastUpdate
                  ? `${Math.floor((Date.now() - flightData.lastUpdate) / 1000)}s ago`
                  : 'N/A'}
              </div>
            </div>

            {flightData.lastPayload?.altitude && (
              <div>
                <div style={{ color: '#888', marginBottom: '6px', fontSize: '12px' }}>Last Altitude:</div>
                <div style={{ color: '#fff', fontWeight: 'bold' }}>
                  {flightData.lastPayload.altitude}m
                </div>
              </div>
            )}

            {flightData.lastPayload?.temperature && (
              <div>
                <div style={{ color: '#888', marginBottom: '6px', fontSize: '12px' }}>Last Temperature:</div>
                <div style={{ color: '#fff', fontWeight: 'bold' }}>
                  {flightData.lastPayload.temperature}°C
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Question Text */}
        <div style={{
          textAlign: 'center',
          fontSize: '18px',
          color: '#fff',
          marginBottom: '25px',
          fontWeight: '500'
        }}>
          Has this flight finished?
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div style={{
            background: '#ff000022',
            border: '2px solid #ff0000',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <div style={{
              color: '#ff6666',
              fontSize: '14px',
              fontWeight: 'bold',
              marginBottom: '5px'
            }}>
              ⚠ Error
            </div>
            <div style={{
              color: '#ffaaaa',
              fontSize: '13px',
              lineHeight: '1.4'
            }}>
              {errorMessage}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '15px',
          justifyContent: 'center'
        }}>
          <button
            onClick={handleFinish}
            disabled={isFinishing}
            style={{
              padding: '15px 35px',
              background: isFinishing ? '#666' : '#22c55e',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isFinishing ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              boxShadow: isFinishing ? 'none' : '0 0 20px rgba(34, 197, 94, 0.4)',
              opacity: isFinishing ? 0.7 : 1
            }}
            onMouseEnter={e => {
              if (!isFinishing) {
                e.target.style.background = '#16a34a'
                e.target.style.transform = 'scale(1.05)'
              }
            }}
            onMouseLeave={e => {
              if (!isFinishing) {
                e.target.style.background = '#22c55e'
                e.target.style.transform = 'scale(1)'
              }
            }}
          >
            {isFinishing ? 'Finishing Flight...' : '✓ Yes, Finish Flight'}
          </button>

          <button
            onClick={onDismiss}
            disabled={isFinishing}
            style={{
              padding: '15px 35px',
              background: '#333',
              color: '#fff',
              border: '2px solid #666',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isFinishing ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              opacity: isFinishing ? 0.5 : 1
            }}
            onMouseEnter={e => {
              if (!isFinishing) {
                e.target.style.background = '#444'
                e.target.style.borderColor = '#888'
              }
            }}
            onMouseLeave={e => {
              if (!isFinishing) {
                e.target.style.background = '#333'
                e.target.style.borderColor = '#666'
              }
            }}
          >
            Not Yet
          </button>
        </div>

        {/* Info Message */}
        <div style={{
          marginTop: '25px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#888',
          fontStyle: 'italic',
          lineHeight: '1.5'
        }}>
          This prompt appears when a flight stops streaming data for more than 30 seconds.
          <br />
          Click "Finish Flight" to mark this flight as completed.
        </div>
      </div>
    </div>,
    document.body
  )
}

export default FlightOfflineAlert
