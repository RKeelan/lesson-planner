import { describe, expect, it } from 'vitest'
import {
  SlideDefinition,
  TextDefinition,
  StyleDefinition,
  TableDefinition,
  ListMarker,
  ListDefinition,
  BodyDefinition,
  LinkDefinition,
  FontSize
} from './slides'

describe('Slide Type Definitions', () => {
  describe('TextDefinition', () => {
    it('should create a valid TextDefinition', () => {
      const textDef: TextDefinition = {
        rawText: 'Hello World',
        textRuns: [],
        listMarkers: [],
        big: false
      }

      expect(textDef.rawText).toBe('Hello World')
      expect(textDef.textRuns).toEqual([])
      expect(textDef.listMarkers).toEqual([])
      expect(textDef.big).toBe(false)
    })

    it('should handle text with formatting', () => {
      const textDef: TextDefinition = {
        rawText: 'Hello bold world',
        textRuns: [
          {
            bold: true,
            start: 6,
            end: 10
          }
        ],
        listMarkers: [],
        big: false
      }

      expect(textDef.textRuns).toHaveLength(1)
      expect(textDef.textRuns[0].bold).toBe(true)
      expect(textDef.textRuns[0].start).toBe(6)
      expect(textDef.textRuns[0].end).toBe(10)
    })

    it('should handle big text', () => {
      const textDef: TextDefinition = {
        rawText: 'BIG TITLE',
        textRuns: [],
        listMarkers: [],
        big: true
      }

      expect(textDef.big).toBe(true)
    })
  })

  describe('StyleDefinition', () => {
    it('should create basic style definition', () => {
      const style: StyleDefinition = {
        bold: true,
        italic: false,
        start: 0,
        end: 5
      }

      expect(style.bold).toBe(true)
      expect(style.italic).toBe(false)
      expect(style.start).toBe(0)
      expect(style.end).toBe(5)
    })

    it('should handle font styling', () => {
      const style: StyleDefinition = {
        fontFamily: 'Arial',
        fontSize: {
          magnitude: 12,
          unit: 'pt'
        },
        start: 0,
        end: 10
      }

      expect(style.fontFamily).toBe('Arial')
      expect(style.fontSize?.magnitude).toBe(12)
      expect(style.fontSize?.unit).toBe('pt')
    })

    it('should handle color styling', () => {
      const style: StyleDefinition = {
        foregroundColor: {
          opaqueColor: {
            themeColor: 'TEXT1'
          }
        },
        backgroundColor: {
          opaqueColor: {
            rgbColor: {
              red: 1.0,
              green: 0.5,
              blue: 0.0
            }
          }
        }
      }

      expect(style.foregroundColor?.opaqueColor?.themeColor).toBe('TEXT1')
      expect(style.backgroundColor?.opaqueColor?.rgbColor?.red).toBe(1.0)
    })

    it('should handle links', () => {
      const linkDef: LinkDefinition = {
        url: 'https://example.com'
      }

      const style: StyleDefinition = {
        link: linkDef,
        underline: true
      }

      expect(style.link?.url).toBe('https://example.com')
      expect(style.underline).toBe(true)
    })

    it('should handle text decorations', () => {
      const style: StyleDefinition = {
        underline: true,
        strikethrough: true,
        smallCaps: true,
        baselineOffset: 'SUPERSCRIPT'
      }

      expect(style.underline).toBe(true)
      expect(style.strikethrough).toBe(true)
      expect(style.smallCaps).toBe(true)
      expect(style.baselineOffset).toBe('SUPERSCRIPT')
    })
  })

  describe('ListMarker', () => {
    it('should create unordered list marker', () => {
      const marker: ListMarker = {
        start: 0,
        end: 20,
        type: 'unordered'
      }

      expect(marker.start).toBe(0)
      expect(marker.end).toBe(20)
      expect(marker.type).toBe('unordered')
    })

    it('should create ordered list marker', () => {
      const marker: ListMarker = {
        start: 5,
        end: 25,
        type: 'ordered'
      }

      expect(marker.start).toBe(5)
      expect(marker.end).toBe(25)
      expect(marker.type).toBe('ordered')
    })
  })

  describe('ListDefinition', () => {
    it('should create list definition', () => {
      const listDef: ListDefinition = {
        depth: 1,
        tag: 'ul',
        start: 0,
        end: 50
      }

      expect(listDef.depth).toBe(1)
      expect(listDef.tag).toBe('ul')
      expect(listDef.start).toBe(0)
      expect(listDef.end).toBe(50)
    })

    it('should handle nested lists', () => {
      const listDef: ListDefinition = {
        depth: 2,
        tag: 'ol',
        start: 10
      }

      expect(listDef.depth).toBe(2)
      expect(listDef.tag).toBe('ol')
      expect(listDef.start).toBe(10)
      expect(listDef.end).toBeUndefined()
    })
  })

  describe('TableDefinition', () => {
    it('should create table definition', () => {
      const tableDef: TableDefinition = {
        rows: 2,
        columns: 3,
        cells: [
          [
            { rawText: 'A1', textRuns: [], listMarkers: [], big: false },
            { rawText: 'B1', textRuns: [], listMarkers: [], big: false },
            { rawText: 'C1', textRuns: [], listMarkers: [], big: false }
          ],
          [
            { rawText: 'A2', textRuns: [], listMarkers: [], big: false },
            { rawText: 'B2', textRuns: [], listMarkers: [], big: false },
            { rawText: 'C2', textRuns: [], listMarkers: [], big: false }
          ]
        ]
      }

      expect(tableDef.rows).toBe(2)
      expect(tableDef.columns).toBe(3)
      expect(tableDef.cells).toHaveLength(2)
      expect(tableDef.cells[0]).toHaveLength(3)
      expect(tableDef.cells[0][0].rawText).toBe('A1')
    })

    it('should handle empty table', () => {
      const tableDef: TableDefinition = {
        rows: 0,
        columns: 0,
        cells: []
      }

      expect(tableDef.rows).toBe(0)
      expect(tableDef.columns).toBe(0)
      expect(tableDef.cells).toHaveLength(0)
    })
  })

  describe('BodyDefinition', () => {
    it('should create body definition with text', () => {
      const bodyDef: BodyDefinition = {
        text: {
          rawText: 'Body content',
          textRuns: [],
          listMarkers: [],
          big: false
        }
      }

      expect(bodyDef.text?.rawText).toBe('Body content')
    })

    it('should handle body definition without text', () => {
      const bodyDef: BodyDefinition = {
        text: undefined
      }

      expect(bodyDef.text).toBeUndefined()
    })
  })

  describe('SlideDefinition', () => {
    it('should create minimal slide definition', () => {
      const slideDef: SlideDefinition = {
        bodies: [],
        tables: []
      }

      expect(slideDef.bodies).toEqual([])
      expect(slideDef.tables).toEqual([])
      expect(slideDef.title).toBeUndefined()
      expect(slideDef.subtitle).toBeUndefined()
    })

    it('should create complete slide definition', () => {
      const slideDef: SlideDefinition = {
        title: {
          rawText: 'Slide Title',
          textRuns: [],
          listMarkers: [],
          big: false
        },
        subtitle: {
          rawText: 'Slide Subtitle',
          textRuns: [],
          listMarkers: [],
          big: false
        },
        bodies: [
          {
            text: {
              rawText: 'Body content',
              textRuns: [],
              listMarkers: [],
              big: false
            }
          }
        ],
        tables: [],
        objectId: 'slide-123',
        index: 0,
        notes: 'Speaker notes'
      }

      expect(slideDef.title?.rawText).toBe('Slide Title')
      expect(slideDef.subtitle?.rawText).toBe('Slide Subtitle')
      expect(slideDef.bodies).toHaveLength(1)
      expect(slideDef.objectId).toBe('slide-123')
      expect(slideDef.index).toBe(0)
      expect(slideDef.notes).toBe('Speaker notes')
    })

    it('should handle slide with custom properties', () => {
      const slideDef: SlideDefinition = {
        bodies: [],
        tables: [],
        layout: 'TITLE_AND_BODY',
        theme: 'Modern',
        transition: 'FADE',
        autoSlide: 5000,
        loop: true,
        showSlideNum: true,
        showTotalSlideNum: false,
        customLayout: 'Custom Layout Name'
      }

      expect(slideDef.layout).toBe('TITLE_AND_BODY')
      expect(slideDef.theme).toBe('Modern')
      expect(slideDef.transition).toBe('FADE')
      expect(slideDef.autoSlide).toBe(5000)
      expect(slideDef.loop).toBe(true)
      expect(slideDef.showSlideNum).toBe(true)
      expect(slideDef.showTotalSlideNum).toBe(false)
      expect(slideDef.customLayout).toBe('Custom Layout Name')
    })
  })

  describe('FontSize', () => {
    it('should create font size definition', () => {
      const fontSize: FontSize = {
        magnitude: 16,
        unit: 'pt'
      }

      expect(fontSize.magnitude).toBe(16)
      expect(fontSize.unit).toBe('pt')
    })

    it('should handle different units', () => {
      const fontSizePx: FontSize = {
        magnitude: 12,
        unit: 'px'
      }

      const fontSizeEm: FontSize = {
        magnitude: 1.5,
        unit: 'em'
      }

      expect(fontSizePx.unit).toBe('px')
      expect(fontSizeEm.magnitude).toBe(1.5)
      expect(fontSizeEm.unit).toBe('em')
    })
  })

  describe('Type compatibility', () => {
    it('should allow optional properties to be undefined', () => {
      const style: StyleDefinition = {
        start: 0,
        end: 5
      }

      // All optional properties should be allowed to be undefined
      expect(style.bold).toBeUndefined()
      expect(style.italic).toBeUndefined()
      expect(style.fontFamily).toBeUndefined()
      expect(style.foregroundColor).toBeUndefined()
      expect(style.backgroundColor).toBeUndefined()
      expect(style.link).toBeUndefined()
      expect(style.underline).toBeUndefined()
      expect(style.strikethrough).toBeUndefined()
      expect(style.smallCaps).toBeUndefined()
      expect(style.baselineOffset).toBeUndefined()
      expect(style.fontSize).toBeUndefined()
    })

    it('should handle complex nested structures', () => {
      const slide: SlideDefinition = {
        title: {
          rawText: 'Complex Slide',
          textRuns: [
            {
              bold: true,
              italic: true,
              fontFamily: 'Arial',
              fontSize: { magnitude: 24, unit: 'pt' },
              foregroundColor: {
                opaqueColor: {
                  themeColor: 'ACCENT1'
                }
              },
              link: {
                url: 'https://example.com'
              },
              start: 0,
              end: 12
            }
          ],
          listMarkers: [
            {
              start: 0,
              end: 12,
              type: 'unordered'
            }
          ],
          big: true
        },
        bodies: [
          {
            text: {
              rawText: 'List content:\n\t• Item 1\n\t• Item 2',
              textRuns: [],
              listMarkers: [
                {
                  start: 14,
                  end: 30,
                  type: 'unordered'
                }
              ],
              big: false
            }
          }
        ],
        tables: [
          {
            rows: 1,
            columns: 2,
            cells: [
              [
                {
                  rawText: 'Header 1',
                  textRuns: [{ bold: true, start: 0, end: 8 }],
                  listMarkers: [],
                  big: false
                },
                {
                  rawText: 'Header 2',
                  textRuns: [{ bold: true, start: 0, end: 8 }],
                  listMarkers: [],
                  big: false
                }
              ]
            ]
          }
        ],
        objectId: 'complex-slide-id',
        notes: 'These are speaker notes for the complex slide'
      }

      expect(slide.title?.rawText).toBe('Complex Slide')
      expect(slide.title?.textRuns[0].bold).toBe(true)
      expect(slide.title?.textRuns[0].link?.url).toBe('https://example.com')
      expect(slide.bodies[0].text?.listMarkers[0].type).toBe('unordered')
      expect(slide.tables[0].cells[0][0].textRuns[0].bold).toBe(true)
    })
  })
}) 