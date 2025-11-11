import { tool } from 'ai';
import { z } from 'zod';

export const audienceTargetingTool = tool({
  description: `Provide guidance and suggestions for audience targeting.
  
  USAGE GUIDELINES:
  1. RECOMMEND AI Advantage+ as the primary option - it performs 22% better on average
  2. For users who want manual targeting, offer helpful suggestions without blocking their progress
  3. Never repeatedly push for AI Advantage+ if the user has chosen manual targeting
  4. Keep suggestions concise and actionable
  5. Limit suggestions to 3 per stage to avoid infinite loops
  
  WHEN TO USE THIS TOOL:
  - User asks for targeting recommendations
  - User asks how to describe their audience for manual targeting
  - User wants to understand their targeting options
  - User asks about specific interests or behaviors to target
  
  WHEN NOT TO USE:
  - User has already selected their targeting mode and is making progress
  - User explicitly dismisses suggestions
  - You've already made 3 suggestions in the current stage
  
  CRITICAL: This tool provides SUGGESTIONS only. Never block the user from proceeding with their choice.`,
  
  inputSchema: z.object({
    suggestionType: z.enum(['recommend_advantage_plus', 'help_with_description', 'explain_parameters', 'suggest_refinement', 'confirm_ready'])
      .describe('Type of suggestion to provide'),
    context: z.string().optional().describe('Additional context about what the user is working on'),
  }),
  // Server-side execution for audience targeting suggestions
  execute: async (input, { toolCallId }) => {
    const suggestions = {
      recommend_advantage_plus: "I recommend using AI Advantage+ targeting - it performs 22% better on average by automatically finding your ideal customers. But if you prefer more control, manual targeting is also available!",
      help_with_description: "Great! Describe your ideal customer in natural language. For example: 'Women aged 25-40 interested in fitness and healthy eating' or 'Small business owners in tech industry'. I'll translate this into Meta targeting parameters.",
      explain_parameters: "I've generated targeting parameters based on your description. You can adjust the age range, gender, interests, and behaviors. Each parameter helps Meta find people more likely to be interested in your ad.",
      suggest_refinement: `Your targeting looks good! ${input.context || 'Consider adding more interests or behaviors to reach a more specific audience, or remove some to broaden your reach.'}`,
      confirm_ready: "Your targeting is set up! These parameters will help Meta show your ad to the right people. You can always come back to adjust them later.",
    };
    
    return {
      success: true,
      suggestionType: input.suggestionType,
      suggestion: suggestions[input.suggestionType],
      toolCallId,
    };
  },
});


