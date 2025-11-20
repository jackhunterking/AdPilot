/**
 * Feature: Copy Service Server Implementation
 * Purpose: Server-side ad copy generation and editing
 * References:
 *  - Copy Service Contract: lib/services/contracts/copy-service.interface.ts
 *  - Vercel AI SDK v5: https://sdk.vercel.ai/docs
 *  - AI SDK generateObject: https://sdk.vercel.ai/docs/reference/ai-sdk-core/generate-object
 */

import { generateObject } from 'ai';
import { getModel } from '@/lib/ai/gateway-provider';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import type {
  CopyService,
  GenerateCopyInput,
  GenerateCopyResult,
  EditCopyInput,
  EditCopyResult,
  RefineCopyInput,
  RefineCopyResult,
  SelectCopyInput,
  CopyVariation,
} from '../contracts/copy-service.interface';
import type { ServiceResult } from '@/lib/journeys/types/journey-contracts';

/**
 * Copy Service Server Implementation
 * Handles copy generation and editing
 * 
 * NOTE: OpenAI API integration required for full functionality
 * Currently stubs that need implementation when OpenAI key is configured
 */
class CopyServiceServer implements CopyService {
  generateCopyVariations = {
    async execute(input: GenerateCopyInput): Promise<ServiceResult<GenerateCopyResult>> {
      try {
        const supabase = await createServerClient();
        
        // Get user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          return {
            success: false,
            error: { code: 'unauthorized', message: 'Not authenticated' }
          };
        }

        // Define schema for ad copy (Meta requirements)
        const copySchema = z.object({
          variations: z.array(z.object({
            headline: z.string().max(40).describe('Catchy headline under 40 characters'),
            primary_text: z.string().max(125).describe('Main ad copy text, max 125 characters'),
            description: z.string().max(30).describe('Additional description, max 30 characters'),
            cta_text: z.string().describe('Call to action button text'),
            cta_type: z.enum(['LEARN_MORE', 'SIGN_UP', 'SHOP_NOW', 'GET_QUOTE', 'CONTACT_US', 'APPLY_NOW']).default('LEARN_MORE'),
          })).length(3).describe('Generate exactly 3 unique variations'),
        });

        // Generate using o1-mini (reasoning model for high-quality copy)
        const { object } = await generateObject({
          model: getModel('openai/o1-mini'),
          schema: copySchema,
          prompt: `Generate 3 unique ad copy variations for a ${input.goalType} campaign.

Product/Service: ${input.prompt}
Campaign Goal: ${input.goalType}
Platform: Facebook/Instagram Ads

Requirements:
- Headline: Maximum 40 characters, attention-grabbing
- Primary Text: Maximum 125 characters, goal-oriented and persuasive
- Description: Maximum 30 characters, highlight key benefit
- CTA: Action-oriented button text

Each variation should:
1. Have a distinct tone (professional, casual, urgent)
2. Emphasize different benefits
3. Target different emotional triggers
4. Comply with Meta advertising policies`,
        });

        const variations = [];

        // Insert each variation to database
        for (let i = 0; i < object.variations.length; i++) {
          const variation = object.variations[i];
          
          const { data, error: dbError } = await supabase
            .from('ad_copy_variations')
            .insert({
              ad_id: input.adId,
              headline: variation.headline,
              primary_text: variation.primary_text,
              description: variation.description,
              cta_text: variation.cta_text,
              cta_type: variation.cta_type,
              sort_order: i,
              generation_prompt: input.prompt,
            })
            .select()
            .single();

          if (!dbError && data) {
            variations.push(data);
          }
        }

        if (variations.length === 0) {
          return {
            success: false,
            error: { code: 'insert_failed', message: 'Failed to save copy variations' }
          };
        }

        return {
          success: true,
          data: { variations },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'generation_failed',
            message: error instanceof Error ? error.message : 'Copy generation failed',
          },
        };
      }
    },
  };

  editCopy = {
    async execute(input: EditCopyInput): Promise<ServiceResult<EditCopyResult>> {
      try {
        const supabase = await createServerClient();
        
        // Get user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          return {
            success: false,
            error: { code: 'unauthorized', message: 'Not authenticated' }
          };
        }

        // Edit copy using o1-mini reasoning model
        const { object } = await generateObject({
          model: getModel('openai/o1-mini'),
          schema: z.object({
            headline: z.string().max(40).describe('Edited headline under 40 characters'),
            primary_text: z.string().max(125).describe('Edited primary text under 125 characters'),
            description: z.string().max(30).describe('Edited description under 30 characters'),
            cta_text: z.string().describe('Edited call to action'),
          }),
          prompt: `Edit this ad copy based on the following feedback: ${input.feedback}

Current Copy:
- Headline: ${input.currentCopy.headline}
- Primary Text: ${input.currentCopy.primary_text}
- Description: ${input.currentCopy.description || 'None'}
- CTA: ${input.currentCopy.cta_text}

Apply the requested changes while:
- Maintaining Meta ad requirements (character limits)
- Keeping the core message
- Improving clarity and persuasiveness
- Ensuring compliance with advertising policies`,
        });

        return {
          success: true,
          data: {
            headline: object.headline,
            primary_text: object.primary_text,
            description: object.description,
            cta_text: object.cta_text,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'edit_failed',
            message: error instanceof Error ? error.message : 'Copy edit failed',
          },
        };
      }
    },
  };

  refineHeadline = {
    async execute(input: RefineCopyInput): Promise<ServiceResult<RefineCopyResult>> {
      try {
        // Refine headline using o1-mini
        const { object } = await generateObject({
          model: getModel('openai/o1-mini'),
          schema: z.object({
            refined: z.string().max(40).describe('Refined headline under 40 characters'),
          }),
          prompt: `Refine this ad headline: "${input.currentText}"

Make it more ${input.refinementType || 'engaging and persuasive'}.
Keep under 40 characters.
Maintain core message while improving impact.`,
        });

        return {
          success: true,
          data: { refined: object.refined },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'refinement_failed',
            message: error instanceof Error ? error.message : 'Headline refinement failed',
          },
        };
      }
    },
  };

  refinePrimaryText = {
    async execute(input: RefineCopyInput): Promise<ServiceResult<RefineCopyResult>> {
      try {
        // Refine primary text using o1-mini
        const { object } = await generateObject({
          model: getModel('openai/o1-mini'),
          schema: z.object({
            refined: z.string().max(125).describe('Refined primary text under 125 characters'),
          }),
          prompt: `Refine this ad primary text: "${input.currentText}"

Make it more ${input.refinementType || 'persuasive and action-oriented'}.
Keep under 125 characters.
Maintain the key message while improving engagement.`,
        });

        return {
          success: true,
          data: { refined: object.refined },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'refinement_failed',
            message: error instanceof Error ? error.message : 'Primary text refinement failed',
          },
        };
      }
    },
  };

  refineDescription = {
    async execute(input: RefineCopyInput): Promise<ServiceResult<RefineCopyResult>> {
      try {
        // Refine description using o1-mini
        const { object } = await generateObject({
          model: getModel('openai/o1-mini'),
          schema: z.object({
            refined: z.string().max(30).describe('Refined description under 30 characters'),
          }),
          prompt: `Refine this ad description: "${input.currentText}"

Make it more ${input.refinementType || 'concise and impactful'}.
Keep under 30 characters.
Highlight the key benefit.`,
        });

        return {
          success: true,
          data: { refined: object.refined },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'refinement_failed',
            message: error instanceof Error ? error.message : 'Description refinement failed',
          },
        };
      }
    },
  };

  selectCopyVariation = {
    async execute(input: SelectCopyInput): Promise<ServiceResult<void>> {
      try {
        const supabase = await createServerClient();
        
        // Update selected_copy_id on ads table
        const { error } = await supabase
          .from('ads')
          .update({ selected_copy_id: input.variationIndex.toString() })
          .eq('id', input.adId);

        if (error) {
          return {
            success: false,
            error: {
              code: 'update_failed',
              message: error.message,
            },
          };
        }

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'internal_error',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    },
  };

  validateCopy = {
    async execute(copy: CopyVariation): Promise<ServiceResult<{ valid: boolean; errors?: string[] }>> {
      try {
        const errors: string[] = [];

        // Meta character limits
        if (copy.headline && copy.headline.length > 40) {
          errors.push('Headline must be 40 characters or less');
        }

        if (copy.primaryText && copy.primaryText.length > 125) {
          errors.push('Primary text must be 125 characters or less');
        }

        if (copy.description && copy.description.length > 30) {
          errors.push('Description must be 30 characters or less');
        }

        return {
          success: true,
          data: {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'validation_failed',
            message: error instanceof Error ? error.message : 'Copy validation failed',
          },
        };
      }
    },
  };
}

// Export singleton instance
export const copyServiceServer = new CopyServiceServer();

