import { getAccessToken } from './services/googleAuth'
import { useEffect, useRef, useState } from 'react'
import { initGoogleAuth } from './services/googleAuth'
import { Button } from './components/ui/button'
import './App.css'

function App() {
  const [dragActive, setDragActive] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [manualMarkdown, setManualMarkdown] = useState('')
  const [templateID, setTemplateID] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
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

    // Check if user is authenticated
    const checkAuthentication = () => {
      const token = localStorage.getItem('google_auth_token')
      setIsAuthenticated(!!token)
    }

    checkAuthentication()
    
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
  }

  const handleGenerateSlides = async () => {
    try {
      const token = await getAccessToken()
      // Here you would implement the call to generate slides using the token
      console.log('Generate slides with token:', token)
      console.log('Using markdown:', manualMarkdown)
      console.log('Using template ID:', templateID || 'none')
    } catch (error) {
      console.error('Error generating slides:', error)
      setError('Failed to generate slides. Please try again.')
    }
  }

  // Common box styles for the left pane
  const leftBoxClasses = "w-[40rem] h-[40rem] rounded-lg shadow-sm flex items-center justify-center bg-white"
  
  // Common box styles for the right pane - making it wider
  const rightBoxClasses = "w-[50rem] h-[40rem] rounded-lg shadow-sm flex items-center justify-center bg-white"

  return (
    <div className="h-screen w-screen flex items-center justify-center p-6 overflow-hidden">
      <div className="flex flex-col w-full max-w-[95rem]">
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
              />
            </div>
            
            <div className="mb-3 flex-shrink-0 w-full">
              <label htmlFor="templateID" className="block text-sm font-medium text-gray-700 mb-1">
                Template ID (optional)
              </label>
              <input
                id="templateID"
                type="text"
                className="w-full p-3 border border-gray-300 rounded-md"
                placeholder="Enter template presentation ID"
                value={templateID}
                onChange={(e) => setTemplateID(e.target.value)}
              />
            </div>
            
            <div className="flex-shrink-0 w-full">
              <Button
                className="w-full text-black"
                size="lg"
                variant={isAuthenticated ? "default" : "secondary"}
                disabled={!isAuthenticated}
                onClick={handleGenerateSlides}
              >
                Generate Slides
              </Button>
              {!isAuthenticated && (
                <p className="text-sm text-red-500 mt-2">
                  You must sign in with Google first to generate slides
                </p>
              )}
              {error && (
                <p className="text-sm text-red-500 mt-2">{error}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
