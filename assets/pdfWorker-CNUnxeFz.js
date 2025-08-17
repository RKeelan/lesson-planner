(function(){"use strict";let r=null;self.postMessage("worker-ready");const i="https://cdn.jsdelivr.net/pyodide/v0.24.1/full/";async function n(){try{const{loadPyodide:o}=await import(`${i}pyodide.mjs`);if(r=await o({indexURL:i}),!r)throw new Error("Failed to initialize Pyodide");await r.loadPackage("micropip");const t=`${location.origin}/markitdown-0.1.1-py3-none-any.whl`;console.log(`Worker: Attempting to install wheel from: ${t}`);try{const e=await fetch(t);if(console.log(`Worker: Wheel file fetch status: ${e.status}`),console.log(`Worker: Wheel file content-type: ${e.headers.get("content-type")}`),console.log(`Worker: Wheel file size: ${e.headers.get("content-length")} bytes`),!e.ok)throw new Error(`Wheel file not accessible: ${e.status} ${e.statusText}`)}catch(e){throw console.error(`Worker: Failed to fetch wheel file: ${e}`),e}await r.runPythonAsync(`
      import micropip
      
      print(f"About to install wheel from: ${t}")
      
      # Install local markitdown package with absolute URL
      try:
        await micropip.install([
          '${t}',
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
    `),self.postMessage("pyodide-ready")}catch(o){self.postMessage({type:"pyodide-error",error:o instanceof Error?o.toString():String(o)}),r=null}}n();async function s(o){if(!r)throw new Error("Pyodide is not initialized");try{return r.FS.writeFile("/tmp/doc.pdf",new Uint8Array(o)),await r.runPythonAsync(`
      from markitdown import MarkItDown
      
      # Initialize MarkItDown with all plugins enabled
      mid = MarkItDown(enable_plugins=True)
      
      # Convert the document
      result = mid.convert('/tmp/doc.pdf')
      
      # Return text content
      result.text_content
    `)}catch(t){throw console.error("Error converting PDF to Markdown:",t),t}}self.addEventListener("message",async o=>{const t=o.data;if(console.log("Worker received:",t),t.command==="reload-pyodide"&&(r=null,n()),t.type==="convert"&&t.file)try{r||await n();const e=await t.file.arrayBuffer(),a=await s(e);self.postMessage({type:"conversion-result",success:!0,markdown:a})}catch(e){self.postMessage({type:"conversion-result",success:!1,error:e instanceof Error?e.toString():String(e)})}})})();
