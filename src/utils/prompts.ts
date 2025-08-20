// Import prompts as raw text using Vite's ?raw suffix
import lessonPlanPrompt from '../prompts/lesson-plan.md?raw'
import worksheetPrompt from '../prompts/worksheet.md?raw'
import transcribePrompt from '../prompts/transcribe.md?raw'

export const prompts = {
  lessonPlan: lessonPlanPrompt,
  worksheet: worksheetPrompt,
  transcribe: transcribePrompt
}