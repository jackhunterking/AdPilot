# AdPilot

AI-powered Meta (Facebook/Instagram) advertising platform with seamless Lovable integration.

## 🔗 Related Projects

- **Chrome Extension:** [adpilot-lovable-extension](https://github.com/jackhunterking/adpilot-lovable-extension) - Install AdPilot directly in Lovable editor
- **Lovable UI:** Coming soon - Dedicated UI for Lovable integration

---

Small deployment sync note: trigger build for meta-connection UI/API fixes.

## Meta: Connect as Admin (server-verified)

- Adds an intermediate step to verify the Facebook user has admin/payment permissions on the selected Business and Ad Account before opening the payment dialog.
- Server verifies roles via Graph API and persists a single source of truth in `campaign_meta_connections`.

### User flow
1. Connect With Meta (select Business/Page/Ad Account)
2. Connect as Admin
   - Verify Admin Access (server check)
   - Reconnect with Admin Access (re-run Business Login if needed)
3. Add Payment (enabled only when admin verified, if required by flag)

### Required permissions
- `business_management`
- `ads_management`

Ensure these are included in your Facebook Business Login configuration.

### Feature flag
To require admin verification before opening the payment dialog, set:

```bash
NEXT_PUBLIC_META_REQUIRE_ADMIN=true
```

If you want to temporarily disable gating (for testing), set `NEXT_PUBLIC_META_REQUIRE_ADMIN=false`.

### Business Login Configs (dual)
- System connect (assets):
```bash
NEXT_PUBLIC_FB_BIZ_LOGIN_CONFIG_ID_SYSTEM=1352055236432179
```
- User login (before payment or manual):
```bash
NEXT_PUBLIC_FB_BIZ_LOGIN_CONFIG_ID_USER=823305277060499
```
If only the legacy single key is present, the app will continue to use:
```bash
NEXT_PUBLIC_FB_BIZ_LOGIN_CONFIG_ID=<legacy_config_id>
```

### Helpful links
- Business People settings: `https://business.facebook.com/settings/people/?business_id=<BUSINESS_ID>`
- Ad Account payment methods: `https://business.facebook.com/settings/ad-accounts/<AD_ACCOUNT_ID>/payment_methods`

### Data model
The following fields are added to `public.campaign_meta_connections` as the single source of truth:
- `admin_connected boolean`
- `admin_checked_at timestamptz`
- `admin_business_role text`
- `admin_ad_account_role text`

### References
- Business assigned users: `https://developers.facebook.com/docs/graph-api/reference/business/assigned_users/`
- Ad Account users/roles: `https://developers.facebook.com/docs/marketing-api/reference/ad-account/`
- Supabase RLS: `https://supabase.com/docs/guides/auth/row-level-security`
