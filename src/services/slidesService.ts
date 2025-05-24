import { getAccessToken } from './googleAuth';
import SlideGenerator from '../md2gslides/slide_generator';

export async function generateSlides(
  markdown: string,
  templateId?: string,
): Promise<string> {
  try {
    const token = await getAccessToken();
    
    // Create or copy presentation
    let generator;
    if (templateId) {
      try {
        // Try to copy presentation (requires drive.file permission)
        generator = await SlideGenerator.copyPresentation(token, 'Lesson Plan', templateId);
      } catch (error) {
        console.warn('Could not copy presentation template (missing Drive permissions). Creating new presentation instead.');
        // Fallback to creating a new presentation
        generator = await SlideGenerator.newPresentation(token, 'Lesson Plan');
      }
    } else {
      generator = await SlideGenerator.newPresentation(token, 'Lesson Plan');
    }
    
    // Generate slides from markdown
    return await generator.generateFromMarkdown(markdown);
  } catch (error) {
    console.error('Error generating slides:', error);
    throw error;
  }
}