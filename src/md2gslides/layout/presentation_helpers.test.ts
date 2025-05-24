import { describe, expect, it } from 'vitest'
import {
  findPage,
  pageSize,
  findLayoutIdByName,
  findPlaceholder,
  findSpeakerNotesObjectId,
  Dimensions
} from './presentation_helpers'
import { slides_v1 as SlidesV1 } from 'googleapis'

// Mock presentation data for testing
const mockPresentation: SlidesV1.Schema$Presentation = {
  presentationId: 'test-presentation-id',
  pageSize: {
    width: { magnitude: 1280, unit: 'EMU' },
    height: { magnitude: 720, unit: 'EMU' }
  },
  slides: [
    {
      objectId: 'slide-1',
      pageElements: [
        {
          objectId: 'title-element-1',
          shape: {
            placeholder: {
              type: 'TITLE',
              index: 0
            }
          }
        },
        {
          objectId: 'body-element-1',
          shape: {
            placeholder: {
              type: 'BODY',
              index: 0
            }
          }
        },
        {
          objectId: 'subtitle-element-1',
          shape: {
            placeholder: {
              type: 'SUBTITLE',
              index: 0
            }
          }
        }
      ],
      slideProperties: {
        notesPage: {
          notesProperties: {
            speakerNotesObjectId: 'notes-1'
          }
        }
      }
    },
    {
      objectId: 'slide-2',
      pageElements: [
        {
          objectId: 'title-element-2',
          shape: {
            placeholder: {
              type: 'TITLE',
              index: 0
            }
          }
        },
        {
          objectId: 'body-element-2a',
          shape: {
            placeholder: {
              type: 'BODY',
              index: 0
            }
          }
        },
        {
          objectId: 'body-element-2b',
          shape: {
            placeholder: {
              type: 'BODY',
              index: 1
            }
          }
        }
      ]
    }
  ],
  layouts: [
    {
      objectId: 'layout-title',
      layoutProperties: {
        name: 'TITLE',
        displayName: 'Title Slide'
      }
    },
    {
      objectId: 'layout-title-body',
      layoutProperties: {
        name: 'TITLE_AND_BODY',
        displayName: 'Title and Body'
      }
    },
    {
      objectId: 'layout-section',
      layoutProperties: {
        name: 'SECTION_HEADER',
        displayName: 'Section Header'
      }
    }
  ]
}

describe('presentation helpers', () => {
  describe('findPage', () => {
    it('should find page by ID', () => {
      const page = findPage(mockPresentation, 'slide-1')
      
      expect(page).toBeDefined()
      expect(page?.objectId).toBe('slide-1')
    })

    it('should return undefined for non-existent page', () => {
      const page = findPage(mockPresentation, 'non-existent-slide')
      
      expect(page).toBeUndefined()
    })

    it('should return undefined when presentation has no slides', () => {
      const emptyPresentation: SlidesV1.Schema$Presentation = {}
      const page = findPage(emptyPresentation, 'slide-1')
      
      expect(page).toBeUndefined()
    })

    it('should handle empty slides array', () => {
      const presentationWithNoSlides: SlidesV1.Schema$Presentation = {
        slides: []
      }
      const page = findPage(presentationWithNoSlides, 'slide-1')
      
      expect(page).toBeUndefined()
    })
  })

  describe('pageSize', () => {
    it('should return page dimensions', () => {
      const dimensions = pageSize(mockPresentation)
      
      expect(dimensions).toEqual({
        width: 1280,
        height: 720
      })
    })

    it('should throw error when width is missing', () => {
      const presentationNoWidth: SlidesV1.Schema$Presentation = {
        pageSize: {
          height: { magnitude: 720, unit: 'EMU' }
        }
      }
      
      expect(() => pageSize(presentationNoWidth)).toThrow('Presentation width is required')
    })

    it('should throw error when height is missing', () => {
      const presentationNoHeight: SlidesV1.Schema$Presentation = {
        pageSize: {
          width: { magnitude: 1280, unit: 'EMU' }
        }
      }
      
      expect(() => pageSize(presentationNoHeight)).toThrow('Presentation height is required')
    })

    it('should throw error when pageSize is missing', () => {
      const presentationNoPageSize: SlidesV1.Schema$Presentation = {}
      
      expect(() => pageSize(presentationNoPageSize)).toThrow('Presentation width is required')
    })

    it('should handle different units', () => {
      const presentationDifferentUnit: SlidesV1.Schema$Presentation = {
        pageSize: {
          width: { magnitude: 1920, unit: 'PT' },
          height: { magnitude: 1080, unit: 'PT' }
        }
      }
      
      const dimensions = pageSize(presentationDifferentUnit)
      expect(dimensions).toEqual({
        width: 1920,
        height: 1080
      })
    })
  })

  describe('findLayoutIdByName', () => {
    it('should find layout by name', () => {
      const layoutId = findLayoutIdByName(mockPresentation, 'TITLE')
      
      expect(layoutId).toBe('layout-title')
    })

    it('should find different layout by name', () => {
      const layoutId = findLayoutIdByName(mockPresentation, 'TITLE_AND_BODY')
      
      expect(layoutId).toBe('layout-title-body')
    })

    it('should return undefined for non-existent layout', () => {
      const layoutId = findLayoutIdByName(mockPresentation, 'NON_EXISTENT_LAYOUT')
      
      expect(layoutId).toBeUndefined()
    })

    it('should return undefined when presentation has no layouts', () => {
      const presentationNoLayouts: SlidesV1.Schema$Presentation = {}
      const layoutId = findLayoutIdByName(presentationNoLayouts, 'TITLE')
      
      expect(layoutId).toBeUndefined()
    })

    it('should handle empty layouts array', () => {
      const presentationEmptyLayouts: SlidesV1.Schema$Presentation = {
        layouts: []
      }
      const layoutId = findLayoutIdByName(presentationEmptyLayouts, 'TITLE')
      
      expect(layoutId).toBeUndefined()
    })

    it('should handle layout without objectId', () => {
      const presentationNoObjectId: SlidesV1.Schema$Presentation = {
        layouts: [
          {
            layoutProperties: {
              name: 'TITLE',
              displayName: 'Title Slide'
            }
          }
        ]
      }
      const layoutId = findLayoutIdByName(presentationNoObjectId, 'TITLE')
      
      expect(layoutId).toBeUndefined()
    })

    it('should handle layout without name', () => {
      const presentationNoName: SlidesV1.Schema$Presentation = {
        layouts: [
          {
            objectId: 'layout-1',
            layoutProperties: {
              displayName: 'Some Layout'
            }
          }
        ]
      }
      const layoutId = findLayoutIdByName(presentationNoName, 'TITLE')
      
      expect(layoutId).toBeUndefined()
    })
  })

  describe('findPlaceholder', () => {
    it('should find placeholder by type', () => {
      const placeholders = findPlaceholder(mockPresentation, 'slide-1', 'TITLE')
      
      expect(placeholders).toBeDefined()
      expect(placeholders).toHaveLength(1)
      expect(placeholders?.[0].objectId).toBe('title-element-1')
    })

    it('should find multiple placeholders of same type', () => {
      const placeholders = findPlaceholder(mockPresentation, 'slide-2', 'BODY')
      
      expect(placeholders).toBeDefined()
      expect(placeholders).toHaveLength(2)
      expect(placeholders?.[0].objectId).toBe('body-element-2a')
      expect(placeholders?.[1].objectId).toBe('body-element-2b')
    })

    it('should find subtitle placeholder', () => {
      const placeholders = findPlaceholder(mockPresentation, 'slide-1', 'SUBTITLE')
      
      expect(placeholders).toBeDefined()
      expect(placeholders).toHaveLength(1)
      expect(placeholders?.[0].objectId).toBe('subtitle-element-1')
    })

    it('should return undefined for non-existent placeholder type', () => {
      const placeholders = findPlaceholder(mockPresentation, 'slide-1', 'NON_EXISTENT_TYPE')
      
      expect(placeholders).toBeUndefined()
    })

    it('should throw error for non-existent page', () => {
      expect(() => findPlaceholder(mockPresentation, 'non-existent-slide', 'TITLE'))
        .toThrow('Can\'t find page non-existent-slide')
    })

    it('should return undefined for page with no elements', () => {
      const presentationNoElements: SlidesV1.Schema$Presentation = {
        slides: [
          {
            objectId: 'slide-no-elements'
          }
        ]
      }
      
      const placeholders = findPlaceholder(presentationNoElements, 'slide-no-elements', 'TITLE')
      
      expect(placeholders).toBeUndefined()
    })

    it('should return undefined for page with empty elements array', () => {
      const presentationEmptyElements: SlidesV1.Schema$Presentation = {
        slides: [
          {
            objectId: 'slide-empty-elements',
            pageElements: []
          }
        ]
      }
      
      const placeholders = findPlaceholder(presentationEmptyElements, 'slide-empty-elements', 'TITLE')
      
      expect(placeholders).toBeUndefined()
    })

    it('should handle elements without shape', () => {
      const presentationNoShape: SlidesV1.Schema$Presentation = {
        slides: [
          {
            objectId: 'slide-no-shape',
            pageElements: [
              {
                objectId: 'element-no-shape'
              }
            ]
          }
        ]
      }
      
      const placeholders = findPlaceholder(presentationNoShape, 'slide-no-shape', 'TITLE')
      
      expect(placeholders).toBeUndefined()
    })

    it('should handle elements without placeholder', () => {
      const presentationNoPlaceholder: SlidesV1.Schema$Presentation = {
        slides: [
          {
            objectId: 'slide-no-placeholder',
            pageElements: [
              {
                objectId: 'element-no-placeholder',
                shape: {}
              }
            ]
          }
        ]
      }
      
      const placeholders = findPlaceholder(presentationNoPlaceholder, 'slide-no-placeholder', 'TITLE')
      
      expect(placeholders).toBeUndefined()
    })
  })

  describe('findSpeakerNotesObjectId', () => {
    it('should find speaker notes object ID', () => {
      const notesId = findSpeakerNotesObjectId(mockPresentation, 'slide-1')
      
      expect(notesId).toBe('notes-1')
    })

    it('should return undefined for slide without notes', () => {
      const notesId = findSpeakerNotesObjectId(mockPresentation, 'slide-2')
      
      expect(notesId).toBeUndefined()
    })

    it('should return undefined for non-existent slide', () => {
      const notesId = findSpeakerNotesObjectId(mockPresentation, 'non-existent-slide')
      
      expect(notesId).toBeUndefined()
    })

    it('should handle slide without slide properties', () => {
      const presentationNoProps: SlidesV1.Schema$Presentation = {
        slides: [
          {
            objectId: 'slide-no-props'
          }
        ]
      }
      
      const notesId = findSpeakerNotesObjectId(presentationNoProps, 'slide-no-props')
      
      expect(notesId).toBeUndefined()
    })

    it('should handle slide without notes page', () => {
      const presentationNoNotesPage: SlidesV1.Schema$Presentation = {
        slides: [
          {
            objectId: 'slide-no-notes-page',
            slideProperties: {}
          }
        ]
      }
      
      const notesId = findSpeakerNotesObjectId(presentationNoNotesPage, 'slide-no-notes-page')
      
      expect(notesId).toBeUndefined()
    })

    it('should handle slide without notes properties', () => {
      const presentationNoNotesProps: SlidesV1.Schema$Presentation = {
        slides: [
          {
            objectId: 'slide-no-notes-props',
            slideProperties: {
              notesPage: {}
            }
          }
        ]
      }
      
      const notesId = findSpeakerNotesObjectId(presentationNoNotesProps, 'slide-no-notes-props')
      
      expect(notesId).toBeUndefined()
    })

    it('should handle slide without speaker notes object ID', () => {
      const presentationNoSpeakerNotes: SlidesV1.Schema$Presentation = {
        slides: [
          {
            objectId: 'slide-no-speaker-notes',
            slideProperties: {
              notesPage: {
                notesProperties: {}
              }
            }
          }
        ]
      }
      
      const notesId = findSpeakerNotesObjectId(presentationNoSpeakerNotes, 'slide-no-speaker-notes')
      
      expect(notesId).toBeUndefined()
    })
  })

  describe('Dimensions interface', () => {
    it('should work with Dimensions interface', () => {
      const dimensions: Dimensions = {
        width: 1920,
        height: 1080
      }
      
      expect(dimensions.width).toBe(1920)
      expect(dimensions.height).toBe(1080)
    })
  })
}) 