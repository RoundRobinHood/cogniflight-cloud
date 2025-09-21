import { useState, useEffect, useRef } from 'react'
import { AlertTriangle, Shield, User } from 'lucide-react'

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
  const [currentData, setCurrentData] = useState({
    totalPilots: 100,
    fatiguredPilots: 3,
    fatconLevel: 5,
    lastUpdated: new Date()
  })
  
  const previousLevel = useRef(5)

  // Calculate FATCON level based on percentage of fatigued pilots
  const calculateFatconLevel = (fatiguredPilots, totalPilots) => {
    const percentage = (fatiguredPilots / totalPilots) * 100
    
    for (const [level, config] of Object.entries(FATCON_LEVELS)) {
      if (percentage >= config.triggerRange[0] && percentage <= config.triggerRange[1]) {
        return parseInt(level)
      }
    }
    return 5 // Default to lowest risk
  }

  // Simulate real-time pilot fatigue monitoring
  useEffect(() => {
    const updateFatconData = () => {
      const totalPilots = Math.floor(Math.random() * 50) + 80 // 80-130 pilots
      const fatiguredPilots = Math.floor(Math.random() * Math.floor(totalPilots * 0.6)) // 0-60% can be fatigued
      const newLevel = calculateFatconLevel(fatiguredPilots, totalPilots)
      
      setCurrentData({
        totalPilots,
        fatiguredPilots,
        fatconLevel: newLevel,
        lastUpdated: new Date()
      })
    }

    // Update every 15 seconds for demonstration
    const interval = setInterval(updateFatconData, 15000)
    
    // Initial update after 3 seconds
    const initialTimeout = setTimeout(updateFatconData, 3000)
    
    return () => {
      clearInterval(interval)
      clearTimeout(initialTimeout)
    }
  }, [])

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
          {currentData.fatiguredPilots}
        </div>
      </div>
      <div className="fatcon-details">
        <div className="fatcon-level" style={{ color: currentConfig.color }}>
          {currentConfig.name}
        </div>
        <div className="fatcon-status">
          {currentConfig.status}
        </div>
      </div>
    </div>
  )
}

export default FatconWidget