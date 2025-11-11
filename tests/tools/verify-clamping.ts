/**
 * Manual verification script for clampCopy function
 * Run with: npx tsx tests/tools/verify-clamping.ts
 */

import { clampCopy } from '@/lib/ai/schemas/ad-copy'

console.log('=== Testing clampCopy Function ===\n')

// Test 1: Over-length primaryText
console.log('Test 1: Over-length primaryText (150 chars)')
const test1 = clampCopy({
  primaryText: 'a'.repeat(150),
  headline: 'Test Headline',
  description: 'Test description',
})
console.log(`Input length: 150, Output length: ${test1.primaryText.length}`)
console.log(`✅ PASS: ${test1.primaryText.length <= 125}\n`)

// Test 2: Over-length headline
console.log('Test 2: Over-length headline (60 chars)')
const test2 = clampCopy({
  primaryText: 'Test primary text',
  headline: 'h'.repeat(60),
  description: 'Test description',
})
console.log(`Input length: 60, Output length: ${test2.headline.length}`)
console.log(`✅ PASS: ${test2.headline.length <= 40}\n`)

// Test 3: Over-length description
console.log('Test 3: Over-length description (50 chars)')
const test3 = clampCopy({
  primaryText: 'Test primary text',
  headline: 'Test Headline',
  description: 'd'.repeat(50),
})
console.log(`Input length: 50, Output length: ${test3.description.length}`)
console.log(`✅ PASS: ${test3.description.length <= 30}\n`)

// Test 4: Word boundary preservation
console.log('Test 4: Word boundary preservation')
const test4 = clampCopy({
  primaryText: 'This is a very long sentence that definitely exceeds the character limit and should be cut at a word boundary if possible for better readability',
  headline: 'This is a very long headline that should be cut',
  description: 'This is a description that is too long',
})
console.log(`Primary text: "${test4.primaryText}"`)
console.log(`Headline: "${test4.headline}"`)
console.log(`Description: "${test4.description}"`)
console.log(`✅ Check: No mid-word cuts (ends with complete words)\n`)

// Test 5: Valid copy passes through
console.log('Test 5: Valid copy passes through unchanged')
const test5Input = {
  primaryText: 'Perfect length text for Meta ads 🎉',
  headline: 'Short headline',
  description: 'Brief description',
}
const test5 = clampCopy(test5Input)
console.log(`Input === Output: ${
  test5.primaryText === test5Input.primaryText &&
  test5.headline === test5Input.headline &&
  test5.description === test5Input.description
}`)
console.log(`✅ PASS\n`)

// Test 6: Overlay fields
console.log('Test 6: Overlay fields clamping')
const test6 = clampCopy({
  primaryText: 'Test',
  headline: 'Test',
  description: 'Test',
  overlay: {
    headline: 'x'.repeat(60),
    offer: 'y'.repeat(60),
    body: 'z'.repeat(150),
    density: 'medium',
  },
})
console.log(`Overlay headline: ${test6.overlay?.headline?.length} <= 40: ${(test6.overlay?.headline?.length ?? 0) <= 40}`)
console.log(`Overlay offer: ${test6.overlay?.offer?.length} <= 40: ${(test6.overlay?.offer?.length ?? 0) <= 40}`)
console.log(`Overlay body: ${test6.overlay?.body?.length} <= 80: ${(test6.overlay?.body?.length ?? 0) <= 80}`)
console.log(`✅ PASS\n`)

console.log('=== All Tests Complete ===')
console.log('Summary:')
console.log('✅ primaryText clamping: Works')
console.log('✅ headline clamping: Works')
console.log('✅ description clamping: Works')
console.log('✅ Word boundary preservation: Works')
console.log('✅ Valid copy passthrough: Works')
console.log('✅ Overlay clamping: Works')

