import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generatePDFFromHTML } from '../pdfService'

// Mock functions for external libraries
const mockAddImage = vi.fn()
const mockSave = vi.fn()
const mockToDataURL = vi.fn()

// Mock html2canvas
vi.mock('html2canvas', () => ({
  default: vi.fn(() => Promise.resolve({
    toDataURL: mockToDataURL
  }))
}))

// Mock jsPDF
vi.mock('jspdf', () => ({
  default: vi.fn(() => ({
    addImage: mockAddImage,
    save: mockSave
  }))
}))

// Mock DOM APIs
const mockQuerySelector = vi.fn()
const mockGetComputedStyle = vi.fn()
const mockIframeDoc = {
  querySelector: mockQuerySelector,
  open: vi.fn(),
  write: vi.fn(),
  close: vi.fn(),
  body: document.createElement('body')
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

describe('pdfService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock document.createElement for iframe
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'iframe') {
        return mockIframe as any
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
  })
  
  afterEach(() => {
    console.log = originalConsoleLog
    console.error = originalConsoleError
    vi.restoreAllMocks()
  })

  describe('generatePDFFromHTML', () => {
    it('should create iframe with correct initial dimensions', async () => {
      const htmlContent = '<div class="page"><p>Test content</p></div>'
      
      await generatePDFFromHTML(htmlContent, 'test.pdf')
      
      expect(document.createElement).toHaveBeenCalledWith('iframe')
      expect(mockIframe.style.position).toBe('absolute')
      expect(mockIframe.style.left).toBe('-9999px')
      expect(mockIframe.style.width).toBe('1100px') // CANVAS_LONG_DIM
      expect(mockIframe.style.height).toBe('1100px') // CANVAS_LONG_DIM
      expect(mockIframe.style.visibility).toBe('hidden')
    })

    it('should write HTML content to iframe with proper wrapper', async () => {
      const htmlContent = '<div class="page"><p>Test content</p></div>'
      
      await generatePDFFromHTML(htmlContent, 'test.pdf')
      
      expect(mockIframeDoc.open).toHaveBeenCalled()
      expect(mockIframeDoc.write).toHaveBeenCalledWith(
        expect.stringContaining('<!DOCTYPE html>')
      )
      expect(mockIframeDoc.write).toHaveBeenCalledWith(
        expect.stringContaining('<div class="page"><p>Test content</p></div>')
      )
      expect(mockIframeDoc.close).toHaveBeenCalled()
    })

    it('should detect portrait orientation correctly', async () => {
      // Portrait: width < height
      mockGetComputedStyle.mockReturnValue({
        width: '216px',
        height: '279px'
      })
      
      const htmlContent = '<div class="page"><p>Test content</p></div>'
      
      await generatePDFFromHTML(htmlContent, 'test.pdf')
      
      expect(console.log).toHaveBeenCalledWith('Detected orientation:', {
        width: 216,
        height: 279,
        isLandscape: false,
        orientation: 'portrait'
      })
      
      // Should use portrait dimensions for canvas
      const html2canvas = await import('html2canvas')
      expect(html2canvas.default).toHaveBeenCalledWith(
        mockIframeDoc.body,
        expect.objectContaining({
          width: 800, // CANVAS_SHORT_DIM for portrait
          height: 1100 // CANVAS_LONG_DIM for portrait
        })
      )
      
      // Should create PDF with portrait orientation
      const jsPDF = await import('jspdf')
      expect(jsPDF.default).toHaveBeenCalledWith('p', 'mm', 'letter')
    })

    it('should detect landscape orientation correctly', async () => {
      // Landscape: width > height
      mockGetComputedStyle.mockReturnValue({
        width: '279px',
        height: '216px'
      })
      
      const htmlContent = '<div class="page"><p>Test content</p></div>'
      
      await generatePDFFromHTML(htmlContent, 'test.pdf')
      
      expect(console.log).toHaveBeenCalledWith('Detected orientation:', {
        width: 279,
        height: 216,
        isLandscape: true,
        orientation: 'landscape'
      })
      
      // Should use landscape dimensions for canvas
      const html2canvas = await import('html2canvas')
      expect(html2canvas.default).toHaveBeenCalledWith(
        mockIframeDoc.body,
        expect.objectContaining({
          width: 1100, // CANVAS_LONG_DIM for landscape
          height: 800 // CANVAS_SHORT_DIM for landscape
        })
      )
      
      // Should create PDF with landscape orientation
      const jsPDF = await import('jspdf')
      expect(jsPDF.default).toHaveBeenCalledWith('l', 'mm', 'letter')
    })

    it('should handle square orientation as portrait', async () => {
      // Square: width = height (should default to portrait)
      mockGetComputedStyle.mockReturnValue({
        width: '250px',
        height: '250px'
      })
      
      const htmlContent = '<div class="page"><p>Test content</p></div>'
      
      await generatePDFFromHTML(htmlContent, 'test.pdf')
      
      expect(console.log).toHaveBeenCalledWith('Detected orientation:', {
        width: 250,
        height: 250,
        isLandscape: false, // width > height is false for equal values
        orientation: 'portrait'
      })
    })

    it('should add image to PDF with correct dimensions for portrait', async () => {
      mockGetComputedStyle.mockReturnValue({
        width: '216px',
        height: '279px'
      })
      
      const htmlContent = '<div class="page"><p>Test content</p></div>'
      
      await generatePDFFromHTML(htmlContent, 'test.pdf')
      
      expect(mockAddImage).toHaveBeenCalledWith(
        'data:image/png;base64,test',
        'PNG',
        0, // X offset
        0, // Y offset
        216, // Page width MM (portrait)
        279  // Page height MM (portrait)
      )
    })

    it('should add image to PDF with correct dimensions for landscape', async () => {
      mockGetComputedStyle.mockReturnValue({
        width: '279px',
        height: '216px'
      })
      
      const htmlContent = '<div class="page"><p>Test content</p></div>'
      
      await generatePDFFromHTML(htmlContent, 'test.pdf')
      
      expect(mockAddImage).toHaveBeenCalledWith(
        'data:image/png;base64,test',
        'PNG',
        0, // X offset
        0, // Y offset
        279, // Page width MM (landscape)
        216  // Page height MM (landscape)
      )
    })

    it('should save PDF with correct filename', async () => {
      const htmlContent = '<div class="page"><p>Test content</p></div>'
      const filename = 'custom-worksheet.pdf'
      
      await generatePDFFromHTML(htmlContent, filename)
      
      expect(mockSave).toHaveBeenCalledWith(filename)
    })

    it('should use default filename when none provided', async () => {
      const htmlContent = '<div class="page"><p>Test content</p></div>'
      
      await generatePDFFromHTML(htmlContent)
      
      expect(mockSave).toHaveBeenCalledWith('worksheet.pdf')
    })

    it('should clean up iframe after successful generation', async () => {
      const htmlContent = '<div class="page"><p>Test content</p></div>'
      
      await generatePDFFromHTML(htmlContent, 'test.pdf')
      
      expect(document.body.appendChild).toHaveBeenCalledWith(mockIframe)
      expect(document.body.removeChild).toHaveBeenCalledWith(mockIframe)
    })

    it('should throw error when page container is not found', async () => {
      mockQuerySelector.mockReturnValue(null) // No .page or .page-container element
      
      const htmlContent = '<div><p>Test content without page container</p></div>'
      
      await expect(generatePDFFromHTML(htmlContent, 'test.pdf')).rejects.toThrow(
        'Failed to generate PDF'
      )
      
      expect(console.error).toHaveBeenCalledWith('Could not find .page or .page-container element')
      expect(document.body.removeChild).toHaveBeenCalledWith(mockIframe)
    })

    it('should throw error when computed style cannot be obtained', async () => {
      mockGetComputedStyle.mockReturnValue(null)
      
      const htmlContent = '<div class="page"><p>Test content</p></div>'
      
      await expect(generatePDFFromHTML(htmlContent, 'test.pdf')).rejects.toThrow(
        'Failed to generate PDF'
      )
      
      expect(console.error).toHaveBeenCalledWith('Could not get computed style for page container')
      expect(document.body.removeChild).toHaveBeenCalledWith(mockIframe)
    })

    it('should throw error when width/height cannot be parsed', async () => {
      mockGetComputedStyle.mockReturnValue({
        width: 'invalid',
        height: 'invalid'
      })
      
      const htmlContent = '<div class="page"><p>Test content</p></div>'
      
      await expect(generatePDFFromHTML(htmlContent, 'test.pdf')).rejects.toThrow(
        'Failed to generate PDF'
      )
      
      expect(console.error).toHaveBeenCalledWith(
        'Could not parse width/height from computed style:',
        { width: 'invalid', height: 'invalid' }
      )
      expect(document.body.removeChild).toHaveBeenCalledWith(mockIframe)
    })

    // Note: Testing iframe document access failure is complex due to Promise.resolve() timing
    // This edge case is covered by the overall error handling in the catch block

    it('should throw error when body element is not found', async () => {
      const mockIframeDocWithoutBody = {
        ...mockIframeDoc,
        body: null
      }
      
      const mockIframeWithoutBody = {
        ...mockIframe,
        contentDocument: mockIframeDocWithoutBody
      }
      
      const originalCreateElement = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
        if (tagName === 'iframe') {
          return mockIframeWithoutBody as any
        }
        return originalCreateElement(tagName)
      })
      
      const htmlContent = '<div class="page"><p>Test content</p></div>'
      
      await expect(generatePDFFromHTML(htmlContent, 'test.pdf')).rejects.toThrow(
        'Failed to generate PDF'
      )
    })

    it('should handle html2canvas errors gracefully', async () => {
      const html2canvas = await import('html2canvas')
      vi.mocked(html2canvas.default).mockRejectedValue(new Error('Canvas error'))
      
      const htmlContent = '<div class="page"><p>Test content</p></div>'
      
      await expect(generatePDFFromHTML(htmlContent, 'test.pdf')).rejects.toThrow(
        'Failed to generate PDF'
      )
      
      expect(console.error).toHaveBeenCalledWith('Error generating PDF:', expect.any(Error))
    })

    it('should search for both .page and .page-container elements', async () => {
      const htmlContent = '<div class="page-container"><p>Test content</p></div>'
      
      await generatePDFFromHTML(htmlContent, 'test.pdf')
      
      expect(mockQuerySelector).toHaveBeenCalledWith('.page-container, .page')
    })

    it('should configure html2canvas with correct options', async () => {
      mockGetComputedStyle.mockReturnValue({
        width: '216px',
        height: '279px'
      })
      
      const htmlContent = '<div class="page"><p>Test content</p></div>'
      
      await generatePDFFromHTML(htmlContent, 'test.pdf')
      
      const html2canvas = await import('html2canvas')
      expect(html2canvas.default).toHaveBeenCalledWith(
        mockIframeDoc.body,
        expect.objectContaining({
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: 800, // Portrait canvas width
          height: 1100 // Portrait canvas height
        })
      )
    })

    it('should wait for content to load before processing', async () => {
      const htmlContent = '<div class="page"><p>Test content</p></div>'
      
      // Mock setTimeout to track if it's called
      const mockSetTimeout = vi.spyOn(global, 'setTimeout')
      
      await generatePDFFromHTML(htmlContent, 'test.pdf')
      
      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 1000)
    })
  })
})