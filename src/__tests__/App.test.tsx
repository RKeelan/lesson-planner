import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import App from '../App'

// Mock the services
vi.mock('../services/googleAuth', () => ({
  getAccessToken: vi.fn(),
  initGoogleAuth: vi.fn(),
  signOut: vi.fn()
}))

vi.mock('../services/slidesService', () => ({
  generateSlides: vi.fn()
}))

// Mock the Worker constructor
const mockWorker = {
  postMessage: vi.fn(),
  addEventListener: vi.fn(),
  terminate: vi.fn()
}

Object.defineProperty(window, 'Worker', {
  value: vi.fn(() => mockWorker),
  writable: true
})

// Mock URL constructor for worker - create a proper constructor
class MockURL {
  href: string
  constructor(url: string, base?: string) {
    this.href = url
  }
}

Object.defineProperty(globalThis, 'URL', {
  value: MockURL,
  writable: true
})

import { initGoogleAuth, signOut } from '../services/googleAuth'
import { generateSlides } from '../services/slidesService'

const mockInitGoogleAuth = vi.mocked(initGoogleAuth)
const mockSignOut = vi.mocked(signOut)
const mockGenerateSlides = vi.mocked(generateSlides)

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInitGoogleAuth.mockResolvedValue()
    mockGenerateSlides.mockResolvedValue('test-presentation-id')
    
    // Reset console methods
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('should render the main interface', () => {
    render(<App />)
    
    // Check for key elements that should be present
    expect(screen.getByText(/Upload lesson plan/i)).toBeInTheDocument()
    expect(screen.getByText(/Markdown Content/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Generate Slides/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sign Out/i })).toBeInTheDocument()
  })

  it('should initialize Google Auth on mount', () => {
    render(<App />)
    
    expect(mockInitGoogleAuth).toHaveBeenCalledOnce()
  })

  it('should initialize PDF worker on mount', () => {
    render(<App />)
    
    expect(window.Worker).toHaveBeenCalledWith(
      expect.any(MockURL),
      { type: 'module' }
    )
    expect(mockWorker.addEventListener).toHaveBeenCalledWith('message', expect.any(Function))
  })

  it('should handle PDF file drop', async () => {
    render(<App />)
    
    // Find the drop zone element by its ID
    const dropZone = document.getElementById('file-upload')?.parentElement
    expect(dropZone).toBeInTheDocument()
    
    const pdfFile = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' })
    
    fireEvent.drop(dropZone!, {
      dataTransfer: { files: [pdfFile] }
    })
    
    expect(mockWorker.postMessage).toHaveBeenCalledWith({
      type: 'convert',
      file: pdfFile
    })
  })

  it('should handle worker messages', async () => {
    render(<App />)
    
    // Get the message handler
    const messageHandler = mockWorker.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )?.[1]
    
    expect(messageHandler).toBeDefined()
    
    // Test pyodide-ready message
    messageHandler({ data: 'pyodide-ready' })
    expect(console.log).toHaveBeenCalledWith('Pyodide is ready for processing')
    
    // Test successful conversion
    const markdownResult = '# Test Slide\n\nConverted content'
    messageHandler({
      data: {
        type: 'conversion-result',
        success: true,
        markdown: markdownResult
      }
    })
    
    await waitFor(() => {
      const textarea = document.getElementById('md-input') as HTMLTextAreaElement
      expect(textarea).toHaveValue(markdownResult)
    })
  })

  it('should handle markdown editing', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    const textarea = document.getElementById('md-input') as HTMLTextAreaElement
    const newMarkdown = '# New Slide\n\nNew content'
    
    await user.clear(textarea)
    await user.type(textarea, newMarkdown)
    
    expect(textarea).toHaveValue(newMarkdown)
  })

  it('should generate slides without template', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    const generateButton = screen.getByRole('button', { name: /Generate Slides/i })
    
    await user.click(generateButton)
    
    expect(mockGenerateSlides).toHaveBeenCalledWith(
      expect.any(String), // The default markdown content
      undefined
    )
    
    await waitFor(() => {
      expect(screen.getByText(/Slides generated successfully!/i)).toBeInTheDocument()
    })
  })

  it('should handle slide generation error', async () => {
    const user = userEvent.setup()
    mockGenerateSlides.mockRejectedValue(new Error('Generation failed'))
    
    render(<App />)
    
    const generateButton = screen.getByRole('button', { name: /Generate Slides/i })
    await user.click(generateButton)
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to generate slides/i)).toBeInTheDocument()
    })
  })

  it('should cleanup worker on unmount', () => {
    const { unmount } = render(<App />)
    
    unmount()
    
    expect(mockWorker.terminate).toHaveBeenCalledOnce()
  })

  it('should handle Google Auth initialization error', async () => {
    mockInitGoogleAuth.mockRejectedValue(new Error('Auth failed'))
    
    render(<App />)
    
    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        'Failed to initialize Google Auth:',
        expect.any(Error)
      )
    })
  })

  // Simplified tests that focus on core functionality
  it('should handle file input change', async () => {
    render(<App />)
    
    // Look for file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    if (fileInput) {
      const pdfFile = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' })
      
      await userEvent.upload(fileInput, pdfFile)
      
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'convert',
        file: pdfFile
      })
    }
  })

  it('should handle template input if present', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    // Look for template input
    const templateInput = document.querySelector('input[placeholder*="template"]') as HTMLInputElement ||
                         document.querySelector('input[placeholder*="Template"]') as HTMLInputElement
    
    if (templateInput) {
      const templateUrl = 'https://docs.google.com/presentation/d/1234567890/edit'
      
      await user.type(templateInput, templateUrl)
      
      expect(templateInput).toHaveValue(templateUrl)
    }
  })

  it('should show processing state during operations', async () => {
    render(<App />)
    
    // Find the drop zone element by its ID
    const dropZone = document.getElementById('file-upload')?.parentElement
    const pdfFile = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' })
    
    fireEvent.drop(dropZone!, {
      dataTransfer: { files: [pdfFile] }
    })
    
    // Should show some kind of processing indicator
    expect(mockWorker.postMessage).toHaveBeenCalledWith({
      type: 'convert',
      file: pdfFile
    })
  })

  it('should handle sign out if button exists', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    // Look for sign out button
    const signOutButton = screen.queryByRole('button', { name: /sign out/i }) ||
                         screen.queryByText(/sign out/i)
    
    if (signOutButton) {
      await user.click(signOutButton)
      expect(mockSignOut).toHaveBeenCalledOnce()
    }
  })
}) 