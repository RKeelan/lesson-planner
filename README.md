# Lesson Planner

[![Deploy](https://github.com/RKeelan/lesson-planner/actions/workflows/deploy.yml/badge.svg)](https://github.com/RKeelan/lesson-planner/actions/workflows/deploy.yml)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://github.com/RKeelan/lesson-planner/blob/main/LICENSE)
[![Live Demo](https://img.shields.io/badge/demo-live-green.svg)](https://rkeelan.github.io/lesson-planner)

A React-based web application that converts lesson plans into Google Slides presentations.

## Overview

Lesson Planner streamlines the process of creating slide presentations from PDF lesson plans. Upload a PDF, automatically extract and convert it to markdown, then generate Google Slides presentations with customizable templates.

## Markdown Syntax for Slide Generation

The application supports a subset of markdown syntax for creating slide presentations.

### Basic Slide Structure

#### Slide Separation

**Slide Breaks**: Use `---` (horizontal rule) to separate individual slides
- Each `---` creates a new slide in the presentation
- Leading `---` at the beginning of the document is ignored

```markdown
# First Slide Title

Content for the first slide

---

# Second Slide Title

Content for the second slide
```

#### Headers and Titles
- **H1 (`#`)**: Primary slide title - becomes the main title of the slide
- **H2 (`##`)**: Slide subtitle - positioned below the main title
- **H3+ (`###`, `####`, etc.)**: Content headers within slide body text

```markdown
# Main Slide Title
## Subtitle for additional context

### Section Header
Content under this section...
```

### Text Formatting

#### Basic Emphasis
- **Bold**: `**bold text**`
- **Italic**: `_italic text_`
- **Strikethrough**: `~~strikethrough text~~`

#### Advanced Text Features
- **Links**: `[link text](URL)` - creates clickable hyperlinks
- **Line Breaks**: Use two spaces at end of line or `\` for soft breaks
- **Hard Breaks**: Rendered as vertical tabs in slide content
- **Blockquotes**: `> quoted text` - renders in italic styling

### Lists and Structure

#### Unordered Lists
```markdown
- First item
- Second item
  - Nested item (indented with 2 spaces)
  - Another nested item
- Third item
```

#### Ordered Lists
```markdown
1. First numbered item
2. Second numbered item
   1. Nested numbered item
   2. Another nested item
3. Third numbered item
```

### Tables

#### Standard Table Syntax
```markdown
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
```

#### Table Features

- **Headers**: First row becomes bold table headers
- **Alignment**: Standard markdown table alignment is supported
- **Styling**: Tables maintain theme-appropriate colors and formatting
- **Cells**: Each cell supports full markdown formatting within

### Custom Attributes and Layout Control

#### Layout Attributes
Add custom attributes using CSS-like syntax `{.classname}` or `{attribute=value}`:

```markdown
# Big Title {.big}
This title will be rendered larger than normal

{.column}
This paragraph starts a new column in two-column layouts

{layout=custom-layout-name}
This slide will use a specific custom layout
```

#### Supported Attributes
- **`{.big}`**: Makes headers larger and more prominent
- **`{.column}`**: Creates column breaks for multi-column layouts
- **`{layout=name}`**: Specifies custom slide layout from template

### Multi-Column Layouts

#### Two-Column Content
```markdown
# Slide with Two Columns

Left column content here...

{.column}
Right column content starts here...

More right column content...
```

#### Column Behavior

- **Column Marker**: `{.column}` paragraph creates new column
- **Content Flow**: All content after `{.column}` flows into the new column
- **Layout**: Automatically arranges content side-by-side

### Emoji and Special Characters

#### Emoji Support
- **Unicode Emoji**: Direct Unicode emoji characters: 🎯 📊 💡
- **Shortcodes**: `:emoji_name:` syntax (where supported)
- **Rendering**: Displays as regular text characters in slides

### HTML Support

#### Inline HTML Elements
Limited HTML support for advanced formatting:

```markdown
<strong>Bold text</strong>
<em>Italic text</em>
<code>Inline code</code>
<sub>Subscript</sub>
<sup>Superscript</sup>
```

#### HTML Comments for Speaker Notes
```markdown
<!-- 
These are speaker notes that will be included 
in the slide notes section.

Speaker notes support **markdown formatting**.
-->
```

## Development

### Prerequisites

- Node.js 18+ (for package management and development)
- Google Cloud Console project with Slides and Drive APIs enabled

### Setup

Clone the repository:
```bash
git clone https://github.com/RKeelan/lesson-planner.git
cd lesson-planner
```

Install dependencies:
```bash
npm install
```

Configure environment variables by creating a `.env` file:
```bash
echo "VITE_GOOGLE_CLIENT_ID=your_google_client_id_here" > .env
```

### Development Commands

Start the development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

Run tests:
```bash
# Run all tests once
npm test

# Watch mode for development
npm run test:watch

# Run tests with UI
npm run test:ui
```

Lint and format code:
```bash
npm run lint
```

Preview production build:
```bash
npm run preview
```

### Google Cloud Setup

1. **Create a Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable Required APIs**:
   - Google Slides API
   - Google Drive API

3. **Configure OAuth Consent Screen**:
   - Set up OAuth consent screen with your domain
   - Add test users during development

4. **Create OAuth Credentials**:
   - Create OAuth 2.0 Client ID for web application
   - Add your development and production URLs to authorized origins
   - Copy the Client ID to your `.env` file

### Project Structure

```
src/
├── components/          # Reusable UI components
├── services/           # Google API and authentication services
├── md2gslides/         # Markdown-to-slides conversion engine
│   ├── parser/         # Markdown parsing and slide extraction
│   └── layout/         # Slide layout matching and generation
├── worker/             # Web worker for PDF processing
└── __tests__/          # Test files
```

### Testing

The project includes comprehensive test coverage:

```bash
# Unit tests for components and services
npm test

# Integration tests for the full workflow
npm run test:watch

# Coverage report
npm run test -- --coverage
```

Test files are located alongside source files with `.test.ts` or `.test.tsx` extensions.

### Deployment

The project deploys automatically to GitHub Pages:

```bash
# Manual deployment
npm run deploy
```

The deployment process:
1. Builds the production bundle
2. Deploys to `gh-pages` branch
3. Serves from GitHub Pages at the configured URL

## Usage

1. **Open the Application**: Navigate to the deployed URL or run locally
2. **Authenticate**: Sign in with your Google account
3. **Upload PDF**: Drag and drop a PDF lesson plan or click to browse
4. **Edit Markdown**: Review and modify the converted markdown content
5. **Add Template** (Optional): Provide a Google Slides template URL/ID
6. **Generate Slides**: Click "Generate Slides" to create your presentation
7. **View Results**: The new presentation opens automatically in Google Slides

## Markdown Syntax Support

The application supports rich markdown features for slide generation:

- **Slide Breaks**: Use `---` to separate slides
- **Headers**: `#`, `##`, `###` for different heading levels
- **Lists**: Ordered and unordered lists with nesting
- **Tables**: Standard markdown table syntax
- **Emphasis**: Bold, italic, and strikethrough text
- **Custom Attributes**: `{.big}`, `{.column}` for layout control
- **Emoji**: Unicode emoji and shortcode support

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Ensure all tests pass: `npm test`
5. Lint your code: `npm run lint`
6. Commit your changes: `git commit -m 'Add feature'`
7. Push to the branch: `git push origin feature-name`
8. Submit a pull request

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Support

For questions, issues, or contributions:
- 📧 [Open an issue](https://github.com/RKeelan/lesson-planner/issues)
- 🔧 [Submit a pull request](https://github.com/RKeelan/lesson-planner/pulls)
- 📖 [View documentation](https://github.com/RKeelan/lesson-planner/wiki)