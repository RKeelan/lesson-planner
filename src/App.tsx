import { useEffect, useRef, useState } from 'react'
import { initGoogleAuth, signOut } from './services/googleAuth'
import { Button } from './components/ui/button'
import { generateSlides } from './services/slidesService'
import { generatePNGFromHTML } from './services/pngService'
import { prompts } from './utils/prompts'
import './App.css'

function App() {
  const [dragActive, setDragActive] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
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
  const workerRef = useRef<Worker | null>(null)
  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

  useEffect(() => {
    // Initialize the PDF worker
    const worker = new Worker(new URL("./worker/pdfWorker.ts", import.meta.url), { type: "module" })
    workerRef.current = worker
    
    // Listen for messages from the worker
    worker.addEventListener('message', (event) => {
      console.log('Message from worker:', event.data)
      
      if (event.data === 'pyodide-ready') {
        console.log('Pyodide is ready for processing')
      }
      
      if (event.data.type === 'conversion-result') {
        setIsProcessing(false)
        
        if (event.data.success) {
          setManualMarkdown(event.data.markdown) // Set the converted markdown directly to the textarea
          setError(null)
          setSuccess('Conversion successful!')
        } else {
          setError(`Conversion failed: ${event.data.error}`)
        }
      }
      
      if (event.data.type === 'pyodide-error') {
        setError(`Python environment error: ${event.data.error}`)
        setIsProcessing(false)
      }
    })
    
    // Initialize Google Auth
    initGoogleAuth().catch(err => {
      console.error("Failed to initialize Google Auth:", err)
    })
    
    // Clean up the worker when component unmounts
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
      }
    }
  }, [])

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    setError(null)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      
      // Check if the file is a PDF
      if (file.type === 'application/pdf') {
        processFile(file)
      } else {
        setError('Please upload a PDF file')
      }
    }
  }
  
  const processFile = (file: File) => {
    if (!workerRef.current) {
      setError('PDF processing is not available')
      return
    }
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum size is 5MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`)
      return
    }
    
    setFileName(file.name)
    setIsProcessing(true)
    setManualMarkdown('') // Clear any existing markdown while processing
    
    // Send the file to the worker for processing
    workerRef.current.postMessage({
      type: 'convert',
      file: file
    })
  }
  
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      
      if (file.type === 'application/pdf') {
        processFile(file)
      } else {
        setError('Please upload a PDF file')
      }
    }
  }
  
  const resetState = () => {
    setFileName(null)
    setManualMarkdown('')
    setError(null)
    setSuccess(null)
  }

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
  const uploadPaneClasses = `${gridPaneClasses} flex items-center justify-center`
  const textPaneClasses = `${gridPaneClasses} p-6 overflow-hidden flex flex-col`

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden p-6">
      <div className="flex justify-end mb-4 flex-shrink-0">
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
      {/* 3x3 Grid Layout - With Healthy Padding */}
      <div className="grid grid-cols-3 grid-rows-3 gap-6 flex-1 min-h-0">
          {/* Top Row - Left: Placeholder */}
          <div className={`${gridPaneClasses} p-6 flex items-center justify-center text-gray-400`}>
            <p className="text-sm">Future feature placeholder</p>
          </div>

          {/* Top Row - Center: Transcribe Prompt */}
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

          {/* Top Row - Right: Placeholder */}
          <div className={`${gridPaneClasses} p-6 flex items-center justify-center text-gray-400`}>
            <p className="text-sm">Future feature placeholder</p>
          </div>

          {/* Middle Row - Left: Drag-and-drop zone */}
          <div 
            className={`${uploadPaneClasses} transition-all duration-300 ${
              dragActive 
                ? 'border-4 border-blue-500 bg-blue-50 shadow-lg cursor-copy' 
                : 'border-2 border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 cursor-pointer'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <input 
              id="file-upload"
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileInputChange}
            />
            
            <div className="text-center p-4">
              {isProcessing ? (
                <div className="flex flex-col items-center">
                  <p className="text-lg font-medium text-blue-600">Processing...</p>
                  <div className="mt-4 w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm text-gray-500 mt-4">This may take a moment</p>
                </div>
              ) : fileName ? (
                <>
                  <p className="text-lg font-medium text-green-600">File Accepted!</p>
                  <p className="text-sm text-gray-700 mt-3 break-all">{fileName}</p>
                  {error && (
                    <p className="text-red-500 mt-2 text-xs">{error}</p>
                  )}
                  <Button 
                    variant="default"
                    size="sm"
                    className="mt-4 text-black"
                    onClick={resetState}
                  >
                    Reset
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium">Upload lesson plan</p>
                  <p className="text-sm text-gray-500 mt-3">Drag & drop your PDF file here</p>
                  <p className="text-xs text-gray-500 mt-2">or click to browse</p>
                </>
              )}
            </div>
          </div>

          {/* Middle Row - Center: Lesson Plan Prompt */}
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

          {/* Middle Row - Right: Markdown Lesson Plan */}
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

          {/* Bottom Row - Left: Placeholder */}
          <div className={`${gridPaneClasses} p-6 flex items-center justify-center text-gray-400`}>
            <p className="text-sm">Future feature placeholder</p>
          </div>

          {/* Bottom Row - Center: Worksheet Prompt */}
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

          {/* Bottom Row - Right: HTML+CSS Worksheet */}
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
    </div>
  )
}

export default App
