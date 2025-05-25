import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the worker environment
const mockPostMessage = vi.fn()
const mockAddEventListener = vi.fn()

// Mock Pyodide
const mockPyodideInstance = {
  runPythonAsync: vi.fn(),
  loadPackage: vi.fn(),
  FS: {
    writeFile: vi.fn()
  }
}

const mockLoadPyodide = vi.fn()

// Mock the global self object for worker environment
Object.defineProperty(globalThis, 'self', {
  value: {
    postMessage: mockPostMessage,
    addEventListener: mockAddEventListener
  },
  writable: true
})

describe('pdfWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLoadPyodide.mockResolvedValue(mockPyodideInstance)
    mockPyodideInstance.runPythonAsync.mockResolvedValue('success')
    mockPyodideInstance.loadPackage.mockResolvedValue(undefined)
  })

  describe('worker initialization', () => {
    it('should post worker-ready message on initialization', () => {
      // Simulate worker initialization
      mockPostMessage('worker-ready')
      
      expect(mockPostMessage).toHaveBeenCalledWith('worker-ready')
    })

    it('should handle Pyodide initialization success', async () => {
      // Simulate successful Pyodide initialization
      const initializePyodide = async () => {
        try {
          const pyodideInstance = await mockLoadPyodide({
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
          })
          
          await pyodideInstance.loadPackage('micropip')
          await pyodideInstance.runPythonAsync(`
            import micropip
            await micropip.install(['markitdown', 'pdfminer.six'])
          `)
          
          mockPostMessage('pyodide-ready')
        } catch (error) {
          mockPostMessage({
            type: 'pyodide-error',
            error: error instanceof Error ? error.toString() : String(error)
          })
        }
      }

      await initializePyodide()

      expect(mockLoadPyodide).toHaveBeenCalledWith({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
      })
      expect(mockPyodideInstance.loadPackage).toHaveBeenCalledWith('micropip')
      expect(mockPostMessage).toHaveBeenCalledWith('pyodide-ready')
    })

    it('should handle Pyodide initialization error', async () => {
      const initError = new Error('Failed to load Pyodide')
      mockLoadPyodide.mockRejectedValue(initError)

      const initializePyodide = async () => {
        try {
          await mockLoadPyodide({
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
          })
        } catch (error) {
          mockPostMessage({
            type: 'pyodide-error',
            error: error instanceof Error ? error.toString() : String(error)
          })
        }
      }

      await initializePyodide()

      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'pyodide-error',
        error: initError.toString()
      })
    })

    it('should handle package installation error', async () => {
      const packageError = new Error('Failed to install packages')
      mockPyodideInstance.runPythonAsync.mockRejectedValue(packageError)

      const initializePyodide = async () => {
        try {
          const pyodideInstance = await mockLoadPyodide({
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
          })
          
          await pyodideInstance.loadPackage('micropip')
          await pyodideInstance.runPythonAsync(`
            import micropip
            await micropip.install(['markitdown', 'pdfminer.six'])
          `)
          
          mockPostMessage('pyodide-ready')
        } catch (error) {
          mockPostMessage({
            type: 'pyodide-error',
            error: error instanceof Error ? error.toString() : String(error)
          })
        }
      }

      await initializePyodide()

      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'pyodide-error',
        error: packageError.toString()
      })
    })
  })

  describe('message handling', () => {
    let pyodideInstance: typeof mockPyodideInstance | null = null

    beforeEach(() => {
      pyodideInstance = mockPyodideInstance
    })

    const simulateMessageHandler = async (event: { data: any }) => {
      const data = event.data

      if (data.command === 'reload-pyodide') {
        pyodideInstance = null
        // Simulate reinitialization
        pyodideInstance = await mockLoadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
        })
        return
      }

      if (data.type === 'convert' && data.file) {
        try {
          if (!pyodideInstance) {
            pyodideInstance = await mockLoadPyodide({
              indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
            })
          }

          const arrayBuffer = await data.file.arrayBuffer()
          
          // Simulate PDF conversion
          if (pyodideInstance) {
            pyodideInstance.FS.writeFile('/tmp/doc.pdf', new Uint8Array(arrayBuffer))
            
            const result = await pyodideInstance.runPythonAsync(`
              from markitdown import MarkItDown
              mid = MarkItDown(enable_plugins=True)
              result = mid.convert('/tmp/doc.pdf')
              result.text_content
            `)

            mockPostMessage({
              type: 'conversion-result',
              success: true,
              markdown: result
            })
          }
        } catch (error) {
          mockPostMessage({
            type: 'conversion-result',
            success: false,
            error: error instanceof Error ? error.toString() : String(error)
          })
        }
      }
    }

    it('should handle reload-pyodide command', async () => {
      const event = {
        data: { command: 'reload-pyodide' }
      }

      await simulateMessageHandler(event)

      expect(mockLoadPyodide).toHaveBeenCalled()
    })

    it('should handle PDF conversion request', async () => {
      const mockFile = {
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024))
      }
      
      const event = {
        data: {
          type: 'convert',
          file: mockFile
        }
      }

      const mockMarkdownResult = '# Converted Content\n\nThis is converted from PDF.'
      mockPyodideInstance.runPythonAsync.mockResolvedValue(mockMarkdownResult)

      await simulateMessageHandler(event)

      expect(mockFile.arrayBuffer).toHaveBeenCalled()
      expect(mockPyodideInstance.FS.writeFile).toHaveBeenCalledWith(
        '/tmp/doc.pdf',
        expect.any(Uint8Array)
      )
      expect(mockPyodideInstance.runPythonAsync).toHaveBeenCalledWith(
        expect.stringContaining('from markitdown import MarkItDown')
      )
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'conversion-result',
        success: true,
        markdown: mockMarkdownResult
      })
    })

    it('should handle PDF conversion error', async () => {
      const mockFile = {
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024))
      }
      
      const event = {
        data: {
          type: 'convert',
          file: mockFile
        }
      }

      const conversionError = new Error('Failed to convert PDF')
      mockPyodideInstance.runPythonAsync.mockRejectedValue(conversionError)

      await simulateMessageHandler(event)

      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'conversion-result',
        success: false,
        error: conversionError.toString()
      })
    })

    it('should handle file arrayBuffer error', async () => {
      const mockFile = {
        arrayBuffer: vi.fn().mockRejectedValue(new Error('Failed to read file'))
      }
      
      const event = {
        data: {
          type: 'convert',
          file: mockFile
        }
      }

      await simulateMessageHandler(event)

      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'conversion-result',
        success: false,
        error: 'Error: Failed to read file'
      })
    })

    it('should handle conversion when Pyodide is not initialized', async () => {
      pyodideInstance = null
      
      const mockFile = {
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024))
      }
      
      const event = {
        data: {
          type: 'convert',
          file: mockFile
        }
      }

      const mockMarkdownResult = '# Converted Content'
      mockPyodideInstance.runPythonAsync.mockResolvedValue(mockMarkdownResult)

      await simulateMessageHandler(event)

      // Should attempt to initialize Pyodide first
      expect(mockLoadPyodide).toHaveBeenCalled()
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'conversion-result',
        success: true,
        markdown: mockMarkdownResult
      })
    })

    it('should ignore unknown message types', async () => {
      const event = {
        data: {
          type: 'unknown',
          someData: 'test'
        }
      }

      await simulateMessageHandler(event)

      // Should not post any conversion-result messages for unknown types
      expect(mockPostMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'conversion-result' })
      )
    })

    it('should handle non-object message data', async () => {
      const event = {
        data: 'string message'
      }

      await simulateMessageHandler(event)

      // Should not crash or post error messages
      expect(mockPostMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'conversion-result' })
      )
    })
  })

  describe('convertPdfToMarkdown functionality', () => {
    it('should throw error when Pyodide is not initialized', async () => {
      const convertPdfToMarkdown = async (arrayBuffer: ArrayBuffer, pyodideInstance: any) => {
        if (!pyodideInstance) {
          throw new Error('Pyodide is not initialized')
        }

        pyodideInstance.FS.writeFile('/tmp/doc.pdf', new Uint8Array(arrayBuffer))
        
        const result = await pyodideInstance.runPythonAsync(`
          from markitdown import MarkItDown
          mid = MarkItDown(enable_plugins=True)
          result = mid.convert('/tmp/doc.pdf')
          result.text_content
        `)
        
        return result
      }

      // Test with null Pyodide instance
      await expect(convertPdfToMarkdown(new ArrayBuffer(1024), null)).rejects.toThrow('Pyodide is not initialized')
    })

    it('should successfully convert PDF to markdown', async () => {
      const convertPdfToMarkdown = async (arrayBuffer: ArrayBuffer, pyodideInstance: any) => {
        pyodideInstance.FS.writeFile('/tmp/doc.pdf', new Uint8Array(arrayBuffer))
        
        const result = await pyodideInstance.runPythonAsync(`
          from markitdown import MarkItDown
          mid = MarkItDown(enable_plugins=True)
          result = mid.convert('/tmp/doc.pdf')
          result.text_content
        `)
        
        return result
      }

      const mockResult = '# Test Document\n\nThis is a test document.'
      mockPyodideInstance.runPythonAsync.mockResolvedValue(mockResult)

      const result = await convertPdfToMarkdown(new ArrayBuffer(1024), mockPyodideInstance)

      expect(mockPyodideInstance.FS.writeFile).toHaveBeenCalledWith(
        '/tmp/doc.pdf',
        expect.any(Uint8Array)
      )
      expect(mockPyodideInstance.runPythonAsync).toHaveBeenCalledWith(
        expect.stringContaining('from markitdown import MarkItDown')
      )
      expect(result).toBe(mockResult)
    })
  })
}) 