import { getAccessToken } from './googleAuth';
import SlideGenerator from '../md2gslides/slide_generator';

export async function generateSlides(
  markdown: string,
  templateId?: string,
  title?: string,
): Promise<string> {
  try {
    const token = await getAccessToken();
    
    // Create or copy presentation
    const presentationTitle = title?.trim() || 'Lesson Plan';
    let generator;
    if (templateId) {
      try {
        // Try to copy presentation (requires drive.file permission)
        generator = await SlideGenerator.copyPresentation(token, presentationTitle, templateId);
      } catch (_error) {
        console.warn('Could not copy presentation template (missing Drive permissions). Creating new presentation instead.');
        // Fallback to creating a new presentation
        generator = await SlideGenerator.newPresentation(token, presentationTitle);
      }
    } else {
      generator = await SlideGenerator.newPresentation(token, presentationTitle);
    }
    
    // Generate slides from markdown
    return await generator.generateFromMarkdown(markdown);
  } catch (error) {
    console.error('Error generating slides:', error);
    throw error;
  }
}