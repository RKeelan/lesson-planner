import html2canvas from 'html2canvas'

// Base canvas dimensions (US Letter proportions: 8.5" x 11")
const BASE_CANVAS_WIDTH = 850  // 8.5 * 100
const BASE_CANVAS_HEIGHT = 1100 // 11 * 100

// Helper function to detect HTML orientation
async function detectHTMLOrientation(htmlContent: string): Promise<{ isLandscape: boolean, width: number, height: number }> {
  // Create temporary detection iframe
  const detectionIframe = document.createElement('iframe')
  detectionIframe.style.position = 'absolute'
  detectionIframe.style.left = '-9999px'
  detectionIframe.style.top = '0'
  detectionIframe.style.width = '2000px'
  detectionIframe.style.height = '2000px'
  detectionIframe.style.border = 'none'
  detectionIframe.style.visibility = 'hidden'
  
  document.body.appendChild(detectionIframe)
  
  try {
    await new Promise(resolve => {
      detectionIframe.onload = resolve
      if (detectionIframe.contentDocument) {
        resolve(undefined)
      }
    })
    
    const iframeDoc = detectionIframe.contentDocument || detectionIframe.contentWindow?.document
    if (!iframeDoc) {
      throw new Error('Could not access detection iframe document')
    }
    
    iframeDoc.open()
    iframeDoc.write(htmlContent)
    iframeDoc.close()
    
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const pageContainer = iframeDoc.querySelector('.page-container, .page') || iframeDoc.body
    const computedStyle = detectionIframe.contentWindow?.getComputedStyle(pageContainer)
    
    if (!computedStyle) {
      throw new Error('Could not get computed style for detection')
    }
    
    const width = parseFloat(computedStyle.width)
    const height = parseFloat(computedStyle.height)
    
    console.log('Detected HTML dimensions:', { width, height })
    
    document.body.removeChild(detectionIframe)
    
    return {
      isLandscape: width > height,
      width: width || BASE_CANVAS_WIDTH,
      height: height || BASE_CANVAS_HEIGHT
    }
  } catch (error) {
    document.body.removeChild(detectionIframe)
    return {
      isLandscape: false,
      width: BASE_CANVAS_WIDTH,
      height: BASE_CANVAS_HEIGHT
    }
  }
}

export async function generatePNGFromHTML(htmlContent: string, filename: string = 'worksheet.png'): Promise<void> {
  try {
    // First, detect the orientation and dimensions of the HTML content
    const { isLandscape, width: contentWidth, height: contentHeight } = await detectHTMLOrientation(htmlContent)
    
    // Set iframe dimensions based on detected orientation
    const iframeWidth = isLandscape ? BASE_CANVAS_HEIGHT : BASE_CANVAS_WIDTH
    const iframeHeight = isLandscape ? BASE_CANVAS_WIDTH : BASE_CANVAS_HEIGHT
      
    console.log('Creating iframe with dimensions:', { 
      iframeWidth, 
      iframeHeight, 
      isLandscape,
      contentWidth,
      contentHeight 
    })
    
    // Create a temporary iframe with correct orientation
    const iframe = document.createElement('iframe')
    iframe.style.position = 'absolute'
    iframe.style.left = '-9999px'
    iframe.style.top = '0'
    iframe.style.width = `${iframeWidth}px`
    iframe.style.height = `${iframeHeight}px`
    iframe.style.border = 'none'
    iframe.style.visibility = 'hidden'
    
    // Append iframe to body
    document.body.appendChild(iframe)
    
    // Wait for iframe to be ready
    await new Promise(resolve => {
      iframe.onload = resolve
      if (iframe.contentDocument) {
        resolve(undefined)
      }
    })
    
    // Get iframe document and write HTML content
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) {
      throw new Error('Could not access iframe document')
    }
    
    // Write the complete HTML content to the iframe with centering
    iframeDoc.open()
    iframeDoc.write(`
      <!DOCTYPE html>
      <html style="margin: 0; padding: 0; background: white; width: 100%; height: 100%;">
      <head>
        <meta charset="UTF-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            width: 100% !important;
            height: 100% !important;
            border: none !important;
            outline: none !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background: white; width: 100%; height: 100%; border: none; display: flex; justify-content: center; align-items: center;">
        ${htmlContent.replace(/<(!DOCTYPE|html|head|body)[^>]*>/gi, '').replace(/<\/(html|head|body)>/gi, '')}
      </body>
      </html>
    `)
    iframeDoc.close()
    
    // Wait for content to load and fonts to be ready
    try {
      // Check if document.fonts API is available for font loading detection
      if (iframe.contentDocument?.fonts) {
        await iframe.contentDocument.fonts.ready
        console.log('Fonts loaded successfully')
      } else {
        console.log('Fonts API not available, using timeout fallback')
      }
    } catch (fontError) {
      console.warn('Font loading detection failed:', fontError)
    }
    
    // Additional wait for rendering to complete
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Get the body element from iframe
    const bodyElement = iframeDoc.body
    if (!bodyElement) {
      throw new Error('Could not find body element in iframe')
    }
    
    // Use the detected orientation to set canvas dimensions
    const canvasWidth = iframeWidth
    const canvasHeight = iframeHeight
    
    console.log('Using iframe dimensions for canvas:', { canvasWidth, canvasHeight, isLandscape })
    
    // Generate canvas from the iframe content - force letter size canvas with content centered
    const canvas = await html2canvas(bodyElement, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: canvasWidth,
      height: canvasHeight,
      scale: 1,
      x: 0,
      y: 0
    } as any)
    
    // Remove the temporary iframe
    document.body.removeChild(iframe)
    
    // Save the PNG
    const link = document.createElement('a')
    link.download = filename
    link.href = canvas.toDataURL('image/png')
    link.click()
    
  } catch (error) {
    console.error('Error generating PNG:', error)
    throw new Error('Failed to generate PNG')
  }
}