import { describe, expect, it } from 'vitest'
import parseMarkdown from './parser'

describe('markdown parser', () => {
  it('should parse simple text', () => {
    const tokens = parseMarkdown('Hello world')
    expect(tokens).toBeDefined()
    expect(tokens.length).toBeGreaterThan(0)
    
    const paragraphOpen = tokens.find(t => t.type === 'paragraph_open')
    const inline = tokens.find(t => t.type === 'inline')
    const paragraphClose = tokens.find(t => t.type === 'paragraph_close')
    
    expect(paragraphOpen).toBeDefined()
    expect(inline).toBeDefined()
    expect(paragraphClose).toBeDefined()
    expect(inline?.content).toBe('Hello world')
  })

  it('should parse headers', () => {
    const tokens = parseMarkdown('# Title\n## Subtitle')
    
    const headingOpen = tokens.find(t => t.type === 'heading_open' && t.tag === 'h1')
    const headingClose = tokens.find(t => t.type === 'heading_close' && t.tag === 'h1')
    const subtitle = tokens.find(t => t.type === 'heading_open' && t.tag === 'h2')
    
    expect(headingOpen).toBeDefined()
    expect(headingClose).toBeDefined()
    expect(subtitle).toBeDefined()
  })

  it('should parse horizontal rules', () => {
    const tokens = parseMarkdown('# Slide 1\n---\n# Slide 2')
    
    const hrToken = tokens.find(t => t.type === 'hr')
    expect(hrToken).toBeDefined()
  })

  it('should parse lists', () => {
    const markdown = `
* Item 1
* Item 2
  * Nested item
    `
    const tokens = parseMarkdown(markdown)
    
    const bulletListOpen = tokens.find(t => t.type === 'bullet_list_open')
    const bulletListClose = tokens.find(t => t.type === 'bullet_list_close')
    const listItemOpen = tokens.find(t => t.type === 'list_item_open')
    
    expect(bulletListOpen).toBeDefined()
    expect(bulletListClose).toBeDefined()
    expect(listItemOpen).toBeDefined()
  })

  it('should parse ordered lists', () => {
    const markdown = `
1. First item
2. Second item
3. Third item
    `
    const tokens = parseMarkdown(markdown)
    
    const orderedListOpen = tokens.find(t => t.type === 'ordered_list_open')
    const orderedListClose = tokens.find(t => t.type === 'ordered_list_close')
    
    expect(orderedListOpen).toBeDefined()
    expect(orderedListClose).toBeDefined()
  })

  it('should parse tables', () => {
    const markdown = `
| Column 1 | Column 2 |
|----------|----------|
| Row 1    | Data 1   |
| Row 2    | Data 2   |
    `
    const tokens = parseMarkdown(markdown)
    
    const tableOpen = tokens.find(t => t.type === 'table_open')
    const tableClose = tokens.find(t => t.type === 'table_close')
    const theadOpen = tokens.find(t => t.type === 'thead_open')
    const tbodyOpen = tokens.find(t => t.type === 'tbody_open')
    
    expect(tableOpen).toBeDefined()
    expect(tableClose).toBeDefined()
    expect(theadOpen).toBeDefined()
    expect(tbodyOpen).toBeDefined()
  })

  it('should parse attributes with markdown-it-attrs', () => {
    const tokens = parseMarkdown('# Title {.big}')
    
    const headingOpen = tokens.find(t => t.type === 'heading_open')
    expect(headingOpen?.attrs).toBeDefined()
    
    const classAttr = headingOpen?.attrs?.find((attr: any) => attr[0] === 'class')
    expect(classAttr?.[1]).toBe('big')
  })

  it('should parse HTML comments', () => {
    const tokens = parseMarkdown('<!-- This is a comment -->')
    
    const htmlBlock = tokens.find(t => t.type === 'html_block')
    expect(htmlBlock).toBeDefined()
    expect(htmlBlock?.content).toContain('This is a comment')
  })

  it('should parse inline HTML', () => {
    const tokens = parseMarkdown('This is **bold** and <em>italic</em> text')
    
    const inline = tokens.find(t => t.type === 'inline')
    expect(inline?.children).toBeDefined()
    
    const htmlInline = inline?.children?.find((t: any) => t.type === 'html_inline')
    expect(htmlInline).toBeDefined()
  })

  it('should handle code blocks', () => {
    const markdown = `
\`\`\`javascript
function hello() {
  console.log("Hello world");
}
\`\`\`
    `
    const tokens = parseMarkdown(markdown)
    
    const codeBlock = tokens.find(t => t.type === 'fence')
    expect(codeBlock).toBeDefined()
    expect(codeBlock?.info).toBe('javascript')
    expect(codeBlock?.content).toContain('function hello()')
  })

  it('should handle inline code', () => {
    const tokens = parseMarkdown('Use `console.log()` to print')
    
    const inline = tokens.find(t => t.type === 'inline')
    const codeInline = inline?.children?.find((t: any) => t.type === 'code_inline')
    
    expect(codeInline).toBeDefined()
    expect(codeInline?.content).toBe('console.log()')
  })

  it('should handle emoji', () => {
    const tokens = parseMarkdown('Hello :heart: world')
    
    const inline = tokens.find(t => t.type === 'inline')
    const emoji = inline?.children?.find((t: any) => t.type === 'emoji')
    
    expect(emoji).toBeDefined()
  })

  it('should handle empty input', () => {
    const tokens = parseMarkdown('')
    expect(tokens).toBeDefined()
    expect(Array.isArray(tokens)).toBe(true)
  })

  it('should handle multiple slides separated by hr', () => {
    const markdown = `
# Slide 1
Content 1

---

# Slide 2
Content 2
    `
    const tokens = parseMarkdown(markdown)
    
    const hrTokens = tokens.filter(t => t.type === 'hr')
    const headingTokens = tokens.filter(t => t.type === 'heading_open')
    
    expect(hrTokens.length).toBe(1)
    expect(headingTokens.length).toBe(2)
  })
}) 