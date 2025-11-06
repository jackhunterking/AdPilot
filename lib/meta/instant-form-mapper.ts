/**
 * Feature: Meta Instant Forms Mapper
 * Purpose: Convert Graph API leadgen_form responses to MetaInstantForm
 * References:
 *  - Meta Graph API leadgen_form: https://developers.facebook.com/docs/marketing-api/reference/leadgen-form/
 */

import type {
  MetaInstantForm,
  MetaInstantFormField,
  GraphAPILeadgenForm,
  GraphAPIQuestion,
  MetaInstantFormFieldType,
} from '@/lib/types/meta-instant-form'

/**
 * Map Graph API question type to our internal field type
 */
function mapQuestionType(
  graphType: string
): MetaInstantFormFieldType | null {
  const typeMap: Record<string, MetaInstantFormFieldType> = {
    FULL_NAME: 'FULL_NAME',
    EMAIL: 'EMAIL',
    PHONE: 'PHONE',
  }
  return typeMap[graphType] || null
}

/**
 * Map Graph API question to MetaInstantFormField
 */
function mapQuestion(
  question: GraphAPIQuestion,
  index: number
): MetaInstantFormField | null {
  const fieldType = mapQuestionType(question.type)
  if (!fieldType) return null

  // Default labels for core fields
  const defaultLabels: Record<MetaInstantFormFieldType, string> = {
    FULL_NAME: 'Full name',
    EMAIL: 'Email',
    PHONE: 'Phone number',
  }

  return {
    id: question.key || `field_${index}`,
    type: fieldType,
    label: question.label || defaultLabels[fieldType],
    key: question.key || fieldType.toLowerCase(),
    required: true,
  }
}

/**
 * Convert Graph API leadgen_form to MetaInstantForm
 */
export function mapGraphAPIFormToMetaForm(
  graphForm: GraphAPILeadgenForm,
  pageData?: {
    pageId?: string
    pageName?: string
    pageProfilePicture?: string
  }
): MetaInstantForm {
  // Map questions to fields (filter out null results)
  const fields: MetaInstantFormField[] = (graphForm.questions || [])
    .map((q, i) => mapQuestion(q, i))
    .filter((f): f is MetaInstantFormField => f !== null)

  // Extract privacy policy
  const privacy = {
    url: graphForm.privacy_policy?.url || '',
    linkText: graphForm.privacy_policy?.link_text || 'Privacy Policy',
  }

  // Extract thank you page
  const thankYou = graphForm.thank_you_page
    ? {
        title: graphForm.thank_you_page.title || 'Thanks for your interest!',
        body: graphForm.thank_you_page.body,
        ctaText: graphForm.thank_you_page.button_text,
        ctaUrl: graphForm.thank_you_page.website_url,
      }
    : undefined

  return {
    id: graphForm.id,
    name: graphForm.name || 'Instant Form',
    privacy,
    fields,
    thankYou,
    pageId: pageData?.pageId,
    pageName: pageData?.pageName,
    pageProfilePicture: pageData?.pageProfilePicture,
    introHeadline: graphForm.name || 'Headline text',
  }
}

/**
 * Convert builder state to MetaInstantForm (for Create flow)
 */
export interface BuilderState {
  formName: string
  privacyUrl: string
  privacyLinkText: string
  fields: Array<{
    id: string
    type: 'full_name' | 'email' | 'phone'
    label: string
    required: boolean
  }>
  thankYouTitle?: string
  thankYouMessage?: string
  thankYouButtonText?: string
  thankYouButtonUrl?: string
}

export function mapBuilderStateToMetaForm(
  state: BuilderState,
  pageData?: {
    pageId?: string
    pageName?: string
    pageProfilePicture?: string
  }
): MetaInstantForm {
  // Map builder field types to our types
  const typeMap: Record<string, MetaInstantFormFieldType> = {
    full_name: 'FULL_NAME',
    email: 'EMAIL',
    phone: 'PHONE',
  }

  const fields: MetaInstantFormField[] = state.fields.map((f) => ({
    id: f.id,
    type: typeMap[f.type] || 'EMAIL',
    label: f.label,
    key: f.type,
    required: f.required,
  }))

  const thankYou =
    state.thankYouTitle
      ? {
          title: state.thankYouTitle,
          body: state.thankYouMessage,
          ctaText: state.thankYouButtonText,
          ctaUrl: state.thankYouButtonUrl,
        }
      : undefined

  return {
    name: state.formName,
    privacy: {
      url: state.privacyUrl,
      linkText: state.privacyLinkText,
    },
    fields,
    thankYou,
    pageId: pageData?.pageId,
    pageName: pageData?.pageName,
    pageProfilePicture: pageData?.pageProfilePicture,
    introHeadline: state.formName,
  }
}

