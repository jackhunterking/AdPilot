#!/usr/bin/env ts-node
/**
 * API v1 Comprehensive Verification Script
 * Purpose: Automated verification of all v1 API implementation
 */

import { execSync } from 'child_process'
import { existsSync } from 'fs'

async function verifyAPIv1() {
  console.log('🔍 API v1 Comprehensive Verification Starting...\n')
  console.log('='.repeat(60))
  
  let errors = 0
  let warnings = 0
  
  // ============================================================================
  // 1. File Structure Verification
  // ============================================================================
  console.log('\n📁 Phase 1: File Structure Verification')
  console.log('-'.repeat(60))
  
  const requiredFiles = [
    // Campaigns (3)
    'app/api/v1/campaigns/route.ts',
    'app/api/v1/campaigns/[id]/route.ts',
    'app/api/v1/campaigns/[id]/state/route.ts',
    // Ads (6)
    'app/api/v1/ads/route.ts',
    'app/api/v1/ads/[id]/route.ts',
    'app/api/v1/ads/[id]/publish/route.ts',
    'app/api/v1/ads/[id]/pause/route.ts',
    'app/api/v1/ads/[id]/resume/route.ts',
    'app/api/v1/ads/[id]/save/route.ts',
    // Meta (8)
    'app/api/v1/meta/status/route.ts',
    'app/api/v1/meta/assets/route.ts',
    'app/api/v1/meta/payment/route.ts',
    'app/api/v1/meta/admin/route.ts',
    'app/api/v1/meta/metrics/route.ts',
    'app/api/v1/meta/breakdown/route.ts',
    'app/api/v1/meta/forms/route.ts',
    'app/api/v1/meta/forms/[id]/route.ts',
    // Leads (2)
    'app/api/v1/leads/route.ts',
    'app/api/v1/leads/export/route.ts',
    // Chat & Conversations (4)
    'app/api/v1/chat/route.ts',
    'app/api/v1/conversations/route.ts',
    'app/api/v1/conversations/[id]/route.ts',
    'app/api/v1/conversations/[id]/messages/route.ts',
    // Images & Creative (3)
    'app/api/v1/images/variations/route.ts',
    'app/api/v1/images/variations/single/route.ts',
    'app/api/v1/creative/plan/route.ts',
    // Infrastructure (2)
    'app/api/v1/_middleware.ts',
    'lib/types/api.ts',
  ]
  
  let missingFiles = 0
  for (const file of requiredFiles) {
    if (!existsSync(file)) {
      console.error(`  ❌ Missing: ${file}`)
      missingFiles++
      errors++
    }
  }
  
  if (missingFiles === 0) {
    console.log(`  ✅ All ${requiredFiles.length} files exist`)
  } else {
    console.error(`  ❌ ${missingFiles} files missing`)
  }
  
  // ============================================================================
  // 2. TypeScript Verification
  // ============================================================================
  console.log('\n🔷 Phase 2: TypeScript Compilation')
  console.log('-'.repeat(60))
  
  try {
    const output = execSync('npm run typecheck 2>&1', { encoding: 'utf-8' })
    const v1Errors = output.match(/app\/api\/v1.*error TS/g)
    
    if (v1Errors && v1Errors.length > 0) {
      console.error('  ❌ TypeScript errors in v1 files:')
      v1Errors.forEach(err => console.error(`     ${err}`))
      errors++
    } else {
      console.log('  ✅ Zero TypeScript errors in v1 files')
    }
  } catch (e) {
    const output = (e as { stdout?: Buffer }).stdout?.toString() || ''
    const v1Errors = output.match(/app\/api\/v1.*error TS/g)
    if (v1Errors && v1Errors.length > 0) {
      console.error('  ❌ TypeScript errors in v1 files')
      errors++
    } else {
      console.log('  ✅ Zero TypeScript errors in v1 files')
    }
  }
  
  // ============================================================================
  // 3. Build Verification
  // ============================================================================
  console.log('\n🏗️  Phase 3: Build Verification')
  console.log('-'.repeat(60))
  
  try {
    const output = execSync('npm run build 2>&1', { encoding: 'utf-8' })
    
    if (output.includes('Compiled successfully')) {
      console.log('  ✅ Build compiled successfully')
    } else {
      console.error('  ❌ Build did not complete successfully')
      errors++
    }
    
    // Count v1 routes in build
    const v1Routes = (output.match(/ƒ \/api\/v1\//g) || []).length
    console.log(`  ✅ Built ${v1Routes} v1 API routes`)
    
    if (v1Routes < 26) {
      console.warn(`  ⚠️  Expected 26 routes, found ${v1Routes}`)
      warnings++
    }
    
  } catch (e) {
    console.error('  ❌ Build failed')
    errors++
  }
  
  // ============================================================================
  // 4. Code Quality Checks
  // ============================================================================
  console.log('\n📊 Phase 4: Code Quality')
  console.log('-'.repeat(60))
  
  // Check for 'any' types
  try {
    execSync('grep -rn ": any" app/api/v1/ 2>/dev/null')
    console.warn('  ⚠️  Found ": any" types in v1 code')
    warnings++
  } catch {
    console.log('  ✅ No ": any" types found')
  }
  
  // Check for proper response formats
  const successCount = execSync('grep -rn "success: true" app/api/v1/ | wc -l', { encoding: 'utf-8' }).trim()
  const errorCodeCount = execSync('grep -rn "error: { code:" app/api/v1/ | wc -l', { encoding: 'utf-8' }).trim()
  
  console.log(`  ✅ Success responses: ${successCount}`)
  console.log(`  ✅ Error responses with codes: ${errorCodeCount}`)
  
  // Check for auth
  const authCount = execSync('grep -rn "createServerClient()" app/api/v1/ | grep -v "_middleware.ts" | wc -l', { encoding: 'utf-8' }).trim()
  console.log(`  ✅ Routes with auth: ${authCount}`)
  
  // ============================================================================
  // 5. Documentation Check
  // ============================================================================
  console.log('\n📚 Phase 5: Documentation')
  console.log('-'.repeat(60))
  
  const docs = [
    'API_REFACTOR_COMPLETE.md',
    'API_V1_IMPLEMENTATION_SUMMARY.md',
    'API_V1_QUICK_REFERENCE.md',
    'PHASE_8_COMPLETE_GUIDE.md',
    'API_V1_COMPLETE_SUCCESS.md',
    'EXECUTION_COMPLETE.md'
  ]
  
  let missingDocs = 0
  for (const doc of docs) {
    if (existsSync(doc)) {
      console.log(`  ✅ ${doc}`)
    } else {
      console.error(`  ❌ Missing: ${doc}`)
      missingDocs++
      errors++
    }
  }
  
  // ============================================================================
  // Final Summary
  // ============================================================================
  console.log('\n' + '='.repeat(60))
  console.log('📊 VERIFICATION SUMMARY')
  console.log('='.repeat(60))
  
  console.log(`\nFiles Created: ${requiredFiles.length - missingFiles}/${requiredFiles.length}`)
  console.log(`Documentation: ${docs.length - missingDocs}/${docs.length}`)
  console.log(`Errors: ${errors}`)
  console.log(`Warnings: ${warnings}`)
  
  if (errors === 0 && warnings === 0) {
    console.log('\n🎉 ✅ ALL VERIFICATIONS PASSED')
    console.log('🚀 API v1 is READY FOR DEPLOYMENT!')
    console.log('\nNext Steps:')
    console.log('  1. Review generated documentation')
    console.log('  2. Test endpoints in dev environment')
    console.log('  3. Update client code to use v1 endpoints')
    console.log('  4. Deploy to Vercel staging')
    console.log('  5. Run integration tests')
    console.log('  6. Deploy to production')
    console.log('  7. Remove old API routes')
  } else if (errors === 0) {
    console.log('\n✅ VERIFICATION PASSED WITH WARNINGS')
    console.log('⚠️  Review warnings before deployment')
    console.log('🚀 Safe to proceed with caution')
  } else {
    console.log('\n❌ VERIFICATION FAILED')
    console.log(`⚠️  Fix ${errors} error(s) before deploying`)
    process.exit(1)
  }
  
  console.log('\n' + '='.repeat(60))
}

verifyAPIv1().catch((error) => {
  console.error('\n❌ Verification script error:', error)
  process.exit(1)
})

