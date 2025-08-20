import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

// Canvas dimensions with bleed area for better PDF generation
const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 1100

export async function generatePDFFromHTML(htmlContent: string, filename: string = 'worksheet.pdf'): Promise<void> {
  try {
    // Create a temporary iframe with oversized dimensions to capture bleed area
    const iframe = document.createElement('iframe')
    iframe.style.position = 'absolute'
    iframe.style.left = '-9999px'
    iframe.style.top = '0'
    iframe.style.width = `${CANVAS_WIDTH}px`
    iframe.style.height = `${CANVAS_HEIGHT}px` 
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
    
    // Write the complete HTML content to the iframe with oversized white background
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
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background: white; width: 100%; height: 100%; border: none;">
        ${htmlContent.replace(/<(!DOCTYPE|html|head|body)[^>]*>/gi, '').replace(/<\/(html|head|body)>/gi, '')}
      </body>
      </html>
    `)
    iframeDoc.close()
    
    // Wait for content to load and render
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Get the body element from iframe
    const bodyElement = iframeDoc.body
    if (!bodyElement) {
      throw new Error('Could not find body element in iframe')
    }
    
    // Generate canvas from the iframe content - capture oversized area with white background
    const canvas = await html2canvas(bodyElement, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT
    } as any)
    
    // Remove the temporary iframe
    document.body.removeChild(iframe)
    
    // Determine orientation based on canvas dimensions
    const isLandscape = canvas.width > canvas.height
    const orientation = isLandscape ? 'l' : 'p'
    
    // Set PDF dimensions based on orientation (US Letter: 216 x 279 mm)
    const pageWidthMM = isLandscape ? 279 : 216
    const pageHeightMM = isLandscape ? 216 : 279
    
    // Create PDF with correct orientation
    const pdf = new jsPDF(orientation, 'mm', 'letter')
    
    // Use full page dimensions - no scaling, no centering, no borders
    const imgWidth = pageWidthMM
    const imgHeight = pageHeightMM
    
    // Add the image to fill the entire page (full bleed)
    pdf.addImage(
      canvas.toDataURL('image/png'), 
      'PNG', 
      0, // No X offset - start at edge
      0, // No Y offset - start at edge  
      imgWidth, // Full page width
      imgHeight // Full page height
    )
    
    // Save the PDF
    pdf.save(filename)
    
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw new Error('Failed to generate PDF')
  }
}