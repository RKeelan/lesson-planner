(function(){"use strict";let r=null;self.postMessage("worker-ready");const n="https://cdn.jsdelivr.net/pyodide/v0.24.1/full/";async function i(){try{const{loadPyodide:t}=await import(`${n}pyodide.mjs`);if(r=await t({indexURL:n}),!r)throw new Error("Failed to initialize Pyodide");await r.loadPackage("micropip");const e=`${location.origin}/markitdown-0.1.1-py3-none-any.whl`;await r.runPythonAsync(`
      import micropip
      
      # Install local markitdown package with absolute URL
      await micropip.install([
        '${e}',
        'pdfminer.six',])
      
      try:
          import markitdown
          print("Required packages imported successfully")
      except ImportError as e:
          print(f"Error importing packages: {e}")
    `),self.postMessage("pyodide-ready")}catch(t){self.postMessage({type:"pyodide-error",error:t instanceof Error?t.toString():String(t)}),r=null}}i();async function a(t){if(!r)throw new Error("Pyodide is not initialized");try{return r.FS.writeFile("/tmp/doc.pdf",new Uint8Array(t)),await r.runPythonAsync(`
      from markitdown import MarkItDown
      
      # Initialize MarkItDown with all plugins enabled
      mid = MarkItDown(enable_plugins=True)
      
      # Convert the document
      result = mid.convert('/tmp/doc.pdf')
      
      # Return text content
      result.text_content
    `)}catch(e){throw console.error("Error converting PDF to Markdown:",e),e}}self.addEventListener("message",async t=>{const e=t.data;if(console.log("Worker received:",e),e.command==="reload-pyodide"&&(r=null,i()),e.type==="convert"&&e.file)try{r||await i();const o=await e.file.arrayBuffer(),s=await a(o);self.postMessage({type:"conversion-result",success:!0,markdown:s})}catch(o){self.postMessage({type:"conversion-result",success:!1,error:o instanceof Error?o.toString():String(o)})}})})();
