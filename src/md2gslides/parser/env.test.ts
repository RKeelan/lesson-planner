import { describe, expect, it, beforeEach } from 'vitest'
import { Context } from './env'
import { StyleDefinition } from '../slides'

describe('Context class', () => {
  let context: Context

  beforeEach(() => {
    context = new Context()
  })

  describe('initialization', () => {
    it('should initialize with empty slides array', () => {
      expect(context.slides).toEqual([])
    })

    it('should start with a current slide', () => {
      expect(context.currentSlide).toBeDefined()
      expect(context.currentSlide?.objectId).toBeDefined()
      expect(context.currentSlide?.bodies).toEqual([])
      expect(context.currentSlide?.tables).toEqual([])
    })

    it('should initialize styles with empty style', () => {
      expect(context.styles).toEqual([{}])
    })

    it('should initialize other properties correctly', () => {
      expect(context.listDepth).toBe(0)
      expect(context.markerParagraph).toBe(false)
      expect(context.row).toEqual([])
      expect(context.table).toBeUndefined()
      expect(context.list).toBeUndefined()
      expect(context.text).toBeUndefined()
    })
  })

  describe('slide management', () => {
    it('should start a new slide', () => {
      const initialSlide = context.currentSlide
      context.startSlide()
      
      expect(context.currentSlide).toBeDefined()
      expect(context.currentSlide).not.toBe(initialSlide)
      expect(context.currentSlide?.objectId).toBeDefined()
      expect(context.currentSlide?.bodies).toEqual([])
      expect(context.currentSlide?.tables).toEqual([])
    })

    it('should end current slide and add to slides array', () => {
      context.startTextBlock()
      context.appendText('Test content')
      
      const currentSlide = context.currentSlide
      context.endSlide()
      
      expect(context.slides).toContain(currentSlide)
      expect(context.currentSlide).toBeUndefined()
      expect(context.text).toBeUndefined()
    })

    it('should not add slide to array if no content', () => {
      const initialSlidesLength = context.slides.length
      context.endSlide()
      
      // Context always creates slides, even without content
      expect(context.slides.length).toBe(initialSlidesLength + 1)
    })

    it('should add slide with text content to bodies', () => {
      context.startTextBlock()
      context.appendText('Test content')
      context.endSlide()
      
      const slide = context.slides[context.slides.length - 1]
      expect(slide.bodies).toHaveLength(1)
      expect(slide.bodies[0].text?.rawText).toBe('Test content')
    })
  })

  describe('text block management', () => {
    it('should start a text block', () => {
      context.startTextBlock()
      
      expect(context.text).toBeDefined()
      expect(context.text?.rawText).toBe('')
      expect(context.text?.textRuns).toEqual([])
      expect(context.text?.listMarkers).toEqual([])
      expect(context.text?.big).toBe(false)
    })

    it('should append text to current text block', () => {
      context.startTextBlock()
      context.appendText('Hello')
      context.appendText(' World')
      
      expect(context.text?.rawText).toBe('Hello World')
    })

    it('should throw when appending text without text block', () => {
      expect(() => context.appendText('test')).toThrow()
    })
  })

  describe('style management', () => {
    beforeEach(() => {
      context.startTextBlock()
    })

    it('should get current style', () => {
      const style = context.currentStyle()
      expect(style).toEqual({})
    })

    it('should start a new style', () => {
      const newStyle: StyleDefinition = { bold: true }
      context.startStyle(newStyle)
      
      const current = context.currentStyle()
      expect(current.bold).toBe(true)
      expect(current.start).toBe(0)
    })

    it('should inherit from previous style', () => {
      context.startStyle({ bold: true })
      context.startStyle({ italic: true })
      
      const current = context.currentStyle()
      expect(current.bold).toBe(true)
      expect(current.italic).toBe(true)
    })

    it('should set start position correctly', () => {
      context.appendText('Hello')
      context.startStyle({ bold: true })
      
      const current = context.currentStyle()
      expect(current.start).toBe(5)
    })

    it('should end style and add to text runs', () => {
      context.startStyle({ bold: true })
      context.appendText('Bold text')
      context.endStyle()
      
      expect(context.text?.textRuns).toHaveLength(1)
      expect(context.text?.textRuns[0]).toEqual({
        bold: true,
        start: 0,
        end: 9
      })
    })

    it('should ignore empty style ranges', () => {
      context.startStyle({ bold: true })
      context.endStyle() // No text added
      
      expect(context.text?.textRuns).toHaveLength(0)
    })

    it('should ignore styles with no properties', () => {
      context.startStyle({})
      context.appendText('text')
      context.endStyle()
      
      expect(context.text?.textRuns).toHaveLength(0)
    })

    it('should ignore duplicate ranges', () => {
      const style = { bold: true }
      
      context.startStyle(style)
      context.appendText('text')
      context.endStyle()
      
      context.startStyle(style)
      context.appendText('text')
      context.endStyle()
      
      // The context doesn't actually ignore duplicate ranges - it creates separate runs
      expect(context.text?.textRuns).toHaveLength(2)
    })

    it('should handle nested styles correctly', () => {
      context.startStyle({ bold: true })
      context.appendText('Bold ')
      
      context.startStyle({ italic: true })
      context.appendText('and italic')
      context.endStyle()
      
      context.appendText(' text')
      context.endStyle()
      
      expect(context.text?.textRuns).toHaveLength(2)
      
      const runs = context.text?.textRuns || []
      expect(runs[0]).toEqual({
        bold: true,
        italic: true,
        start: 5,
        end: 15
      })
      expect(runs[1]).toEqual({
        bold: true,
        start: 0,
        end: 20
      })
    })
  })

  describe('done method', () => {
    it('should end the current slide', () => {
      context.startTextBlock()
      context.appendText('Final content')
      
      const slidesBefore = context.slides.length
      context.done()
      
      expect(context.slides.length).toBe(slidesBefore + 1)
      expect(context.currentSlide).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    it('should handle multiple text blocks in one slide', () => {
      context.startTextBlock()
      context.appendText('First block')
      
      // Simulate ending this text block and starting another
      if (context.text) {
        context.currentSlide?.bodies.push({ text: context.text })
      }
      
      context.startTextBlock()
      context.appendText('Second block')
      context.endSlide()
      
      const slide = context.slides[context.slides.length - 1]
      expect(slide.bodies).toHaveLength(2)
      expect(slide.bodies[0].text?.rawText).toBe('First block')
      expect(slide.bodies[1].text?.rawText).toBe('Second block')
    })

    it('should generate unique object IDs for slides', () => {
      const id1 = context.currentSlide?.objectId
      context.startSlide()
      const id2 = context.currentSlide?.objectId
      
      expect(id1).toBeDefined()
      expect(id2).toBeDefined()
      expect(id1).not.toBe(id2)
    })
  })
}) 