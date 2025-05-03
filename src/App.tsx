import { useEffect, useRef, useState } from 'react'
import './App.css'

function App() {
  const [dragActive, setDragActive] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [markdownContent, setMarkdownContent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const workerRef = useRef<Worker | null>(null)

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
          setMarkdownContent(event.data.markdown)
          setError(null)
        } else {
          setError(`Conversion failed: ${event.data.error}`)
          setMarkdownContent(null)
        }
      }
      
      if (event.data.type === 'pyodide-error') {
        setError(`Python environment error: ${event.data.error}`)
        setIsProcessing(false)
      }
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
    
    setFileName(file.name)
    setIsProcessing(true)
    setMarkdownContent(null)
    
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
    setMarkdownContent(null)
    setError(null)
  }

  // Common box styles
  const boxClasses = "w-[32rem] h-[32rem] rounded-lg shadow-sm flex items-center justify-center bg-white"

  return (
    <div className="h-screen w-screen flex items-center justify-center p-6 overflow-hidden">
      <div className="flex gap-12 flex-col md:flex-row">
        {/* Left pane - Drag-and-drop zone */}
        <div 
          className={`${boxClasses} transition-all duration-300 ${
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
                <button 
                  className="mt-12 text-2xl text-white bg-blue-500 hover:bg-blue-600 py-4 px-8 rounded-lg transition-colors duration-200"
                  onClick={resetState}
                >
                  Reset
                </button>
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

        {/* Right pane - Markdown preview */}
        <div 
          id="md-preview" 
          className={`${boxClasses} border border-gray-300 p-6 overflow-auto`}
        >
          {markdownContent ? (
            <div className="markdown-content w-full h-full overflow-auto">
              <pre className="whitespace-pre-wrap text-sm">{markdownContent}</pre>
            </div>
          ) : (
            <div className="text-center">
              {fileName && !error ? (
                <div className="text-3xl text-gray-400">
                  {isProcessing ? 'Converting PDF to Markdown...' : 'Waiting for conversion...'}
                </div>
              ) : (
                <div className="text-3xl text-gray-400">Markdown preview will appear here</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
