import { describe, expect, it } from 'vitest'
import matchLayout from './match_layout'
import { SlideDefinition } from '../slides'
import { slides_v1 as SlidesV1 } from 'googleapis'

// Mock presentation with common layout types
const mockPresentation: SlidesV1.Schema$Presentation = {
  layouts: [
    {
      layoutProperties: {
        name: 'TITLE',
        displayName: 'Title'
      }
    },
    {
      layoutProperties: {
        name: 'SECTION_HEADER',
        displayName: 'Section Header'
      }
    },
    {
      layoutProperties: {
        name: 'TITLE_AND_BODY',
        displayName: 'Title and Body'
      }
    },
    {
      layoutProperties: {
        name: 'TITLE_AND_TWO_COLUMNS',
        displayName: 'Title and Two Columns'
      }
    },
    {
      layoutProperties: {
        name: 'MAIN_POINT',
        displayName: 'Main Point'
      }
    },
    {
      layoutProperties: {
        name: 'BIG_NUMBER',
        displayName: 'Big Number'
      }
    },
    {
      layoutProperties: {
        name: 'SECTION_TITLE_AND_DESCRIPTION',
        displayName: 'Section Title and Description'
      }
    },
    {
      layoutProperties: {
        name: 'BLANK',
        displayName: 'Blank'
      }
    }
  ]
}

describe('matchLayout function', () => {
  it('should match TITLE layout for slide with title and subtitle only', () => {
    const slide: SlideDefinition = {
      title: { rawText: 'Main Title', textRuns: [], listMarkers: [], big: false },
      subtitle: { rawText: 'Subtitle', textRuns: [], listMarkers: [], big: false },
      bodies: [],
      tables: []
    }

    const layout = matchLayout(mockPresentation, slide)
    expect(layout).toBeDefined()
    expect(layout.name).toBe('TITLE')
  })

  it('should match SECTION_HEADER layout for slide with title only', () => {
    const slide: SlideDefinition = {
      title: { rawText: 'Section Title', textRuns: [], listMarkers: [], big: false },
      bodies: [],
      tables: []
    }

    const layout = matchLayout(mockPresentation, slide)
    expect(layout).toBeDefined()
    expect(layout.name).toBe('SECTION_HEADER')
  })

  it('should match TITLE_AND_BODY layout for slide with title and body content', () => {
    const slide: SlideDefinition = {
      title: { rawText: 'Title', textRuns: [], listMarkers: [], big: false },
      bodies: [
        {
          text: { rawText: 'Body content', textRuns: [], listMarkers: [], big: false }
        }
      ],
      tables: []
    }

    const layout = matchLayout(mockPresentation, slide)
    expect(layout).toBeDefined()
    expect(layout.name).toBe('TITLE_AND_BODY')
  })

  it('should match TITLE_AND_TWO_COLUMNS layout for slide with title and two bodies', () => {
    const slide: SlideDefinition = {
      title: { rawText: 'Title', textRuns: [], listMarkers: [], big: false },
      bodies: [
        {
          text: { rawText: 'Left column', textRuns: [], listMarkers: [], big: false }
        },
        {
          text: { rawText: 'Right column', textRuns: [], listMarkers: [], big: false }
        }
      ],
      tables: []
    }

    const layout = matchLayout(mockPresentation, slide)
    expect(layout).toBeDefined()
    expect(layout.name).toBe('TITLE_AND_TWO_COLUMNS')
  })

  it('should match MAIN_POINT layout for slide with big title only', () => {
    const slide: SlideDefinition = {
      title: { rawText: 'Big Title', textRuns: [], listMarkers: [], big: true },
      bodies: [],
      tables: []
    }

    const layout = matchLayout(mockPresentation, slide)
    expect(layout).toBeDefined()
    expect(layout.name).toBe('MAIN_POINT')
  })

  it('should match BIG_NUMBER layout for slide with big title and content', () => {
    const slide: SlideDefinition = {
      title: { rawText: '100%', textRuns: [], listMarkers: [], big: true },
      bodies: [
        {
          text: { rawText: 'Success rate', textRuns: [], listMarkers: [], big: false }
        }
      ],
      tables: []
    }

    const layout = matchLayout(mockPresentation, slide)
    expect(layout).toBeDefined()
    expect(layout.name).toBe('BIG_NUMBER')
  })

  it('should match SECTION_TITLE_AND_DESCRIPTION layout for slide with title, subtitle, and content', () => {
    const slide: SlideDefinition = {
      title: { rawText: 'Section', textRuns: [], listMarkers: [], big: false },
      subtitle: { rawText: 'Description', textRuns: [], listMarkers: [], big: false },
      bodies: [
        {
          text: { rawText: 'Content', textRuns: [], listMarkers: [], big: false }
        }
      ],
      tables: []
    }

    const layout = matchLayout(mockPresentation, slide)
    expect(layout).toBeDefined()
    expect(layout.name).toBe('SECTION_TITLE_AND_DESCRIPTION')
  })

  it('should match BLANK layout for slide with no content', () => {
    const slide: SlideDefinition = {
      bodies: [],
      tables: []
    }

    const layout = matchLayout(mockPresentation, slide)
    expect(layout).toBeDefined()
    expect(layout.name).toBe('BLANK')
  })

  it('should use custom layout when specified', () => {
    const slide: SlideDefinition = {
      title: { rawText: 'Title', textRuns: [], listMarkers: [], big: false },
      customLayout: 'Title and Body',
      bodies: [],
      tables: []
    }

    const layout = matchLayout(mockPresentation, slide)
    expect(layout).toBeDefined()
    expect(layout.name).toBe('TITLE_AND_BODY')
  })

  it('should handle slide with tables', () => {
    const slide: SlideDefinition = {
      title: { rawText: 'Data Table', textRuns: [], listMarkers: [], big: false },
      bodies: [],
      tables: [
        {
          rows: 2,
          columns: 2,
          cells: [
            [
              { rawText: 'A', textRuns: [], listMarkers: [], big: false },
              { rawText: 'B', textRuns: [], listMarkers: [], big: false }
            ],
            [
              { rawText: 'C', textRuns: [], listMarkers: [], big: false },
              { rawText: 'D', textRuns: [], listMarkers: [], big: false }
            ]
          ]
        }
      ]
    }

    const layout = matchLayout(mockPresentation, slide)
    expect(layout).toBeDefined()
    expect(layout.name).toBe('TITLE_AND_BODY')
  })

  it('should fall back to first available layout when matched layout not found', () => {
    const limitedPresentation: SlidesV1.Schema$Presentation = {
      layouts: [
        {
          layoutProperties: {
            name: 'CUSTOM_LAYOUT',
            displayName: 'Custom Layout'
          }
        }
      ]
    }

    const slide: SlideDefinition = {
      title: { rawText: 'Title', textRuns: [], listMarkers: [], big: false },
      subtitle: { rawText: 'Subtitle', textRuns: [], listMarkers: [], big: false },
      bodies: [],
      tables: []
    }

    const layout = matchLayout(limitedPresentation, slide)
    expect(layout).toBeDefined()
    expect(layout.name).toBe('CUSTOM_LAYOUT')
  })

  it('should handle empty layouts array gracefully', () => {
    const emptyPresentation: SlidesV1.Schema$Presentation = {
      layouts: []
    }

    const slide: SlideDefinition = {
      title: { rawText: 'Title', textRuns: [], listMarkers: [], big: false },
      bodies: [],
      tables: []
    }

    // Will match SECTION_HEADER, but then find no available layouts, so layoutName stays as determined
    // Then GenericLayout constructor will handle the missing layout
    const layout = matchLayout(emptyPresentation, slide)
    expect(layout).toBeDefined()
    expect(layout.name).toBe('SECTION_HEADER')
  })

  it('should handle undefined layouts in presentation gracefully', () => {
    const noLayoutsPresentation: SlidesV1.Schema$Presentation = {}

    const slide: SlideDefinition = {
      title: { rawText: 'Title', textRuns: [], listMarkers: [], big: false },
      bodies: [],
      tables: []
    }

    // Will match SECTION_HEADER since there are no available layouts to check against
    const layout = matchLayout(noLayoutsPresentation, slide)
    expect(layout).toBeDefined()
    expect(layout.name).toBe('SECTION_HEADER')
  })

  it('should handle custom layout that does not exist in presentation', () => {
    const slide: SlideDefinition = {
      title: { rawText: 'Title', textRuns: [], listMarkers: [], big: false },
      customLayout: 'Non Existent Layout',
      bodies: [],
      tables: []
    }

    const layout = matchLayout(mockPresentation, slide)
    expect(layout).toBeDefined()
    // Should fall back to matching based on content
    expect(layout.name).toBe('SECTION_HEADER')
  })

  it('should handle slide with empty text content', () => {
    const slide: SlideDefinition = {
      title: { rawText: '', textRuns: [], listMarkers: [], big: false },
      bodies: [
        {
          text: { rawText: '', textRuns: [], listMarkers: [], big: false }
        }
      ],
      tables: []
    }

    const layout = matchLayout(mockPresentation, slide)
    expect(layout).toBeDefined()
    // Will match TITLE_AND_BODY since it has title and bodies, even if empty
    expect(layout.name).toBe('TITLE_AND_BODY')
  })

  it('should prioritize first matching layout (order matters)', () => {
    // Since TITLE_AND_BODY matches anything with title OR bodies,
    // it should match before BLANK for a slide with just bodies
    const slide: SlideDefinition = {
      bodies: [
        {
          text: { rawText: 'Content', textRuns: [], listMarkers: [], big: false }
        }
      ],
      tables: []
    }

    const layout = matchLayout(mockPresentation, slide)
    expect(layout).toBeDefined()
    expect(layout.name).toBe('TITLE_AND_BODY')
  })

  it('should handle slide with multiple tables', () => {
    const slide: SlideDefinition = {
      title: { rawText: 'Multiple Tables', textRuns: [], listMarkers: [], big: false },
      bodies: [],
      tables: [
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
    }

    const layout = matchLayout(mockPresentation, slide)
    expect(layout).toBeDefined()
    expect(layout.name).toBe('TITLE_AND_BODY')
  })
}) 