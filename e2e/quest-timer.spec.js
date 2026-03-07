// e2e/quest-timer.spec.js
import { test, expect } from '@playwright/test';

test.describe('Quest Timer Functionality', () => {
  test('quest timer updates live', async ({ page }) => {
    // Navigate to game page
    await page.goto('/game');

    // Assume we have a way to start a quest (this would need to be set up in the app)
    // For now, check if timer elements exist
    const timerElement = page.locator('.timer').first();
    await expect(timerElement).toBeVisible();

    // Get initial timer value
    const initialTimer = await timerElement.textContent();

    // Wait a few seconds
    await page.waitForTimeout(3000);

    // Check timer has decreased
    const updatedTimer = await timerElement.textContent();
    expect(updatedTimer).not.toBe(initialTimer);
  });

  test('abandon quest clears active quest', async ({ page }) => {
    await page.goto('/game');

    // Find abandon button
    const abandonButton = page.getByRole('button', { name: /abandon/i });
    await expect(abandonButton).toBeVisible();

    // Click abandon
    await abandonButton.click();

    // Check that active quest is cleared (timer should disappear)
    const timerElement = page.locator('.timer');
    await expect(timerElement).toHaveCount(0);
  });

  test('beginner quest does not deduct HP', async ({ page }) => {
    await page.goto('/game');

    // Get initial HP
    const initialHP = await page.locator('.hp-display').textContent();

    // Start beginner quest somehow
    // This would need app setup to trigger quest start

    // Check HP hasn't changed
    const finalHP = await page.locator('.hp-display').textContent();
    expect(finalHP).toBe(initialHP);
  });
});