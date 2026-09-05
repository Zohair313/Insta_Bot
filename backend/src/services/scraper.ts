import { chromium, Browser, Page } from 'playwright';
import path from 'path';

export interface ReelDocument {
  reelUrl: string;
  caption: string;
  transcript?: string;
  tags: string[];
  embedding?: number[];
  createdAt: Date;
}

/**
 * Opens a visible browser for the user to manually log in and saves the session.
 */
export async function loginAndSaveSession(): Promise<void> {
  const userDataDir = path.resolve(__dirname, '../../.playwright-session');
  
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false, // Visible browser so user can log in
    viewport: { width: 1280, height: 720 },
  });

  const page = context.pages()[0] || await context.newPage();
  
  console.log('Navigating to Instagram login...');
  await page.goto('https://www.instagram.com/');

  console.log('Please log in to Instagram in the opened browser window.');
  console.log('Waiting for successful login (detecting feed)...');

  // Wait for an element that only appears after login, e.g., the home icon or feed
  try {
    await page.waitForSelector('svg[aria-label="Home"]', { timeout: 120000 }); // Wait up to 2 minutes
    console.log('Login successful! Saving session...');
  } catch (error) {
    console.log('Login wait timed out or failed.');
  }

  await context.close();
}

/**
 * Scrapes saved reels from Instagram using an authenticated session.
 */
export async function scrapeSavedReels(username: string): Promise<ReelDocument[]> {
  const userDataDir = path.resolve(__dirname, '../../.playwright-session');
  
  // Launch persistent context (headless can be true for scraping)
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false, // Keeping it false for debugging, can be true later
    viewport: { width: 1280, height: 720 },
  });

  const page = context.pages()[0] || await context.newPage();

  console.log('Navigating to Instagram...');
  await page.goto(`https://www.instagram.com/${username}/saved/all-posts/`);

  await page.waitForLoadState('networkidle');

  const scrapedReels: ReelDocument[] = [];

  // TODO: Add actual scraping logic here (scrolling and extracting reels)
  console.log('Scraping logic to be implemented here');

  await context.close();
  return scrapedReels;
}
