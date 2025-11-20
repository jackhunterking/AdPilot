# Phase 3: Database Verification Guide

This document contains Supabase AI prompts and SQL queries to verify the message persistence database schema, indexes, and RLS policies.

## ✅ Current Schema Status

Based on `lib/supabase/database.types.ts`, the following schema exists:

### Messages Table
- ✅ `id` (uuid, primary key)
- ✅ `conversation_id` (uuid, foreign key → conversations.id)
- ✅ `role` (text: 'user' | 'assistant' | 'system')
- ✅ `content` (text, searchable content)
- ✅ `parts` (jsonb, full message parts array)
- ✅ `metadata` (jsonb, message metadata)
- ✅ `seq` (bigserial, auto-incrementing sequence)
- ✅ `tool_invocations` (jsonb, legacy field - not used by AI SDK v5)
- ✅ `created_at` (timestamptz)

### Conversations Table
- ✅ `id` (uuid, primary key)
- ✅ `user_id` (uuid, references profiles)
- ✅ `campaign_id` (uuid, references campaigns, nullable)
- ✅ `title` (text, nullable)
- ✅ `metadata` (jsonb, nullable)
- ✅ `message_count` (integer, nullable)
- ✅ `created_at` (timestamptz)
- ✅ `updated_at` (timestamptz)

### Foreign Key Relationships
- ✅ `messages.conversation_id` → `conversations.id`
- ✅ `conversations.campaign_id` → `campaigns.id`
- ✅ `conversations.user_id` → `profiles.id` (implicit from generated types)

---

## Step 3.1: Verify Messages Table Schema

### Supabase AI Prompt

```
Show me the complete schema for the messages table including:
1. All columns with their data types
2. Primary key definition
3. Foreign key constraints
4. Default values and constraints
5. Sequence definition for seq column

Table: public.messages
```

### Expected Output

```sql
CREATE TABLE public.messages (
  id uuid PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES conversations(id),
  role text NOT NULL,
  content text NOT NULL,
  parts jsonb NOT NULL,
  metadata jsonb,
  seq bigserial NOT NULL,
  tool_invocations jsonb,
  created_at timestamptz DEFAULT now()
);
```

---

## Step 3.2: Verify Indexes

### Supabase AI Prompt

```
Show me all indexes on the messages table.

List indexes including:
1. Primary key index
2. Foreign key indexes
3. Any composite indexes
4. Sequence-related indexes

Table: public.messages
```

### Required Indexes

For optimal performance, verify these indexes exist:

1. **Primary Key Index**: `messages_pkey` on `id`
2. **Conversation FK Index**: Index on `conversation_id` for filtering
3. **Sequence Index**: Index on `seq` for ordering
4. **Composite Index** (optional but recommended): `(conversation_id, seq)` for efficient pagination

### Create Missing Indexes (if needed)

If any indexes are missing, run these SQL statements in Supabase SQL Editor:

```sql
-- Index on conversation_id (if missing)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
ON messages(conversation_id);

-- Index on seq (if missing)
CREATE INDEX IF NOT EXISTS idx_messages_seq 
ON messages(seq);

-- Composite index for efficient pagination (recommended)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_seq 
ON messages(conversation_id, seq);
```

---

## Step 3.3: Verify RLS Policies

### Supabase AI Prompt

```
Show me all Row Level Security (RLS) policies for the messages table.

Include:
1. Policy names
2. Policy commands (SELECT, INSERT, UPDATE, DELETE)
3. Policy expressions and conditions
4. Who the policies apply to (PUBLIC, authenticated, etc.)

Table: public.messages
```

### Expected RLS Policies

Users should be able to:
- ✅ **SELECT**: Read messages from conversations they own
- ✅ **INSERT**: Add messages to their own conversations
- ❌ **UPDATE**: Disabled (append-only pattern)
- ❌ **DELETE**: Disabled (append-only pattern)

### Required Policy Definitions

If policies are missing, create them:

```sql
-- Enable RLS on messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT their own messages
CREATE POLICY "Users can select their own messages"
ON messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.user_id = auth.uid()
  )
);

-- Policy: Users can INSERT messages to their own conversations
CREATE POLICY "Users can insert messages to their own conversations"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.user_id = auth.uid()
  )
);

-- NO UPDATE policy (append-only)
-- NO DELETE policy (append-only)
```

---

## Step 3.4: Manual Database Verification

### V3.1: Check if Messages Are Being Saved

Run this query in Supabase SQL Editor:

```sql
-- Check recent messages
SELECT 
  id,
  conversation_id,
  role,
  LEFT(content, 50) as content_preview,
  jsonb_array_length(parts) as parts_count,
  seq,
  created_at
FROM messages
ORDER BY created_at DESC
LIMIT 20;
```

**Expected Result**: Should show recent messages if any conversations have occurred.

### V3.2: Check Specific Conversation

Get a conversation ID from browser console logs, then run:

```sql
-- Replace YOUR_CONVERSATION_ID with actual UUID
SELECT 
  id,
  conversation_id,
  role,
  LEFT(content, 50) as content_preview,
  jsonb_array_length(parts) as parts_count,
  created_at
FROM messages
WHERE conversation_id = 'YOUR_CONVERSATION_ID'
ORDER BY seq ASC;
```

**Expected Result**: Should show all messages for that conversation in order.

### V3.3: Verify Foreign Key Integrity

Check for orphaned messages (should return 0):

```sql
-- Check for orphaned messages (messages without valid conversation)
SELECT 
  m.id,
  m.conversation_id,
  m.created_at
FROM messages m
LEFT JOIN conversations c ON m.conversation_id = c.id
WHERE c.id IS NULL
LIMIT 10;
```

**Expected Result**: 0 rows (no orphaned messages)

### V3.4: Verify Conversations Exist

```sql
-- Check conversations
SELECT 
  id,
  campaign_id,
  user_id,
  title,
  message_count,
  created_at
FROM conversations
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Result**: Should show conversations linked to campaigns.

### V3.5: Test RLS Policies

Run as authenticated user in Supabase Dashboard (must be logged in):

```sql
-- This should return YOUR messages only
SELECT COUNT(*) as my_messages
FROM messages m
JOIN conversations c ON m.conversation_id = c.id
WHERE c.user_id = auth.uid();
```

**Expected Result**: Count of messages you own (may be 0 if you haven't sent any yet).

---

## Step 3.6: Verify Sequence Generation

Check that the `seq` column auto-increments properly:

```sql
-- Check sequence values for a conversation
SELECT 
  id,
  seq,
  role,
  created_at
FROM messages
WHERE conversation_id = 'YOUR_CONVERSATION_ID'
ORDER BY seq ASC;
```

**Expected Result**: `seq` values should be sequential: 1, 2, 3, 4, etc.

---

## Troubleshooting

### Issue: No indexes on conversation_id or seq

**Solution**: Run the CREATE INDEX statements from Step 3.2

### Issue: RLS policies blocking inserts

**Symptom**: Error: "new row violates row-level security policy"

**Solution**: 
1. Verify conversations table has proper user_id
2. Check that INSERT policy exists and is correct
3. Ensure user is authenticated when inserting

### Issue: Orphaned messages exist

**Solution**:
```sql
-- Delete orphaned messages (USE WITH CAUTION)
DELETE FROM messages
WHERE conversation_id NOT IN (SELECT id FROM conversations);
```

### Issue: Sequence not incrementing

**Solution**:
```sql
-- Reset sequence (if needed)
SELECT setval('messages_seq_seq', (SELECT MAX(seq) FROM messages));
```

---

## Success Criteria

✅ All required columns exist in messages table  
✅ Foreign key constraint to conversations exists  
✅ Primary key and indexes exist  
✅ RLS policies allow SELECT and INSERT for own messages  
✅ RLS policies block UPDATE and DELETE  
✅ No orphaned messages in database  
✅ Sequence increments correctly  
✅ Conversations are linked to campaigns and users  

---

## Next Steps

After verifying the database:
1. Test message persistence from the application
2. Check browser console for save logs
3. Verify messages persist after page refresh
4. Move to Phase 4: Frontend verification

