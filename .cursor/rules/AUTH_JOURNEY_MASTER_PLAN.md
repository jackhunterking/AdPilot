# Authentication Journey Master Plan

## Purpose and Scope

This document serves as the single source of truth for understanding, testing, and verifying all authentication and campaign creation flows in AdPilot. It provides:

- Visual flowcharts of all user journeys
- Detailed phase breakdowns with expected system behavior
- State tracking at each step (database, localStorage, sessionStorage, URL)
- API endpoint references and interactions
- Component interaction maps

## 🚨 CRITICAL UNDERSTANDING - Automation Triggers

**There is ONE and ONLY ONE automation trigger in AdPilot: ENTERING A PROMPT**

### ✓ What Triggers Campaign Creation (Automation):
1. **Unauthenticated user enters prompt** → System stores prompt → Opens auth modal → After authentication → Automatically creates campaign
2. **Authenticated user enters prompt** → Immediately creates campaign automatically

### ✗ What Does NOT Trigger Campaign Creation:
1. **Clicking "Sign Up" button** → Opens auth modal → User creates account → Stays on homepage (NO campaign created)
2. **Clicking "Sign In" button** → Opens auth modal → User signs in → Stays on homepage (NO campaign created)

### 📝 About Prompts:
Users enter natural language expressing their desires:
- ✓ "I want more customers for my gym"
- ✓ "Need leads for my law practice"
- ✓ "Want people to call my plumbing business"
- ✗ NOT technical prompts like "Create a lead generation campaign..."

**Remember:** Authentication buttons are for authentication ONLY. Campaign creation happens ONLY when a prompt is entered.

## Document Navigation

- [Journey Overview](#journey-overview) - High-level map of all journeys
- [Journey 1: Prompt → Auth → Campaign](#journey-1-unauthenticated-user-creates-prompt) - Unauthenticated user enters prompt (AUTOMATION)
- [Journey 2: Sign Up → Homepage](#journey-2-direct-sign-up-no-automation) - Direct signup (NO automation)
- [Journey 3: Sign In → Homepage](#journey-3-existing-user-sign-in-no-automation) - Returning user (NO automation)
- [Journey 4: Prompt (Authenticated) → Campaign](#journey-4-authenticated-user-creates-prompt) - Authenticated user enters prompt (AUTOMATION)
- [Critical Paths & Edge Cases](#critical-paths--edge-cases)
- [API Endpoints Reference](#api-endpoints-reference)
- [Component Interaction Map](#component-interaction-map)
- [State Management Summary](#state-management-summary)

## Key Terminology

| Term | Definition |
|------|------------|
| **Prompt** | Natural language input from user expressing what they want (e.g., "I need more customers", "Want leads for my business"). NOT technical instructions. |
| **Temp Prompt** | Temporary storage of user's natural language prompt and goal before authentication |
| **temp_prompt_id** | UUID identifier for a stored temp prompt |
| **Draft Ad** | Initial ad record created automatically with campaign |
| **First Visit Flag** | URL parameter `firstVisit=true` that triggers initial setup flow |
| **Sentinel Key** | sessionStorage flag to prevent duplicate processing |
| **Post-Auth Handler** | Service that processes temp prompts after authentication |
| **user_metadata** | Supabase user metadata object where OAuth temp_prompt_id is stored |
| **Automation Trigger** | ONLY occurs when user submits a prompt. Auth buttons (Sign Up/Sign In) do NOT trigger automation. |

## State Tracking Legend

Throughout this document, state snapshots use these indicators:

**Database Tables:**
- `temp_prompts` - Temporary prompt storage (1 hour expiration)
- `campaigns` - Campaign records
- `ads` - Ad records
- `profiles` - User profile records

**Browser Storage:**
- `localStorage.temp_prompt_id` - Temp prompt reference persisted across OAuth redirects
- `sessionStorage.post_login_processed` - Duplicate prevention sentinel
- `sessionStorage.post_verify_processed` - Email verification sentinel
- `sessionStorage.post_login_campaign_id` - Recovery campaign ID

**URL Parameters:**
- `?view=build` - Opens campaign builder view
- `?adId={id}` - Pre-selects specific ad
- `?firstVisit=true` - Triggers first-time setup
- `?verified=true` - Email verification success indicator
- `?auth=success` - OAuth callback success indicator

**Application URLs:**
- Production: `https://adpilot.studio`
- Staging: `https://staging.adpilot.studio`

---

## Journey Overview

```
                             ┌─────────────────────────┐
                             │  User Lands on Homepage │
                             └───────────┬─────────────┘
                                         │
                                         ▼
                            ┌────────────────────────┐
                            │  User Authenticated?   │
                            └──────┬──────────┬──────┘
                                   │          │
                       NO ◄────────┘          └────────► YES
                       │                                 │
                       ▼                                 ▼
         ┌─────────────────────────┐        ┌──────────────────────────┐
         │    What User Does?      │        │  Show Campaign Grid &    │
         └──┬────────┬──────────┬──┘        │  Create Prompt Option    │
            │        │          │           └──────────────────────────┘
            │        │          │                        │
    ┌───────┘  ┌─────┘          └─────┐                │
    │          │                      │                │
    ▼          ▼                      ▼                │
┌────────┐ ┌────────┐          ┌────────┐             │
│ Enter  │ │ Click  │          │ Click  │             │
│Prompt  │ │Sign Up │          │Sign In │             │
└───┬────┘ └───┬────┘          └───┬────┘             │
    │          │                   │                  │
    │   ┌──────┴───────────────────┘                  │
    │   │                                             │
    ▼   ▼                                             │
┌─────────────┐                                       │
│Store Temp   │                                       │
│Prompt in DB │                                       │
│& localStorage                                       │
└──────┬──────┘                                       │
       │                                              │
       ▼                                              │
┌──────────────────┐                                  │
│ Open Auth Modal  │◄─────────────────────────────────┘
└────────┬─────────┘
         │
         ▼
┌────────────────────┐
│ Choose Auth Method │
└──┬──────┬───────┬──┘
   │      │       │
   │      │       └────────────┐
   │      │                    │
   ▼      ▼                    ▼
┌──────┐ ┌────────┐     ┌────────────┐
│Email/│ │Email/  │     │  Google    │
│Pass  │ │Pass    │     │  OAuth     │
│Sign  │ │Sign In │     │            │
│Up    │ │        │     │            │
└──┬───┘ └───┬────┘     └─────┬──────┘
   │         │                 │
   ▼         │                 │
┌──────────┐ │                 │
│ Verify   │ │                 │
│ Email    │ │                 │
└─────┬────┘ │                 │
      │      │                 │
      └──────┴─────────────────┤
                                │
                                ▼
                    ┌───────────────────────┐
                    │  Has Temp Prompt ID?  │
                    └──────┬──────────┬─────┘
                           │          │
                    YES ◄──┘          └──► NO
                     │                     │
                     ▼                     │
            ┌────────────────────┐         │
            │ /auth/post-login   │         │
            └─────────┬──────────┘         │
                      │                    │
                      ▼                    │
         ┌──────────────────────┐          │
         │ Temp Prompt Found in │          │
         │localStorage/metadata?│          │
         └───┬──────────────┬───┘          │
             │              │              │
      YES ◄──┘              └──► NO        │
       │                         │         │
       ▼                         └─────────┤
┌───────────────────┐                      │
│ Create Campaign   │                      │
│ with AI Naming    │                      │
│ + Draft Ad        │                      │
└────────┬──────────┘                      │
         │                                 │
         ▼                                 ▼
┌──────────────────────────────┐  ┌────────────────┐
│    Campaign Builder          │  │    Homepage    │
│ /{campaignId}?view=build     │  │  (Logged In)   │
│ &adId={id}&firstVisit=true   │  │                │
└──────────────────────────────┘  └────────────────┘

═══════════════════════════════════════════════════════════════
KEY JOURNEYS:
  [Journey 1] → Enter Prompt (Unauth) → Auth → ✓ AUTO Campaign Builder
  [Journey 2] → Click Sign Up → Homepage → ✗ NO automation
  [Journey 3] → Click Sign In → Homepage → ✗ NO automation
  [Journey 4] → Enter Prompt (Auth) → ✓ AUTO Campaign Builder

CRITICAL RULE: Only entering a PROMPT triggers campaign automation!
  Sign Up/Sign In buttons = Authentication ONLY
  Prompt Input = Campaign Creation (with or without auth)
═══════════════════════════════════════════════════════════════
```

**Journey Summary:**

| Journey | Entry Point | Auth Required | Temp Prompt | Campaign Creation | Final Destination |
|---------|-------------|---------------|-------------|-------------------|-------------------|
| Journey 1 | Prompt Input (Unauth) | Yes | Created | ✓ Automatic | Campaign Builder |
| Journey 2 | Sign Up Button | Yes | No | ✗ None | Homepage (logged in) |
| Journey 3 | Sign In Button | Yes | No | ✗ None | Homepage (logged in) |
| Journey 4 | Prompt Input (Auth) | No | Created | ✓ Automatic | Campaign Builder |

**CRITICAL: The ONLY automation trigger is entering a prompt. Sign Up/Sign In buttons do NOT trigger any automation.**

---

## Journey 1: Unauthenticated User Creates Prompt

**Overview:** User enters what they want to achieve in natural language (e.g., "I want more customers for my gym", "Need leads for my law practice"), authenticates, and lands in campaign builder with AI-generated campaign.

**Key Point:** This is the ONLY journey that triggers automatic campaign creation. Users express their desires naturally, not as technical prompts.

### Phase 1: Prompt Creation

```
     USER                HERO SECTION          TEMP PROMPT API        DATABASE         LOCAL STORAGE
       │                      │                      │                   │                   │
       │  Types business      │                      │                   │                   │
       │  description         │                      │                   │                   │
       │─────────────────────>│                      │                   │                   │
       │                      │                      │                   │                   │
       │  Selects goal        │                      │                   │                   │
       │  (leads/calls/       │                      │                   │                   │
       │   website-visits)    │                      │                   │                   │
       │─────────────────────>│                      │                   │                   │
       │                      │                      │                   │                   │
       │  Clicks Submit       │                      │                   │                   │
       │─────────────────────>│                      │                   │                   │
       │                      │                      │                   │                   │
       │                      │  POST /api/temp-     │                   │                   │
       │                      │  prompt              │                   │                   │
       │                      │  {promptText,        │                   │                   │
       │                      │   goalType}          │                   │                   │
       │                      │─────────────────────>│                   │                   │
       │                      │                      │                   │                   │
       │                      │                      │  INSERT into      │                   │
       │                      │                      │  temp_prompts     │                   │
       │                      │                      │──────────────────>│                   │
       │                      │                      │                   │                   │
       │                      │                      │  {id, expires_at} │                   │
       │                      │                      │<──────────────────│                   │
       │                      │                      │                   │                   │
       │                      │  {tempId: "uuid"}    │                   │                   │
       │                      │<─────────────────────│                   │                   │
       │                      │                      │                   │                   │
       │                      │                      │                   │  Store            │
       │                      │                      │                   │  temp_prompt_id   │
       │                      │──────────────────────────────────────────────────────────────>│
       │                      │                      │                   │                   │
       │  Auth Modal Opens    │                      │                   │                   │
       │  (Sign Up tab)       │                      │                   │                   │
       │<─────────────────────│                      │                   │                   │
       │                      │                      │                   │                   │
```

#### Phase 1 Steps

| Step | User Action | System Response | State Changes | Flow |
|------|-------------|-----------------|---------------|------|
| 1.1 | Lands on homepage (/) | Displays hero section with prompt input and animated placeholders | None | ► START |
| 1.2 | Types what they want in natural language (e.g., "I need more customers for my fitness studio", "Want leads for my law firm") | Text appears in textarea | None | ▼ |
| 1.3 | Selects goal from dropdown | Goal icon and label update (default: Leads) | None | ▼ |
| 1.4 | Clicks submit button | Button shows loading state, **THIS triggers automation** | None | ▼ |
| 1.5 | System stores prompt | POST /api/temp-prompt creates database record | ✓ DB: temp_prompts row created | ▼ |
| 1.6 | System saves temp ID | Returns {tempId} | ✓ localStorage: temp_prompt_id set | ▼ |
| 1.7 | Auth modal opens | Modal displays with Sign Up tab active | None | ► TO PHASE 2 |

#### Phase 1 State Snapshot

**Database:**
```json
// temp_prompts table
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "prompt_text": "I need more clients for my fitness coaching business",
  "goal_type": "leads",
  "used": false,
  "expires_at": "2024-01-01T13:00:00Z",
  "created_at": "2024-01-01T12:00:00Z"
}
```

**localStorage:**
```json
{
  "temp_prompt_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**sessionStorage:**
```json
{}
```

**URL:**
```
https://adpilot.studio/
```

---

### Phase 2A: Authentication (Email/Password Sign Up)

```
  USER            SIGN UP FORM       LOCAL STORAGE      SUPABASE         EMAIL CLIENT
    │                   │                   │                │                 │
    │  Fills email,     │                   │                │                 │
    │  password,        │                   │                │                 │
    │  confirm password │                   │                │                 │
    │──────────────────>│                   │                │                 │
    │                   │                   │                │                 │
    │  Clicks "Create   │                   │                │                 │
    │  Account"         │                   │                │                 │
    │──────────────────>│                   │                │                 │
    │                   │                   │                │                 │
    │                   │  Read             │                │                 │
    │                   │  temp_prompt_id   │                │                 │
    │                   │──────────────────>│                │                 │
    │                   │                   │                │                 │
    │                   │  Remove           │                │                 │
    │                   │  temp_prompt_id   │                │                 │
    │                   │──────────────────>│                │                 │
    │                   │                   │                │                 │
    │                   │  signUp(email,    │                │                 │
    │                   │  password, {      │                │                 │
    │                   │   emailRedirectTo,│                │                 │
    │                   │   data: {temp_    │                │                 │
    │                   │   prompt_id}})    │                │                 │
    │                   │──────────────────────────────────>│                 │
    │                   │                   │                │                 │
    │                   │                   │  CREATE USER   │                 │
    │                   │                   │  (confirmed=   │                 │
    │                   │                   │   false)       │                 │
    │                   │                   │                │  Send           │
    │                   │                   │                │  verification   │
    │                   │                   │                │  email          │
    │                   │                   │                │────────────────>│
    │                   │                   │                │                 │
    │                   │  Success          │                │                 │
    │                   │<──────────────────────────────────│                 │
    │                   │                   │                │                 │
    │  "Check your      │                   │                │                 │
    │  email" dialog    │                   │                │                 │
    │<──────────────────│                   │                │                 │
    │                   │                   │                │                 │
    │  Opens email      │                   │                │                 │
    │────────────────────────────────────────────────────────────────────────>│
    │                   │                   │                │                 │
    │  Clicks           │                   │                │                 │
    │  verification     │                   │                │                 │
    │  link             │                   │                │                 │
    │────────────────────────────────────────────────────────────────────────>│
    │                   │                   │                │                 │
    │                   │                   │  Verify token  │                 │
    │                   │                   │<───────────────────────────────────
    │                   │                   │                │                 │
    │                   │                   │  Set confirmed │                 │
    │                   │                   │  =true         │                 │
    │  Redirect to      │                   │                │                 │
    │  /?verified=true  │                   │                │                 │
    │<───────────────────────────────────────────────────────────────────────────
    │                   │                   │                │                 │
```

#### Phase 2A Steps

| Step | User Action | System Response | State Changes | Flow |
|------|-------------|-----------------|---------------|------|
| 2A.1 | Clicks Sign Up tab in modal | Form displays with email, password, confirm password fields | None | ◄ FROM PHASE 1 |
| 2A.2 | Enters email address | Email field populated | None | ▼ |
| 2A.3 | Enters password (validated) | Real-time validation shows checkmarks for requirements | None | ▼ |
| 2A.4 | Enters confirm password | Field populated | None | ▼ |
| 2A.5 | Clicks "Create Account" | Button shows loading spinner | None | ▼ |
| 2A.6 | System reads temp_prompt_id | Retrieved from localStorage | None | ▼ |
| 2A.7 | System calls Supabase signUp | Attaches temp_prompt_id to user_metadata | ✓ localStorage: temp_prompt_id removed | ▼ |
| 2A.8 | Supabase creates user | User created with confirmed=false | ✓ DB: auth.users row created | ▼ |
| 2A.9 | Verification email sent | Email with magic link sent | None | ▼ |
| 2A.10 | Modal shows confirmation | "Check your email" dialog displays | None | ▼ |
| 2A.11 | User clicks email link | Supabase confirms email | ✓ DB: auth.users confirmed=true | ▼ |
| 2A.12 | Redirects to homepage | URL: /?verified=true | ✓ URL: verified=true param added | ▼ |
| 2A.13 | User clicks Sign In | Auth modal opens to Sign In tab | None | ► TO PHASE 2B |

#### Phase 2A State Snapshot (After Email Sent)

**Database:**
```json
// temp_prompts table (unchanged)
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "prompt_text": "I run a fitness coaching business...",
  "goal_type": "leads",
  "used": false,
  "expires_at": "2024-01-01T13:00:00Z"
}

// auth.users table
{
  "id": "user-uuid-123",
  "email": "user@example.com",
  "confirmed_at": null,
  "user_metadata": {
    "temp_prompt_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**localStorage:**
```json
{
  // temp_prompt_id REMOVED after signUp call
}
```

**sessionStorage:**
```json
{}
```

**URL:**
```
https://adpilot.studio/
(User waiting for email verification)
```

#### Phase 2A State Snapshot (After Email Verified, Before Sign In)

**Database:**
```json
// auth.users table (updated)
{
  "id": "user-uuid-123",
  "email": "user@example.com",
  "confirmed_at": "2024-01-01T12:05:00Z",
  "user_metadata": {
    "temp_prompt_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**localStorage:**
```json
{}
```

**sessionStorage:**
```json
{}
```

**URL:**
```
https://adpilot.studio/?verified=true
```

---

### Phase 2B: Authentication (Email/Password Sign In)

```
  USER          SIGN IN FORM      LOCAL STORAGE      SUPABASE        BROWSER
    │                  │                  │               │              │
    │  Enters email    │                  │               │              │
    │  and password    │                  │               │              │
    │─────────────────>│                  │               │              │
    │                  │                  │               │              │
    │  Clicks          │                  │               │              │
    │  "Sign In"       │                  │               │              │
    │─────────────────>│                  │               │              │
    │                  │                  │               │              │
    │                  │  Check for       │               │              │
    │                  │  temp_prompt_id  │               │              │
    │                  │─────────────────>│               │              │
    │                  │                  │               │              │
    │                  │  ┌─── IF FOUND (Journey 4) ───┐ │              │
    │                  │  │                             │ │              │
    │                  │  │  signInWithPassword()       │ │              │
    │                  │  │────────────────────────────────────────────>│
    │                  │  │                             │ │              │
    │                  │  │  Success (session)          │ │              │
    │                  │  │<────────────────────────────────────────────│
    │                  │  │                             │ │              │
    │                  │  │  Redirect to                │ │              │
    │                  │  │  /auth/post-login           │ │              │
    │                  │  │─────────────────────────────────────────────>│
    │                  │  │                             │ │              │
    │                  │  └─────────────────────────────┘ │              │
    │                  │                  │               │              │
    │                  │  ┌─── IF NOT FOUND (Journey 3) ┐│              │
    │                  │  │                             │ │              │
    │                  │  │  signInWithPassword()       │ │              │
    │                  │  │────────────────────────────────────────────>│
    │                  │  │                             │ │              │
    │                  │  │  Success (session)          │ │              │
    │                  │  │<────────────────────────────────────────────│
    │                  │  │                             │ │              │
    │  Close modal,    │  │                             │ │              │
    │  stay on         │  │                             │ │              │
    │  homepage        │  │                             │ │              │
    │<──────────────────────                             │ │              │
    │                  │  └─────────────────────────────┘ │              │
    │                  │                  │               │              │
```

#### Phase 2B Steps

| Step | User Action | System Response | State Changes | Flow |
|------|-------------|-----------------|---------------|------|
| 2B.1 | Opens Sign In form | Form displays with email and password fields | None | ◄ FROM PHASE 2A.13 |
| 2B.2 | Enters credentials | Fields populated | None | ▼ |
| 2B.3 | Clicks "Sign In" | Button shows loading spinner | None | ▼ |
| 2B.4 | System checks localStorage | Reads temp_prompt_id (if exists from Journey 4) | None | ▼ |
| 2B.5 | System calls Supabase | signInWithPassword(email, password) | None | ▼ |
| 2B.6 | Supabase authenticates | Creates session, returns user object | ✓ DB: Session created | ▼ |
| 2B.7 | If temp_prompt_id exists | Redirect to /auth/post-login | ✓ URL: /auth/post-login | ► TO PHASE 3 |
| 2B.8 | If no temp_prompt_id | Close modal, stay on homepage | None | ► END (Journey 3) |

**For Journey 1 (Email Sign Up → Email Verify → Sign In), we proceed to Phase 3 via post-login.**

#### Phase 2B State Snapshot (After Sign In, Journey 1 Context)

**Database:**
```json
// auth.users table
{
  "id": "user-uuid-123",
  "email": "user@example.com",
  "confirmed_at": "2024-01-01T12:05:00Z",
  "user_metadata": {
    "temp_prompt_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}

// auth.sessions table
{
  "user_id": "user-uuid-123",
  "access_token": "...",
  "refresh_token": "...",
  "expires_at": "2024-01-01T13:05:00Z"
}

// temp_prompts table (unchanged)
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "prompt_text": "I run a fitness coaching business...",
  "goal_type": "leads",
  "used": false
}
```

**localStorage:**
```json
{
  // Empty (was cleared during signUp)
}
```

**sessionStorage:**
```json
{}
```

**URL:**
```
https://adpilot.studio/auth/post-login
(Redirected for campaign creation)
```

---

### Phase 2C: Authentication (Google OAuth)

```
USER    SIGN UP FORM   LOCAL STORAGE   SUPABASE      GOOGLE     AUTH CALLBACK
  │           │               │            │            │              │
  │  Clicks   │               │            │            │              │
  │  "Continue│               │            │            │              │
  │  with     │               │            │            │              │
  │  Google"  │               │            │            │              │
  │──────────>│               │            │            │              │
  │           │               │            │            │              │
  │           │  Read         │            │            │              │
  │           │  temp_prompt_id            │            │              │
  │           │──────────────>│            │            │              │
  │           │               │            │            │              │
  │           │  Found:       │            │            │              │
  │           │  "550e8400... │            │            │              │
  │           │<──────────────│            │            │              │
  │           │               │            │            │              │
  │           │  signInWithOAuth(          │            │              │
  │           │   'google', {              │            │              │
  │           │   redirectTo: /auth/       │            │              │
  │           │    callback?next=...,      │            │              │
  │           │   data: {temp_prompt_id}}) │            │              │
  │           │───────────────────────────>│            │              │
  │           │               │            │            │              │
  │           │               │  OAuth redirect         │              │
  │           │               │  to Google              │              │
  │           │               │────────────────────────>│              │
  │           │               │            │            │              │
  │  OAuth    │               │            │            │              │
  │  consent  │               │            │            │              │
  │  screen   │               │            │            │              │
  │<───────────────────────────────────────────────────│              │
  │           │               │            │            │              │
  │  User     │               │            │            │              │
  │  authorizes               │            │            │              │
  │  & grants │               │            │            │              │
  │  permission               │            │            │              │
  │───────────────────────────────────────────────────>│              │
  │           │               │            │            │              │
  │           │               │            │  Redirect with code       │
  │           │               │            │  to /auth/callback        │
  │           │               │            │───────────────────────────>│
  │           │               │            │            │              │
  │           │               │            │  exchangeCodeFor          │
  │           │               │            │  Session(code)            │
  │           │               │            │<──────────────────────────│
  │           │               │            │            │              │
  │           │               │            │  Session + User           │
  │           │               │            │  (with metadata)          │
  │           │               │            │───────────────────────────>│
  │           │               │            │            │              │
  │           │               │            │            │  Set auth    │
  │           │               │            │            │  cookies     │
  │           │               │            │            │              │
  │  Redirect to /auth/       │            │            │              │
  │  post-login?auth=success  │            │            │              │
  │<──────────────────────────────────────────────────────────────────│
  │           │               │            │            │              │
```

#### Phase 2C Steps

| Step | User Action | System Response | State Changes | Flow |
|------|-------------|-----------------|---------------|------|
| 2C.1 | Clicks "Continue with Google" | System reads temp_prompt_id from localStorage | None | ◄ FROM PHASE 1 |
| 2C.2 | System initiates OAuth | Calls Supabase signInWithOAuth with temp_prompt_id in metadata | None | ▼ |
| 2C.3 | Browser redirects | User taken to Google OAuth consent screen | ✓ URL: accounts.google.com | ▼ |
| 2C.4 | User authorizes | Grants permissions to AdPilot | None | ▼ |
| 2C.5 | Google redirects back | Redirects to /auth/callback?code={code}&next=/auth/post-login | ✓ URL: /auth/callback | ▼ |
| 2C.6 | Callback exchanges code | exchangeCodeForSession(code) | ✓ DB: Session + User created | ▼ |
| 2C.7 | Sets auth cookies | Response includes Supabase session cookies | ✓ Cookies: auth tokens set | ▼ |
| 2C.8 | Redirects to post-login | URL: /auth/post-login?auth=success | ✓ URL: /auth/post-login | ► TO PHASE 3 |

#### Phase 2C State Snapshot (After OAuth Complete)

**Database:**
```json
// auth.users table
{
  "id": "user-uuid-456",
  "email": "user@gmail.com",
  "confirmed_at": "2024-01-01T12:06:00Z",
  "user_metadata": {
    "temp_prompt_id": "550e8400-e29b-41d4-a716-446655440000",
    "full_name": "John Doe",
    "avatar_url": "https://lh3.googleusercontent.com/..."
  },
  "app_metadata": {
    "provider": "google"
  }
}

// temp_prompts table (unchanged)
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "prompt_text": "I run a fitness coaching business...",
  "goal_type": "leads",
  "used": false
}
```

**localStorage:**
```json
{
  "temp_prompt_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**sessionStorage:**
```json
{}
```

**URL:**
```
https://adpilot.studio/auth/post-login?auth=success
```

---

### Phase 3: Campaign Generation

```
POST       POST AUTH    LOCAL      CAMPAIGNS   TEMP       AI      DATABASE   SESSION
LOGIN      HANDLER      STORAGE    API         PROMPT                        STORAGE
  │            │            │          │         API                            │
  │            │            │          │          │          │        │         │
  │  Check post_login_     │          │          │          │        │         │
  │  processed             │          │          │          │        │         │
  │───────────────────────────────────────────────────────────────────────────>│
  │            │            │          │          │          │        │         │
  │  ┌──── IF NOT PROCESSED ─────────────────────────────────────────────────┐ │
  │  │        │            │          │          │          │        │         │ │
  │  │  Set post_login_   │          │          │          │        │         │ │
  │  │  processing=true   │          │          │          │        │         │ │
  │  │───────────────────────────────────────────────────────────────────────>│ │
  │  │        │            │          │          │          │        │         │ │
  │  │  processAuth       │          │          │          │        │         │ │
  │  │  Completion()      │          │          │          │        │         │ │
  │  │─────────>          │          │          │          │        │         │ │
  │  │        │            │          │          │          │        │         │ │
  │  │        │  Read      │          │          │          │        │         │ │
  │  │        │  temp_prompt_id       │          │          │        │         │ │
  │  │        │───────────>│          │          │          │        │         │ │
  │  │        │            │          │          │          │        │         │ │
  │  │        │  ┌─ IF FOUND (Priority: localStorage) ───┐ │        │         │ │
  │  │        │  │         │          │          │          │        │         │ │
  │  │        │  │  POST /api/        │          │          │        │         │ │
  │  │        │  │  campaigns         │          │          │        │         │ │
  │  │        │  │  {tempPromptId}    │          │          │        │         │ │
  │  │        │  │───────────────────>│          │          │        │         │ │
  │  │        │  │         │          │          │          │        │         │ │
  │  │        │  │         │  GET /api/temp-     │          │        │         │ │
  │  │        │  │         │  prompt?id={id}     │          │        │         │ │
  │  │        │  │         │─────────────────────>│          │        │         │ │
  │  │        │  │         │          │          │          │        │         │ │
  │  │        │  │         │          │  SELECT from        │        │         │ │
  │  │        │  │         │          │  temp_prompts       │        │         │ │
  │  │        │  │         │          │  WHERE id=? AND     │        │         │ │
  │  │        │  │         │          │  used=false         │        │         │ │
  │  │        │  │         │          │─────────────────────────────>│         │ │
  │  │        │  │         │          │          │          │        │         │ │
  │  │        │  │         │          │  {prompt_text,      │        │         │ │
  │  │        │  │         │          │   goal_type}        │        │         │ │
  │  │        │  │         │          │<─────────────────────────────│         │ │
  │  │        │  │         │          │          │          │        │         │ │
  │  │        │  │         │  {promptText,        │          │        │         │ │
  │  │        │  │         │   goalType}          │          │        │         │ │
  │  │        │  │         │<─────────────────────│          │        │         │ │
  │  │        │  │         │          │          │          │        │         │ │
  │  │        │  │         │  generateCampaignName(          │        │         │ │
  │  │        │  │         │   promptText)                   │        │         │ │
  │  │        │  │         │─────────────────────────────────>        │         │ │
  │  │        │  │         │          │          │          │        │         │ │
  │  │        │  │         │  "Fitness Coaching Lead         │        │         │ │
  │  │        │  │         │   Generation"                   │        │         │ │
  │  │        │  │         │<─────────────────────────────────        │         │ │
  │  │        │  │         │          │          │          │        │         │ │
  │  │        │  │         │  INSERT into campaigns          │        │         │ │
  │  │        │  │         │─────────────────────────────────────────>│         │ │
  │  │        │  │         │          │          │          │        │         │ │
  │  │        │  │         │  {campaign}          │          │        │         │ │
  │  │        │  │         │<─────────────────────────────────────────│         │ │
  │  │        │  │         │          │          │          │        │         │ │
  │  │        │  │         │  INSERT into ads     │          │        │         │ │
  │  │        │  │         │  (draft)             │          │        │         │ │
  │  │        │  │         │─────────────────────────────────────────>│         │ │
  │  │        │  │         │          │          │          │        │         │ │
  │  │        │  │         │  {draftAd}           │          │        │         │ │
  │  │        │  │         │<─────────────────────────────────────────│         │ │
  │  │        │  │         │          │          │          │        │         │ │
  │  │        │  │         │  UPDATE temp_prompts SET used=true       │         │ │
  │  │        │  │         │─────────────────────────────────────────>│         │ │
  │  │        │  │         │          │          │          │        │         │ │
  │  │        │  │  {campaign,        │          │          │        │         │ │
  │  │        │  │   draftAdId}       │          │          │        │         │ │
  │  │        │  │<───────────────────│          │          │        │         │ │
  │  │        │  │         │          │          │          │        │         │ │
  │  │        │  Remove    │          │          │          │        │         │ │
  │  │        │  temp_prompt_id       │          │          │        │         │ │
  │  │        │─────────────>         │          │          │        │         │ │
  │  │        │  │         │          │          │          │        │         │ │
  │  │  {campaign,│         │          │          │          │        │         │ │
  │  │   draftAdId}         │          │          │          │        │         │ │
  │  │<─────────│            │          │          │          │        │         │ │
  │  │        │  │         │          │          │          │        │         │ │
  │  │  Set post_login_campaign_id, post_login_processed    │        │         │ │
  │  │───────────────────────────────────────────────────────────────────────>│ │
  │  │        │  │         │          │          │          │        │         │ │
  │  │  Remove post_login_processing  │          │          │        │         │ │
  │  │───────────────────────────────────────────────────────────────────────>│ │
  │  │        │  │         │          │          │          │        │         │ │
  │  │  Navigate to /{campaignId}?view=build&adId={id}&firstVisit=true        │ │
  │  │        │  │         │          │          │          │        │         │ │
  │  │        │  └─────────────────────────────────────────────────────────────┘ │
  │  └──────────────────────────────────────────────────────────────────────────┘
  │            │            │          │          │          │        │         │
```

#### Phase 3 Steps

| Step | User Action | System Response | State Changes | Flow |
|------|-------------|-----------------|---------------|------|
| 3.1 | Page loads /auth/post-login | Shows "Creating your campaign..." loader | None | ◄ FROM PHASE 2 |
| 3.2 | System checks sentinel | Reads sessionStorage.post_login_processed | None | ▼ |
| 3.3 | If not processed | Sets post_login_processing=true | ✓ sessionStorage: processing flag set | ▼ |
| 3.4 | PostAuthHandler called | processAuthCompletion(user.user_metadata) | None | ▼ |
| 3.5 | Check localStorage | Reads temp_prompt_id (priority source) | None | ▼ |
| 3.6 | If not found, check metadata | Reads user.user_metadata.temp_prompt_id | None | ▼ |
| 3.7 | If temp_prompt_id found | Proceeds with campaign creation | None | ▼ |
| 3.8 | Call campaigns API | POST /api/campaigns {tempPromptId} | None | ▼ |
| 3.9 | Fetch temp prompt | GET /api/temp-prompt?id={tempPromptId} | None | ▼ |
| 3.10 | AI generates name | Calls AI model with prompt_text | None | ▼ |
| 3.11 | Create campaign | INSERT into campaigns table | ✓ DB: Campaign created | ▼ |
| 3.12 | Create draft ad | INSERT into ads table (status='draft') | ✓ DB: Draft ad created | ▼ |
| 3.13 | Mark prompt as used | UPDATE temp_prompts SET used=true | ✓ DB: Temp prompt marked used | ▼ |
| 3.14 | Return to handler | {campaign, draftAdId} | None | ▼ |
| 3.15 | Clean up localStorage | Remove temp_prompt_id | ✓ localStorage: temp_prompt_id removed | ▼ |
| 3.16 | Set success sentinels | post_login_campaign_id, post_login_processed | ✓ sessionStorage: Sentinels set | ▼ |
| 3.17 | Navigate to builder | Push to /{campaignId}?view=build&adId={draftAdId}&firstVisit=true | ✓ URL: Campaign builder | ► TO PHASE 4 |

#### Phase 3 State Snapshot (Campaign Created)

**Database:**
```json
// campaigns table
{
  "id": "campaign-uuid-789",
  "user_id": "user-uuid-123",
  "name": "Fitness Coaching Lead Generation",
  "status": "draft",
  "initial_goal": "leads",
  "initial_prompt": "I need more clients for my fitness coaching business",
  "created_at": "2024-01-01T12:07:00Z",
  "updated_at": "2024-01-01T12:07:00Z"
}

// ads table
{
  "id": "ad-uuid-101",
  "campaign_id": "campaign-uuid-789",
  "status": "draft",
  "created_at": "2024-01-01T12:07:00Z"
}

// temp_prompts table (marked as used)
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "prompt_text": "I need more clients for my fitness coaching business",
  "goal_type": "leads",
  "used": true,
  "expires_at": "2024-01-01T13:00:00Z"
}
```

**localStorage:**
```json
{
  // temp_prompt_id removed by PostAuthHandler
}
```

**sessionStorage:**
```json
{
  "post_login_processed": "true",
  "post_login_campaign_id": "campaign-uuid-789"
}
```

**URL:**
```
https://adpilot.studio/campaign-uuid-789?view=build&adId=ad-uuid-101&firstVisit=true
```

---

### Phase 4: Builder Handoff

```
   BROWSER          CAMPAIGN PAGE         FIRST VISIT FLOW          USER
      │                   │                        │                  │
      │  Navigate to      │                        │                  │
      │  /{campaignId}?   │                        │                  │
      │  view=build&      │                        │                  │
      │  adId={draftAdId} │                        │                  │
      │  &firstVisit=true │                        │                  │
      │──────────────────>│                        │                  │
      │                   │                        │                  │
      │                   │  Parse URL params      │                  │
      │                   │  - view=build          │                  │
      │                   │  - adId={draftAdId}    │                  │
      │                   │  - firstVisit=true     │                  │
      │                   │                        │                  │
      │                   │  Load campaign data    │                  │
      │                   │  (GET /api/campaigns/  │                  │
      │                   │   {id})                │                  │
      │                   │                        │                  │
      │                   │  Load draft ad data    │                  │
      │                   │  (GET /api/campaigns/  │                  │
      │                   │   {id}/ads)            │                  │
      │                   │                        │                  │
      │                   │  Pre-select draft ad   │                  │
      │                   │  based on adId param   │                  │
      │                   │                        │                  │
      │                   │  Trigger initial       │                  │
      │                   │  setup                 │                  │
      │                   │───────────────────────>│                  │
      │                   │                        │                  │
      │                   │                        │  Display         │
      │                   │                        │  campaign        │
      │                   │                        │  builder UI      │
      │                   │                        │  with draft ad   │
      │                   │                        │  pre-selected    │
      │                   │                        │─────────────────>│
      │                   │                        │                  │
      │                   │                        │  Begin           │
      │                   │                        │  configuring     │
      │                   │                        │  campaign        │
      │                   │<──────────────────────────────────────────│
      │                   │  (User can now set    │                  │
      │                   │   goal, location,     │                  │
      │                   │   budget, etc.)       │                  │
      │                   │                        │                  │
```

#### Phase 4 Steps

| Step | User Action | System Response | State Changes | Flow |
|------|-------------|-----------------|---------------|------|
| 4.1 | Browser navigates | Loads campaign workspace page | None | ◄ FROM PHASE 3 |
| 4.2 | Page parses URL | Extracts view, adId, firstVisit params | None | ▼ |
| 4.3 | Load campaign data | Fetches campaign from /api/campaigns/{id} | None | ▼ |
| 4.4 | Load ads data | Fetches ads from /api/campaigns/{id}/ads | None | ▼ |
| 4.5 | Pre-select draft ad | Sets active ad to adId from URL | None | ▼ |
| 4.6 | Trigger first visit flow | firstVisit=true activates setup wizard | None | ▼ |
| 4.7 | Display builder UI | Shows campaign workspace with draft ad | None | ▼ |
| 4.8 | User configures | Can now set goal, location, budget, etc. | ✓ Campaign updated as user works | ► JOURNEY COMPLETE |

#### Phase 4 State Snapshot (Builder Loaded)

**Database:**
```json
// campaigns table (unchanged)
{
  "id": "campaign-uuid-789",
  "user_id": "user-uuid-123",
  "name": "Fitness Coaching Lead Generation",
  "status": "draft",
  "initial_goal": "leads",
  "initial_prompt": "I run a fitness coaching business..."
}

// ads table (unchanged)
{
  "id": "ad-uuid-101",
  "campaign_id": "campaign-uuid-789",
  "status": "draft"
}
```

**localStorage:**
```json
{}
```

**sessionStorage:**
```json
{
  "post_login_processed": "true",
  "post_login_campaign_id": "campaign-uuid-789"
}
```

**URL:**
```
https://adpilot.studio/campaign-uuid-789?view=build&adId=ad-uuid-101&firstVisit=true
```

**UI State:**
- Campaign workspace visible
- Draft ad selected in sidebar
- Goal selection canvas ready
- First-visit setup flow active

---

## Journey 2: Direct Sign Up (No Automation)

**Overview:** User clicks "Sign Up" button in header, creates account, and stays on logged-in homepage. **NO campaign is created** - user can then enter a prompt if they want.

**Key Point:** This journey has ZERO automation. It's purely authentication. The user must actively enter a prompt later to trigger campaign creation.

### Phase 1: Direct Sign Up

```
  USER      HOMEPAGE HEADER    AUTH MODAL      SUPABASE      EMAIL CLIENT
    │               │               │               │               │
    │  Clicks       │               │               │               │
    │  "Sign Up"    │               │               │               │
    │  button       │               │               │               │
    │──────────────>│               │               │               │
    │               │               │               │               │
    │               │  Open modal   │               │               │
    │               │  (defaultTab= │               │               │
    │               │   'signup')   │               │               │
    │               │──────────────>│               │               │
    │               │               │               │               │
    │  Display sign up form         │               │               │
    │<──────────────────────────────│               │               │
    │               │               │               │               │
    │  Fills email, │               │               │               │
    │  password,    │               │               │               │
    │  confirm      │               │               │               │
    │──────────────────────────────>│               │               │
    │               │               │               │               │
    │  Clicks       │               │               │               │
    │  "Create      │               │               │               │
    │  Account"     │               │               │               │
    │──────────────────────────────>│               │               │
    │               │               │               │               │
    │               │  signUp(email,│               │               │
    │               │  password)    │               │               │
    │               │  NO temp_prompt_id            │               │
    │               │  in metadata  │               │               │
    │               │──────────────────────────────>│               │
    │               │               │               │               │
    │               │               │  CREATE USER  │               │
    │               │               │  (confirmed=  │               │
    │               │               │   false)      │               │
    │               │               │               │  Send         │
    │               │               │               │  verification │
    │               │               │               │  email        │
    │               │               │               │──────────────>│
    │               │               │               │               │
    │               │  Success      │               │               │
    │               │<──────────────────────────────│               │
    │               │               │               │               │
    │  Show "Check your email"      │               │               │
    │  dialog       │               │               │               │
    │<──────────────────────────────│               │               │
    │               │               │               │               │
```

#### Phase 1 Steps

| Step | User Action | System Response | State Changes | Flow |
|------|-------------|-----------------|---------------|------|
| 1.1 | Lands on homepage | Shows header with "Sign Up" button | None | ► START |
| 1.2 | Clicks "Sign Up" button | Auth modal opens to Sign Up tab | None | ▼ |
| 1.3 | Fills signup form | Email, password, confirm password entered | None | ▼ |
| 1.4 | Clicks "Create Account" | System checks localStorage for temp_prompt_id | None | ▼ |
| 1.5 | No temp_prompt_id found | Calls Supabase signUp WITHOUT metadata | None | ▼ |
| 1.6 | Supabase creates user | User created (confirmed=false) | ✓ DB: auth.users created | ▼ |
| 1.7 | Verification email sent | User receives email with verification link | None | ▼ |
| 1.8 | Modal shows confirmation | "Check your email" dialog displays | None | ► TO PHASE 2 |

#### Phase 1 State Snapshot

**Database:**
```json
// auth.users table
{
  "id": "user-uuid-999",
  "email": "newuser@example.com",
  "confirmed_at": null,
  "user_metadata": {
    // NO temp_prompt_id
  }
}
```

**localStorage:**
```json
{}
```

**sessionStorage:**
```json
{}
```

**URL:**
```
https://adpilot.studio/
```

---

### Phase 2: Post-Auth Redirect

```
  USER    EMAIL CLIENT   SUPABASE    HOMEPAGE    SIGN IN FORM
    │           │            │            │              │
    │  Clicks   │            │            │              │
    │  verification          │            │              │
    │  link     │            │            │              │
    │──────────>│            │            │              │
    │           │            │            │              │
    │           │  Verify    │            │              │
    │           │  email     │            │              │
    │           │  token     │            │              │
    │           │───────────>│            │              │
    │           │            │            │              │
    │           │  SET       │            │              │
    │           │  confirmed_│            │              │
    │           │  at        │            │              │
    │           │            │            │              │
    │           │  Redirect to           │              │
    │           │  /?verified=true       │              │
    │           │───────────────────────>│              │
    │           │            │            │              │
    │  Display homepage      │            │              │
    │  (unauthenticated -    │            │              │
    │   must sign in)        │            │              │
    │<──────────────────────────────────│              │
    │           │            │            │              │
    │  Clicks "Sign In"      │            │              │
    │───────────────────────────────────>│              │
    │           │            │            │              │
    │           │            │  Open auth modal          │
    │           │            │  (signin tab)             │
    │           │            │───────────────────────────>│
    │           │            │            │              │
    │  Enters credentials    │            │              │
    │────────────────────────────────────────────────────>│
    │           │            │            │              │
    │  Clicks "Sign In"      │            │              │
    │────────────────────────────────────────────────────>│
    │           │            │            │              │
    │           │            │            │  Check       │
    │           │            │            │  localStorage│
    │           │            │            │  for temp_   │
    │           │            │            │  prompt_id   │
    │           │            │            │  (NOT FOUND) │
    │           │            │            │              │
    │           │            │  signInWithPassword()     │
    │           │            │<──────────────────────────│
    │           │            │            │              │
    │           │  CREATE    │            │              │
    │           │  SESSION   │            │              │
    │           │            │            │              │
    │           │  Success (session)      │              │
    │           │            │───────────────────────────>│
    │           │            │            │              │
    │           │            │            │  No temp_    │
    │           │            │            │  prompt_id,  │
    │           │            │            │  stay on page│
    │           │            │            │              │
    │           │            │  Close modal              │
    │           │            │<──────────────────────────│
    │           │            │            │              │
```

#### Phase 2 Steps

| Step | User Action | System Response | State Changes | Flow |
|------|-------------|-----------------|---------------|------|
| 2.1 | Opens verification email | Email displays with verification link | None | ◄ FROM PHASE 1 |
| 2.2 | Clicks verification link | Browser navigates to Supabase verification URL | None | ▼ |
| 2.3 | Supabase confirms email | Sets confirmed_at timestamp | ✓ DB: User confirmed | ▼ |
| 2.4 | Redirects to homepage | URL: /?verified=true | ✓ URL: verified param added | ▼ |
| 2.5 | Homepage loads | Shows unauthenticated homepage (no session yet) | None | ▼ |
| 2.6 | User clicks "Sign In" | Auth modal opens | None | ▼ |
| 2.7 | User enters credentials | Fields populated | None | ▼ |
| 2.8 | Clicks "Sign In" | System checks for temp_prompt_id | None | ▼ |
| 2.9 | No temp_prompt_id found | Creates session, closes modal | ✓ DB: Session created | ▼ |
| 2.10 | Stays on homepage | No redirect to post-login | None | ► TO PHASE 3 |

#### Phase 2 State Snapshot

**Database:**
```json
// auth.users table
{
  "id": "user-uuid-999",
  "email": "newuser@example.com",
  "confirmed_at": "2024-01-01T12:10:00Z",
  "user_metadata": {}
}

// auth.sessions table
{
  "user_id": "user-uuid-999",
  "access_token": "...",
  "refresh_token": "...",
  "expires_at": "2024-01-01T13:10:00Z"
}
```

**localStorage:**
```json
{}
```

**sessionStorage:**
```json
{}
```

**URL:**
```
https://adpilot.studio/
(Auth modal closed, user is now signed in)
```

---

### Phase 3: Homepage Landing (Ready for Prompt)

```
  HOMEPAGE        AUTH PROVIDER          USER
      │                  │                 │
      │  Detect auth     │                 │
      │  state change    │                 │
      │─────────────────>│                 │
      │                  │                 │
      │  User object     │                 │
      │  available       │                 │
      │<─────────────────│                 │
      │                  │                 │
      │  Re-render with  │                 │
      │  logged-in state │                 │
      │                  │                 │
      │  Display:        │                 │
      │  - LoggedInHeader│                 │
      │  - CampaignGrid  │                 │
      │  - Prompt Input  │                 │
      │─────────────────────────────────────>│
      │                  │                 │
      │                  │   User sees:   │
      │                  │   • Empty      │
      │                  │     campaign   │
      │                  │     grid       │
      │                  │   • Prompt     │
      │                  │     input ready│
      │                  │   • NO auto-   │
      │                  │     mation yet │
      │                  │                 │
      │                  │   To create    │
      │                  │   campaign:    │
      │                  │   Enter prompt!│
      │                  │                 │
```

#### Phase 3 Steps

| Step | User Action | System Response | State Changes | Flow |
|------|-------------|-----------------|---------------|------|
| 3.1 | Auth modal closes | AuthProvider detects session | None | ◄ FROM PHASE 2 |
| 3.2 | Homepage re-renders | Switches to logged-in view | None | ▼ |
| 3.3 | Shows LoggedInHeader | Header displays user menu, workspace link | None | ▼ |
| 3.4 | Shows CampaignGrid | Displays empty grid (new user, no campaigns) | None | ▼ |
| 3.5 | Prompt input visible | User can now type prompt to trigger campaign creation | None | ► JOURNEY COMPLETE |

**Next Steps:** User must enter a prompt (Journey 4) to create their first campaign. Simply signing up does NOT create anything automatically.

#### Phase 3 State Snapshot

**Database:**
```json
// auth.users table (unchanged)
{
  "id": "user-uuid-999",
  "email": "newuser@example.com",
  "confirmed_at": "2024-01-01T12:10:00Z"
}

// campaigns table
[]  // Empty - no campaigns yet
```

**localStorage:**
```json
{}
```

**sessionStorage:**
```json
{}
```

**URL:**
```
https://adpilot.studio/
```

**UI State:**
- LoggedInHeader visible with user menu
- Hero section with prompt input
- Empty campaign grid (new user)
- Ready to create first campaign

**⚠️ JOURNEY 2 COMPLETE:** User has signed up successfully. NO campaign was created. User is now in authenticated state and must enter a prompt to trigger campaign creation (see Journey 4).

---

## Journey 3: Existing User Sign In (No Automation)

**Overview:** Returning user clicks "Sign In" button, authenticates, and lands on logged-in homepage with their existing campaigns. **NO new campaign is created** - user can enter a prompt if they want to create a new one.

**Key Point:** This journey has ZERO automation. It's purely authentication. Sign In button does NOT trigger any campaign creation.

### Phase 1: Sign In

```
  USER   HOMEPAGE HEADER   AUTH MODAL   SIGN IN FORM   LOCAL STORAGE   SUPABASE
    │             │              │              │              │            │
    │  Clicks     │              │              │              │            │
    │  "Sign In"  │              │              │              │            │
    │  button     │              │              │              │            │
    │────────────>│              │              │              │            │
    │             │              │              │              │            │
    │             │  Open modal  │              │              │            │
    │             │  (defaultTab │              │              │            │
    │             │   ='signin') │              │              │            │
    │             │─────────────>│              │              │            │
    │             │              │              │              │            │
    │  Display sign in form      │              │              │            │
    │<───────────────────────────│              │              │            │
    │             │              │              │              │            │
    │  Enters email & password   │              │              │            │
    │────────────────────────────────────────────>             │            │
    │             │              │              │              │            │
    │  Clicks "Sign In"          │              │              │            │
    │────────────────────────────────────────────>             │            │
    │             │              │              │              │            │
    │             │              │              │  Check for   │            │
    │             │              │              │  temp_prompt │            │
    │             │              │              │  _id         │            │
    │             │              │              │─────────────>│            │
    │             │              │              │              │            │
    │             │              │              │  NOT FOUND   │            │
    │             │              │              │  (Journey 3) │            │
    │             │              │              │<─────────────│            │
    │             │              │              │              │            │
    │             │              │              │  signInWith  │            │
    │             │              │              │  Password()  │            │
    │             │              │              │──────────────────────────>│
    │             │              │              │              │            │
    │             │              │              │  Success     │            │
    │             │              │              │  (session,   │            │
    │             │              │              │   user)      │            │
    │             │              │              │<──────────────────────────│
    │             │              │              │              │            │
    │             │              │  onSuccess() │              │            │
    │             │              │  close modal │              │            │
    │             │              │<─────────────│              │            │
    │             │              │              │              │            │
    │  Modal closes              │              │              │            │
    │<───────────────────────────│              │              │            │
    │             │              │              │              │            │
```

#### Phase 1 Steps

| Step | User Action | System Response | State Changes | Flow |
|------|-------------|-----------------|---------------|------|
| 1.1 | Lands on homepage | Shows unauthenticated homepage | None | ► START |
| 1.2 | Clicks "Sign In" button | Auth modal opens to Sign In tab | None | ▼ |
| 1.3 | Enters email | Email field populated | None | ▼ |
| 1.4 | Enters password | Password field populated | None | ▼ |
| 1.5 | Clicks "Sign In" | System checks localStorage for temp_prompt_id | None | ▼ |
| 1.6 | No temp_prompt_id found | Proceeds with normal sign in | None | ▼ |
| 1.7 | Calls Supabase auth | signInWithPassword(email, password) | None | ▼ |
| 1.8 | Supabase authenticates | Returns session and user object | ✓ DB: Session created | ▼ |
| 1.9 | Checks temp_prompt_id again | Not found, stays on page | None | ▼ |
| 1.10 | Modal closes | onSuccess() callback fires | None | ► TO PHASE 2 |

#### Phase 1 State Snapshot

**Database:**
```json
// auth.users table
{
  "id": "existing-user-uuid",
  "email": "returning@example.com",
  "confirmed_at": "2023-12-01T10:00:00Z",
  "user_metadata": {}
}

// auth.sessions table
{
  "user_id": "existing-user-uuid",
  "access_token": "...",
  "refresh_token": "...",
  "expires_at": "2024-01-01T13:15:00Z"
}

// campaigns table
[
  {
    "id": "existing-campaign-1",
    "user_id": "existing-user-uuid",
    "name": "Previous Campaign",
    "status": "active"
  }
]
```

**localStorage:**
```json
{}
```

**sessionStorage:**
```json
{}
```

**URL:**
```
https://adpilot.studio/
```

---

### Phase 2: Session Restoration

```
  AUTH PROVIDER      SUPABASE       DATABASE       HOMEPAGE
        │                │              │              │
        │  Modal closes, │              │              │
        │  auth state    │              │              │
        │  change detected              │              │
        │                │              │              │
        │  onAuthState   │              │              │
        │  Change event  │              │              │
        │───────────────>│              │              │
        │                │              │              │
        │  setUser       │              │              │
        │  (session.user)│              │              │
        │                │              │              │
        │  Fetch profile │              │              │
        │  from profiles │              │              │
        │  table         │              │              │
        │───────────────────────────────>│              │
        │                │              │              │
        │  Profile data  │              │              │
        │<───────────────────────────────│              │
        │                │              │              │
        │  setProfile    │              │              │
        │  (profile)     │              │              │
        │                │              │              │
        │  Trigger re-render            │              │
        │───────────────────────────────────────────────>│
        │                │              │              │
```

#### Phase 2 Steps

| Step | User Action | System Response | State Changes | Flow |
|------|-------------|-----------------|---------------|------|
| 2.1 | Auth state changes | AuthProvider detects SIGNED_IN event | None | ◄ FROM PHASE 1 |
| 2.2 | Set user object | Updates user state in AuthContext | None | ▼ |
| 2.3 | Fetch profile | Queries profiles table for user data | None | ▼ |
| 2.4 | Set profile object | Updates profile state in AuthContext | None | ▼ |
| 2.5 | Trigger re-render | Components using useAuth() re-render | None | ► TO PHASE 3 |

#### Phase 2 State Snapshot

**Database:**
```json
// profiles table
{
  "id": "existing-user-uuid",
  "email": "returning@example.com",
  "full_name": "John Doe",
  "created_at": "2023-12-01T10:00:00Z"
}
```

**localStorage:**
```json
{}
```

**sessionStorage:**
```json
{}
```

**URL:**
```
https://adpilot.studio/
```

---

### Phase 3: Homepage Landing

```
  HOMEPAGE       CAMPAIGNS API      DATABASE           USER
      │                 │                │               │
      │  Detect user    │                │               │
      │  is             │                │               │
      │  authenticated  │                │               │
      │                 │                │               │
      │  Render         │                │               │
      │  LoggedInHeader │                │               │
      │                 │                │               │
      │  GET /api/      │                │               │
      │  campaigns      │                │               │
      │  (fetch user's  │                │               │
      │   campaigns)    │                │               │
      │────────────────>│                │               │
      │                 │                │               │
      │                 │  SELECT from   │               │
      │                 │  campaigns     │               │
      │                 │  WHERE user_id │               │
      │                 │  =?            │               │
      │                 │───────────────>│               │
      │                 │                │               │
      │                 │  Campaign list │               │
      │                 │<───────────────│               │
      │                 │                │               │
      │  {campaigns:    │                │               │
      │   [...]}        │                │               │
      │<────────────────│                │               │
      │                 │                │               │
      │  Display Campaign│              │               │
      │  Grid with       │              │               │
      │  existing        │              │               │
      │  campaigns       │              │               │
      │─────────────────────────────────────────────────>│
      │                 │                │               │
      │                 │                │  User sees:   │
      │                 │                │  • Existing   │
      │                 │                │    campaigns  │
      │                 │                │  • Can create │
      │                 │                │    new ones   │
      │                 │                │  • Can navigate│
      │                 │                │    to workspace│
      │                 │                │               │
```

#### Phase 3 Steps

| Step | User Action | System Response | State Changes | Flow |
|------|-------------|-----------------|---------------|------|
| 3.1 | Homepage re-renders | Switches to logged-in view | None | ◄ FROM PHASE 2 |
| 3.2 | Shows LoggedInHeader | Displays user menu, workspace link | None | ▼ |
| 3.3 | Fetches campaigns | GET /api/campaigns | None | ▼ |
| 3.4 | Loads campaign list | Returns user's existing campaigns | None | ▼ |
| 3.5 | Displays CampaignGrid | Shows campaign cards with metrics | None | ▼ |
| 3.6 | Prompt input visible | User can type prompt to create NEW campaign if desired | None | ► JOURNEY COMPLETE |

**Next Steps:** User can enter a prompt to create a new campaign (triggers Journey 4), or navigate to existing campaigns. Simply signing in does NOT create anything automatically.

#### Phase 3 State Snapshot

**Database:**
```json
// campaigns table (user's campaigns)
[
  {
    "id": "existing-campaign-1",
    "user_id": "existing-user-uuid",
    "name": "Previous Campaign",
    "status": "active",
    "created_at": "2024-01-01T10:00:00Z"
  },
  {
    "id": "existing-campaign-2",
    "user_id": "existing-user-uuid",
    "name": "Another Campaign",
    "status": "paused",
    "created_at": "2024-01-05T14:30:00Z"
  }
]
```

**localStorage:**
```json
{}
```

**sessionStorage:**
```json
{}
```

**URL:**
```
https://adpilot.studio/
```

**UI State:**
- LoggedInHeader visible
- CampaignGrid showing 2 existing campaigns
- Prompt input available for new campaigns
- User fully authenticated and operational

**⚠️ JOURNEY 3 COMPLETE:** User has signed in successfully. NO campaign was created. User sees their existing campaigns and can enter a prompt to create a new campaign (triggers Journey 4).

---

## Journey 4: Authenticated User Creates Prompt

**Overview:** User is already logged in and enters what they want in natural language (e.g., "I need more bookings for my salon", "Want to drive traffic to my online store"). Campaign is automatically created and user lands in builder.

**Key Point:** This is the second automation trigger - when an AUTHENTICATED user enters a prompt. The prompt is the trigger, not the authentication state. Users express desires naturally.

### Phase 1: Prompt Creation (User Already Authenticated)

**Flow:** User is already logged in on homepage, sees prompt input, types natural language desire, clicks submit.

**Key Difference from Journey 1:** User is ALREADY authenticated, so NO auth modal opens. Campaign creation happens immediately.

#### Phase 1 Steps

| Step | User Action | System Response | State Changes | Flow |
|------|-------------|-----------------|---------------|------|
| 1.1 | On logged-in homepage | Sees prompt input with their campaign grid | None | ► START |
| 1.2 | Types natural language desire (e.g., "Need more clients for my salon") | Text appears in textarea | None | ▼ |
| 1.3 | Selects goal from dropdown | Goal icon and label update | None | ▼ |
| 1.4 | Clicks submit button | Button shows loading, **triggers automation** | None | ▼ |
| 1.5 | System stores prompt | POST /api/temp-prompt creates database record | ✓ DB: temp_prompts row created | ▼ |
| 1.6 | System saves temp ID | Returns {tempId} | ✓ localStorage: temp_prompt_id set | ▼ |
| 1.7 | Skips auth (already logged in) | Goes directly to campaign creation | None | ► TO PHASE 2 |

#### Phase 1 State Snapshot

**Database:**
```json
// temp_prompts table
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "prompt_text": "I need more bookings for my salon",
  "goal_type": "leads",
  "used": false,
  "expires_at": "2024-01-01T13:00:00Z"
}

// User is already authenticated
// auth.users and auth.sessions already exist
```

**localStorage:**
```json
{
  "temp_prompt_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**sessionStorage:**
```json
{}
```

**URL:**
```
https://adpilot.studio/
(User stays on logged-in homepage, NO auth modal)
```

---

### Phase 2: Direct Campaign Generation (No Auth Needed)

**Since user is already authenticated, the system immediately creates the campaign.**

```
  USER      HERO SECTION    CAMPAIGNS API    AI SERVICE    DATABASE
    │              │                │              │            │
    │  Prompt      │                │              │            │
    │  already     │                │              │            │
    │  submitted   │                │              │            │
    │  (Phase 1)   │                │              │            │
    │              │                │              │            │
    │              │  User is       │              │            │
    │              │  authenticated │              │            │
    │              │  - skip auth   │              │            │
    │              │  modal         │              │            │
    │              │                │              │            │
    │              │  Create        │              │            │
    │              │  campaign      │              │            │
    │              │  directly      │              │            │
    │              │───────────────>│              │            │
    │              │                │              │            │
    │              │                │  AI generates│            │
    │              │                │  campaign    │            │
    │              │                │  name        │            │
    │              │                │─────────────>│            │
    │              │                │              │            │
    │              │                │  "Salon      │            │
    │              │                │   Booking    │            │
    │              │                │   Campaign"  │            │
    │              │                │<─────────────│            │
    │              │                │              │            │
    │              │                │  INSERT into campaigns    │
    │              │                │──────────────────────────>│
    │              │                │              │            │
    │              │                │  INSERT into ads (draft)  │
    │              │                │──────────────────────────>│
    │              │                │              │            │
    │              │  {campaign,    │              │            │
    │              │   draftAdId}   │              │            │
    │              │<───────────────│              │            │
    │              │                │              │            │
    │  Navigate to campaign builder                │            │
    │  /{campaignId}?view=build&adId={id}&firstVisit=true       │
    │<─────────────│                │              │            │
    │              │                │              │            │
```

#### Phase 2 Steps

| Step | User Action | System Response | State Changes | Flow |
|------|-------------|-----------------|---------------|------|
| 2.1 | System checks auth | User already authenticated, skip auth modal | None | ◄ FROM PHASE 1 |
| 2.2 | Call campaigns API | POST /api/campaigns with prompt (no tempPromptId needed for auth users) | None | ▼ |
| 2.3 | AI generates name | Creates campaign name from natural language prompt | None | ▼ |
| 2.4 | Create campaign | INSERT into campaigns table | ✓ DB: Campaign created | ▼ |
| 2.5 | Create draft ad | INSERT into ads table (status='draft') | ✓ DB: Draft ad created | ▼ |
| 2.6 | Return campaign data | {campaign, draftAdId} | None | ▼ |
| 2.7 | Navigate to builder | Router pushes to /{campaignId}?view=build&adId={draftAdId}&firstVisit=true | ✓ URL: Campaign builder | ► TO PHASE 3 |

#### Phase 2 State Snapshot

**Database:**
```json
// campaigns table (NEW)
{
  "id": "campaign-uuid-new",
  "user_id": "authenticated-user-uuid",
  "name": "Salon Booking Lead Campaign",
  "status": "draft",
  "initial_goal": "leads",
  "initial_prompt": "I need more bookings for my salon",
  "created_at": "2024-01-01T14:00:00Z"
}

// ads table (NEW)
{
  "id": "ad-uuid-new",
  "campaign_id": "campaign-uuid-new",
  "status": "draft",
  "created_at": "2024-01-01T14:00:00Z"
}

// temp_prompts table (if used)
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "used": true
}
```

**localStorage:**
```json
{
  // Cleaned up after campaign creation
}
```

**sessionStorage:**
```json
{}
```

**URL:**
```
https://adpilot.studio/campaign-uuid-new?view=build&adId=ad-uuid-new&firstVisit=true
```

---

### Phase 3: Builder Handoff

**User lands directly in campaign builder with firstVisit=true flag. Identical to Journey 1, Phase 4.**

---

## Critical Paths & Edge Cases

### 1. OAuth Redirect with Temp Prompt Preservation

**Scenario:** User creates prompt, chooses Google OAuth, must preserve temp_prompt_id through external redirect.

**Challenge:** OAuth redirects to Google and back, losing browser context.

**Solution:**
1. Read `temp_prompt_id` from localStorage before OAuth initiation
2. Attach to `user_metadata.temp_prompt_id` during signInWithOAuth call
3. OAuth callback creates user with metadata intact
4. PostAuthHandler checks BOTH localStorage AND user_metadata
5. Priority: localStorage > user_metadata

**State Flow:**

```
localStorage.temp_prompt_id (before OAuth)
  ↓
Google OAuth redirect
  ↓
Callback creates user with user_metadata.temp_prompt_id
  ↓
PostAuthHandler reads from user_metadata
  ↓
Campaign created
  ↓
localStorage.temp_prompt_id removed
```

**Critical Code:**

```typescript
// components/auth/auth-provider.tsx (line 205)
const signInWithGoogle = async (nextPath: string = '/auth/post-login') => {
  const tempPromptId = typeof window !== 'undefined' 
    ? localStorage.getItem('temp_prompt_id')
    : null

  // Attach to OAuth metadata
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback?next=${nextPath}`,
      data: tempPromptId ? { temp_prompt_id: tempPromptId } : undefined
    }
  })
}
```

```typescript
// lib/services/post-auth-handler.ts (line 85)
private getTempPromptId(userMetadata?: Record<string, unknown>): string | null {
  // Check localStorage first (priority)
  if (typeof window !== 'undefined') {
    const localId = localStorage.getItem('temp_prompt_id')
    if (localId) return localId
  }
  
  // Fallback to user metadata (OAuth flows)
  if (userMetadata?.temp_prompt_id) {
    return userMetadata.temp_prompt_id as string
  }
  
  return null
}
```

---

### 2. Email Verification Delay Handling

**Scenario:** User signs up via email/password, must verify email before creating campaign.

**Challenge:** Temp prompt must survive email verification delay (could be minutes/hours).

**Solution:**
1. Store `temp_prompt_id` in `user_metadata` during signUp (even for email/password)
2. Clear from localStorage immediately after signUp
3. After email verification, user returns and signs in
4. PostAuthHandler retrieves from `user_metadata.temp_prompt_id`

**State Flow:**

```
Prompt created → localStorage.temp_prompt_id
  ↓
User signs up → user_metadata.temp_prompt_id attached
  ↓
localStorage.temp_prompt_id cleared immediately
  ↓
Email sent, user waits (minutes/hours)
  ↓
User verifies email → returns to homepage
  ↓
User signs in → session created
  ↓
Redirects to /auth/post-login (no localStorage temp_prompt_id)
  ↓
PostAuthHandler reads user_metadata.temp_prompt_id
  ↓
Campaign created
```

**Critical Code:**

```typescript
// components/auth/sign-up-form.tsx (line 50)
const handleSubmit = async (e: React.FormEvent) => {
  // Get temp_prompt_id ONE LAST TIME
  const tempPromptId = localStorage.getItem('temp_prompt_id')
  
  // Clear immediately - we'll rely on Supabase metadata
  if (tempPromptId) {
    localStorage.removeItem('temp_prompt_id')
  }
  
  // Attach to user metadata
  await signUp(email, password, redirectUrl, tempPromptId || undefined)
}
```

---

### 3. Duplicate Prevention Mechanisms

**Scenario:** User navigation or browser behavior causes post-login page to execute multiple times.

**Challenge:** Could create duplicate campaigns from same temp prompt.

**Solution:**
1. Use React `useRef` to prevent multiple executions in same render cycle
2. Check `sessionStorage.post_login_processed` sentinel before starting
3. Set `sessionStorage.post_login_processing` lock during execution
4. Mark temp prompt as `used=true` in database after consumption
5. API validates temp prompt is not already used

**State Flow:**

```
/auth/post-login loads
  ↓
Check sessionStorage.post_login_processed → Not found
  ↓
Set sessionStorage.post_login_processing = true (lock)
  ↓
Check temp_prompts.used = false
  ↓
Create campaign
  ↓
Update temp_prompts.used = true
  ↓
Set sessionStorage.post_login_processed = true
  ↓
Remove sessionStorage.post_login_processing (unlock)
  ↓
If page reloads → Sentinel found, exit immediately
```

**Critical Code:**

```typescript
// app/auth/post-login/page.tsx (line 66)
const hasRunRef = useRef(false)

// Prevent multiple concurrent executions
if (hasRunRef.current) {
  return // Exit immediately
}

// Check sentinel
const alreadyProcessed = sessionStorage.getItem('post_login_processed')
if (alreadyProcessed) {
  return // Already processed
}

// Set processing lock
sessionStorage.setItem('post_login_processing', 'true')
hasRunRef.current = true

// ... process campaign creation ...

// Mark as processed
sessionStorage.setItem('post_login_processed', 'true')
sessionStorage.removeItem('post_login_processing')
```

```typescript
// app/api/temp-prompt/route.ts (line 74)
const { data, error } = await supabaseServer
  .from('temp_prompts')
  .select('*')
  .eq('id', tempId)
  .eq('used', false)  // Only return if not already used
  .single()
```

---

### 4. Expired Temp Prompt Handling

**Scenario:** User creates prompt but doesn't authenticate within 1 hour expiration window.

**Challenge:** Temp prompt expires, campaign creation should fail gracefully.

**Solution:**
1. Temp prompts have `expires_at` timestamp (1 hour from creation)
2. API checks expiration before returning prompt
3. Return 410 Gone if expired
4. PostAuthHandler catches error, redirects to homepage
5. User can create new prompt

**State Flow:**

```
Prompt created at 12:00, expires_at = 13:00
  ↓
User authenticates at 13:15 (75 minutes later)
  ↓
POST /api/campaigns {tempPromptId}
  ↓
GET /api/temp-prompt?id={id}
  ↓
Check expires_at < now()
  ↓
Return 410 Gone
  ↓
PostAuthHandler catches error
  ↓
Redirect to homepage (no campaign created)
```

**Critical Code:**

```typescript
// app/api/temp-prompt/route.ts (line 88)
const expiresAt = new Date(data.expires_at)
if (expiresAt < new Date()) {
  return NextResponse.json(
    { error: 'Prompt has expired' },
    { status: 410 }
  )
}
```

```typescript
// lib/services/post-auth-handler.ts (line 76)
try {
  const response = await fetch('/api/campaigns', {
    method: 'POST',
    body: JSON.stringify({ tempPromptId })
  })
  
  if (!response.ok) {
    throw new Error('Failed to create campaign')
  }
} catch (error) {
  console.error('PostAuthHandler Error:', error)
  throw error // Caught by post-login page, redirects to homepage
}
```

---

### 5. Error States and Recovery Paths

**Common Error Scenarios:**

| Error | Cause | Recovery Path |
|-------|-------|---------------|
| Email already registered | User tries to sign up with existing email | Switch to Sign In tab |
| Invalid credentials | Wrong email/password on sign in | Show error, allow retry |
| Email not confirmed | Sign in before verifying email | Show "check email" message |
| Temp prompt expired | Authentication took > 1 hour | Redirect to homepage, create new prompt |
| Campaign API failure | Server error during creation | Show error page with "Try Again" button |
| Network timeout | Slow connection during auth | Show timeout error, allow retry |
| OAuth callback failure | Code exchange fails | Redirect to auth-code-error page |

**Error Handling Flow:**

```
                        ┌──────────────────┐
                        │  Error Occurs    │
                        └────────┬─────────┘
                                 │
                                 ▼
                      ┌──────────────────────┐
                      │   What Type of       │
                      │   Error?             │
                      └──┬──────────┬────────┘
                         │          │
         ┌───────────────┘          └───────────────┐
         │                                          │
         ▼                                          ▼
┌──────────────────┐                    ┌────────────────────┐
│   Auth Error     │                    │   API Error        │
│  (Invalid creds, │                    │  (Server error,    │
│   email issues)  │                    │   campaign fail)   │
└────────┬─────────┘                    └────────┬───────────┘
         │                                       │
         ▼                                       ▼
┌──────────────────┐                    ┌────────────────────┐
│  Display in Form │                    │  Show Error Page   │
│  User can retry  │                    │  with options      │
└──────────────────┘                    └────────┬───────────┘
                                                 │
                                                 ▼
                                    ┌────────────────────────┐
                                    │  User Action?          │
                                    └──┬──────────────────┬──┘
                                       │                  │
                          ┌────────────┘                  └──────────┐
                          │                                          │
                          ▼                                          ▼
                   ┌──────────────┐                         ┌────────────────┐
                   │  Try Again   │                         │  Go Home       │
                   │  (Reload)    │                         │  (Redirect /)  │
                   └──────┬───────┘                         └────────────────┘
                          │
                          ▼
                   ┌──────────────┐
                   │  Succeeds?   │
                   └──┬────────┬──┘
                      │        │
               YES ◄──┘        └──► NO
                │                   │
                ▼                   │
         ┌──────────────┐           │
         │  Continue    │           │
         │  Flow        │           │
         └──────────────┘           │
                                    │
                                    └───► Back to Error Page

═══════════════════════════════════════════════════════════
RECOVERY STRATEGY:
  • Auth Errors → In-form feedback, user retry
  • API Errors → Full error page with "Try Again" or "Go Home"
  • Network Errors → Timeout message, auto-retry or manual
═══════════════════════════════════════════════════════════
```

**Error State Examples:**

```typescript
// components/auth/sign-in-form.tsx (line 29)
if (error.message.includes('Invalid login credentials')) {
  setError('Invalid email or password. Please try again.')
} else if (error.message.includes('Email not confirmed')) {
  setError('Please confirm your email before signing in.')
}
```

```typescript
// app/auth/post-login/page.tsx (line 162)
catch (err) {
  const errorMessage = err instanceof Error ? err.message : 'Failed to create campaign'
  setError(errorMessage)
  setState('error')
  
  // Show error UI with recovery options
}
```

---

## API Endpoints Reference

### POST /api/temp-prompt

**Purpose:** Store temporary prompt before authentication

**Request:**
```json
{
  "promptText": "I run a fitness coaching business...",
  "goalType": "leads"
}
```

**Response:**
```json
{
  "tempId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Side Effects:**
- Creates row in `temp_prompts` table
- Sets `expires_at` to 1 hour from now
- Sets `used` to false

**Error Codes:**
- 400: Missing promptText
- 500: Database error

**Files:**
- `app/api/temp-prompt/route.ts`

---

### GET /api/temp-prompt?id={tempId}

**Purpose:** Retrieve stored temp prompt for campaign creation

**Request:**
```
GET /api/temp-prompt?id=550e8400-e29b-41d4-a716-446655440000
```

**Response:**
```json
{
  "promptText": "I run a fitness coaching business...",
  "goalType": "leads"
}
```

**Side Effects:**
- None (retrieval only, marking as used happens in campaigns API)

**Error Codes:**
- 400: Missing id parameter
- 404: Prompt not found or already used
- 410: Prompt expired

**Validation:**
- Checks `used = false`
- Checks `expires_at > now()`

**Files:**
- `app/api/temp-prompt/route.ts`

---

### POST /api/campaigns

**Purpose:** Create new campaign with AI-generated name

**Request (with temp prompt):**
```json
{
  "tempPromptId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Request (direct creation):**
```json
{
  "name": "My Campaign",
  "initialPrompt": "I run a fitness coaching business...",
  "goalType": "leads"
}
```

**Response:**
```json
{
  "campaign": {
    "id": "campaign-uuid-789",
    "name": "Fitness Coaching Lead Generation",
    "status": "draft",
    "user_id": "user-uuid-123",
    "initial_goal": "leads",
    "initial_prompt": "I run a fitness coaching business...",
    "created_at": "2024-01-01T12:07:00Z",
    "updated_at": "2024-01-01T12:07:00Z"
  },
  "draftAdId": "ad-uuid-101"
}
```

**Side Effects:**
- If tempPromptId provided:
  - Fetches temp prompt via GET /api/temp-prompt
  - Generates campaign name via AI
  - Marks temp prompt as used
- Creates campaign in `campaigns` table
- Creates draft ad in `ads` table
- Returns both campaign object and draft ad ID

**Error Codes:**
- 400: Missing required fields
- 404: Temp prompt not found
- 410: Temp prompt expired
- 500: Campaign creation or AI error

**Files:**
- `app/api/campaigns/route.ts`
- Related: `lib/ai/campaign-namer.ts`

---

### GET /auth/callback

**Purpose:** Handle OAuth callback and exchange code for session

**Request:**
```
GET /auth/callback?code={oauth_code}&next=/auth/post-login
```

**Response:**
```
HTTP 302 Redirect
Location: https://adpilot.studio/auth/post-login?auth=success
Set-Cookie: sb-access-token=...; sb-refresh-token=...
```

**Side Effects:**
- Calls `supabase.auth.exchangeCodeForSession(code)`
- Creates session in `auth.sessions` table
- Creates or updates user in `auth.users` table
- Preserves `user_metadata.temp_prompt_id` if attached during OAuth
- Sets authentication cookies
- Redirects to `next` parameter or `/`

**Error Codes:**
- Redirect to `/auth/auth-code-error` if code exchange fails

**Files:**
- `app/auth/callback/route.ts`

---

### GET /auth/post-login

**Purpose:** Process temp prompt after authentication and create campaign

**Request:**
```
GET /auth/post-login
(No parameters, reads from session and localStorage)
```

**Response:**
```
HTTP 302 Redirect
Location: https://adpilot.studio/{campaignId}?view=build&adId={draftAdId}&firstVisit=true
```

**Side Effects:**
- Checks for `temp_prompt_id` in localStorage and user_metadata
- If found:
  - Calls POST /api/campaigns with tempPromptId
  - Campaign and draft ad created
  - Temp prompt marked as used
  - localStorage cleaned up
  - Redirects to campaign builder
- If not found:
  - Redirects to homepage

**Session State:**
- Sets `sessionStorage.post_login_processed`
- Sets `sessionStorage.post_login_campaign_id`
- Uses `sessionStorage.post_login_processing` for locking

**Files:**
- `app/auth/post-login/page.tsx`
- `lib/services/post-auth-handler.ts`

---

### GET /auth/post-verify

**Purpose:** Process temp prompt after email verification

**Request:**
```
GET /auth/post-verify?verified=true
(Similar to post-login but for email verification flow)
```

**Response:**
```
HTTP 302 Redirect
Location: https://adpilot.studio/{campaignId}?view=build&adId={draftAdId}&firstVisit=true
```

**Side Effects:**
- Similar to /auth/post-login
- Used specifically for email verification flow
- Checks `verified=true` URL parameter

**Files:**
- `app/auth/post-verify/page.tsx`

---

## Component Interaction Map

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                 HOMEPAGE LAYER                                    │
│  ┌────────────────┐   ┌──────────────────┐   ┌──────────────┐  ┌──────────────┐│
│  │  app/page.tsx  │──>│ HomepageHeader   │   │ HeroSection  │  │CampaignGrid  ││
│  │  (Root)        │   │                  │   │              │  │              ││
│  └────────────────┘   └────────┬─────────┘   └──────┬───────┘  └──────┬───────┘│
│                                 │                     │                 │        │
│                                 │  Sign In/Up click   │  Submit prompt  │        │
└─────────────────────────────────┼─────────────────────┼─────────────────┼────────┘
                                  │                     │                 │
                                  │                     │                 │
                                  ▼                     ▼                 │
┌─────────────────────────────────────────────────────────────────────────┼────────┐
│                           AUTH COMPONENTS LAYER                          │        │
│                                                                          │        │
│  ┌─────────────────┐                                                    │        │
│  │   AuthModal     │                                                    │        │
│  │                 │                                                    │        │
│  └────┬───────┬────┘                                                    │        │
│       │       │                                                         │        │
│       ▼       ▼                                                         │        │
│  ┌─────────┐ ┌──────────┐                                              │        │
│  │SignIn   │ │SignUp    │                                              │        │
│  │Form     │ │Form      │                                              │        │
│  └────┬────┘ └────┬─────┘                                              │        │
│       │           │                                                     │        │
│       └─────┬─────┘                                                     │        │
│             │                                                           │        │
│             ▼                                                           │        │
│  ┌─────────────────────┐                                               │        │
│  │   AuthProvider      │                                               │        │
│  │   (Context)         │                                               │        │
│  └──────────┬──────────┘                                               │        │
│             │                                                           │        │
│             │  signIn/signUp/signInWithOAuth                           │        │
└─────────────┼───────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SERVICES LAYER                                      │
│  ┌──────────────────────┐       ┌─────────────────────────────────────────────┐│
│  │   Supabase Client    │       │      PostAuthHandler Service                ││
│  │   lib/supabase/      │       │      lib/services/post-auth-handler.ts      ││
│  │   client.ts          │       │                                             ││
│  └──────┬───────────────┘       └──────────────┬──────────────────────────────┘│
│         │                                       │                               │
│         │  OAuth redirect                       │  processAuthCompletion()      │
└─────────┼───────────────────────────────────────┼───────────────────────────────┘
          │                                       │
          ▼                                       │
┌────────────────────────────┐                   │
│     AUTH ROUTES LAYER       │                   │
│                             │                   │
│  ┌────────────────────┐    │                   │
│  │  /auth/callback    │────┼───────────────────┘
│  │  (OAuth exchange)  │    │
│  └─────────┬──────────┘    │
│            │                │
│            ▼                │
│  ┌────────────────────┐    │
│  │ /auth/post-login   │◄───┘
│  │ (Campaign create)  │
│  └─────────┬──────────┘
│            │
│  ┌────────────────────┐
│  │ /auth/post-verify  │
│  │ (Email verify)     │
│  └─────────┬──────────┘
└────────────┼─────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                                   API LAYER                                     │
│                                                                                 │
│  ┌──────────────────────────────┐       ┌──────────────────────────────────┐  │
│  │  /api/temp-prompt            │       │  /api/campaigns                  │  │
│  │  (Store/retrieve prompts)    │◄──────│  (Create campaigns with AI)      │  │
│  └──────────────────────────────┘       └─────────┬────────────────────────┘  │
│            ▲                                       │                            │
│            │                                       │                            │
│            └───────── Fetch temp prompt ──────────┘                            │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────┬─┘
                                                                                │
                                                                                ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                            CAMPAIGN LAYER                                       │
│                                                                                 │
│  ┌───────────────────────────────┐       ┌───────────────────────────────┐    │
│  │   Campaign Workspace          │       │   Campaign Builder             │    │
│  │   /{campaignId}               │──────>│   (Build view)                 │    │
│  │   (Main page)                 │       │   ?view=build&firstVisit=true  │    │
│  └───────────────────────────────┘       └───────────────────────────────┘    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════════
FLOW SUMMARY:
  User Action (Homepage) → Auth Components → Supabase Service
    → Auth Routes → PostAuthHandler → APIs → Campaign Workspace
═══════════════════════════════════════════════════════════════════════════════════
```

### Component Flow Descriptions

**1. Homepage Entry**
- `app/page.tsx` → Root component
- Renders `HomepageHeader` (unauthenticated) or `LoggedInHeader` (authenticated)
- Renders `HeroSection` with prompt input
- Renders `AdCarousel` (unauthenticated) or `CampaignGrid` (authenticated)

**2. Prompt Creation Flow**
- User types in `HeroSection` prompt input
- Submit → POST `/api/temp-prompt`
- Success → Store `temp_prompt_id` in localStorage
- Opens `AuthModal` component

**3. Authentication Flow**
- `AuthModal` shows `SignInForm` or `SignUpForm`
- Forms use `AuthProvider` context via `useAuth()` hook
- `AuthProvider` wraps Supabase client methods
- All auth calls go through `lib/supabase/client.ts`

**4. OAuth Flow**
- `signInWithGoogle()` → Supabase OAuth
- Redirect to Google → Back to `/auth/callback`
- Callback exchanges code → Creates session
- Redirects to `/auth/post-login`

**5. Post-Authentication**
- `/auth/post-login` page component loads
- Calls `PostAuthHandler.processAuthCompletion()`
- Handler checks localStorage and user_metadata for temp_prompt_id
- If found → Calls POST `/api/campaigns`
- Campaign API fetches temp prompt, creates campaign
- Returns to post-login page
- Navigates to campaign workspace

**6. Campaign Builder**
- Campaign workspace loads at `/{campaignId}`
- URL params: `view=build&adId={draftAdId}&firstVisit=true`
- Loads campaign and ad data
- Displays builder UI with first-visit setup flow

---

## State Management Summary

### Complete State Lifecycle

```
                               [START]
                                  │
                                  │  User submits prompt
                                  ▼
                         ┌─────────────────┐
                         │ Prompt Created  │
                         └────────┬────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │                           │
                    ▼                           ▼
         ┌──────────────────┐        ┌───────────────────┐
         │  Store in        │        │  Set temp_prompt  │
         │  temp_prompts    │        │  _id in           │
         │  (Database)      │        │  localStorage     │
         └────────┬─────────┘        └─────────┬─────────┘
                  │                            │
                  └────────────┬───────────────┘
                               │
                               ▼
                  ┌──────────────────────┐
                  │   Awaiting Auth      │
                  └───────────┬──────────┘
                              │
              ┌───────────────┼───────────────┐
              │                               │
              ▼                               ▼
   ┌─────────────────────┐         ┌──────────────────────┐
   │  Email/Password     │         │  Google OAuth        │
   │  Flow               │         │  Flow                │
   └──────────┬──────────┘         └──────────┬───────────┘
              │                               │
              │                               │
   ┌──────────┴─────────┐         ┌──────────┴──────────┐
   │                    │         │                     │
   ▼                    ▼         ▼                     ▼
┌─────────┐      ┌──────────┐  ┌─────────┐      ┌──────────────┐
│Metadata │      │localStorage  │Metadata │      │localStorage  │
│Set      │      │Cleared   │  │Set      │      │Kept (fallback)│
└────┬────┘      └────┬─────┘  └────┬────┘      └──────┬───────┘
     │                │             │                   │
     └────────────────┴─────────────┴───────────────────┘
                      │
                      ▼
            ┌──────────────────────┐
            │  User Authenticated  │
            └──────────┬───────────┘
                       │
                       ▼
         ┌──────────────────────────────┐
         │  Read temp_prompt_id from:   │
         │  1. localStorage (priority)  │
         │  2. user_metadata (fallback) │
         └──────────────┬───────────────┘
                        │
                        ▼
            ┌─────────────────────────┐
            │  Create Campaign with   │
            │  AI Naming + Draft Ad   │
            └──────────┬──────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌───────────┐  ┌────────────┐  ┌─────────────┐
│Mark temp  │  │Remove temp │  │Set session  │
│_prompt    │  │_prompt_id  │  │Storage      │
│used=true  │  │from        │  │sentinels    │
│(Database) │  │localStorage│  │             │
└─────┬─────┘  └──────┬─────┘  └──────┬──────┘
      │               │               │
      └───────────────┴───────────────┘
                      │
                      ▼
                  [END]
            Journey Complete!
  User lands in Campaign Builder
     with firstVisit=true

═══════════════════════════════════════════════════════════════
KEY TRANSITIONS:
  ► Prompt Created → Database + localStorage
  ► Auth Method → Sets metadata and clears/keeps localStorage
  ► Post-Auth → Reads from both sources (priority: localStorage)
  ► Campaign Created → Cleanup all temp state
═══════════════════════════════════════════════════════════════
```

### State Storage Comparison

| Storage | Key | Lifecycle | Purpose | Cleared By |
|---------|-----|-----------|---------|------------|
| **Database: temp_prompts** | id (UUID) | 1 hour | Persistent storage of prompt | Expires or marked used |
| **localStorage** | temp_prompt_id | Until removed | Survive OAuth redirects | PostAuthHandler after use |
| **sessionStorage** | post_login_processed | Tab session | Duplicate prevention | Browser tab close |
| **sessionStorage** | post_login_processing | Tab session | Concurrent lock | PostAuthHandler after use |
| **sessionStorage** | post_login_campaign_id | Tab session | Recovery path | Manual or tab close |
| **user_metadata** | temp_prompt_id | Permanent | OAuth flow persistence | Never (archived with user) |
| **URL** | Various params | Navigation | State passing between pages | Navigation |

### Database Tables State

**temp_prompts Table:**
```sql
CREATE TABLE temp_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_text TEXT NOT NULL,
  goal_type TEXT,
  used BOOLEAN DEFAULT false,
  expires_at TIMESTAMP DEFAULT (now() + INTERVAL '1 hour'),
  created_at TIMESTAMP DEFAULT now()
);
```

**Lifecycle:**
1. Created on prompt submission
2. `used = false` until campaign created
3. `expires_at` checked on retrieval
4. Marked `used = true` after campaign creation
5. Cleaned up by periodic job (recommended)

**campaigns Table:**
```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  initial_goal TEXT,
  initial_prompt TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

**ads Table:**
```sql
CREATE TABLE ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'draft',
  -- ... other ad fields
  created_at TIMESTAMP DEFAULT now()
);
```

### localStorage Management

**Keys Used:**
- `temp_prompt_id` - Stores UUID of temp prompt

**Set:** After prompt submission, before auth modal opens

**Read:** 
- By SignInForm to determine redirect
- By PostAuthHandler to find temp prompt

**Cleared:**
- Immediately after SignUp (relies on user_metadata)
- After campaign creation by PostAuthHandler

**Code Locations:**
```typescript
// Set: components/homepage/hero-section.tsx (line 140)
localStorage.setItem('temp_prompt_id', tempId)

// Read: lib/services/post-auth-handler.ts (line 88)
const localId = localStorage.getItem('temp_prompt_id')

// Clear: lib/services/post-auth-handler.ts (line 109)
localStorage.removeItem('temp_prompt_id')
```

### sessionStorage Management

**Keys Used:**
- `post_login_processed` - Sentinel to prevent duplicate processing
- `post_login_processing` - Lock during campaign creation
- `post_login_campaign_id` - Recovery campaign ID

**Set:** During post-login/post-verify processing

**Read:** At start of post-login/post-verify to check if already processed

**Cleared:**
- `post_login_processing` after completion or error
- `post_login_processed` can persist (harmless, tab-scoped)
- `post_login_campaign_id` used for recovery then cleared

**Code Locations:**
```typescript
// app/auth/post-login/page.tsx

// Check sentinel (line 71)
const alreadyProcessed = sessionStorage.getItem('post_login_processed')

// Set lock (line 105)
sessionStorage.setItem('post_login_processing', 'true')

// Set processed (line 138)
sessionStorage.setItem('post_login_processed', 'true')

// Set campaign ID (line 149)
sessionStorage.setItem('post_login_campaign_id', campaign.id)
```

### user_metadata Management

**Field:**
- `user.user_metadata.temp_prompt_id` - UUID string

**Set:**
- During signUp (email/password) with metadata parameter
- During signInWithOAuth (Google) with data parameter

**Read:**
- By PostAuthHandler when localStorage doesn't have temp_prompt_id
- Priority: localStorage > user_metadata

**Never Cleared:** Persists in Supabase auth.users table permanently

**Code Locations:**
```typescript
// Set during signUp: components/auth/sign-up-form.tsx (line 66)
await signUp(email, password, redirectUrl, tempPromptId || undefined)

// Set during OAuth: components/auth/auth-provider.tsx (line 233)
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { data: { temp_prompt_id: tempPromptId } }
})

// Read: lib/services/post-auth-handler.ts (line 96)
if (userMetadata?.temp_prompt_id) {
  return userMetadata.temp_prompt_id as string
}
```

### URL Parameters

**Parameters Used:**

| Parameter | Purpose | Set By | Read By | Example |
|-----------|---------|--------|---------|---------|
| `view` | Active view in workspace | Navigation | Campaign page | `?view=build` |
| `adId` | Pre-select specific ad | PostAuthHandler | Campaign page | `?adId=ad-uuid-101` |
| `firstVisit` | Trigger setup flow | PostAuthHandler | Campaign page | `?firstVisit=true` |
| `verified` | Email verification | Supabase | Homepage | `?verified=true` |
| `auth` | OAuth success | /auth/callback | AuthProvider | `?auth=success` |
| `code` | OAuth code | Google | /auth/callback | `?code=xxx` |
| `next` | Post-auth redirect | Auth forms | /auth/callback | `?next=/auth/post-login` |

**Lifecycle Examples:**

```
// OAuth flow
/ → (initiate OAuth) → accounts.google.com → 
/auth/callback?code=xxx&next=/auth/post-login → 
/auth/post-login?auth=success → 
/{campaignId}?view=build&adId={id}&firstVisit=true

// Email verification flow
/ → (sign up) → (verify email) → 
/?verified=true → (sign in) → 
/auth/post-login → 
/{campaignId}?view=build&adId={id}&firstVisit=true
```

---

## Summary

This document maps all authentication and campaign creation journeys in AdPilot. Key takeaways:

1. **Four Main Journeys:**
   - Journey 1: Prompt → Auth → Campaign (main conversion)
   - Journey 2: Sign Up → Homepage (new user, no prompt)
   - Journey 3: Sign In → Homepage (returning user)
   - Journey 4: Prompt → Sign In → Campaign (existing user with prompt)

2. **State Persistence Strategy:**
   - Short-term: localStorage for OAuth redirects
   - Medium-term: user_metadata for email verification delays
   - Database: temp_prompts table as source of truth

3. **Duplicate Prevention:**
   - React useRef for same-render prevention
   - sessionStorage sentinels for cross-reload prevention
   - Database used flag for absolute prevention

4. **Critical Handoffs:**
   - HeroSection → AuthModal → PostAuthHandler → Campaign Builder
   - Each handoff preserves temp_prompt_id through appropriate storage

5. **Error Recovery:**
   - Expired prompts redirect to homepage
   - Failed campaign creation shows retry options
   - All errors logged for debugging

**Files Reference:**
- Entry: `app/page.tsx`
- Prompt: `components/homepage/hero-section.tsx`
- Auth: `components/auth/*`
- Callbacks: `app/auth/callback/route.ts`, `app/auth/post-login/page.tsx`
- Service: `lib/services/post-auth-handler.ts`
- APIs: `app/api/temp-prompt/route.ts`, `app/api/campaigns/route.ts`

---

## Quick Reference Guide

### When Does Campaign Creation Happen?

```
┌────────────────────────────────────────────────────────────────┐
│                    AUTOMATION TRIGGERS                         │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ✓ User enters prompt (unauthenticated) → Journey 1           │
│    "I want more customers" → Auth → Campaign created          │
│                                                                │
│  ✓ User enters prompt (authenticated) → Journey 4             │
│    "Need leads for my business" → Campaign created            │
│                                                                │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                  NO AUTOMATION (Auth Only)                     │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ✗ User clicks "Sign Up" button → Journey 2                   │
│    Creates account → Stays on homepage → NO campaign          │
│                                                                │
│  ✗ User clicks "Sign In" button → Journey 3                   │
│    Authenticates → Stays on homepage → NO campaign            │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### User Intent Recognition

Users express desires naturally, NOT technical instructions:

**Examples of Natural Language Prompts:**
- "I want more bookings for my restaurant"
- "Need customers for my yoga studio"
- "Want people to call my plumbing service"
- "Get traffic to my ecommerce store"
- "Generate leads for my consulting business"

**NOT like this:**
- "Create a lead generation campaign with Meta ads"
- "Build conversion-optimized Facebook ads"
- "Deploy performance marketing campaign"

### State Persistence Strategy

| Storage | When Set | When Read | When Cleared |
|---------|----------|-----------|--------------|
| localStorage.temp_prompt_id | After prompt submit | During post-auth | After campaign created |
| user_metadata.temp_prompt_id | During signUp/OAuth | During post-auth | Never (archived) |
| sessionStorage sentinels | During post-auth processing | On page load | Tab close |
| Database temp_prompts | After prompt submit | During campaign API | Marked used=true |

### Application URLs

- **Production:** https://adpilot.studio
- **Staging:** https://staging.adpilot.studio

---

*Document Version: 2.0*  
*Last Updated: 2025-11-16*  
*Maintained by: Engineering Team*

