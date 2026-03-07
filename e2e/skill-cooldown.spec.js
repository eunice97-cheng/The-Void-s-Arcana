// e2e/skill-cooldown.spec.js
import { test, expect } from '@playwright/test';

test.describe('Skill Cooldown Functionality', () => {
  test('skill cooldown timer updates live', async ({ page }) => {
    await page.goto('/game');

    // Find a skill with cooldown
    const skillElement = page.locator('.skill-item').first();
    await expect(skillElement).toBeVisible();

    // Check for cooldown display
    const cooldownElement = skillElement.locator('.cooldown');
    const initialCooldown = await cooldownElement.textContent();

    // Wait a few seconds
    await page.waitForTimeout(2000);

    // Cooldown should decrease
    const updatedCooldown = await cooldownElement.textContent();
    expect(updatedCooldown).not.toBe(initialCooldown);
  });

  test('skill becomes available after cooldown', async ({ page }) => {
    await page.goto('/game');

    // Find skill with cooldown
    const skillElement = page.locator('.skill-item').first();

    // Wait for cooldown to expire (this test might be slow)
    await page.waitForTimeout(35000); // Wait 35 seconds for 30s cooldown

    // Cooldown should be gone
    const cooldownElement = skillElement.locator('.cooldown');
    await expect(cooldownElement).toHaveCount(0);
  });
});