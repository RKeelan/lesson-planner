import { useState } from 'react'
import './App.css'

function App() {
  const [dragActive, setDragActive] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

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
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      setFileName(file.name)
    }
  }

  // Common box styles
  const boxClasses = "w-[32rem] h-[32rem] rounded-lg shadow-sm flex items-center justify-center bg-white"

  return (
    <div className="h-screen w-screen flex items-center justify-center p-6 overflow-hidden">
      <div className="flex gap-12">
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
        >
          <div className="text-center p-12">
            {fileName ? (
              <>
                <p className="text-4xl font-medium text-green-600">File Accepted!</p>
                <p className="text-2xl text-gray-700 mt-8 break-all max-w-lg">{fileName}</p>
                <button 
                  className="mt-12 text-2xl text-white bg-blue-500 hover:bg-blue-600 py-4 px-8 rounded-lg transition-colors duration-200"
                  onClick={() => setFileName(null)}
                >
                  Reset
                </button>
              </>
            ) : (
              <>
                <p className="text-4xl font-medium">Upload lesson plan</p>
                <p className="text-2xl text-gray-500 mt-8">Drag & drop your files here</p>
              </>
            )}
          </div>
        </div>

        {/* Right pane - Markdown preview */}
        <div 
          id="md-preview" 
          className={`${boxClasses} border border-gray-300 p-12 overflow-auto`}
        >
          <div className="text-center">
            {fileName ? (
              <>
                <span className="text-4xl font-medium">Document Name:</span>
                <p className="text-2xl mt-8">{fileName}</p>
              </>
            ) : (
              <div className="text-3xl text-gray-400">Document preview will appear here</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
