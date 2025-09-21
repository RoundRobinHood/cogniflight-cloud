import { AlertTriangle, Shield, X, Users, Activity, Clock } from 'lucide-react'

const FATCON_ACTIONS = {
  5: [
    'Standard monitoring protocols active',
    'Routine data collection in progress',
    'Normal flight operations continue'
  ],
  4: [
    'Increased monitoring frequency initiated',
    'Advisory notifications sent to supervisors',
    'Enhanced crew observation protocols'
  ],
  3: [
    'Enhanced screening protocols activated',
    'Crew rotation schedules under review',
    'Fatigue countermeasures deployed',
    'Shift supervisors notified'
  ],
  2: [
    'Mandatory rest periods enforced',
    'Backup crew activation initiated',
    'Flight schedule adjustments in progress',
    'Medical team on standby'
  ],
  1: [
    'IMMEDIATE: Operations suspension protocols',
    'Emergency crew replacement initiated',
    'Flight safety intervention activated',
    'Command center notification sent'
  ]
}

function FatconAlert({ isOpen, onClose, levelData, previousLevel, newLevel }) {
  if (!isOpen || !levelData) return null

  const IconComponent = levelData.icon
  const isEscalation = newLevel < previousLevel
  const actions = FATCON_ACTIONS[newLevel] || []

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fatcon-alert-backdrop"
        onClick={onClose}
      />
      
      {/* Alert Dialog */}
      <div className="fatcon-alert-dialog">
        {/* Header */}
        <div className="fatcon-alert-header" style={{ backgroundColor: levelData.bgColor, borderColor: levelData.color }}>
          <div className="fatcon-alert-icon" style={{ color: levelData.color }}>
            <IconComponent size={24} />
          </div>
          <div className="fatcon-alert-title">
            <h2 style={{ color: levelData.color }}>{levelData.name}</h2>
            <p className="fatcon-alert-status">{levelData.status}</p>
          </div>
          <button 
            className="fatcon-alert-close"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="fatcon-alert-content">
          {isEscalation && (
            <div className="fatcon-alert-escalation">
              <AlertTriangle size={16} />
              <span>FATCON Level Escalated from {previousLevel} to {newLevel}</span>
            </div>
          )}

          <div className="fatcon-alert-description">
            <h3>Situation Status</h3>
            <p>{levelData.description}</p>
          </div>

          <div className="fatcon-alert-triggers">
            <h3>Trigger Conditions</h3>
            <div className="fatcon-alert-metrics">
              <div className="fatcon-metric">
                <Users size={16} />
                <span>Pilot Fatigue Range: {levelData.triggerRange[0]}% - {levelData.triggerRange[1]}%</span>
              </div>
              <div className="fatcon-metric">
                <Activity size={16} />
                <span>Current Monitoring: Active</span>
              </div>
              <div className="fatcon-metric">
                <Clock size={16} />
                <span>Response Time: Immediate</span>
              </div>
            </div>
          </div>

          <div className="fatcon-alert-actions">
            <h3>Active Response Protocols</h3>
            <ul className="fatcon-actions-list">
              {actions.map((action, index) => (
                <li key={index} className={action.startsWith('IMMEDIATE') ? 'fatcon-action-critical' : ''}>
                  {action}
                </li>
              ))}
            </ul>
          </div>

          <div className="fatcon-alert-footer">
            <div className="fatcon-alert-timestamp">
              Alert Generated: {new Date().toLocaleString()}
            </div>
            <button 
              className="fatcon-acknowledge-btn"
              onClick={onClose}
              style={{ backgroundColor: levelData.color }}
            >
              Acknowledge Alert
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default FatconAlert