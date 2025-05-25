import { beforeEach, describe, expect, it, vi } from 'vitest'

import { generateSlides } from '../slidesService'

// Mock the dependencies
vi.mock('../googleAuth', () => ({
  getAccessToken: vi.fn()
}))

vi.mock('../../md2gslides/slide_generator', () => ({
  default: {
    copyPresentation: vi.fn(),
    newPresentation: vi.fn()
  }
}))

import { getAccessToken } from '../googleAuth'
import SlideGenerator from '../../md2gslides/slide_generator'

const mockGetAccessToken = vi.mocked(getAccessToken)
const mockSlideGenerator = vi.mocked(SlideGenerator)

// Create a mock function for generateFromMarkdown
const mockGenerateFromMarkdown = vi.fn()

// Mock generator instance with all required properties and methods
const mockGeneratorInstance = {
  generateFromMarkdown: mockGenerateFromMarkdown,
  erase: vi.fn(),
  // Add other required properties as minimal mocks
  slides: [],
  accessToken: 'test-token',
  createSlides: vi.fn(),
  populateSlides: vi.fn(),
  updatePresentation: vi.fn(),
  reloadPresentation: vi.fn()
} as unknown as SlideGenerator

describe('slidesService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset console methods
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('generateSlides', () => {
    const testMarkdown = '# Test Slide\n\nThis is a test slide.'
    const testToken = 'test-access-token'
    const testPresentationId = 'test-presentation-id'

    it('should generate slides without template', async () => {
      mockGetAccessToken.mockResolvedValue(testToken)
      mockSlideGenerator.newPresentation.mockResolvedValue(mockGeneratorInstance)
      mockGenerateFromMarkdown.mockResolvedValue(testPresentationId)

      const result = await generateSlides(testMarkdown)

      expect(mockGetAccessToken).toHaveBeenCalledOnce()
      expect(mockSlideGenerator.newPresentation).toHaveBeenCalledWith(testToken, 'Lesson Plan')
      expect(mockGenerateFromMarkdown).toHaveBeenCalledWith(testMarkdown)
      expect(result).toBe(testPresentationId)
    })

    it('should generate slides with template successfully', async () => {
      const templateId = 'template-123'
      
      mockGetAccessToken.mockResolvedValue(testToken)
      mockSlideGenerator.copyPresentation.mockResolvedValue(mockGeneratorInstance)
      mockGenerateFromMarkdown.mockResolvedValue(testPresentationId)

      const result = await generateSlides(testMarkdown, templateId)

      expect(mockGetAccessToken).toHaveBeenCalledOnce()
      expect(mockSlideGenerator.copyPresentation).toHaveBeenCalledWith(testToken, 'Lesson Plan', templateId)
      expect(mockGenerateFromMarkdown).toHaveBeenCalledWith(testMarkdown)
      expect(result).toBe(testPresentationId)
    })

    it('should fallback to new presentation when template copy fails', async () => {
      const templateId = 'template-123'
      const copyError = new Error('Drive permissions required')
      
      mockGetAccessToken.mockResolvedValue(testToken)
      mockSlideGenerator.copyPresentation.mockRejectedValue(copyError)
      mockSlideGenerator.newPresentation.mockResolvedValue(mockGeneratorInstance)
      mockGenerateFromMarkdown.mockResolvedValue(testPresentationId)

      const result = await generateSlides(testMarkdown, templateId)

      expect(mockGetAccessToken).toHaveBeenCalledOnce()
      expect(mockSlideGenerator.copyPresentation).toHaveBeenCalledWith(testToken, 'Lesson Plan', templateId)
      expect(mockSlideGenerator.newPresentation).toHaveBeenCalledWith(testToken, 'Lesson Plan')
      expect(mockGenerateFromMarkdown).toHaveBeenCalledWith(testMarkdown)
      expect(console.warn).toHaveBeenCalledWith(
        'Could not copy presentation template (missing Drive permissions). Creating new presentation instead.'
      )
      expect(result).toBe(testPresentationId)
    })

    it('should handle auth token retrieval failure', async () => {
      const authError = new Error('Authentication failed')
      
      mockGetAccessToken.mockRejectedValue(authError)

      await expect(generateSlides(testMarkdown)).rejects.toThrow('Authentication failed')
      
      expect(mockGetAccessToken).toHaveBeenCalledOnce()
      expect(mockSlideGenerator.newPresentation).not.toHaveBeenCalled()
      expect(mockSlideGenerator.copyPresentation).not.toHaveBeenCalled()
      expect(console.error).toHaveBeenCalledWith('Error generating slides:', authError)
    })

    it('should handle new presentation creation failure', async () => {
      const presentationError = new Error('Failed to create presentation')
      
      mockGetAccessToken.mockResolvedValue(testToken)
      mockSlideGenerator.newPresentation.mockRejectedValue(presentationError)

      await expect(generateSlides(testMarkdown)).rejects.toThrow('Failed to create presentation')
      
      expect(mockGetAccessToken).toHaveBeenCalledOnce()
      expect(mockSlideGenerator.newPresentation).toHaveBeenCalledWith(testToken, 'Lesson Plan')
      expect(console.error).toHaveBeenCalledWith('Error generating slides:', presentationError)
    })

    it('should handle markdown generation failure', async () => {
      const markdownError = new Error('Failed to generate from markdown')
      
      mockGetAccessToken.mockResolvedValue(testToken)
      mockSlideGenerator.newPresentation.mockResolvedValue(mockGeneratorInstance)
      mockGenerateFromMarkdown.mockRejectedValue(markdownError)

      await expect(generateSlides(testMarkdown)).rejects.toThrow('Failed to generate from markdown')
      
      expect(mockGetAccessToken).toHaveBeenCalledOnce()
      expect(mockSlideGenerator.newPresentation).toHaveBeenCalledWith(testToken, 'Lesson Plan')
      expect(mockGenerateFromMarkdown).toHaveBeenCalledWith(testMarkdown)
      expect(console.error).toHaveBeenCalledWith('Error generating slides:', markdownError)
    })

    it('should handle fallback failure when both template copy and new presentation fail', async () => {
      const templateId = 'template-123'
      const copyError = new Error('Drive permissions required')
      const newPresentationError = new Error('Failed to create new presentation')
      
      mockGetAccessToken.mockResolvedValue(testToken)
      mockSlideGenerator.copyPresentation.mockRejectedValue(copyError)
      mockSlideGenerator.newPresentation.mockRejectedValue(newPresentationError)

      await expect(generateSlides(testMarkdown, templateId)).rejects.toThrow('Failed to create new presentation')
      
      expect(mockGetAccessToken).toHaveBeenCalledOnce()
      expect(mockSlideGenerator.copyPresentation).toHaveBeenCalledWith(testToken, 'Lesson Plan', templateId)
      expect(mockSlideGenerator.newPresentation).toHaveBeenCalledWith(testToken, 'Lesson Plan')
      expect(console.warn).toHaveBeenCalledWith(
        'Could not copy presentation template (missing Drive permissions). Creating new presentation instead.'
      )
      expect(console.error).toHaveBeenCalledWith('Error generating slides:', newPresentationError)
    })

    it('should handle empty markdown', async () => {
      const emptyMarkdown = ''
      
      mockGetAccessToken.mockResolvedValue(testToken)
      mockSlideGenerator.newPresentation.mockResolvedValue(mockGeneratorInstance)
      mockGenerateFromMarkdown.mockResolvedValue(testPresentationId)

      const result = await generateSlides(emptyMarkdown)

      expect(mockGenerateFromMarkdown).toHaveBeenCalledWith(emptyMarkdown)
      expect(result).toBe(testPresentationId)
    })

    it('should handle undefined template ID', async () => {
      mockGetAccessToken.mockResolvedValue(testToken)
      mockSlideGenerator.newPresentation.mockResolvedValue(mockGeneratorInstance)
      mockGenerateFromMarkdown.mockResolvedValue(testPresentationId)

      const result = await generateSlides(testMarkdown, undefined)

      expect(mockSlideGenerator.copyPresentation).not.toHaveBeenCalled()
      expect(mockSlideGenerator.newPresentation).toHaveBeenCalledWith(testToken, 'Lesson Plan')
      expect(result).toBe(testPresentationId)
    })

    it('should handle empty string template ID', async () => {
      mockGetAccessToken.mockResolvedValue(testToken)
      mockSlideGenerator.newPresentation.mockResolvedValue(mockGeneratorInstance)
      mockGenerateFromMarkdown.mockResolvedValue(testPresentationId)

      const result = await generateSlides(testMarkdown, '')

      expect(mockSlideGenerator.copyPresentation).not.toHaveBeenCalled()
      expect(mockSlideGenerator.newPresentation).toHaveBeenCalledWith(testToken, 'Lesson Plan')
      expect(result).toBe(testPresentationId)
    })
  })
}) 