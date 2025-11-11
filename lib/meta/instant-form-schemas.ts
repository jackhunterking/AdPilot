/**
 * Feature: Meta Instant Forms Zod Schemas
 * Purpose: Runtime validation for Graph API responses and request bodies
 * References:
 *  - Meta Graph API leadgen_form: https://developers.facebook.com/docs/marketing-api/reference/leadgen-form/
 */

import { z } from 'zod'

/**
 * Graph API Question schema (subset for core fields)
 */
export const GraphAPIQuestionSchema = z.object({
  type: z.string(),
  key: z.string().optional(),
  label: z.string().optional(),
})

/**
 * Graph API Privacy Policy schema
 */
export const GraphAPIPrivacyPolicySchema = z.object({
  url: z.string().optional(),
  link_text: z.string().optional(),
})

/**
 * Graph API Thank You Page schema
 */
export const GraphAPIThankYouPageSchema = z.object({
  title: z.string().optional(),
  body: z.string().optional(),
  button_text: z.string().optional(),
  website_url: z.string().optional(),
})

/**
 * Graph API Leadgen Form response schema (minimal)
 */
export const GraphAPILeadgenFormSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  questions: z.array(GraphAPIQuestionSchema).optional(),
  privacy_policy: GraphAPIPrivacyPolicySchema.optional(),
  thank_you_page: GraphAPIThankYouPageSchema.optional(),
  created_time: z.string().optional(),
})

/**
 * Graph API Forms List response schema
 */
export const GraphAPIFormsListSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      name: z.string().optional(),
      created_time: z.string().optional(),
    })
  ),
  paging: z.object({
    cursors: z.object({
      before: z.string().optional(),
      after: z.string().optional(),
    }).optional(),
    next: z.string().optional(),
    previous: z.string().optional(),
  }).optional(),
})

/**
 * Create Form Request Body schema
 */
export const CreateFormRequestSchema = z.object({
  campaignId: z.string(),
  pageId: z.string().optional(),
  pageAccessToken: z.string().optional(),
  name: z.string().min(1, 'Form name is required'),
  privacyPolicy: z.object({
    url: z.string().url('Invalid privacy policy URL'),
    link_text: z.string().min(1, 'Privacy link text is required'),
  }),
  questions: z.array(
    z.object({
      type: z.enum(['FULL_NAME', 'EMAIL', 'PHONE']),
      key: z.string(),
    })
  ).optional(),
  thankYouPage: z.object({
    title: z.string().optional(),
    body: z.string().optional(),
    button_text: z.string().optional(),
    website_url: z.string().optional(),
  }).optional(),
})

export type GraphAPIQuestion = z.infer<typeof GraphAPIQuestionSchema>
export type GraphAPIPrivacyPolicy = z.infer<typeof GraphAPIPrivacyPolicySchema>
export type GraphAPIThankYouPage = z.infer<typeof GraphAPIThankYouPageSchema>
export type GraphAPILeadgenForm = z.infer<typeof GraphAPILeadgenFormSchema>
export type GraphAPIFormsList = z.infer<typeof GraphAPIFormsListSchema>
export type CreateFormRequest = z.infer<typeof CreateFormRequestSchema>

