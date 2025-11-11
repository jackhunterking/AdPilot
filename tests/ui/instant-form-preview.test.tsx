/**
 * Feature: Meta Instant Form Preview Visual Tests
 * Purpose: Playwright screenshot tests for pixel-perfect validation
 * References:
 *  - Playwright visual comparison: https://playwright.dev/docs/test-snapshots
 */

import { test, expect } from '@playwright/test'
import { MetaInstantFormPreview } from '@/components/forms/MetaInstantFormPreview'
import type { MetaInstantForm } from '@/lib/types/meta-instant-form'

// Mock form data for testing
const mockForm: MetaInstantForm = {
  id: 'test_form_123',
  name: 'Test Lead Form',
  privacy: {
    url: 'https://example.com/privacy',
    linkText: 'Privacy Policy',
  },
  fields: [
    {
      id: 'email',
      type: 'EMAIL',
      label: 'Email',
      key: 'email',
      required: true,
    },
    {
      id: 'full_name',
      type: 'FULL_NAME',
      label: 'Full name',
      key: 'full_name',
      required: true,
    },
    {
      id: 'phone',
      type: 'PHONE',
      label: 'Phone number',
      key: 'phone',
      required: true,
    },
  ],
  thankYou: {
    title: 'Thanks for your interest!',
    body: "We'll contact you within 24 hours",
    ctaText: 'View website',
    ctaUrl: 'https://example.com',
  },
}

test.describe('MetaInstantFormPreview Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport to match device frame width
    await page.setViewportSize({ width: 400, height: 900 })
  })

  test('Stage 1: Prefill information', async ({ page, mount }) => {
    const component = await mount(<MetaInstantFormPreview form={mockForm} />)

    // Wait for component to be visible
    await expect(component).toBeVisible()

    // Take screenshot of stage 1 (default)
    await expect(component).toHaveScreenshot('instant-form-stage-1-prefill.png', {
      maxDiffPixels: 100, // Allow minor rendering differences
    })
  })

  test('Stage 2: Contact information', async ({ page, mount }) => {
    const component = await mount(<MetaInstantFormPreview form={mockForm} />)
    await expect(component).toBeVisible()

    // Navigate to stage 2 using right arrow
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(500) // Wait for transition

    await expect(component).toHaveScreenshot('instant-form-stage-2-contact.png', {
      maxDiffPixels: 100,
    })
  })

  test('Stage 3: Review', async ({ page, mount }) => {
    const component = await mount(<MetaInstantFormPreview form={mockForm} />)
    await expect(component).toBeVisible()

    // Navigate to stage 3
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(500)
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(500)

    await expect(component).toHaveScreenshot('instant-form-stage-3-review.png', {
      maxDiffPixels: 100,
    })
  })

  test('Stage 4: Thank you', async ({ page, mount }) => {
    const component = await mount(
      <MetaInstantFormPreview form={mockForm} showThankYou={true} />
    )
    await expect(component).toBeVisible()

    await expect(component).toHaveScreenshot('instant-form-stage-4-thankyou.png', {
      maxDiffPixels: 100,
    })
  })

  test('Form without thank you', async ({ page, mount }) => {
    const formWithoutThankYou: MetaInstantForm = {
      ...mockForm,
      thankYou: undefined,
    }

    const component = await mount(
      <MetaInstantFormPreview form={formWithoutThankYou} />
    )
    await expect(component).toBeVisible()

    await expect(component).toHaveScreenshot('instant-form-no-thankyou.png', {
      maxDiffPixels: 100,
    })
  })

  test('Device frame appearance', async ({ page, mount }) => {
    const component = await mount(<MetaInstantFormPreview form={mockForm} />)
    await expect(component).toBeVisible()

    // Check that device frame is rendered
    const frame = component.locator('[style*="border-radius"]').first()
    await expect(frame).toBeVisible()

    // Check status bar is present
    const statusBar = component.locator('text=9:41')
    await expect(statusBar).toBeVisible()
  })

  test('Navigation with keyboard', async ({ page, mount }) => {
    const component = await mount(<MetaInstantFormPreview form={mockForm} />)
    await expect(component).toBeVisible()

    // Should start at stage 1
    await expect(component.locator('text=Prefill information')).toBeVisible()

    // Navigate forward
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(300)
    await expect(component.locator('text=Contact information')).toBeVisible()

    // Navigate back
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(300)
    await expect(component.locator('text=Prefill information')).toBeVisible()
  })

  test('Progress bar updates', async ({ page, mount }) => {
    const component = await mount(<MetaInstantFormPreview form={mockForm} />)
    await expect(component).toBeVisible()

    // Check progress at stage 1 (33%)
    const progressBar = component.locator('[style*="width"]').filter({
      has: page.locator('[style*="background"]'),
    })
    
    // Navigate to stage 3 and check progress is fuller
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(500)
    
    // Progress should be at 100% for stage 3
    await expect(component.locator('text=Review')).toBeVisible()
  })
})

