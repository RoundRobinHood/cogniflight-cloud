import { useEffect, useState, useRef, useCallback } from 'react'
import { useSystem } from '../useSystem'
import { useXTerm } from 'react-xtermjs'
import { usePipeClient } from '../../api/socket.js'

function TerminalApp() {
  const { instance, ref } = useXTerm()
  const client = usePipeClient()
  const [currentDir, setCurrentDir] = useState('~')
  const [homeDir, setHomeDir] = useState('')
  const [commandHistory, setCommandHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isExecuting, setIsExecuting] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [welcomeShown, setWelcomeShown] = useState(false)
  const inputBufferRef = useRef('')
  const cursorPositionRef = useRef(0)

  const { addNotification } = useSystem()

  // Helper function to format directory path
  const formatDirectory = useCallback((dir) => {
    if (!homeDir || !dir) return dir
    return dir.startsWith(homeDir) ? dir.replace(homeDir, '~') : dir
  }, [homeDir])

  // Initialize terminal when client is available
  useEffect(() => {
    if (client && !isInitialized) {
      const initializeTerminal = async () => {
        try {
          // Get home directory first
          const homeResult = await client.run_command('echo $HOME')
          let home = ''
          if (homeResult.command_result === 0) {
            home = homeResult.output.trim()
            setHomeDir(home)
          }

          // Get initial working directory
          const pwdResult = await client.run_command('echo $PWD')
          if (pwdResult.command_result === 0) {
            const dir = pwdResult.output.trim()
            // Format directory immediately with the home we just got
            const formattedDir = home && dir.startsWith(home) ? dir.replace(home, '~') : dir
            setCurrentDir(formattedDir)
          }
          setIsInitialized(true)
        } catch (error) {
          console.error('Failed to initialize terminal:', error)
          addNotification('Failed to connect to terminal', 'error')
        }
      }

      initializeTerminal()
    }
  }, [client, isInitialized, addNotification])

  // Display prompt
  const displayPrompt = useCallback(() => {
    if (instance && !isExecuting && isInitialized) {
      const prompt = `\x1b[32m${currentDir}\x1b[0m $ `
      instance.write(prompt)
      cursorPositionRef.current = 0
      inputBufferRef.current = ''
    }
  }, [instance, currentDir, isExecuting, isInitialized])

  // Execute command
  const executeCommand = useCallback(async (command) => {
    if (!client || !instance) return

    if (command.trim() === '') {
      instance.writeln('')
      displayPrompt()
      return
    }

    setIsExecuting(true)
    instance.writeln('')

    // Add to history
    if (command.trim() !== '') {
      setCommandHistory(prev => [...prev, command.trim()])
      setHistoryIndex(-1)
    }

    try {
      // Handle built-in commands
      if (command.trim() === 'clear') {
        instance.clear()
        setIsExecuting(false)
        displayPrompt()
        return
      }

      // Execute command via websocket
      const result = await client.run_command(command)

      // Display output
      if (result.output) {
        const lines = result.output.split('\n')
        lines.forEach((line, index) => {
          if (index === lines.length - 1 && line === '') return // Skip empty last line
          instance.writeln(line)
        })
      }

      // Display errors
      if (result.error) {
        const errorLines = result.error.split('\n')
        errorLines.forEach((line, index) => {
          if (index === errorLines.length - 1 && line === '') return
          instance.writeln(`\x1b[31m${line}\x1b[0m`) // Red color for errors
        })
      }

      // Update current directory if command was cd
      if (command.trim().startsWith('cd')) {
        try {
          const pwdResult = await client.run_command('echo $PWD')
          if (pwdResult.command_result === 0) {
            const dir = pwdResult.output.trim()
            const formattedDir = formatDirectory(dir)
            setCurrentDir(formattedDir)

            // Display prompt immediately with updated directory
            setIsExecuting(false)
            const prompt = `\x1b[32m${formattedDir}\x1b[0m $ `
            instance.write(prompt)
            inputBufferRef.current = ''
            cursorPositionRef.current = 0
            return
          }
        } catch (error) {
          console.error('Failed to update directory:', error)
        }
      }

    } catch (error) {
      console.error('Command execution failed:', error)
      instance.writeln(`\x1b[31mError: ${error.message}\x1b[0m`)
    }

    setIsExecuting(false)
    displayPrompt()
  }, [client, instance, displayPrompt, formatDirectory])

  // Handle keyboard input - use ref to get current value
  const handleInputRef = useRef()
  handleInputRef.current = (data) => {
    if (!instance || isExecuting || !isInitialized) return

    // Check for arrow keys first
    if (handleArrowKeys(data)) return

    const code = data.charCodeAt(0)

    switch (code) {
      case 13: // Enter
        executeCommand(inputBufferRef.current)
        break

      case 127: // Backspace
        if (cursorPositionRef.current > 0) {
          inputBufferRef.current =
            inputBufferRef.current.slice(0, cursorPositionRef.current - 1) +
            inputBufferRef.current.slice(cursorPositionRef.current)
          cursorPositionRef.current--
          instance.write('\b \b')
        }
        break

      case 27: // Escape sequences (arrow keys handled above)
        break

      case 3: // Ctrl+C
        instance.writeln('^C')
        inputBufferRef.current = ''
        cursorPositionRef.current = 0
        displayPrompt()
        break

      case 12: // Ctrl+L (clear)
        instance.clear()
        displayPrompt()
        break

      default:
        if (code >= 32 && code <= 126) { // Printable characters
          inputBufferRef.current =
            inputBufferRef.current.slice(0, cursorPositionRef.current) +
            data +
            inputBufferRef.current.slice(cursorPositionRef.current)
          cursorPositionRef.current++
          instance.write(data)
        }
        break
    }
  }

  // Handle arrow keys for command history
  const handleArrowKeys = useCallback((data) => {
    if (isExecuting || !isInitialized) return false

    if (data === '\x1b[A') { // Up arrow
      if (commandHistory.length > 0) {
        const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1)
        if (newIndex >= 0) {
          setHistoryIndex(newIndex)
          const command = commandHistory[commandHistory.length - 1 - newIndex]

          // Clear current line
          instance.write('\r' + ' '.repeat(currentDir.length + 3 + inputBufferRef.current.length))
          instance.write('\r')

          // Display new command
          const prompt = `\x1b[32m${currentDir}\x1b[0m $ `
          instance.write(prompt + command)
          inputBufferRef.current = command
          cursorPositionRef.current = command.length
        }
      }
      return true
    } else if (data === '\x1b[B') { // Down arrow
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        const command = commandHistory[commandHistory.length - 1 - newIndex]

        // Clear current line
        instance.write('\r' + ' '.repeat(currentDir.length + 3 + inputBufferRef.current.length))
        instance.write('\r')

        // Display new command
        const prompt = `\x1b[32m${currentDir}\x1b[0m $ `
        instance.write(prompt + command)
        inputBufferRef.current = command
        cursorPositionRef.current = command.length
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        // Clear current line
        instance.write('\r' + ' '.repeat(currentDir.length + 3 + inputBufferRef.current.length))
        instance.write('\r')

        // Display empty prompt
        const prompt = `\x1b[32m${currentDir}\x1b[0m $ `
        instance.write(prompt)
        inputBufferRef.current = ''
        cursorPositionRef.current = 0
      }
      return true
    }
    return false
  }, [instance, commandHistory, historyIndex, currentDir, isExecuting, isInitialized])

  // Initialize terminal display on mount (only once)
  useEffect(() => {
    if (!instance) return

    // Set terminal options for better responsiveness
    instance.options.cursorBlink = true
    instance.options.cursorStyle = 'block'
    instance.options.fontSize = 14
    instance.options.fontFamily = 'Menlo, Monaco, "Courier New", monospace'
    instance.options.theme = {
      background: '#1e1e1e',
      foreground: '#ffffff',
      cursor: '#ffffff',
      cursorAccent: '#000000',
      selection: '#404040'
    }

    // Clear and show initial state
    instance.clear()
    instance.writeln('\x1b[33mConnecting to terminal...\x1b[0m')
  }, [instance])

  // Setup terminal content when ready (only once)
  useEffect(() => {
    if (!instance || !client || !isInitialized || welcomeShown) return

    // Clear previous content and show welcome
    instance.clear()
    instance.writeln('\x1b[36mWelcome to CogniFlight Terminal\x1b[0m')
    instance.writeln('Type commands and press Enter to execute.')
    instance.writeln('Use Ctrl+L to clear, Ctrl+C to cancel.')
    instance.writeln('')

    // Display initial prompt directly
    const prompt = `\x1b[32m${currentDir}\x1b[0m $ `
    instance.write(prompt)
    inputBufferRef.current = ''
    cursorPositionRef.current = 0

    setWelcomeShown(true)
  }, [instance, client, isInitialized, welcomeShown, currentDir])

  // Setup input handlers (only once when all ready)
  useEffect(() => {
    if (!instance || !client || !isInitialized) return

    // Use stable handler that won't change
    const dataHandler = (data) => handleInputRef.current(data)
    instance.onData(dataHandler)

    return () => {
      // Cleanup: properly remove handlers
      try {
        instance.onData(() => {})
      } catch {
        // Instance might be disposed
      }
    }
  }, [instance, client, isInitialized])

  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '400px',
        backgroundColor: '#1e1e1e',
        padding: '8px',
        boxSizing: 'border-box'
      }}
    />
  )
}

export default TerminalApp
