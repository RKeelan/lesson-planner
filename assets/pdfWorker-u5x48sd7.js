(function(){"use strict";let e=null;self.postMessage("worker-ready");const i="https://cdn.jsdelivr.net/pyodide/v0.24.1/full/";async function n(){try{const{loadPyodide:r}=await import(`${i}pyodide.mjs`);if(e=await r({indexURL:i}),!e)throw new Error("Failed to initialize Pyodide");await e.loadPackage("micropip"),await e.runPythonAsync(`
      import micropip
      
      # Install local markitdown package
      await micropip.install([
        '/markitdown-0.1.1-py3-none-any.whl',
        'pdfminer.six',])
      
      try:
          import markitdown
          print("Required packages imported successfully")
      except ImportError as e:
          print(f"Error importing packages: {e}")
    `),self.postMessage("pyodide-ready")}catch(r){self.postMessage({type:"pyodide-error",error:r instanceof Error?r.toString():String(r)}),e=null}}n();async function a(r){if(!e)throw new Error("Pyodide is not initialized");try{return e.FS.writeFile("/tmp/doc.pdf",new Uint8Array(r)),await e.runPythonAsync(`
      from markitdown import MarkItDown
      
      # Initialize MarkItDown with all plugins enabled
      mid = MarkItDown(enable_plugins=True)
      
      # Convert the document
      result = mid.convert('/tmp/doc.pdf')
      
      # Return text content
      result.text_content
    `)}catch(t){throw console.error("Error converting PDF to Markdown:",t),t}}self.addEventListener("message",async r=>{const t=r.data;if(console.log("Worker received:",t),t.command==="reload-pyodide"&&(e=null,n()),t.type==="convert"&&t.file)try{e||await n();const o=await t.file.arrayBuffer(),s=await a(o);self.postMessage({type:"conversion-result",success:!0,markdown:s})}catch(o){self.postMessage({type:"conversion-result",success:!1,error:o instanceof Error?o.toString():String(o)})}})})();
