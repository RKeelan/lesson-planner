# Lesson Planner

## Overview

Lesson Planner is a React-based web application that converts PDF lesson plans into Google Slides presentations. The application provides a drag-and-drop interface for uploading PDF files, automatically extracts text content using Python-based processing, and generates slides using a markdown-to-slides engine based on Google's md2googleslides library.

**Key Features:**
- PDF to markdown conversion using drag-and-drop interface with sample markdown templates
- Markdown-to-slides conversion with custom layout matching
- Google Authentication integration for Slides and Drive API access
- Real-time markdown editing with predefined templates and syntax support
- Template-based slide generation from existing Google Slides presentations
- Web worker-based PDF processing for non-blocking UI
- Comprehensive testing suite with Vitest
- URL extraction for Google Slides template input
- Sign-out functionality with token management
- 5MB file size limit

**Technology Stack:**
- Frontend: React 19, TypeScript, Vite
- UI Framework: Tailwind CSS with Radix UI components
- PDF Processing: Pyodide (Python in browser) with MarkItDown library
- Slides Generation: Custom md2gslides engine (forked from Google's md2googleslides)
- Authentication: Google Identity Services (OAuth 2.0)
- Testing: Vitest with jsdom and Testing Library
- Build/Deploy: Vite, GitHub Pages

## Architecture

### Frontend Architecture

The application follows a single-page application (SPA) pattern with the main components organized as follows:

#### Core Components
- **App.tsx** (`src/App.tsx`): Main application component handling state management, file upload, and UI rendering
- **Button** (`src/components/ui/button.tsx`): Reusable UI button component using Radix UI and class-variance-authority

#### State Management
The application uses React's built-in state management with the following key state variables:
- `dragActive`: Controls drag-and-drop visual feedback
- `fileName`: Stores uploaded file name
- `isProcessing`: Tracks PDF conversion status
- `isGeneratingSlides`: Tracks slide generation process
- `manualMarkdown`: Stores converted/edited markdown content with sample template
- `templateInput`: Google Slides template URL or ID input
- `error`: Error message display
- `success`: Success message display

#### File Processing Pipeline

1. **File Upload** (`src/App.tsx`): Drag-and-drop or click-to-browse file selection with PDF validation
2. **Size Validation** (`src/App.tsx`): 5MB maximum file size enforcement
3. **Worker Processing** (`src/App.tsx`): File sent to web worker for conversion
4. **Result Handling** (`src/App.tsx`): Processed markdown received from worker

### Backend Architecture (Client-side)

#### Web Worker System
- **PDF Worker** (`src/worker/pdfWorker.ts`): Isolated web worker for PDF processing
  - Pyodide initialization and Python environment setup
  - MarkItDown library integration for PDF-to-markdown conversion
  - File system operations within worker context
  - Error handling and progress reporting

#### Google Services Integration
- **Authentication Service** (`src/services/googleAuth.ts`): Google OAuth 2.0 integration
  - Token-based authentication with automatic refresh
  - Local storage token caching with expiration handling
  - Extended API scope management (`presentations` and `drive.file` scopes)
  - Sign-in/sign-out functionality with token revocation

- **Slides Service** (`src/services/slidesService.ts`): High-level slides generation interface
  - Markdown-to-slides conversion orchestration
  - Template presentation copying with fallback handling
  - Integration with md2gslides engine
  - Error handling and authentication management

#### Markdown-to-Slides Engine
- **md2gslides Module** (`src/md2gslides/`): Comprehensive slide generation system forked from Google's md2googleslides
  - **SlideGenerator** (`src/md2gslides/slide_generator.ts`): Core slide generation engine
  - **Parser Module** (`src/md2gslides/parser/`): Markdown parsing and slide extraction
    - `extract_slides.ts`: Slide content extraction from markdown
    - `parser.ts`: Markdown parsing with support for custom attributes
    - `env.ts`: Environment and configuration management
  - **Layout Module** (`src/md2gslides/layout/`): Slide layout matching and generation
    - `match_layout.ts`: Automatic layout detection and matching
    - `generic_layout.ts`: Generic slide layout templates
    - `presentation_helpers.ts`: Google Slides API helper functions
  - **Utilities** (`src/md2gslides/utils.ts`): Common utilities and helper functions
  - **Slides Definition** (`src/md2gslides/slides.ts`): Slide structure and type definitions

### Build and Deployment

- **Development**: Vite dev server with HMR and path aliases
- **Build**: TypeScript compilation + Vite bundling
- **Testing**: Vitest with jsdom environment and comprehensive test suite
- **Deployment**: GitHub Pages via `gh-pages` package
- **Linting**: ESLint with TypeScript and React rules

### Dependencies

#### Runtime Dependencies
- **Core Framework**: React 19 with TypeScript support
- **UI & Styling**: Tailwind CSS, Radix UI components, Lucide React icons
- **Google APIs**: googleapis library for Slides and Drive API integration
- **Markdown Processing**: markdown-it with plugins for enhanced parsing
  - `markdown-it-attrs`: Custom attributes support
  - `markdown-it-emoji`: Emoji rendering
  - `markdown-it-expand-tabs`: Tab expansion
  - `markdown-it-highlightjs`: Code syntax highlighting
  - `markdown-it-lazy-headers`: Flexible header parsing
- **Utilities**: lodash, uuid, probe-image-size, parse-color, promise-retry
- **CSS Processing**: @adobe/css-tools for CSS manipulation

#### Development Dependencies
- **Build Tools**: Vite, TypeScript, autoprefixer
- **Testing**: Vitest, jsdom, @testing-library suite
- **Code Quality**: ESLint with TypeScript and React rules
- **Type Definitions**: Comprehensive @types packages for all major dependencies

### Environment Configuration

The application requires the following environment variables:
- `VITE_GOOGLE_CLIENT_ID`: Google OAuth client ID for API access

### Testing Architecture

The project includes comprehensive testing coverage:

- **Unit Tests**: Individual component and service testing
- **Integration Tests**: API integration and workflow testing
- **Test Setup**: Custom test environment with jsdom and testing utilities
- **Coverage**: Tests for all major modules including:
  - UI components (`button.test.tsx`)
  - Core application logic (`App.test.tsx`)
  - Authentication services (`googleAuth.test.ts`)
  - Slides generation (`slidesService.test.ts`)
  - PDF worker functionality (`pdfWorker.test.ts`)
  - md2gslides engine components (comprehensive test suite)

### Markdown Features and Syntax Support

The application supports rich markdown syntax for slide generation:

- **Slide Separation**: `---` for slide breaks
- **Layouts**: Automatic layout detection and custom attributes (`{.big}`, `{.column}`)
- **Formatting**: Bold, italics, strikethrough, headers
- **Lists**: Ordered and unordered lists with nesting
- **Tables**: Markdown table syntax with proper formatting
- **Emoji**: Unicode emoji support with shortcode rendering
- **Custom Attributes**: CSS-like attribute specification for layout control
- **Two-Column Layouts**: Column directive support for side-by-side content

### Worker Architecture Details

The PDF processing uses a sophisticated web worker implementation:

1. **Pyodide Initialization** (`src/worker/pdfWorker.ts`): 
   - Dynamic import of Pyodide from CDN
   - Python environment setup with required packages
   - MarkItDown library installation from local wheel file

2. **File Processing** (`src/worker/pdfWorker.ts`):
   - Virtual file system operations
   - PDF parsing and text extraction
   - Markdown conversion with formatting preservation

3. **Communication Protocol** (`src/worker/pdfWorker.ts`):
   - Message-based communication between main thread and worker
   - Error handling and status reporting
   - Asynchronous operation management

This architecture ensures smooth user experience by preventing UI blocking during intensive PDF processing operations.

### Slide Generation Workflow

1. **Markdown Processing**: Markdown content is parsed and processed by the md2gslides engine
2. **Layout Detection**: Automatic detection of appropriate slide layouts based on content structure
3. **Template Handling**: Optional template presentation copying with Drive API integration
4. **Slide Creation**: Systematic creation of slides using Google Slides API batch operations
5. **Content Population**: Population of slide elements with parsed markdown content
6. **Result Delivery**: Return of presentation ID and automatic browser opening of generated slides

## Tasks
### Phase 2: Current Tasks (In Progress)

#### 2-E-1: Add status bar component
- **File**: `src/components/StatusBar.tsx` (new)
- **Task**: Create status bar showing 'Google: signed in as <email>' or 'Google: not connected'
- **Acceptance**: Status updates when user signs in/out

#### 2-E-2: Implement toast notifications
- **Dependencies**: Install react-hot-toast or similar
- **Task**: Add success/error toasts for slide generation
- **Acceptance**: User sees confirmation when slides are generated successfully

#### 2-E-3: Add shadcn/ui modals
- **Dependencies**: Install @radix-ui/react-dialog
- **Task**: Replace any existing modals with shadcn/ui Dialog components
- **Acceptance**: Consistent modal styling and behavior

### Phase 3: LLM Integration

#### 3-A-1: Install Vercel AI SDK
- **Command**: `npm install ai @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google`
- **Task**: Add Vercel AI SDK for unified LLM provider support
- **Acceptance**: Dependencies installed and properly configured

#### 3-A-2: Create key manager modal
- **File**: `src/components/KeyManagerModal.tsx` (new)
- **Task**: Modal with provider dropdown (OpenAI, Anthropic, Google), API key input, remember checkbox
- **Acceptance**: Modal saves keys to localStorage/sessionStorage as `${PROVIDER}_API_KEY`

#### 3-A-3: Add key manager trigger
- **File**: `src/App.tsx`
- **Task**: Add key icon in header that opens KeyManagerModal
- **Acceptance**: Clicking key icon opens modal for API key management

#### 3-B-1: Create LLM service with Vercel AI SDK
- **File**: `src/services/llmService.ts` (new)
- **Task**: Implement `callLLM({markdown, instructions}): Promise<string>` using Vercel AI SDK
- **Acceptance**: Function works with OpenAI, Anthropic, or Google based on available API keys

#### 3-B-2: Add prompt builder
- **File**: `src/services/llmService.ts`
- **Task**: Add `buildPrompt(markdown: string, instructions: string): string`
- **Format**: `${instructions}\n---DOCUMENT START---\n${markdown}`
- **Acceptance**: Consistent prompt format for all LLM providers

#### 3-C-1: Add teacher instructions UI
- **File**: `src/App.tsx`
- **Task**: Add textarea for teacher instructions when PDF is converted
- **Acceptance**: Instructions input appears after successful PDF processing

#### 3-C-2: Integrate LLM with slide generation
- **File**: `src/App.tsx`
- **Task**: Modify Generate Slides to call LLM, then pass result to existing slide generation
- **Flow**: `markdown + instructions → LLM → enhanced markdown → slides`
- **Acceptance**: Generate button processes markdown through LLM before creating slides

#### 3-D-1: Add token estimation
- **Dependencies**: Install tiktoken or similar
- **File**: `src/services/costEstimator.ts` (new)
- **Task**: Estimate prompt tokens and costs before LLM calls
- **Acceptance**: Shows estimated cost before generation

#### 3-D-2: Add cost confirmation modal
- **File**: `src/components/CostConfirmationModal.tsx` (new)
- **Task**: Show confirmation if estimated cost > $0.50
- **Acceptance**: User must confirm expensive operations

#### 3-D-3: Display cost estimates
- **File**: `src/App.tsx`
- **Task**: Show 'Estimated cost: $X.XX' under Generate button
- **Acceptance**: Real-time cost updates based on content length

### Phase 4: Post-MVP Enhancements (Future)

#### 4-A: Image placeholder system
- **Task**: Support `![unsplash:keyword]` syntax for automatic image insertion
- **Integration**: Unsplash API for keyword-based image search

#### 4-B: Document chunking
- **Task**: Handle documents > 15k tokens with chunking and summarization
- **Implementation**: Split large documents and process in chunks

#### 4-C: Template library
- **Task**: Multi-provider slide templates with dropdown selection
- **Features**: Curated template IDs for different presentation types

#### 4-D: Caching system
- **Task**: Service Worker cache for `markdown ↔ deckID` mapping
- **Benefit**: Prevent duplicate generation for same content

### Technical Debt & Build Issues

#### BUILD-1: Pyodide Vite configuration
- **Condition**: If build errors occur with Pyodide
- **Tasks**: 
  - Install `vite-plugin-wasm` and `vite-plugin-top-level-await`
  - Add plugins to `vite.config.ts`
  - Set `moduleResolution: 'bundler'` in tsconfig
  - Add `define: { 'process.env': {} }` to Vite config

### Legend
- ✅ Completed
- 🔄 In Progress  
- 📋 Pending