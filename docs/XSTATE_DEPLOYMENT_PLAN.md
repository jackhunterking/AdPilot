# XState Audience Targeting - Deployment Plan

## 📋 Pre-Deployment Checklist

### ✅ Code Quality

- [x] TypeScript compilation passing (`npm run typecheck`)
- [x] Production build successful (`npm run build`)
- [x] No linting errors (`npm run lint`)
- [x] All new files follow project structure
- [x] Documentation complete
- [x] Code committed and pushed to GitHub

### ✅ Database

- [x] Migration applied to Supabase (skgndmwetbcboglmhvbw)
- [x] Validation trigger active
- [x] Performance index created
- [x] Legacy format backward compatible

### ⏳ Testing (User Required)

- [ ] Manual testing completed (requires `.env.local` flag)
- [ ] Unit tests written (Phase 6A - optional for MVP)
- [ ] Integration tests written (Phase 6B - optional for MVP)
- [ ] Browser testing across scenarios

### ⏳ Feature Flag

- [ ] Feature flag documented
- [ ] Default value set to `false` (safe rollout)
- [ ] Rollback procedure documented

---

## 🚀 Deployment Strategy

### Step 1: Deploy to Staging ✅ READY

**Action:** Push to staging branch

```bash
git push origin new-flow
```

**Vercel will automatically deploy.**

**Test on staging:**
1. Set `NEXT_PUBLIC_USE_XSTATE_AUDIENCE=true` in Vercel environment variables (staging only)
2. Test all scenarios from XSTATE_AUDIENCE_TESTING_GUIDE.md
3. Monitor error logs
4. Check database persistence

**Success Criteria:**
- ✅ UI updates correctly after mode switches
- ✅ Loading spinners appear for 500ms
- ✅ Button text changes
- ✅ State persists across page refreshes
- ✅ No console errors
- ✅ No Vercel build errors

---

### Step 2: Deploy to Production (Feature Flag OFF)

**Action:** Merge to main branch

```bash
git checkout main
git merge new-flow
git push origin main
```

**Vercel Environment Variables (Production):**
```
NEXT_PUBLIC_USE_XSTATE_AUDIENCE=false  # Keep legacy by default
```

**Verification:**
- ✅ Production builds successfully
- ✅ Legacy system still works
- ✅ No user impact
- ✅ Feature flag ready for activation

---

### Step 3: Gradual Rollout (10% → 50% → 100%)

#### 3A: Enable for 10% of users

**Action:** Update environment variable in Vercel

For percentage-based rollout, we need a user-level flag. Two options:

**Option A: Simple (All or Nothing)**
```
NEXT_PUBLIC_USE_XSTATE_AUDIENCE=true  # All users
```

**Option B: Advanced (Percentage-based)**
Implement hash-based rollout:
```typescript
const shouldUseXState = () => {
  if (!campaign?.user_id) return false;
  const hash = hashString(campaign.user_id);
  return (hash % 100) < 10; // 10% of users
};
```

#### 3B: Monitor for 24-48 hours

**Metrics to Track:**
- Error rate in audience targeting
- Success rate of mode switches
- Average time to complete audience setup
- User complaints or support tickets
- Database write performance

**Tools:**
- Vercel Analytics
- Supabase Logs
- Sentry (if configured)
- User feedback

**Red Flags (Rollback Immediately):**
- Error rate > 5%
- User complaints about stuck UI
- Database performance degradation
- Build failures

#### 3C: Increase to 50%

If 10% rollout successful for 24 hours:
- Increase percentage to 50%
- Monitor for another 24 hours

#### 3D: Full Rollout (100%)

If 50% rollout successful:
- Enable for all users
- Monitor for 1 week
- Proceed to Phase 7A (cleanup)

---

## 🔙 Rollback Plan

### Immediate Rollback (< 5 minutes)

**If critical issues found:**

1. **Disable feature flag in Vercel**
   ```
   NEXT_PUBLIC_USE_XSTATE_AUDIENCE=false
   ```

2. **Trigger redeployment** (or wait for automatic redeploy)

3. **Verify legacy system active**
   - Check console shows `[AudienceContext]` messages
   - Verify mode switching works
   - Test on one campaign

**Result:** All users immediately revert to stable legacy implementation

### Database Rollback (if needed)

**If database corruption suspected:**

```sql
-- Check affected campaigns
SELECT campaign_id, audience_data
FROM campaign_states
WHERE audience_data->>'version' = '1';

-- Rollback validation trigger (if causing issues)
DROP TRIGGER IF EXISTS validate_audience_data_trigger ON campaign_states;

-- Rollback function
DROP FUNCTION IF EXISTS validate_audience_data_schema();

-- Rollback index (if performance issues)
DROP INDEX IF EXISTS idx_campaign_states_audience_mode;
```

**Note:** Database rollback rarely needed - validation is permissive and supports both formats.

### Code Rollback (nuclear option)

**If feature flag doesn't work:**

```bash
git revert ee1e0d3  # Revert the XState commit
git push origin new-flow --force
```

**Result:** Complete removal of XState code.

---

## 📊 Monitoring Checklist

### During Rollout

**Watch these metrics:**

1. **Error Rates**
   - Target: < 1% errors
   - Alert: > 5% errors

2. **Mode Switch Success Rate**
   - Target: 100% UI updates correctly
   - Alert: < 95% success

3. **Load Times**
   - Target: < 100ms for state updates
   - Alert: > 500ms

4. **Database Performance**
   - Target: < 100ms write latency
   - Alert: > 500ms

5. **User Complaints**
   - Target: 0 stuck UI reports
   - Alert: Any reports of non-updating UI

### Key Logs to Monitor

**Successful Mode Switch:**
```
[AudienceMachine] Switching from manual to AI mode
[AudienceStatePersistence] ✅ Saved state: switching
[AudienceMachine] User selected AI Advantage+ mode  
[AudienceStatePersistence] ✅ Saved state: aiCompleted
```

**Failed Mode Switch:**
```
[AudienceMachine] Error in transition
[AudienceStatePersistence] ❌ All save attempts failed
```

---

## 🎓 Post-Deployment Tasks

### After 100% Rollout + 1 Week Stability

1. **Phase 7A:** Remove legacy `audience-context.tsx`
2. **Phase 7C:** Performance optimization
3. Update documentation to reflect XState as default
4. Remove feature flag code
5. Celebrate! 🎉

---

## 📞 Emergency Contacts

**If critical issue found:**
1. Disable feature flag immediately
2. Document the issue with:
   - Console logs
   - Screenshots
   - Steps to reproduce
   - Database state

---

## ✅ Pre-Deployment Sign-Off

**Before enabling in production:**

- [x] Code review completed
- [x] TypeScript passing
- [x] Build successful
- [x] Migration applied
- [ ] Staging tested (requires user)
- [ ] Rollback plan reviewed
- [ ] Monitoring configured

**Deployment Approved By:** _____________  
**Date:** _____________

---

**Status:** ✅ Ready for staging deployment  
**Risk Level:** Low (backward compatible, feature flagged)  
**Rollback Time:** < 5 minutes

