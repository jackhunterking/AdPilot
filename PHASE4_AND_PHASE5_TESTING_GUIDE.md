# Phase 4 & 5: Frontend Verification and Testing Guide

This document provides step-by-step testing instructions to verify message persistence is working correctly end-to-end.

---

## Phase 4: Frontend Client-Side Verification

### ✅ V4.1: Verify useChat Hook Configuration

**File**: `components/ai-chat.tsx` (lines 363-367)

**Current Implementation** (Verified ✅):
```typescript
const chatHelpers = useChat({
  id: chatId, // ✅ Stable conversation ID
  messages: initialMessages,  // ✅ Loaded from DB
  transport, // ✅ Configured with auth headers
});
```

**Status**: ✅ Correct - Hook is properly configured with stable ID and initial messages.

---

### ✅ V4.2: Verify Server-Side Message Loading

**File**: `app/[campaignId]/page.tsx` (lines 117-161)

**Current Implementation** (Verified ✅):
```typescript
// Step 1: Get conversation for this campaign
const { data: conversation } = await supabaseServer
  .from('conversations')
  .select('id')
  .eq('campaign_id', campaignId)
  .single();

// Step 2: Load messages from that conversation
if (conversation) {
  const result = await supabaseServer
    .from('messages')
    .select('*')
    .eq('conversation_id', conversation.id)
    .order('seq', { ascending: true });
  
  dbMessages = result.data;
}

// Step 3: Convert to UIMessage format
const messages: UIMessage[] = (dbMessages || [])
  .map(dbToUIMessage)
  .filter((msg): msg is UIMessage => msg !== null);
```

**Status**: ✅ Correct - Messages are loaded from DB and converted properly.

---

### ✅ V4.3: Verify Auto-Submit Prevention

**File**: `components/ai-chat.tsx` (lines 394-396)

**Current Implementation** (Verified ✅):
```typescript
// Don't auto-submit if messages already exist
if (initialMessages.length > 0) {
  return
}
```

**Status**: ✅ Correct - Won't duplicate messages on refresh.

---

## Phase 5: End-to-End Testing

### Prerequisites

Before testing:
1. ✅ Ensure you're running the app locally or on staging
2. ✅ Open browser DevTools Console (F12)
3. ✅ Have Supabase Dashboard open to check database
4. ✅ Clear browser cache if needed (Cmd+Shift+R / Ctrl+Shift+F5)

---

### Test 5.1: Basic Message Persistence

**Objective**: Verify messages persist after normal page refresh.

**Steps**:

1. **Navigate to a campaign page**
   - Go to `/workspace` or your homepage
   - Create a new campaign or open an existing one
   - Note the campaign ID in the URL

2. **Send a test message**
   - Type: "I am a real estate broker looking to get leads for a pre construction condo sales"
   - Click send
   - Wait for AI to respond completely

3. **Check browser console logs**
   - Look for: `[API] ✅ onFinish called with X messages`
   - Look for: `[MessageStore] ✅ Successfully saved X new messages`
   - Look for: `[API] ✅ Successfully saved messages to database`

4. **Refresh the page (hard refresh)**
   - Press Cmd+Shift+R (Mac) or Ctrl+Shift+F5 (Windows)
   - Page should reload

5. **Verify persistence**
   - ✅ **PASS**: Both user message and AI response are visible
   - ❌ **FAIL**: Messages disappear

**Expected Console Logs**:
```
[SERVER] Loaded 2 messages
[SERVER] First message: {id: "msg_...", role: "user", has_parts: true}
```

**Screenshot**: Take a screenshot showing messages persisted after refresh.

---

### Test 5.2: Rapid Refresh (Client Disconnect Scenario)

**Objective**: Verify `consumeStream()` ensures messages persist even if client disconnects.

**Steps**:

1. **Navigate to campaign page** (same as Test 5.1)

2. **Send a message and immediately refresh**
   - Type: "Generate 3 creative variations for my real estate ad"
   - Click send
   - **IMMEDIATELY** hard refresh (within 1 second) - Don't wait for AI response!

3. **Wait 5-10 seconds** after page reloads
   - The stream should continue processing on the backend

4. **Hard refresh again**

5. **Verify persistence**
   - ✅ **PASS**: Your message "Generate 3 creative variations..." is visible
   - ❌ **FAIL**: Message disappeared

**Key Check**: Check server logs (Vercel logs or local terminal):
```
[API] ✅ onFinish called with X messages
[API] ✅ Successfully saved messages to database
```

Even though the client disconnected, the server should have completed processing thanks to `consumeStream()`.

---

### Test 5.3: Multiple Messages in Sequence

**Objective**: Verify multiple messages persist correctly.

**Steps**:

1. **Send Message 1**
   - Type: "I want to target young professionals aged 25-35"
   - Wait for response
   - Refresh page
   - ✅ Verify: Message 1 and response persist

2. **Send Message 2**
   - Type: "Focus on Toronto downtown area"
   - Wait for response
   - Refresh page
   - ✅ Verify: Messages 1-2 and responses persist (4 total)

3. **Send Message 3**
   - Type: "Budget is $5000 for 30 days"
   - Wait for response
   - Refresh page
   - ✅ Verify: All 6 messages persist (3 user + 3 assistant)

**Check database manually** (Optional):

In Supabase SQL Editor:
```sql
SELECT 
  id,
  role,
  LEFT(content, 50) as preview,
  seq,
  created_at
FROM messages
WHERE conversation_id = 'YOUR_CONVERSATION_ID'
ORDER BY seq ASC;
```

Should show 6 rows with seq: 1, 2, 3, 4, 5, 6

---

### Test 5.4: Tool Invocations (Creative Generation)

**Objective**: Verify tool call parts persist correctly in messages.

**Steps**:

1. **Send creative generation request**
   - Type: "Generate creative variations with a modern condo building image"
   - Wait for tool invocation to complete
   - You should see creative variations displayed

2. **Check browser console**
   - Look for logs showing parts with type: `tool-call`, `tool-output`
   - Example: `partTypes: ["text", "tool-call", "tool-output", "text"]`

3. **Refresh the page**

4. **Verify persistence**
   - ✅ **PASS**: Creative variations are still displayed
   - ✅ **PASS**: Tool invocation parts are preserved
   - ❌ **FAIL**: Variations disappear or show "No variations generated"

**Database Check**:
```sql
SELECT 
  id,
  role,
  jsonb_array_length(parts) as parts_count,
  parts
FROM messages
WHERE conversation_id = 'YOUR_CONVERSATION_ID'
AND role = 'assistant'
ORDER BY seq DESC
LIMIT 1;
```

The `parts` array should contain tool-call and tool-output objects.

---

### Test 5.5: Long Session (10 Messages)

**Objective**: Verify long conversations persist correctly.

**Steps**:

1. **Have a 10-message conversation** (5 user + 5 assistant)
   - Send various messages about your campaign
   - Wait for each response
   - Don't refresh until you've completed all 10 messages

2. **Close the tab completely**
   - Close the browser tab (or entire browser)

3. **Reopen the campaign page**
   - Navigate back to the same campaign URL

4. **Verify persistence**
   - ✅ **PASS**: All 10 messages load correctly
   - ✅ **PASS**: Messages are in correct order
   - ✅ **PASS**: No duplicates
   - ❌ **FAIL**: Some messages missing

**Performance Check**:
- Page should load within 2-3 seconds
- Messages should render smoothly

---

### Test 5.6: Edge Cases

#### Test 5.6a: Empty Conversation State
1. Create a new campaign
2. Navigate to campaign page
3. ✅ Verify: No messages shown (empty state)
4. Send first message
5. Refresh
6. ✅ Verify: First message persists

#### Test 5.6b: Network Interruption Simulation
1. Open Network tab in DevTools
2. Send a message
3. Immediately switch to "Offline" in Network tab
4. Wait 5 seconds
5. Switch back to "Online"
6. Refresh page
7. ✅ Verify: Message should still save (thanks to consumeStream)

#### Test 5.6c: Multiple Tabs
1. Open campaign in Tab 1
2. Send a message, wait for response
3. Open same campaign in Tab 2
4. ✅ Verify: Messages from Tab 1 visible in Tab 2
5. Send message in Tab 2
6. Refresh Tab 1
7. ✅ Verify: Messages from Tab 2 now visible in Tab 1

---

## Success Criteria Checklist

After completing all tests:

### Phase 4 ✅
- [x] useChat hook configured with stable ID
- [x] Server loads messages from database on mount
- [x] Messages converted from DB format to UIMessage format
- [x] Auto-submit prevented when messages exist

### Phase 5 ✅
- [ ] Test 5.1: Basic persistence works (send + wait + refresh)
- [ ] Test 5.2: Rapid refresh works (send + immediate refresh)
- [ ] Test 5.3: Multiple messages persist correctly
- [ ] Test 5.4: Tool invocations preserved
- [ ] Test 5.5: Long sessions (10+ messages) persist
- [ ] Test 5.6a: Empty state handled correctly
- [ ] Test 5.6b: Network interruption handled
- [ ] Test 5.6c: Multi-tab consistency works

---

## Common Issues & Solutions

### Issue: Messages disappear on refresh
**Cause**: `onFinish` not being called or not saving to DB  
**Check**: Browser console for `[API] ✅ onFinish called` log  
**Solution**: Verify Phase 1 implementation is correct

### Issue: Only user messages persist, not AI responses
**Cause**: Assistant message not included in `completeMessages` array  
**Check**: `[API] Message roles:` log should show both user and assistant  
**Solution**: Verify `onFinish` receives complete messages from `toUIMessageStreamResponse`

### Issue: Duplicate messages appear
**Cause**: Deduplication not working  
**Check**: `[MessageStore] Deduplication:` log  
**Solution**: Verify message IDs are unique and deduplication logic works

### Issue: Tool invocations lost on refresh
**Cause**: Parts array not properly stored/loaded  
**Check**: Database `parts` column should be valid JSONB  
**Solution**: Verify `messageToStorage` and `storageToMessage` functions

### Issue: RLS policies blocking access
**Symptom**: "permission denied for table messages"  
**Check**: Supabase logs, RLS policies  
**Solution**: Run RLS policy creation scripts from Phase 3

---

## Debugging Commands

### Check server logs
```bash
# Local development
# Check terminal where npm run dev is running

# Vercel deployment
# Go to Vercel Dashboard → Your Project → Functions → Logs
```

### Check browser console
```javascript
// See all messages in current useChat state
console.log(messages);

// Check conversation ID
console.log(chatId);

// Check if messages are initialized
console.log(initialMessages);
```

### Check database directly
```sql
-- Count messages per conversation
SELECT 
  conversation_id,
  COUNT(*) as message_count,
  MIN(created_at) as first_message,
  MAX(created_at) as last_message
FROM messages
GROUP BY conversation_id
ORDER BY last_message DESC;
```

---

## Final Verification

Once all tests pass:

1. ✅ Messages persist across page refreshes
2. ✅ Messages persist even with client disconnects
3. ✅ Multiple messages in sequence all persist
4. ✅ Tool invocations preserved correctly
5. ✅ Long conversations (10+ messages) work
6. ✅ No duplicate messages created
7. ✅ Message order preserved (by seq)
8. ✅ All roles (user/assistant) persist correctly

**Congratulations!** 🎉 Message persistence is working correctly!

---

## Next Steps

After verification:
1. Monitor production logs for any persistence issues
2. Set up alerts for failed message saves
3. Consider implementing message retry logic
4. Add analytics to track save success rate
5. Document any edge cases discovered during testing

