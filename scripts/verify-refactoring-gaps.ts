/**
 * Feature: Refactoring Gap Verification Script
 * Purpose: Verify all refactored endpoints work correctly
 * References:
 *  - API v1: MASTER_API_DOCUMENTATION.mdc
 */

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL';
  error?: string;
  duration?: number;
}

interface TestCase {
  name: string;
  run: (params: TestParams) => Promise<void>;
}

interface TestParams {
  testCampaignId: string;
  testAdId: string;
  authCookie?: string;
}

const tests: TestCase[] = [
  {
    name: 'GET /api/v1/ads/[id]/save returns snapshot',
    run: async (params: TestParams) => {
      const response = await fetch(`http://localhost:3000/api/v1/ads/${params.testAdId}/save`, {
        credentials: 'include',
        headers: params.authCookie ? { Cookie: params.authCookie } : {},
      });
      
      if (response.status === 405) {
        throw new Error('405 Method Not Allowed - GET not implemented');
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data: unknown = await response.json();
      const result = data as { success?: boolean; data?: { snapshot?: unknown } };
      
      if (!result.success || !result.data?.snapshot) {
        throw new Error('Invalid response format - missing success or snapshot data');
      }
    }
  },
  {
    name: 'GET /api/v1/conversations?campaignId works',
    run: async (params: TestParams) => {
      const response = await fetch(
        `http://localhost:3000/api/v1/conversations?campaignId=${params.testCampaignId}`,
        {
          credentials: 'include',
          headers: params.authCookie ? { Cookie: params.authCookie } : {},
        }
      );
      
      if (response.status === 404) {
        throw new Error('404 Not Found - endpoint missing');
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data: unknown = await response.json();
      const result = data as { success?: boolean; data?: { conversations?: unknown[] } };
      
      if (!result.success || !Array.isArray(result.data?.conversations)) {
        throw new Error('Invalid response format - missing conversations array');
      }
    }
  },
  {
    name: 'POST /api/v1/conversations creates conversation',
    run: async (params: TestParams) => {
      const response = await fetch('http://localhost:3000/api/v1/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(params.authCookie ? { Cookie: params.authCookie } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          campaignId: params.testCampaignId,
          title: 'Test Conversation',
        }),
      });
      
      if (response.status === 404) {
        throw new Error('404 Not Found - endpoint missing');
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data: unknown = await response.json();
      const result = data as { success?: boolean; data?: { conversation?: { id?: string } } };
      
      if (!result.success || !result.data?.conversation?.id) {
        throw new Error('Invalid response format - missing conversation ID');
      }
    }
  },
  {
    name: 'Service layer: ad-service-server.getSnapshot returns data',
    run: async (params: TestParams) => {
      // This test verifies the server service works
      // In a real test environment, we'd import and test directly
      // For now, we verify via the API endpoint which uses it
      const response = await fetch(`http://localhost:3000/api/v1/ads/${params.testAdId}/save`, {
        credentials: 'include',
        headers: params.authCookie ? { Cookie: params.authCookie } : {},
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data: unknown = await response.json();
      const result = data as { success?: boolean; data?: { snapshot?: Record<string, unknown> } };
      
      if (!result.success || !result.data?.snapshot) {
        throw new Error('Service not returning snapshot data');
      }
      
      // Verify snapshot is not empty (should have at least one key)
      const snapshot = result.data.snapshot;
      if (Object.keys(snapshot).length === 0) {
        throw new Error('Snapshot is empty - service may not be using adDataService');
      }
    }
  },
];

async function runTests(params: TestParams): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  console.log('\n🧪 Running Refactoring Gap Verification Tests\n');
  console.log(`Test Parameters:`);
  console.log(`  Campaign ID: ${params.testCampaignId}`);
  console.log(`  Ad ID: ${params.testAdId}`);
  console.log(`  Auth Cookie: ${params.authCookie ? 'Provided' : 'Not provided (using credentials: include)'}\n`);
  
  for (const test of tests) {
    const startTime = Date.now();
    
    try {
      await test.run(params);
      const duration = Date.now() - startTime;
      
      results.push({
        name: test.name,
        status: 'PASS',
        duration,
      });
      
      console.log(`✅ PASS: ${test.name} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      results.push({
        name: test.name,
        status: 'FAIL',
        error: errorMessage,
        duration,
      });
      
      console.error(`❌ FAIL: ${test.name} (${duration}ms)`);
      console.error(`   Error: ${errorMessage}`);
    }
  }
  
  return results;
}

function printSummary(results: TestResult[]): void {
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Test Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ${failed > 0 ? '❌' : ''}`);
  console.log(`Total Duration: ${totalDuration}ms`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (failed > 0) {
    console.log('Failed Tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.name}`);
      console.log(`    ${r.error}`);
    });
    console.log('');
  }
}

// Main execution
async function main() {
  // Get test parameters from command line or environment
  const testCampaignId = process.env.TEST_CAMPAIGN_ID || 'ef71164d-4384-4903-94e7-3b5377b9d482';
  const testAdId = process.env.TEST_AD_ID || '95ec2a6d-a72c-4563-801b-5b7a15ac173a';
  const authCookie = process.env.TEST_AUTH_COOKIE;
  
  const results = await runTests({
    testCampaignId,
    testAdId,
    authCookie,
  });
  
  printSummary(results);
  
  // Exit with error code if any tests failed
  const hasFailures = results.some(r => r.status === 'FAIL');
  process.exit(hasFailures ? 1 : 0);
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error running tests:', error);
    process.exit(1);
  });
}

export { runTests, type TestResult, type TestParams };

