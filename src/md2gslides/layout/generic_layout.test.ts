import { describe, expect, it, vi, beforeEach } from 'vitest'
import GenericLayout from './generic_layout'
import { SlideDefinition, TextDefinition, TableDefinition } from '../slides'
import { slides_v1 as SlidesV1 } from 'googleapis'

// Mock the uuid function
vi.mock('../utils', () => ({
  uuid: vi.fn(() => 'test-uuid-123'),
  assert: vi.fn((condition: any, message?: string) => {
    if (!condition) {
      throw new Error(message || 'Assertion failed')
    }
  })
}))

// Mock the presentation helpers
vi.mock('./presentation_helpers', () => ({
  findLayoutIdByName: vi.fn((presentation: any, name: string) => {
    if (name === 'TITLE') return 'layout-title-id'
    if (name === 'TITLE_AND_BODY') return 'layout-title-body-id'
    return undefined
  }),
  findPlaceholder: vi.fn((presentation: any, slideId: string, placeholderType: string) => {
    if (placeholderType === 'TITLE') {
      return [{ objectId: 'title-placeholder-id' }]
    }
    if (placeholderType === 'SUBTITLE') {
      return [{ objectId: 'subtitle-placeholder-id' }]
    }
    if (placeholderType === 'BODY') {
      return [
        { objectId: 'body-placeholder-1-id' },
        { objectId: 'body-placeholder-2-id' }
      ]
    }
    return undefined
  }),
  findSpeakerNotesObjectId: vi.fn(() => 'speaker-notes-id')
}))

describe('GenericLayout class', () => {
  let mockPresentation: SlidesV1.Schema$Presentation
  let mockSlide: SlideDefinition
  let layout: GenericLayout

  beforeEach(() => {
    mockPresentation = {
      presentationId: 'test-presentation-id',
      pageSize: {
        width: { magnitude: 1280, unit: 'EMU' },
        height: { magnitude: 720, unit: 'EMU' }
      },
      layouts: [
        {
          objectId: 'layout-title-id',
          layoutProperties: {
            name: 'TITLE',
            displayName: 'Title Layout'
          }
        },
        {
          objectId: 'layout-title-body-id',
          layoutProperties: {
            name: 'TITLE_AND_BODY',
            displayName: 'Title and Body Layout'
          }
        }
      ]
    }

    mockSlide = {
      title: {
        rawText: 'Test Title',
        textRuns: [],
        listMarkers: [],
        big: false
      },
      bodies: [],
      tables: []
    }

    layout = new GenericLayout('TITLE', mockPresentation, mockSlide)
  })

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(layout.name).toBe('TITLE')
      expect(layout.presentation).toBe(mockPresentation)
    })

    it('should accept different layout names', () => {
      const titleBodyLayout = new GenericLayout('TITLE_AND_BODY', mockPresentation, mockSlide)
      expect(titleBodyLayout.name).toBe('TITLE_AND_BODY')
    })
  })

  describe('appendCreateSlideRequest', () => {
    it('should create slide request with correct layout', () => {
      const requests: SlidesV1.Schema$Request[] = []
      
      const result = layout.appendCreateSlideRequest(requests)
      
      expect(result).toHaveLength(1)
      expect(result[0].createSlide?.slideLayoutReference?.layoutId).toBe('layout-title-id')
      expect(result[0].createSlide?.objectId).toBe('test-uuid-123')
      expect(mockSlide.objectId).toBe('test-uuid-123')
    })

    it('should throw error when layout not found', () => {
      const invalidLayout = new GenericLayout('NON_EXISTENT_LAYOUT', mockPresentation, mockSlide)
      const requests: SlidesV1.Schema$Request[] = []
      
      expect(() => invalidLayout.appendCreateSlideRequest(requests)).toThrow(
        'Unable to find layout "NON_EXISTENT_LAYOUT"'
      )
    })

    it('should append to existing requests array', () => {
      const requests: SlidesV1.Schema$Request[] = [
        { createSlide: { objectId: 'existing-slide' } }
      ]
      
      const result = layout.appendCreateSlideRequest(requests)
      
      expect(result).toHaveLength(2)
      expect(result[0].createSlide?.objectId).toBe('existing-slide')
      expect(result[1].createSlide?.objectId).toBe('test-uuid-123')
    })
  })

  describe('appendContentRequests', () => {
    beforeEach(() => {
      mockSlide.objectId = 'test-slide-id'
    })

    it('should fill title placeholder', () => {
      mockSlide.title = {
        rawText: 'Test Title',
        textRuns: [],
        listMarkers: [],
        big: false
      }

      const requests: SlidesV1.Schema$Request[] = []
      layout.appendContentRequests(requests)

      const insertTextRequest = requests.find(r => r.insertText)
      expect(insertTextRequest?.insertText?.text).toBe('Test Title')
      expect(insertTextRequest?.insertText?.objectId).toBe('title-placeholder-id')
    })

    it('should fill subtitle placeholder', () => {
      mockSlide.subtitle = {
        rawText: 'Test Subtitle',
        textRuns: [],
        listMarkers: [],
        big: false
      }

      const requests: SlidesV1.Schema$Request[] = []
      layout.appendContentRequests(requests)

      const insertTextRequest = requests.find(r => 
        r.insertText?.text === 'Test Subtitle' && 
        r.insertText?.objectId === 'subtitle-placeholder-id'
      )
      expect(insertTextRequest).toBeDefined()
    })

    it('should handle body content', () => {
      mockSlide.bodies = [
        {
          text: {
            rawText: 'Body text 1',
            textRuns: [],
            listMarkers: [],
            big: false
          }
        },
        {
          text: {
            rawText: 'Body text 2',
            textRuns: [],
            listMarkers: [],
            big: false
          }
        }
      ]

      const requests: SlidesV1.Schema$Request[] = []
      layout.appendContentRequests(requests)

      const bodyRequests = requests.filter(r => 
        r.insertText?.text?.includes('Body text')
      )
      expect(bodyRequests).toHaveLength(2)
      expect(bodyRequests[0].insertText?.objectId).toBe('body-placeholder-1-id')
      expect(bodyRequests[1].insertText?.objectId).toBe('body-placeholder-2-id')
    })

    it('should handle speaker notes', () => {
      mockSlide.notes = 'These are speaker notes'

      const requests: SlidesV1.Schema$Request[] = []
      layout.appendContentRequests(requests)

      const notesRequest = requests.find(r => 
        r.insertText?.text === 'These are speaker notes'
      )
      expect(notesRequest?.insertText?.objectId).toBe('speaker-notes-id')
    })

    it('should create table when tables present', () => {
      mockSlide.tables = [
        {
          rows: 2,
          columns: 2,
          cells: [
            [
              { rawText: 'A1', textRuns: [], listMarkers: [], big: false },
              { rawText: 'B1', textRuns: [], listMarkers: [], big: false }
            ],
            [
              { rawText: 'A2', textRuns: [], listMarkers: [], big: false },
              { rawText: 'B2', textRuns: [], listMarkers: [], big: false }
            ]
          ]
        }
      ]

      const requests: SlidesV1.Schema$Request[] = []
      layout.appendContentRequests(requests)

      const createTableRequest = requests.find(r => r.createTable)
      expect(createTableRequest?.createTable?.rows).toBe(2)
      expect(createTableRequest?.createTable?.columns).toBe(2)
      expect(createTableRequest?.createTable?.objectId).toBe('test-uuid-123')

      const cellTextRequests = requests.filter(r => 
        r.insertText?.cellLocation
      )
      expect(cellTextRequests).toHaveLength(4)
    })

    it('should handle empty/undefined content gracefully', () => {
      mockSlide.title = undefined
      mockSlide.subtitle = undefined
      mockSlide.bodies = []
      mockSlide.tables = []
      mockSlide.notes = undefined

      const requests: SlidesV1.Schema$Request[] = []
      layout.appendContentRequests(requests)

      expect(requests).toHaveLength(0)
    })
  })

  describe('text formatting and styling', () => {
    beforeEach(() => {
      mockSlide.objectId = 'test-slide-id'
    })

    it('should apply text runs for formatting', () => {
      mockSlide.title = {
        rawText: 'Bold and italic text',
        textRuns: [
          {
            bold: true,
            start: 0,
            end: 4
          },
          {
            italic: true,
            start: 9,
            end: 15
          }
        ],
        listMarkers: [],
        big: false
      }

      const requests: SlidesV1.Schema$Request[] = []
      layout.appendContentRequests(requests)

      const styleRequests = requests.filter(r => r.updateTextStyle)
      expect(styleRequests).toHaveLength(2)
      
      const boldRequest = styleRequests.find(r => r.updateTextStyle?.style?.bold)
      expect(boldRequest?.updateTextStyle?.textRange?.startIndex).toBe(0)
      expect(boldRequest?.updateTextStyle?.textRange?.endIndex).toBe(4)
      
      const italicRequest = styleRequests.find(r => r.updateTextStyle?.style?.italic)
      expect(italicRequest?.updateTextStyle?.textRange?.startIndex).toBe(9)
      expect(italicRequest?.updateTextStyle?.textRange?.endIndex).toBe(15)
    })

    it('should apply complex text styling', () => {
      mockSlide.title = {
        rawText: 'Formatted text',
        textRuns: [
          {
            bold: true,
            italic: true,
            underline: true,
            strikethrough: true,
            fontFamily: 'Arial',
            fontSize: { magnitude: 24, unit: 'pt' },
            foregroundColor: {
              opaqueColor: { themeColor: 'ACCENT1' }
            },
            start: 0,
            end: 9
          }
        ],
        listMarkers: [],
        big: false
      }

      const requests: SlidesV1.Schema$Request[] = []
      layout.appendContentRequests(requests)

      const styleRequest = requests.find(r => r.updateTextStyle)
      expect(styleRequest?.updateTextStyle?.style?.bold).toBe(true)
      expect(styleRequest?.updateTextStyle?.style?.italic).toBe(true)
      expect(styleRequest?.updateTextStyle?.style?.underline).toBe(true)
      expect(styleRequest?.updateTextStyle?.style?.strikethrough).toBe(true)
      expect(styleRequest?.updateTextStyle?.style?.fontFamily).toBe('Arial')
      expect(styleRequest?.updateTextStyle?.style?.fontSize?.magnitude).toBe(24)
      expect(styleRequest?.updateTextStyle?.fields).toContain('bold')
      expect(styleRequest?.updateTextStyle?.fields).toContain('fontFamily')
    })

    it('should handle list markers', () => {
      mockSlide.bodies = [
        {
          text: {
            rawText: 'Item 1\nItem 2\nItem 3',
            textRuns: [],
            listMarkers: [
              {
                start: 0,
                end: 21,
                type: 'unordered'
              }
            ],
            big: false
          }
        }
      ]

      const requests: SlidesV1.Schema$Request[] = []
      layout.appendContentRequests(requests)

      const bulletRequest = requests.find(r => r.createParagraphBullets)
      expect(bulletRequest?.createParagraphBullets?.textRange?.startIndex).toBe(0)
      expect(bulletRequest?.createParagraphBullets?.textRange?.endIndex).toBe(21)
      expect(bulletRequest?.createParagraphBullets?.bulletPreset).toBe('BULLET_DISC_CIRCLE_SQUARE')
    })

    it('should handle ordered list markers', () => {
      mockSlide.bodies = [
        {
          text: {
            rawText: '1. First\n2. Second\n3. Third',
            textRuns: [],
            listMarkers: [
              {
                start: 0,
                end: 25,
                type: 'ordered'
              }
            ],
            big: false
          }
        }
      ]

      const requests: SlidesV1.Schema$Request[] = []
      layout.appendContentRequests(requests)

      const bulletRequest = requests.find(r => r.createParagraphBullets)
      expect(bulletRequest?.createParagraphBullets?.bulletPreset).toBe('NUMBERED_DIGIT_ALPHA_ROMAN')
    })
  })

  describe('table creation', () => {
    beforeEach(() => {
      mockSlide.objectId = 'test-slide-id'
    })

    it('should throw error for multiple tables', () => {
      mockSlide.tables = [
        {
          rows: 1,
          columns: 1,
          cells: [[{ rawText: 'Table 1', textRuns: [], listMarkers: [], big: false }]]
        },
        {
          rows: 1,
          columns: 1,
          cells: [[{ rawText: 'Table 2', textRuns: [], listMarkers: [], big: false }]]
        }
      ]

      const requests: SlidesV1.Schema$Request[] = []
      
      expect(() => layout.appendContentRequests(requests)).toThrow(
        'Multiple tables per slide are not supported.'
      )
    })

    it('should create table with correct cell content', () => {
      const table: TableDefinition = {
        rows: 2,
        columns: 3,
        cells: [
          [
            { rawText: 'Header 1', textRuns: [{ bold: true, start: 0, end: 8 }], listMarkers: [], big: false },
            { rawText: 'Header 2', textRuns: [], listMarkers: [], big: false },
            { rawText: 'Header 3', textRuns: [], listMarkers: [], big: false }
          ],
          [
            { rawText: 'Data 1', textRuns: [], listMarkers: [], big: false },
            { rawText: 'Data 2', textRuns: [], listMarkers: [], big: false },
            { rawText: 'Data 3', textRuns: [], listMarkers: [], big: false }
          ]
        ]
      }
      mockSlide.tables = [table]

      const requests: SlidesV1.Schema$Request[] = []
      layout.appendContentRequests(requests)

      const createTableRequest = requests.find(r => r.createTable)
      expect(createTableRequest?.createTable?.rows).toBe(2)
      expect(createTableRequest?.createTable?.columns).toBe(3)

      const cellRequests = requests.filter(r => r.insertText?.cellLocation)
      expect(cellRequests).toHaveLength(6)
      
      const header1Request = cellRequests.find(r => 
        r.insertText?.text === 'Header 1' &&
        r.insertText?.cellLocation?.rowIndex === 0 &&
        r.insertText?.cellLocation?.columnIndex === 0
      )
      expect(header1Request).toBeDefined()

      const data3Request = cellRequests.find(r => 
        r.insertText?.text === 'Data 3' &&
        r.insertText?.cellLocation?.rowIndex === 1 &&
        r.insertText?.cellLocation?.columnIndex === 2
      )
      expect(data3Request).toBeDefined()
    })
  })

  describe('bounding box calculations', () => {
    it('should calculate bounding box correctly', () => {
      const element: SlidesV1.Schema$PageElement = {
        objectId: 'test-element',
        size: {
          width: { magnitude: 100 },
          height: { magnitude: 50 }
        },
        transform: {
          scaleX: 2,
          scaleY: 1.5,
          translateX: 10,
          translateY: 20
        }
      }

      // Access protected method through type assertion
      const boundingBox = (layout as any).calculateBoundingBox(element)
      
      expect(boundingBox).toEqual({
        width: 200, // scaleX * width = 2 * 100
        height: 75, // scaleY * height = 1.5 * 50
        x: 10,
        y: 20
      })
    })

    it('should handle default transform values', () => {
      const element: SlidesV1.Schema$PageElement = {
        objectId: 'test-element',
        size: {
          width: { magnitude: 100 },
          height: { magnitude: 50 }
        }
      }

      const boundingBox = (layout as any).calculateBoundingBox(element)
      
      expect(boundingBox).toEqual({
        width: 100,
        height: 50,
        x: 0,
        y: 0
      })
    })

    it('should get body bounding box from placeholder', () => {
      const placeholder: SlidesV1.Schema$PageElement = {
        objectId: 'body-placeholder',
        size: {
          width: { magnitude: 800 },
          height: { magnitude: 600 }
        },
        transform: {
          translateX: 50,
          translateY: 100
        }
      }

      const boundingBox = (layout as any).getBodyBoundingBox(placeholder)
      
      expect(boundingBox.width).toBe(800)
      expect(boundingBox.height).toBe(600)
      expect(boundingBox.x).toBe(50)
      expect(boundingBox.y).toBe(100)
    })

    it('should get body bounding box from presentation when no placeholder', () => {
      const boundingBox = (layout as any).getBodyBoundingBox(undefined)
      
      expect(boundingBox).toEqual({
        width: 1280,
        height: 720,
        x: 0,
        y: 0
      })
    })
  })

  describe('field mask computation', () => {
    it('should compute field mask for object with defined properties', () => {
      const object = {
        bold: true,
        italic: false,
        fontSize: { magnitude: 12, unit: 'pt' },
        undefined_prop: undefined,
        fontFamily: 'Arial'
      }

      const fieldMask = (layout as any).computeShallowFieldMask(object)
      
      expect(fieldMask).toBe('bold,italic,fontSize,fontFamily')
    })

    it('should handle empty object', () => {
      const object = {}
      const fieldMask = (layout as any).computeShallowFieldMask(object)
      
      expect(fieldMask).toBe('')
    })

    it('should exclude undefined properties', () => {
      const object = {
        defined: 'value',
        undefinedProp: undefined,
        nullProp: null,
        falseProp: false,
        zeroProp: 0,
        emptyStringProp: ''
      }

      const fieldMask = (layout as any).computeShallowFieldMask(object)
      
      expect(fieldMask).toBe('defined,nullProp,falseProp,zeroProp,emptyStringProp')
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle slide without objectId for content requests', () => {
      // Reset objectId
      mockSlide.objectId = undefined
      mockSlide.title = {
        rawText: 'Test Title',
        textRuns: [],
        listMarkers: [],
        big: false
      }

      const requests: SlidesV1.Schema$Request[] = []
      
      // When slide has no objectId, it will throw assertion error when trying to find placeholders
      expect(() => layout.appendContentRequests(requests)).toThrow('Assertion failed')
    })

    it('should handle presentation without page size for bounding box', () => {
      const presentationNoPageSize = { ...mockPresentation }
      delete presentationNoPageSize.pageSize
      
      const layoutNoPageSize = new GenericLayout('TITLE', presentationNoPageSize, mockSlide)
      
      expect(() => (layoutNoPageSize as any).getBodyBoundingBox(undefined)).toThrow()
    })

    it('should handle element without size for bounding box calculation', () => {
      const element: SlidesV1.Schema$PageElement = {
        objectId: 'test-element'
      }

      expect(() => (layout as any).calculateBoundingBox(element)).toThrow()
    })
  })
}) 