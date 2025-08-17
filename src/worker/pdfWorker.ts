// PDF Worker
// This worker will handle PDF processing tasks

declare const self: Worker;

interface PyodideInterface {
  runPythonAsync: <T>(code: string) => Promise<T>;
  loadPackage: (packageName: string | string[]) => Promise<void>;
  FS: {
    writeFile: (path: string, data: Uint8Array, options?: object) => void;
  };
}

let pyodideInstance: PyodideInterface | null = null;

// Let the main thread know the worker is ready
self.postMessage('worker-ready');

// Define the Pyodide CDN URL
const PYODIDE_CDN_URL = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/';

// Dynamically load Pyodide
async function initializePyodide() {
  try {
    // Use importShim for ESM in workers (Vite handles this)
    const { loadPyodide } = await import(/* @vite-ignore */ `${PYODIDE_CDN_URL}pyodide.mjs`);

    // Initialize Pyodide with the CDN location for additional assets
    pyodideInstance = await loadPyodide({
      indexURL: PYODIDE_CDN_URL,
    }) as PyodideInterface;
    
    if (!pyodideInstance) {
      throw new Error("Failed to initialize Pyodide");
    }
    
    // Load the micropip package first
    await pyodideInstance.loadPackage('micropip');
    
    // Construct the wheel file URL based on the worker's origin
    // For GitHub Pages, extract the repository name from the current path
    const isGitHubPages = location.hostname.includes('github.io');
    let basePath = '';
    if (isGitHubPages) {
      // Extract repo name from pathname (e.g., '/lesson-planner/' -> '/lesson-planner')
      const pathSegments = location.pathname.split('/').filter(Boolean);
      basePath = pathSegments.length > 0 ? `/${pathSegments[0]}` : '';
    }
    const wheelUrl = `${location.origin}${basePath}/markitdown-0.1.1-py3-none-any.whl`;
    
    // Debug: Check wheel file availability
    console.log(`Worker: Attempting to install wheel from: ${wheelUrl}`);
    
    try {
      // First check if wheel file is accessible
      const response = await fetch(wheelUrl);
      console.log(`Worker: Wheel file fetch status: ${response.status}`);
      console.log(`Worker: Wheel file content-type: ${response.headers.get('content-type')}`);
      console.log(`Worker: Wheel file size: ${response.headers.get('content-length')} bytes`);
      
      if (!response.ok) {
        throw new Error(`Wheel file not accessible: ${response.status} ${response.statusText}`);
      }
    } catch (fetchError) {
      console.error(`Worker: Failed to fetch wheel file: ${fetchError}`);
      throw fetchError;
    }
    
    await pyodideInstance.runPythonAsync(`
      import micropip
      
      print(f"About to install wheel from: ${wheelUrl}")
      
      # Install local markitdown package with absolute URL
      try:
        await micropip.install([
          '${wheelUrl}',
          'pdfminer.six',])
        print("Packages installed successfully")
      except Exception as install_error:
        print(f"Installation error: {install_error}")
        print(f"Error type: {type(install_error).__name__}")
        raise install_error
      
      try:
          import markitdown
          print("Required packages imported successfully")
      except ImportError as e:
          print(f"Error importing packages: {e}")
    `);
    
    // Signal successful loading
    self.postMessage('pyodide-ready');
  } catch (error: unknown) {
    // Signal error with details
    self.postMessage({ 
      type: 'pyodide-error', 
      error: error instanceof Error ? error.toString() : String(error) 
    });
    // Reset instance on error
    pyodideInstance = null;
  }
}

// Start loading Pyodide only once at initialization
initializePyodide();

// Convert PDF to Markdown
async function convertPdfToMarkdown(arrayBuffer: ArrayBuffer): Promise<string> {
  if (!pyodideInstance) {
    throw new Error("Pyodide is not initialized");
  }

  try {
    // Write the PDF file to the Pyodide filesystem
    pyodideInstance.FS.writeFile('/tmp/doc.pdf', new Uint8Array(arrayBuffer));
    
    // Run Python code to convert PDF to Markdown
    const result = await pyodideInstance.runPythonAsync<string>(`
      from markitdown import MarkItDown
      
      # Initialize MarkItDown with all plugins enabled
      mid = MarkItDown(enable_plugins=True)
      
      # Convert the document
      result = mid.convert('/tmp/doc.pdf')
      
      # Return text content
      result.text_content
    `);
    
    return result;
  } catch (error: unknown) {
    console.error("Error converting PDF to Markdown:", error);
    throw error;
  }
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
  const data = event.data;
  
  // Process messages from the main thread here
  console.log('Worker received:', data);
  
  // Allow manual reload request if needed
  if (data.command === 'reload-pyodide') {
    pyodideInstance = null;
    initializePyodide();
  }
  
  // Handle PDF to Markdown conversion
  if (data.type === 'convert' && data.file) {
    try {
      // Wait for Pyodide to be ready if it's not
      if (!pyodideInstance) {
        await initializePyodide();
      }
      
      // Convert the file to ArrayBuffer
      const arrayBuffer = await data.file.arrayBuffer();
      
      // Convert PDF to Markdown
      const markdownText = await convertPdfToMarkdown(arrayBuffer);
      
      // Send the result back to the main thread
      self.postMessage({
        type: 'conversion-result',
        success: true,
        markdown: markdownText
      });
    } catch (error: unknown) {
      // Send error back to main thread
      self.postMessage({
        type: 'conversion-result',
        success: false,
        error: error instanceof Error ? error.toString() : String(error)
      });
    }
  }
}); 