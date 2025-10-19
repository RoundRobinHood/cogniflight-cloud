import { useEffect, useState, useRef, useCallback } from 'react'
import { useSystem } from '../useSystem'
import { useXTerm } from 'react-xtermjs'
import { useStreamClient } from '../../api/socket.js'

function TerminalApp() {
  const { instance, ref } = useXTerm()
  const client = useStreamClient()
  const [currentDir, setCurrentDir] = useState('~')
  const [homeDir, setHomeDir] = useState('')
  const [commandHistory, setCommandHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isExecuting, setIsExecuting] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [welcomeShown, setWelcomeShown] = useState(false)
  const [isAwaitingInput, setIsAwaitingInput] = useState(false)
  const inputBufferRef = useRef('')
  const cursorPositionRef = useRef(0)
  const commandHandleRef = useRef(null)

  const { addNotification } = useSystem()

  // Helper function to format directory path
  const formatDirectory = useCallback((dir) => {
    if (!homeDir || !dir) return dir
    return dir.startsWith(homeDir) ? dir.replace(homeDir, '~') : dir
  }, [homeDir])

  // Send input to running command
  const sendInput = useCallback((line) => {
    if (commandHandleRef.current && commandHandleRef.current.command_running) {
      commandHandleRef.current.input(line + '\r\n')
    }
  }, [])

  // Send EOF to running command
  const sendEOF = useCallback(() => {
    if (commandHandleRef.current && commandHandleRef.current.command_running) {
      commandHandleRef.current.input_eof()
      setIsAwaitingInput(false)
    }
  }, [])

  // Send command interrupt to running command
  const sendInterrupt = useCallback(() => {
    if (commandHandleRef.current && commandHandleRef.current.command_running) {
      commandHandleRef.current.interrupt();
    }
  }, []);

  // Initialize terminal when client is available
  useEffect(() => {
    if (client && !isInitialized) {
      const initializeTerminal = async () => {
        try {
          // Get home directory first
          const homeHandle = await client.run_command('echo $HOME')
          let homeOutput = ''
          for await (const chunk of homeHandle.iter_output()) {
            homeOutput += chunk
          }
          await homeHandle.result()

          let home = ''
          if (homeHandle.command_result === 0) {
            home = homeOutput.trim()
            setHomeDir(home)
          }

          // Get initial working directory
          const pwdHandle = await client.run_command('echo $PWD')
          let pwdOutput = ''
          for await (const chunk of pwdHandle.iter_output()) {
            pwdOutput += chunk
          }
          await pwdHandle.result()

          if (pwdHandle.command_result === 0) {
            const dir = pwdOutput.trim()
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

    // Clear input buffer immediately when starting command
    inputBufferRef.current = ''
    cursorPositionRef.current = 0

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

      // Execute command via streaming client
      const commandHandle = await client.run_command(command)
      commandHandleRef.current = commandHandle
      setIsAwaitingInput(true)

      // Stream output in real-time
      const outputStreamer = (async () => {
        try {
          for await (const chunk of commandHandle.iter_output()) {
            if (chunk) {
              instance.write(chunk)
            }
          }
        } catch (error) {
          console.error('Output stream error:', error)
        }
      })()

      // Stream errors in real-time
      const errorStreamer = (async () => {
        try {
          for await (const chunk of commandHandle.iter_error()) {
            if (chunk) {
              instance.write(chunk) // Don't override ANSI codes - write as-is
            }
          }
        } catch (error) {
          console.error('Error stream error:', error)
        }
      })()

      // Wait for command to finish
      await commandHandle.result()

      // Wait for all streams to finish
      await Promise.all([outputStreamer, errorStreamer])

      // Add newline after command output for clean prompt separation
      instance.writeln('')

      // Clean up command handle
      commandHandleRef.current = null
      setIsAwaitingInput(false)

      // Update current directory if command was cd (do this BEFORE displaying prompt)
      if (command.trim().startsWith('cd')) {
        try {
          const pwdHandle = await client.run_command('echo $PWD')
          let pwdOutput = ''
          for await (const chunk of pwdHandle.iter_output()) {
            pwdOutput += chunk
          }
          await pwdHandle.result()

          if (pwdHandle.command_result === 0) {
            const dir = pwdOutput.trim()
            const formattedDir = formatDirectory(dir)
            setCurrentDir(formattedDir)

            // Display prompt immediately with updated directory
            setIsExecuting(false)
            const prompt = `\x1b[32m${formattedDir}\x1b[0m $ `
            instance.write(prompt)
            inputBufferRef.current = ''
            cursorPositionRef.current = 0
            return // Exit early to avoid displaying prompt twice
          }
        } catch (error) {
          console.error('Failed to update directory:', error)
        }
      }

    } catch (error) {
      console.error('Command execution failed:', error)
      instance.writeln(`\x1b[31mError: ${error.message}\x1b[0m`)
      // Clean up on error
      commandHandleRef.current = null
      setIsAwaitingInput(false)
    }

    setIsExecuting(false)
    displayPrompt()
  }, [client, instance, displayPrompt, formatDirectory])

  // Handle keyboard input - use ref to get current value
  const handleInputRef = useRef()
  handleInputRef.current = (data) => {
    if (!instance || !isInitialized) return

    const code = data.charCodeAt(0)

    // Handle stdin input mode (when waiting for user input to commands)
    if (isAwaitingInput) {
      switch (code) {
        case 4: // Ctrl+D (EOF)
          instance.writeln('^D')
          sendEOF()
          break

        case 13: // Enter - send line to stdin
          const line = inputBufferRef.current
          instance.writeln('')
          sendInput(line)
          inputBufferRef.current = ''
          cursorPositionRef.current = 0
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

        case 3: // Ctrl+C - send interrupt
          instance.writeln('^C')
          sendInterrupt()
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
      return
    }

    // Normal command input mode
    if (isExecuting) return

    // Check for arrow keys first
    if (handleArrowKeys(data)) return

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
    if (isExecuting || !isInitialized || isAwaitingInput) return false

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
  }, [instance, commandHistory, historyIndex, currentDir, isExecuting, isInitialized, isAwaitingInput])

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

  // Handle terminal resizing
  useEffect(() => {
    if (!instance || !ref.current) return

    const resizeObserver = new ResizeObserver(() => {
      if (instance && ref.current) {
        // Get the container dimensions
        const rect = ref.current.getBoundingClientRect()
        const cols = Math.floor((rect.width - 16) / 9) // Approximate character width
        const rows = Math.floor((rect.height - 16) / 17) // Approximate line height

        // Resize the terminal
        if (cols > 0 && rows > 0) {
          instance.resize(cols, rows)
        }
      }
    })

    resizeObserver.observe(ref.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [instance, ref])

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
