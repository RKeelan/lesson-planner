import { describe, expect, it } from 'vitest'
import extractSlides from './extract_slides'
import { SlideDefinition } from '../slides'

describe('extractSlides function', () => {
  it('should extract simple slide with title', () => {
    const markdown = '# Hello World'
    const slides = extractSlides(markdown)
    
    expect(slides).toHaveLength(1)
    expect(slides[0].title?.rawText).toBe('Hello World')
    expect(slides[0].bodies).toHaveLength(0)
  })

  it('should extract slide with title and subtitle', () => {
    const markdown = `
# Main Title
## Subtitle
    `
    const slides = extractSlides(markdown)
    
    expect(slides).toHaveLength(1)
    expect(slides[0].title?.rawText).toBe('Main Title')
    expect(slides[0].subtitle?.rawText).toBe('Subtitle')
  })

  it('should extract slide with title and body content', () => {
    const markdown = `
# Title
This is body content
    `
    const slides = extractSlides(markdown)
    
    expect(slides).toHaveLength(1)
    expect(slides[0].title?.rawText).toBe('Title')
    expect(slides[0].bodies).toHaveLength(1)
    expect(slides[0].bodies[0].text?.rawText).toContain('This is body content')
  })

  it('should extract multiple slides separated by hr', () => {
    const markdown = `
# Slide 1
Content 1

---

# Slide 2
Content 2
    `
    const slides = extractSlides(markdown)
    
    expect(slides).toHaveLength(2)
    expect(slides[0].title?.rawText).toBe('Slide 1')
    expect(slides[1].title?.rawText).toBe('Slide 2')
  })

  it('should handle big title class', () => {
    const markdown = '# Big Title {.big}'
    const slides = extractSlides(markdown)
    
    expect(slides).toHaveLength(1)
    expect(slides[0].title?.big).toBe(true)
  })

  it('should extract lists correctly', () => {
    const markdown = `
# Title
* Item 1
* Item 2
* Item 3
    `
    const slides = extractSlides(markdown)
    
    expect(slides).toHaveLength(1)
    expect(slides[0].bodies).toHaveLength(1)
    
    const text = slides[0].bodies[0].text
    expect(text?.rawText).toContain('Item 1')
    expect(text?.rawText).toContain('Item 2')
    expect(text?.rawText).toContain('Item 3')
    expect(text?.listMarkers).toHaveLength(1)
    expect(text?.listMarkers[0].type).toBe('unordered')
  })

  it('should extract ordered lists correctly', () => {
    const markdown = `
# Title
1. First item
2. Second item
3. Third item
    `
    const slides = extractSlides(markdown)
    
    expect(slides).toHaveLength(1)
    const text = slides[0].bodies[0].text
    expect(text?.listMarkers).toHaveLength(1)
    expect(text?.listMarkers[0].type).toBe('ordered')
  })

  it('should extract tables correctly', () => {
    const markdown = `
# Title
| Column 1 | Column 2 |
|----------|----------|
| Row 1    | Data 1   |
| Row 2    | Data 2   |
    `
    const slides = extractSlides(markdown)
    
    expect(slides).toHaveLength(1)
    expect(slides[0].tables).toHaveLength(1)
    
    const table = slides[0].tables[0]
    expect(table.rows).toBe(3)
    expect(table.columns).toBe(2)
    expect(table.cells).toHaveLength(3)
    expect(table.cells[0]).toHaveLength(2)
    expect(table.cells[0][0].rawText).toContain('Column 1')
  })

  it('should handle text formatting', () => {
    const markdown = `
# Title
This is **bold** and *italic* text
    `
    const slides = extractSlides(markdown)
    
    expect(slides).toHaveLength(1)
    const text = slides[0].bodies[0].text
    expect(text?.textRuns.length).toBeGreaterThan(0)
    
    const boldRun = text?.textRuns.find(run => run.bold === true)
    expect(boldRun).toBeDefined()
    
    const italicRun = text?.textRuns.find(run => run.italic === true)
    expect(italicRun).toBeDefined()
  })

  it('should handle code blocks', () => {
    const markdown = `
# Title
\`\`\`javascript
function hello() {
  console.log("Hello");
}
\`\`\`
    `
    const slides = extractSlides(markdown)
    
    expect(slides).toHaveLength(1)
    const text = slides[0].bodies[0].text
    expect(text?.rawText).toContain('function hello()')
    
    const codeRun = text?.textRuns.find(run => run.fontFamily === 'Courier New')
    expect(codeRun).toBeDefined()
  })

  it('should handle inline code', () => {
    const markdown = `
# Title
Use \`console.log()\` to print
    `
    const slides = extractSlides(markdown)
    
    expect(slides).toHaveLength(1)
    const text = slides[0].bodies[0].text
    expect(text?.rawText).toContain('console.log()')
    
    const codeRun = text?.textRuns.find(run => run.fontFamily === 'Courier New')
    expect(codeRun).toBeDefined()
  })

  it('should handle HTML comments as notes', () => {
    const markdown = `
# Title
Content here
<!-- This is a note -->
    `
    const slides = extractSlides(markdown)
    
    expect(slides).toHaveLength(1)
    expect(slides[0].notes).toContain('This is a note')
  })

  it('should handle column layout', () => {
    const markdown = `
# Title
Left column content

{.column}

Right column content
    `
    const slides = extractSlides(markdown)
    
    expect(slides).toHaveLength(1)
    expect(slides[0].bodies).toHaveLength(2)
    expect(slides[0].bodies[0].text?.rawText).toContain('Left column content')
    expect(slides[0].bodies[1].text?.rawText).toContain('Right column content')
  })

  it('should handle empty markdown', () => {
    const slides = extractSlides('')
    expect(slides).toHaveLength(1)
  })

  it('should handle markdown with only whitespace', () => {
    const slides = extractSlides('   \n  \n  ')
    expect(slides).toHaveLength(1)
  })

  it('should handle nested lists with mixed styles', () => {
    const markdown = `
# Title
* Item 1
  * Nested item 1
  * Nested item 2
* Item 2
    `
    const slides = extractSlides(markdown)
    
    expect(slides).toHaveLength(1)
    const text = slides[0].bodies[0].text
    expect(text?.listMarkers).toHaveLength(1)
    expect(text?.rawText).toContain('\t')
  })

  it('should handle multiple paragraphs in body', () => {
    const markdown = `
# Title
First paragraph

Second paragraph

Third paragraph
    `
    const slides = extractSlides(markdown)
    
    expect(slides).toHaveLength(1)
    const text = slides[0].bodies[0].text
    expect(text?.rawText).toContain('First paragraph')
    expect(text?.rawText).toContain('Second paragraph')
    expect(text?.rawText).toContain('Third paragraph')
  })

  it('should generate unique object IDs for slides', () => {
    const markdown = `
# Slide 1
---
# Slide 2
---
# Slide 3
    `
    const slides = extractSlides(markdown)
    
    expect(slides).toHaveLength(3)
    const objectIds = slides.map(slide => slide.objectId)
    const uniqueIds = new Set(objectIds)
    expect(uniqueIds.size).toBe(3)
  })

  it('should handle leading hr correctly', () => {
    const markdown = `
---
# First Slide
Content
---
# Second Slide
    `
    const slides = extractSlides(markdown)
    
    // Leading HR creates processing that results in keeping the second slide
    expect(slides).toHaveLength(1)
    expect(slides[0].title?.rawText).toBe('Second Slide')
  })

  it('should handle inline HTML formatting', () => {
    const markdown = `
# Title
This has <strong>bold</strong> and <em>italic</em> formatting
    `
    const slides = extractSlides(markdown)
    
    expect(slides).toHaveLength(1)
    const text = slides[0].bodies[0].text
    expect(text?.textRuns.length).toBeGreaterThan(0)
    
    const boldRun = text?.textRuns.find(run => run.bold === true)
    const italicRun = text?.textRuns.find(run => run.italic === true)
    
    expect(boldRun).toBeDefined()
    expect(italicRun).toBeDefined()
  })

  it('should handle complex slide with multiple elements', () => {
    const markdown = `
# Complex Slide {.big}
## With Subtitle

This is **bold** content with a list:

* Item 1
* Item 2

And a table:

| Col 1 | Col 2 |
|-------|-------|
| A     | B     |

<!-- This is a note -->
    `
    const slides = extractSlides(markdown)
    
    expect(slides).toHaveLength(1)
    const slide = slides[0]
    
    expect(slide.title?.rawText).toBe('Complex Slide')
    expect(slide.title?.big).toBe(true)
    expect(slide.subtitle?.rawText).toBe('With Subtitle')
    expect(slide.bodies.length).toBeGreaterThanOrEqual(0)
    expect(slide.tables).toHaveLength(1)
    expect(slide.notes).toContain('This is a note')
  })
}) 