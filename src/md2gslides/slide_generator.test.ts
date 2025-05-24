import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import SlideGenerator from './slide_generator'

// Mock the uuid function to return predictable IDs
vi.mock('./utils', () => ({
  uuid: vi.fn(() => 'test-slide-1'),
  assert: vi.fn((condition: any, message?: string) => {
    if (!condition) {
      throw new Error(message || 'Assertion failed')
    }
  })
}))

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('SlideGenerator class', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('newPresentation static method', () => {
    it('should create a new presentation successfully', async () => {
      const mockPresentationResponse = {
        presentationId: 'test-presentation-id',
        title: 'Test Presentation',
        slides: []
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPresentationResponse
      })

      const generator = await SlideGenerator.newPresentation('test-token', 'Test Presentation')
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://slides.googleapis.com/v1/presentations',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: 'Test Presentation',
          }),
        }
      )
      
      expect(generator).toBeInstanceOf(SlideGenerator)
    })

    it('should handle API errors when creating presentation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized'
      })

      await expect(
        SlideGenerator.newPresentation('invalid-token', 'Test Presentation')
      ).rejects.toThrow('Failed to create presentation: Unauthorized')
    })

    it('should erase default slides when presentation has slides', async () => {
      const mockPresentationResponse = {
        presentationId: 'test-presentation-id',
        title: 'Test Presentation',
        slides: [{ objectId: 'default-slide-1' }]
      }

      // Mock for creating presentation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPresentationResponse
      })

      // Mock for erasing slides (batch update)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ presentationId: 'test-presentation-id', replies: [] })
      })

      const generator = await SlideGenerator.newPresentation('test-token', 'Test Presentation')
      
      expect(mockFetch).toHaveBeenCalledTimes(2)
      
      // Check that the second call was to batch update (erase slides)
      const batchUpdateCall = mockFetch.mock.calls[1]
      expect(batchUpdateCall[0]).toContain(':batchUpdate')
      expect(batchUpdateCall[1].method).toBe('POST')
    })
  })

  describe('copyPresentation static method', () => {
    it('should copy presentation successfully', async () => {
      const mockCopyResponse = {
        id: 'copied-presentation-id'
      }

      const mockPresentationResponse = {
        presentationId: 'copied-presentation-id',
        title: 'Copied Presentation'
      }

      // Mock for copying presentation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCopyResponse
      })

      // Mock for getting presentation details
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPresentationResponse
      })

      const generator = await SlideGenerator.copyPresentation(
        'test-token',
        'Copied Presentation',
        'original-presentation-id'
      )
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/drive/v3/files/original-presentation-id/copy',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'Copied Presentation',
          }),
        }
      )
      
      expect(generator).toBeInstanceOf(SlideGenerator)
    })

    it('should handle copy errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found'
      })

      await expect(
        SlideGenerator.copyPresentation('test-token', 'Copy', 'invalid-id')
      ).rejects.toThrow('Failed to copy presentation: Not Found')
    })
  })

  describe('forPresentation static method', () => {
    it('should get existing presentation successfully', async () => {
      const mockPresentationResponse = {
        presentationId: 'existing-presentation-id',
        title: 'Existing Presentation'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPresentationResponse
      })

      const generator = await SlideGenerator.forPresentation('test-token', 'existing-presentation-id')
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://slides.googleapis.com/v1/presentations/existing-presentation-id',
        {
          headers: {
            'Authorization': 'Bearer test-token',
          },
        }
      )
      
      expect(generator).toBeInstanceOf(SlideGenerator)
    })

    it('should handle errors when getting presentation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found'
      })

      await expect(
        SlideGenerator.forPresentation('test-token', 'invalid-id')
      ).rejects.toThrow('Failed to get presentation: Not Found')
    })
  })

  describe('generateFromMarkdown method', () => {
    it('should generate slides from simple markdown', async () => {
      const mockPresentation = {
        presentationId: 'test-presentation-id',
        title: 'Test Presentation',
        slides: [],
        layouts: [
          {
            objectId: 'layout-title-body-id',
            layoutProperties: {
              name: 'TITLE_AND_BODY',
              displayName: 'Title and Body'
            }
          }
        ]
      }

      const generator = new SlideGenerator('test-token', mockPresentation)

      // Mock the batch update calls
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ presentationId: 'test-presentation-id', replies: [] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...mockPresentation,
            slides: [{
              objectId: 'test-slide-1',
              pageElements: [
                {
                  objectId: 'title-element',
                  shape: { placeholder: { type: 'TITLE' } }
                },
                {
                  objectId: 'body-element',
                  shape: { placeholder: { type: 'BODY' } }
                }
              ]
            }]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ presentationId: 'test-presentation-id', replies: [] })
        })

      const markdown = '# Test Slide\nThis is test content'
      
      const presentationId = await generator.generateFromMarkdown(markdown)
      
      expect(presentationId).toBe('test-presentation-id')
      expect(mockFetch).toHaveBeenCalledTimes(3) // Create slides, reload, populate
    })

    it('should handle multiple slides', async () => {
      const mockPresentation = {
        presentationId: 'test-presentation-id',
        title: 'Test Presentation',
        slides: [],
        layouts: [
          {
            objectId: 'layout-title-body-id',
            layoutProperties: {
              name: 'TITLE_AND_BODY',
              displayName: 'Title and Body'
            }
          }
        ]
      }

      const generator = new SlideGenerator('test-token', mockPresentation)

      // Mock the batch update calls
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ presentationId: 'test-presentation-id', replies: [] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...mockPresentation,
            slides: [
              {
                objectId: 'test-slide-1',
                pageElements: [
                  {
                    objectId: 'title-element-1',
                    shape: { placeholder: { type: 'TITLE' } }
                  },
                  {
                    objectId: 'body-element-1',
                    shape: { placeholder: { type: 'BODY' } }
                  }
                ]
              }
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ presentationId: 'test-presentation-id', replies: [] })
        })

      const markdown = `
# Slide 1
Content 1

---

# Slide 2
Content 2
      `
      
      const presentationId = await generator.generateFromMarkdown(markdown)
      
      expect(presentationId).toBe('test-presentation-id')
    })

    it('should throw error when no presentation ID available', async () => {
      const generator = new SlideGenerator('test-token', {})

      await expect(generator.generateFromMarkdown('# Test')).rejects.toThrow()
    })

    it('should handle API errors during slide creation', async () => {
      const mockPresentation = {
        presentationId: 'test-presentation-id',
        title: 'Test Presentation',
        slides: [],
        layouts: [
          {
            objectId: 'layout-section-id',
            layoutProperties: {
              name: 'SECTION_HEADER',
              displayName: 'Section Header'
            }
          }
        ]
      }

      const generator = new SlideGenerator('test-token', mockPresentation)

      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Server Error',
        text: async () => 'Server Error'
      })

      await expect(
        generator.generateFromMarkdown('# Test Slide')
      ).rejects.toThrow('Server Error')
    })
  })

  describe('erase method', () => {
    it('should erase existing slides', async () => {
      const mockPresentation = {
        presentationId: 'test-presentation-id',
        slides: [
          { objectId: 'slide-1' },
          { objectId: 'slide-2' }
        ]
      }

      const generator = new SlideGenerator('test-token', mockPresentation)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ presentationId: 'test-presentation-id', replies: [] })
      })

      await generator.erase()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://slides.googleapis.com/v1/presentations/test-presentation-id:batchUpdate',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
          },
        })
      )

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(requestBody.requests).toHaveLength(2)
      expect(requestBody.requests[0].deleteObject.objectId).toBe('slide-1')
      expect(requestBody.requests[1].deleteObject.objectId).toBe('slide-2')
    })

    it('should resolve immediately when no slides to erase', async () => {
      const mockPresentation = {
        presentationId: 'test-presentation-id',
        slides: []
      }

      const generator = new SlideGenerator('test-token', mockPresentation)

      await generator.erase()

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should resolve when slides property is undefined', async () => {
      const mockPresentation = {
        presentationId: 'test-presentation-id'
      }

      const generator = new SlideGenerator('test-token', mockPresentation)

      await generator.erase()

      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(
        SlideGenerator.newPresentation('test-token', 'Test')
      ).rejects.toThrow('Network error')
    })

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON') }
      })

      await expect(
        SlideGenerator.newPresentation('test-token', 'Test')
      ).rejects.toThrow('Invalid JSON')
    })
  })

  describe('integration scenarios', () => {
    it('should handle complete workflow from markdown to slides', async () => {
      // This test simulates the complete workflow but with mocked API calls
      const mockPresentation = {
        presentationId: 'test-presentation-id',
        title: 'Test Presentation',
        slides: [],
        layouts: [
          {
            objectId: 'layout-title-body-id',
            layoutProperties: {
              name: 'TITLE_AND_BODY',
              displayName: 'Title and Body'
            }
          }
        ]
      }

      // Mock presentation creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPresentation
      })

      // Mock slide creation batch update
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ presentationId: 'test-presentation-id', replies: [] })
      })

      // Mock presentation reload
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockPresentation,
          slides: [{
            objectId: 'test-slide-1',
            pageElements: [
              {
                objectId: 'title-element',
                shape: { placeholder: { type: 'TITLE' } }
              },
              {
                objectId: 'body-element',
                shape: { placeholder: { type: 'BODY' } }
              }
            ]
          }]
        })
      })

      // Mock slide population batch update
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ presentationId: 'test-presentation-id', replies: [] })
      })

      const generator = await SlideGenerator.newPresentation('test-token', 'Test Presentation')
      const markdown = `
# Welcome
This is a test presentation

---

# Second Slide
With more content
      `
      
      const presentationId = await generator.generateFromMarkdown(markdown)
      
      expect(presentationId).toBe('test-presentation-id')
      expect(mockFetch).toHaveBeenCalledTimes(4)
    })
  })
}) 