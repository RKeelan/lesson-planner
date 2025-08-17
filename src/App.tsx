import { useEffect, useRef, useState } from 'react'
import { initGoogleAuth, signOut } from './services/googleAuth'
import { Button } from './components/ui/button'
import { generateSlides } from './services/slidesService'
import './App.css'

function App() {
  const [dragActive, setDragActive] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isGeneratingSlides, setIsGeneratingSlides] = useState(false)
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
        templateID || undefined
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

  // Common box styles for the left pane
  const leftBoxClasses = "w-[40rem] h-[40rem] rounded-lg shadow-sm flex items-center justify-center bg-white"
  
  // Common box styles for the right pane - making it wider
  const rightBoxClasses = "w-[50rem] h-[40rem] rounded-lg shadow-sm flex items-center justify-center bg-white"

  return (
    <div className="h-screen w-screen flex items-center justify-center p-6 overflow-hidden">
      <div className="flex flex-col w-full max-w-[95rem]">
        <div className="flex justify-end mb-4">
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
        <div className="flex gap-8 flex-col md:flex-row">
          {/* Left pane - Drag-and-drop zone */}
          <div 
            className={`${leftBoxClasses} transition-all duration-300 ${
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
            
            <div className="text-center p-12">
              {isProcessing ? (
                <div className="flex flex-col items-center">
                  <p className="text-3xl font-medium text-blue-600">Processing...</p>
                  <div className="mt-8 w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xl text-gray-500 mt-8">This may take a moment</p>
                </div>
              ) : fileName ? (
                <>
                  <p className="text-4xl font-medium text-green-600">File Accepted!</p>
                  <p className="text-2xl text-gray-700 mt-8 break-all max-w-lg">{fileName}</p>
                  {error && (
                    <p className="text-red-500 mt-4">{error}</p>
                  )}
                  <Button 
                    variant="default"
                    size="lg"
                    className="mt-12 text-black"
                    onClick={resetState}
                  >
                    Reset
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-4xl font-medium">Upload lesson plan</p>
                  <p className="text-2xl text-gray-500 mt-8">Drag & drop your PDF file here</p>
                  <p className="text-xl text-gray-500 mt-4">or click to browse</p>
                </>
              )}
            </div>
          </div>

          {/* Right pane - Slides content */}
          <div className={`${rightBoxClasses} border border-gray-300 p-6 overflow-hidden flex flex-col flex-1`}>
            <div className="flex flex-col h-[calc(100%-9rem)] mb-4 w-full">
              <label htmlFor="md-input" className="block text-sm font-medium text-gray-700 mb-1 flex-shrink-0">
                Markdown Content
              </label>
              <textarea
                id="md-input"
                className="w-full h-full p-3 border border-gray-300 rounded-md font-mono text-sm resize-none overflow-auto"
                placeholder="Enter your markdown content here..."
                value={manualMarkdown}
                onChange={(e) => setManualMarkdown(e.target.value)}
                disabled={isGeneratingSlides}
              />
            </div>
            
            <div className="mb-3 flex-shrink-0 w-full">
              <label htmlFor="templateID" className="block text-sm font-medium text-gray-700 mb-1">
                Template Slides URL (optional)
              </label>
              <input
                id="templateID"
                type="text"
                className="w-full p-3 border border-gray-300 rounded-md"
                placeholder="Paste Google Slides URL or enter template ID"
                value={templateInput}
                onChange={(e) => setTemplateInput(e.target.value)}
                disabled={isGeneratingSlides}
              />
            </div>
            
            <div className="flex-shrink-0 w-full">
              {isGeneratingSlides ? (
                <div className="flex flex-col items-center justify-center py-4">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm text-gray-500 mt-2">Generating slides...</p>
                </div>
              ) : (
                <Button
                  className="w-full text-black"
                  size="lg"
                  variant="default"
                  onClick={handleGenerateSlides}
                >
                  Generate Slides
                </Button>
              )}
              {error && (
                <p className="text-sm text-red-500 mt-2">{error}</p>
              )}
              {success && (
                <p className="text-sm text-green-600 mt-2">{success}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
