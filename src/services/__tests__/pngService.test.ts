import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generatePNGFromHTML } from '../pngService'

// Mock functions for external libraries
const mockToDataURL = vi.fn()
const mockClick = vi.fn()

// Mock html2canvas
vi.mock('html2canvas', () => ({
  default: vi.fn(() => Promise.resolve({
    width: 850,
    height: 1100,
    toDataURL: mockToDataURL
  }))
}))

// Mock document.createElement for anchor element
const mockAnchor = {
  download: '',
  href: '',
  click: mockClick
}

// Mock DOM APIs
const mockQuerySelector = vi.fn()
const mockGetComputedStyle = vi.fn()
const mockIframeDoc = {
  querySelector: mockQuerySelector,
  open: vi.fn(),
  write: vi.fn(),
  close: vi.fn(),
  body: document.createElement('body'),
  fonts: {
    ready: Promise.resolve()
  }
}
const mockIframe = {
  style: {} as CSSStyleDeclaration,
  onload: null as (() => void) | null,
  contentDocument: mockIframeDoc,
  contentWindow: {
    getComputedStyle: mockGetComputedStyle
  }
}

// Mock console methods
const originalConsoleLog = console.log
const originalConsoleError = console.error

describe('pngService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock document.createElement for iframe and anchor
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'iframe') {
        return mockIframe as any
      }
      if (tagName === 'a') {
        return mockAnchor as any
      }
      return originalCreateElement(tagName)
    })
    
    // Mock document.body.appendChild and removeChild
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockIframe as any)
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockIframe as any)
    
    // Mock console methods
    console.log = vi.fn()
    console.error = vi.fn()
    
    // Reset iframe style
    Object.assign(mockIframe.style, {})
    
    // Mock default computed style (portrait)
    mockGetComputedStyle.mockReturnValue({
      width: '216px',
      height: '279px'
    })
    
    // Mock page container element
    mockQuerySelector.mockReturnValue(document.createElement('div'))
    
    // Mock canvas data URL
    mockToDataURL.mockReturnValue('data:image/png;base64,test')
    
    // Reset anchor mock
    mockAnchor.download = ''
    mockAnchor.href = ''
  })
  
  afterEach(() => {
    console.log = originalConsoleLog
    console.error = originalConsoleError
    vi.restoreAllMocks()
  })

  describe('generatePNGFromHTML', () => {
    it('should create detection iframe first', async () => {
      const htmlContent = '<div class="page"><p>Test content</p></div>'
      
      await generatePNGFromHTML(htmlContent, 'test.png')
      
      // Should create multiple iframes (detection + rendering)
      expect(document.createElement).toHaveBeenCalledWith('iframe')
      expect(document.body.appendChild).toHaveBeenCalled()
    })

    it('should create main iframe with correct portrait dimensions', async () => {
      mockGetComputedStyle.mockReturnValue({
        width: '216px',
        height: '279px'
      })
      
      const htmlContent = '<div class="page"><p>Test content</p></div>'
      
      await generatePNGFromHTML(htmlContent, 'test.png')
      
      expect(console.log).toHaveBeenCalledWith('Creating iframe with dimensions:', 
        expect.objectContaining({
          iframeWidth: 850,
          iframeHeight: 1100,
          isLandscape: false
        })
      )
    })

    it('should create main iframe with correct landscape dimensions', async () => {
      mockGetComputedStyle.mockReturnValue({
        width: '279px',
        height: '216px'
      })
      
      const htmlContent = '<div class="page"><p>Test content</p></div>'
      
      await generatePNGFromHTML(htmlContent, 'test.png')
      
      expect(console.log).toHaveBeenCalledWith('Creating iframe with dimensions:', 
        expect.objectContaining({
          iframeWidth: 1100,
          iframeHeight: 850,
          isLandscape: true
        })
      )
    })

    it('should configure html2canvas with correct options', async () => {
      const htmlContent = '<div class="page"><p>Test content</p></div>'
      
      await generatePNGFromHTML(htmlContent, 'test.png')
      
      const html2canvas = await import('html2canvas')
      expect(html2canvas.default).toHaveBeenCalledWith(
        mockIframeDoc.body,
        expect.objectContaining({
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: 850,
          height: 1100,
          scale: 1,
          x: 0,
          y: 0
        })
      )
    })

    it('should download PNG with correct filename', async () => {
      const htmlContent = '<div class="page"><p>Test content</p></div>'
      const filename = 'custom-worksheet.png'
      
      await generatePNGFromHTML(htmlContent, filename)
      
      expect(document.createElement).toHaveBeenCalledWith('a')
      expect(mockAnchor.download).toBe(filename)
      expect(mockAnchor.href).toBe('data:image/png;base64,test')
      expect(mockClick).toHaveBeenCalled()
    })

    it('should use default filename when none provided', async () => {
      const htmlContent = '<div class="page"><p>Test content</p></div>'
      
      await generatePNGFromHTML(htmlContent)
      
      expect(mockAnchor.download).toBe('worksheet.png')
    })

    it('should wait for fonts to load', async () => {
      const htmlContent = '<div class="page"><p>Test content</p></div>'
      
      await generatePNGFromHTML(htmlContent, 'test.png')
      
      expect(console.log).toHaveBeenCalledWith('Fonts loaded successfully')
    })

    it('should handle font loading errors gracefully', async () => {
      const mockIframeDocWithFontError = {
        ...mockIframeDoc,
        fonts: {
          ready: Promise.reject(new Error('Font error'))
        }
      }
      
      const mockIframeWithFontError = {
        ...mockIframe,
        contentDocument: mockIframeDocWithFontError
      }
      
      const originalCreateElement = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
        if (tagName === 'iframe') {
          return mockIframeWithFontError as any
        }
        if (tagName === 'a') {
          return mockAnchor as any
        }
        return originalCreateElement(tagName)
      })
      
      const htmlContent = '<div class="page"><p>Test content</p></div>'
      
      await generatePNGFromHTML(htmlContent, 'test.png')
      
      expect(console.warn).toHaveBeenCalledWith('Font loading detection failed:', expect.any(Error))
    })

    it('should clean up iframe after successful generation', async () => {
      const htmlContent = '<div class="page"><p>Test content</p></div>'
      
      await generatePNGFromHTML(htmlContent, 'test.png')
      
      expect(document.body.removeChild).toHaveBeenCalled()
    })

    it('should handle html2canvas errors gracefully', async () => {
      const html2canvas = await import('html2canvas')
      vi.mocked(html2canvas.default).mockRejectedValue(new Error('Canvas error'))
      
      const htmlContent = '<div class="page"><p>Test content</p></div>'
      
      await expect(generatePNGFromHTML(htmlContent, 'test.png')).rejects.toThrow(
        'Failed to generate PNG'
      )
      
      expect(console.error).toHaveBeenCalledWith('Error generating PNG:', expect.any(Error))
    })

    it('should fallback to default dimensions if detection fails', async () => {
      mockGetComputedStyle.mockReturnValue({
        width: 'invalid',
        height: 'invalid'
      })
      
      const htmlContent = '<div class="page"><p>Test content</p></div>'
      
      await generatePNGFromHTML(htmlContent, 'test.png')
      
      // Should still work with fallback dimensions
      expect(mockClick).toHaveBeenCalled()
    })
  })
})