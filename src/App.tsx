import { useEffect, useState } from 'react'
import { initGoogleAuth, signOut } from './services/googleAuth'
import { Button } from './components/ui/button'
import { generateSlides } from './services/slidesService'
import { generatePNGFromHTML } from './services/pngService'
import { prompts } from './utils/prompts'
import './App.css'

function App() {
  const [mode, setMode] = useState<'lesson-plan' | 'worksheet'>('lesson-plan')
  const [isGeneratingSlides, setIsGeneratingSlides] = useState(false)
  const [isGeneratingWorksheet, setIsGeneratingWorksheet] = useState(false)
  const [manualMarkdown, setManualMarkdown] = useState(
`# This is a title slide

## By R. Keelan

---

# This is a section title

## With a subtitle

---

# Section title & body slide

## This is a subtitle

This is the body

---

# Title & body slide

This is the slide body.

---

# This is the main point {.big}

---

100% {.big}

This is the body

---

# Two column layout

This is the left column

{.column}

This is the right column

---

# Formatting

**Bold**, *italics*, and ~~strikethrough~~ may be used.

Ordered lists:
1. Item 1
1. Item 2
1. Item 2.1

Unordered lists:
* Item 1
* Item 2
* Item 2.1

---

# Emoji

## I :heart: cats

:heart_eyes_cat:

---

# Tables

Animal | Number
-------|--------
Fish   | 142 million
Cats   | 88 million
Dogs   | 75 million
Birds  | 16 million
`)
  const [templateInput, setTemplateInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [worksheetError, setWorksheetError] = useState<string | null>(null)
  const [worksheetSuccess, setWorksheetSuccess] = useState<string | null>(null)
  const [lessonPlanPrompt, setLessonPlanPrompt] = useState(prompts.lessonPlan)
  const [worksheetPrompt, setWorksheetPrompt] = useState(prompts.worksheet)
  const [markdownLessonPlanFilename, setMarkdownLessonPlanFilename] = useState('Lesson Plan')
  const [htmlCssWorksheetFilename, setHtmlCssWorksheetFilename] = useState('Worksheet')
  const [transcribePrompt, setTranscribePrompt] = useState(prompts.transcribe)
  const [htmlCssWorksheet, setHtmlCssWorksheet] = useState(
`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lesson Worksheet</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            line-height: 1.6;
        }
        .worksheet-header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .question {
            margin: 20px 0;
            padding: 10px;
            border-left: 3px solid #007bff;
        }
        .answer-space {
            border-bottom: 1px solid #ccc;
            min-height: 30px;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="worksheet-header">
        <h1>Lesson Worksheet</h1>
        <p>Name: _________________ Date: _________</p>
    </div>
    
    <div class="question">
        <h3>Question 1:</h3>
        <p>What is the main topic of today's lesson?</p>
        <div class="answer-space"></div>
    </div>
    
    <div class="question">
        <h3>Question 2:</h3>
        <p>List three key points you learned:</p>
        <div class="answer-space"></div>
        <div class="answer-space"></div>
        <div class="answer-space"></div>
    </div>
</body>
</html>`)

  useEffect(() => {
    // Initialize Google Auth
    initGoogleAuth().catch(err => {
      console.error("Failed to initialize Google Auth:", err)
    })
  }, [])


  const extractTemplateIdFromUrl = (url: string): string => {
    // If it's already just an ID (no slashes), return as is
    if (!url.includes('/')) return url;
    
    // Try to extract ID from Google Slides URL format: https://docs.google.com/presentation/d/PRESENTATION_ID/edit
    const match = url.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : url;
  }

  const handleGenerateSlides = async () => {
    try {
      setIsGeneratingSlides(true);
      setError(null);
      setSuccess(null);

      const templateID = extractTemplateIdFromUrl(templateInput);
      const presentationId = await generateSlides(
        manualMarkdown,
        templateID || undefined,
        markdownLessonPlanFilename
      );

      // Open the presentation in a new tab
      window.open(`https://docs.google.com/presentation/d/${presentationId}/edit`, '_blank');
      
      // Show success message
      setSuccess('Slides generated successfully!');
    } catch (error) {
      console.error('Error generating slides:', error);
      setError('Failed to generate slides. Please try again.');
    } finally {
      setIsGeneratingSlides(false);
    }
  };

  const handleGenerateWorksheet = async () => {
    try {
      setIsGeneratingWorksheet(true);
      setWorksheetError(null);
      setWorksheetSuccess(null);

      // Use user-defined filename or fallback to default
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
      const baseFilename = htmlCssWorksheetFilename.trim() || 'worksheet';
      const filename = `${baseFilename}-${timestamp}.png`;

      await generatePNGFromHTML(htmlCssWorksheet, filename);
      
      // Show success message
      setWorksheetSuccess('Worksheet PNG downloaded successfully!');
    } catch (error) {
      console.error('Error generating worksheet:', error);
      setWorksheetError('Failed to generate worksheet PNG. Please try again.');
    } finally {
      setIsGeneratingWorksheet(false);
    }
  };

  // Common box styles for grid panes
  const gridPaneClasses = "rounded-lg shadow-sm bg-white border border-gray-300"
  const textPaneClasses = `${gridPaneClasses} p-6 overflow-hidden flex flex-col`

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden p-6">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <div className="flex gap-1 bg-gray-200 rounded-lg p-1">
          <Button 
            variant={mode === 'lesson-plan' ? 'rainbow' : 'rainbow-text'}
            size="default"
            className="transition-all duration-200"
            onClick={() => setMode('lesson-plan')}
          >
            Lesson Plan
          </Button>
          <Button 
            variant={mode === 'worksheet' ? 'rainbow' : 'rainbow-text'}
            size="default"
            className="transition-all duration-200"
            onClick={() => setMode('worksheet')}
          >
            Worksheet
          </Button>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            signOut();
            window.location.reload();
          }}
        >
          Sign Out
        </Button>
      </div>
      {mode === 'lesson-plan' && (
        <div className="grid grid-cols-3 grid-rows-1 gap-6 flex-1 min-h-0">
          {/* Transcribe Prompt */}
          <div className={textPaneClasses}>
            <label htmlFor="transcribe-prompt" className="block text-sm font-medium text-gray-700 mb-3">
              Transcribe Prompt
            </label>
            <textarea
              id="transcribe-prompt"
              className="w-full h-full p-3 border border-gray-300 rounded-md font-mono text-xs resize-none overflow-auto"
              placeholder="Enter your transcribe prompt here..."
              value={transcribePrompt}
              onChange={(e) => setTranscribePrompt(e.target.value)}
            />
          </div>

          {/* Lesson Plan Prompt */}
          <div className={textPaneClasses}>
            <label htmlFor="lesson-plan-prompt" className="block text-sm font-medium text-gray-700 mb-3">
              Lesson Plan Prompt
            </label>
            <textarea
              id="lesson-plan-prompt"
              className="w-full h-full p-3 border border-gray-300 rounded-md font-mono text-xs resize-none overflow-auto"
              placeholder="Enter your lesson plan prompt here..."
              value={lessonPlanPrompt}
              onChange={(e) => setLessonPlanPrompt(e.target.value)}
            />
          </div>

          {/* Lesson Plan Generator */}
          <div className={textPaneClasses}>
            <div className="flex flex-col h-[calc(100%-9rem)] mb-4 w-full">
              <input
                type="text"
                className="block text-sm font-medium text-gray-700 mb-1 flex-shrink-0 px-2 py-1 border border-gray-300 rounded bg-white"
                value={markdownLessonPlanFilename}
                onChange={(e) => setMarkdownLessonPlanFilename(e.target.value)}
                placeholder="Enter filename..."
              />
              <textarea
                id="md-input"
                className="w-full h-full p-3 border border-gray-300 rounded-md font-mono text-xs resize-none overflow-auto"
                placeholder="Enter your markdown content here..."
                value={manualMarkdown}
                onChange={(e) => setManualMarkdown(e.target.value)}
                disabled={isGeneratingSlides}
              />
            </div>
            
            <div className="mb-3 flex-shrink-0 w-full">
              <label htmlFor="templateID" className="block text-xs font-medium text-gray-700 mb-1">
                Template Slides URL (optional)
              </label>
              <input
                id="templateID"
                type="text"
                className="w-full p-2 text-xs border border-gray-300 rounded-md"
                placeholder="Paste Google Slides URL or enter template ID"
                value={templateInput}
                onChange={(e) => setTemplateInput(e.target.value)}
                disabled={isGeneratingSlides}
              />
            </div>
            
            <div className="flex-shrink-0 w-full">
              {isGeneratingSlides ? (
                <div className="flex flex-col items-center justify-center py-2">
                  <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-gray-500 mt-1">Generating slides...</p>
                </div>
              ) : (
                <Button
                  className="w-full text-black"
                  size="sm"
                  variant="default"
                  onClick={handleGenerateSlides}
                >
                  Generate Slides
                </Button>
              )}
              {error && (
                <p className="text-xs text-red-500 mt-1">{error}</p>
              )}
              {success && (
                <p className="text-xs text-green-600 mt-1">{success}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {mode === 'worksheet' && (
        <div className="grid grid-cols-[1fr_2fr] grid-rows-2 gap-6 flex-1 min-h-0">
          {/* Worksheet Prompt - Top Left */}
          <div className={textPaneClasses}>
            <label htmlFor="worksheet-prompt" className="block text-sm font-medium text-gray-700 mb-3">
              Worksheet Prompt
            </label>
            <textarea
              id="worksheet-prompt"
              className="w-full h-full p-3 border border-gray-300 rounded-md font-mono text-xs resize-none overflow-auto"
              placeholder="Enter your worksheet prompt here..."
              value={worksheetPrompt}
              onChange={(e) => setWorksheetPrompt(e.target.value)}
            />
          </div>

          {/* Live Preview - Spans entire right column */}
          <div className={`${gridPaneClasses} row-span-2`}>
            <div className="h-full flex flex-col">
              <div className="p-3 border-b border-gray-200 flex-shrink-0">
                <h3 className="text-sm font-medium text-gray-700">Live Preview</h3>
              </div>
              <div className="flex-1 overflow-auto">
                <iframe
                  srcDoc={htmlCssWorksheet}
                  className="w-full h-full border-0"
                  sandbox="allow-same-origin"
                  title="Worksheet Preview"
                />
              </div>
            </div>
          </div>

          {/* HTML+CSS Generator - Bottom Left */}
          <div className={textPaneClasses}>
            <div className="flex flex-col h-[calc(100%-4rem)] mb-4 w-full">
              <input
                type="text"
                className="block text-sm font-medium text-gray-700 mb-1 flex-shrink-0 px-2 py-1 border border-gray-300 rounded bg-white"
                value={htmlCssWorksheetFilename}
                onChange={(e) => setHtmlCssWorksheetFilename(e.target.value)}
                placeholder="Enter filename..."
              />
              <textarea
                id="html-css-worksheet"
                className="w-full h-full p-3 border border-gray-300 rounded-md font-mono text-xs resize-none overflow-auto"
                placeholder="Enter your HTML+CSS worksheet content here..."
                value={htmlCssWorksheet}
                onChange={(e) => setHtmlCssWorksheet(e.target.value)}
              />
            </div>
            
            <div className="flex-shrink-0 w-full">
              {isGeneratingWorksheet ? (
                <div className="flex flex-col items-center justify-center py-2">
                  <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-gray-500 mt-1">Generating PNG...</p>
                </div>
              ) : (
                <Button
                  className="w-full text-black"
                  size="sm"
                  variant="default"
                  onClick={handleGenerateWorksheet}
                  disabled={!htmlCssWorksheet.trim()}
                >
                  Generate Worksheet
                </Button>
              )}
              {worksheetError && (
                <p className="text-xs text-red-500 mt-1">{worksheetError}</p>
              )}
              {worksheetSuccess && (
                <p className="text-xs text-green-600 mt-1">{worksheetSuccess}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
