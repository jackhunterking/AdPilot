# Facebook Marketing API Setup Guide

This guide will help you set up the Facebook Marketing API integration for AdPilot.

## Prerequisites

1. A Facebook Business Account
2. A Facebook Ad Account
3. A Facebook Page (for running ads)

## Step 1: Create a Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click "My Apps" → "Create App"
3. Select "Business" as the app type
4. Fill in the app details and create the app

## Step 2: Add Marketing API

1. In your app dashboard, click "Add Product"
2. Find "Marketing API" and click "Set Up"
3. Follow the setup instructions

## Step 3: Generate Access Token

1. Go to Tools → Graph API Explorer
2. Select your app from the dropdown
3. Click "Generate Access Token"
4. Grant the following permissions:
   - `ads_management`
   - `ads_read`
   - `business_management`
   - `pages_read_engagement`
   - `leads_retrieval` (for lead generation campaigns)

5. Copy the generated access token

## Step 4: Get Your Ad Account ID

1. Go to [Facebook Ads Manager](https://business.facebook.com/adsmanager/)
2. Click on the account name in the top left
3. Go to "Ad Account Settings"
4. Copy your Ad Account ID (format: act_XXXXXXXXXX)
5. Remove the "act_" prefix when adding to environment variables

## Step 5: Configure Environment Variables

Add the following to your `.env.local` file:

\`\`\`
FACEBOOK_ACCESS_TOKEN=your_access_token_here
FACEBOOK_AD_ACCOUNT_ID=your_ad_account_id_here
FACEBOOK_PAGE_ID=your_facebook_page_id_here
\`\`\`

## Step 6: Test the Integration

Run the following command to test your Facebook API connection:

\`\`\`bash
npm run test:facebook-api
\`\`\`

## Important Notes

- **Access Token Expiration**: User access tokens expire after 60 days. For production, use a System User access token that doesn't expire.
- **Rate Limits**: Facebook has rate limits on API calls. Implement proper error handling and retry logic.
- **Webhooks**: Set up webhooks to receive real-time updates on ad performance and lead submissions.

## Troubleshooting

### Error: "Invalid OAuth access token"
- Your access token may have expired. Generate a new one.
- Ensure you've granted all required permissions.

### Error: "Unsupported get request"
- Check that your Ad Account ID is correct.
- Verify you have access to the ad account.

### Error: "Application does not have permission"
- Go to your app settings and ensure Marketing API is added.
- Check that all required permissions are granted.

## Next Steps

Once configured, AdPilot will:
- Create campaigns programmatically
- Fetch real-time metrics
- Manage ad status (pause/resume)
- Retrieve lead form submissions
- Create A/B test variants automatically
