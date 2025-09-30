import { useState, useEffect, useRef } from 'react'
import { AlertTriangle, Shield, User } from 'lucide-react'
import { useSystem } from './useSystem'

// FATCON System Configuration
const FATCON_LEVELS = {
  5: {
    level: 5,
    name: 'FATCON 5',
    status: 'Minimal Risk',
    description: 'Normal operations, baseline fatigue levels',
    triggerRange: [0, 5],
    color: '#22c55e', // Green
    bgColor: 'rgba(34, 197, 94, 0.1)',
    icon: Shield
  },
  4: {
    level: 4,
    name: 'FATCON 4',
    status: 'Low Risk',
    description: 'Slightly elevated fatigue detection',
    triggerRange: [6, 15],
    color: '#3b82f6', // Blue
    bgColor: 'rgba(59, 130, 246, 0.1)',
    icon: Shield
  },
  3: {
    level: 3,
    name: 'FATCON 3',
    status: 'Moderate Risk',
    description: 'Notable fatigue patterns detected',
    triggerRange: [16, 30],
    color: '#eab308', // Yellow
    bgColor: 'rgba(234, 179, 8, 0.1)',
    icon: AlertTriangle
  },
  2: {
    level: 2,
    name: 'FATCON 2',
    status: 'High Risk',
    description: 'Significant operational risk',
    triggerRange: [31, 50],
    color: '#f97316', // Orange
    bgColor: 'rgba(249, 115, 22, 0.1)',
    icon: AlertTriangle
  },
  1: {
    level: 1,
    name: 'FATCON 1',
    status: 'Critical Risk',
    description: 'Immediate danger to flight safety',
    triggerRange: [51, 100],
    color: '#ef4444', // Red
    bgColor: 'rgba(239, 68, 68, 0.1)',
    icon: AlertTriangle
  }
}

function FatconWidget({ onLevelChange }) {
  const { systemState } = useSystem()
  const [currentData, setCurrentData] = useState({
    mild: 0,
    moderate: 0,
    severe: 0,
    totalFatigued: 0,
    totalPilots: 0,
    fatconLevel: 5,
    lastUpdated: new Date()
  })
  
  const previousLevel = useRef(5)

  // Calculate FATCON level based on severity and count of fatigued pilots
  const calculateFatconLevel = (mild, moderate, severe, totalPilots) => {
    if (totalPilots === 0) return 5 // Default to lowest risk if no pilots
    
    // Weight the severity levels (severe has more impact than moderate, moderate more than mild)
    const weightedFatigue = (mild * 1) + (moderate * 2) + (severe * 3)
    const maxPossibleWeight = totalPilots * 3 // If all pilots were severe
    const weightedPercentage = (weightedFatigue / maxPossibleWeight) * 100
    
    // Also consider total percentage of fatigued pilots
    const totalFatigued = mild + moderate + severe
    const totalPercentage = (totalFatigued / totalPilots) * 100
    
    // Combine weighted and total percentages (70% weight on severity, 30% on count)
    const combinedScore = (weightedPercentage * 0.7) + (totalPercentage * 0.3)
    
    for (const [level, config] of Object.entries(FATCON_LEVELS)) {
      if (combinedScore >= config.triggerRange[0] && combinedScore <= config.triggerRange[1]) {
        return parseInt(level)
      }
    }
    return 5 // Default to lowest risk
  }

  // Update FATCON data when received from socket or system state
  const updateFatconData = (data) => {
    const { mild = 0, moderate = 0, severe = 0, totalPilots = 0 } = data
    const totalFatigued = mild + moderate + severe
    const newLevel = calculateFatconLevel(mild, moderate, severe, totalPilots)
    
    setCurrentData({
      mild,
      moderate,
      severe,
      totalFatigued,
      totalPilots,
      fatconLevel: newLevel,
      lastUpdated: new Date()
    })
  }

  // Listen for FATCON updates from system state or socket
  useEffect(() => {
    // Check if system state has FATCON data
    if (systemState?.fatconData) {
      updateFatconData(systemState.fatconData)
    }
  }, [systemState?.fatconData])

  // TODO: Add socket listener for real-time FATCON updates
  // This will be implemented when socket integration is added
  // Example:
  // useEffect(() => {
  //   const handleFatconUpdate = (data) => {
  //     updateFatconData(data)
  //   }
  //   socket.on('fatcon:update', handleFatconUpdate)
  //   return () => socket.off('fatcon:update', handleFatconUpdate)
  // }, [])

  // Monitor level changes in a separate effect
  useEffect(() => {
    // Check if level changed to a more dangerous level (lower number = more dangerous)
    if (currentData.fatconLevel < previousLevel.current && onLevelChange) {
      onLevelChange(currentData.fatconLevel, previousLevel.current, FATCON_LEVELS[currentData.fatconLevel])
    }
    previousLevel.current = currentData.fatconLevel
  }, [currentData.fatconLevel, onLevelChange])

  const currentConfig = FATCON_LEVELS[currentData.fatconLevel]
  const IconComponent = currentConfig.icon

  return (
    <div className="fatcon-widget" style={{ backgroundColor: currentConfig.bgColor }}>
      <div className="fatcon-main">
        <div className="fatcon-icon" style={{ color: currentConfig.color }}>
          <IconComponent size={16} />
        </div>
        <div className="fatcon-count">
          <div className="fatcon-count-total">{currentData.totalFatigued}</div>
          {currentData.totalFatigued > 0 && (
            <div className="fatcon-count-breakdown">
              {currentData.mild > 0 && <span className="fatcon-mild">M:{currentData.mild}</span>}
              {currentData.moderate > 0 && <span className="fatcon-moderate">Mo:{currentData.moderate}</span>}
              {currentData.severe > 0 && <span className="fatcon-severe">S:{currentData.severe}</span>}
            </div>
          )}
        </div>
      </div>
      <div className="fatcon-details">
        <div className="fatcon-level" style={{ color: currentConfig.color }}>
          {currentConfig.name}
        </div>
        <div className="fatcon-status">
          {currentConfig.status}
          {currentData.totalPilots > 0 && (
            <span className="fatcon-pilot-count"> ({currentData.totalPilots} pilots)</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default FatconWidget