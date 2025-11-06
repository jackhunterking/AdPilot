# Instant Form Persistence Migration

## Goal
Add storage for selected/created instant forms in the `campaign_states` table under `goal_data` as a JSONB field.

## Background
- The app stores campaign state in the `campaign_states` table with a 1-to-1 relationship to `campaigns`.
- The `goal_data` column is JSONB and stores goal-specific configuration.
- We need to persist the selected instant form so it can be loaded when the user returns to the goal step.

## Required Changes

### 1. Database Schema (no migration needed)
The `campaign_states.goal_data` column already exists as JSONB. We will store the instant form under a new key:

```jsonb
{
  "lead_form": {
    "id": "form_123456",
    "name": "Contact Form",
    "privacy": {
      "url": "https://example.com/privacy",
      "linkText": "Privacy Policy"
    },
    "fields": [
      {
        "id": "email",
        "type": "EMAIL",
        "label": "Email",
        "key": "email",
        "required": true
      },
      {
        "id": "full_name",
        "type": "FULL_NAME",
        "label": "Full name",
        "key": "full_name",
        "required": true
      },
      {
        "id": "phone",
        "type": "PHONE",
        "label": "Phone number",
        "key": "phone",
        "required": true
      }
    ],
    "thankYou": {
      "title": "Thanks for your interest!",
      "body": "We'll contact you within 24 hours",
      "ctaText": "View website",
      "ctaUrl": "https://example.com"
    }
  }
}
```

### 2. Verification Query
To verify the structure is working, run:

```sql
-- Check existing goal_data structure
SELECT 
  c.id as campaign_id,
  cs.goal_data
FROM campaigns c
JOIN campaign_states cs ON c.id = cs.campaign_id
WHERE cs.goal_data IS NOT NULL
LIMIT 5;

-- Example of what goal_data->>'lead_form' might look like after update
SELECT 
  c.id,
  cs.goal_data->'lead_form' as lead_form_data
FROM campaigns c
JOIN campaign_states cs ON c.id = cs.campaign_id
WHERE cs.goal_data->'lead_form' IS NOT NULL;
```

### 3. RLS Policies
Existing RLS policies on `campaign_states` should be sufficient since they already restrict by `campaign.user_id`. No new policies needed.

## Application Code Updates

### Goal Context (already exists)
The goal context at `lib/context/goal-context.tsx` will be updated to:
1. Read `goal_data.lead_form` when loading state
2. Write to `goal_data.lead_form` when form is selected/created

### Example Update Pattern
```typescript
// In goal-context.tsx or similar
const saveLeadForm = async (form: MetaInstantForm) => {
  await supabase
    .from('campaign_states')
    .update({
      goal_data: {
        ...existingGoalData,
        lead_form: form
      }
    })
    .eq('campaign_id', campaignId)
}

const loadLeadForm = async (): Promise<MetaInstantForm | null> => {
  const { data } = await supabase
    .from('campaign_states')
    .select('goal_data')
    .eq('campaign_id', campaignId)
    .single()
  
  return data?.goal_data?.lead_form || null
}
```

## Testing Checklist
- [ ] Create a form via the UI and verify `goal_data.lead_form` is populated
- [ ] Select an existing form and verify it's saved to `goal_data.lead_form`
- [ ] Reload the page/step and verify the form is restored from `goal_data.lead_form`
- [ ] Verify RLS prevents users from accessing other users' campaign states

## Notes
- No actual SQL migration file is needed since we're using an existing JSONB column
- The `lead_form` key follows the pattern of storing goal-specific data in `goal_data`
- This approach allows flexibility for future goal types without schema changes

