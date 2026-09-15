import { chromium, Browser, Page } from 'playwright';
import path from 'path';
import { loadSettings } from './settings';
import { LocalReel, writeLocalReels } from './localStore';

export interface ReelDocument {
  reelUrl: string;
  caption: string;
  transcript?: string;
  tags: string[];
  embedding?: number[];
  createdAt: Date;
}

/**
 * Opens a visible browser and logs in to Instagram.
 * If stored credentials exist, they are auto-filled; otherwise manual login is expected.
 */
export async function loginAndSaveSession(username?: string, password?: string): Promise<void> {
  const userDataDir = path.resolve(__dirname, '../../.playwright-session');
  
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false, // Visible browser so user can log in
    viewport: { width: 1280, height: 720 },
  });

  const page = context.pages()[0] || await context.newPage();
  
  await page.goto('https://www.instagram.com/accounts/login/');

  if (username && password) {
    console.log(`Auto-filling credentials for @${username}...`);
    try {
      await page.waitForSelector('input[name="username"]', { timeout: 30000 });
      await page.fill('input[name="username"]', username);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
    } catch (e) {
      console.log('Could not auto-fill the login form:', e);
    }

    console.log('Waiting for successful login (detecting feed)...');
    try {
      await page.waitForSelector('svg[aria-label="Home"]', { timeout: 60000 });
      console.log('Auto login successful! Saving session...');
    } catch (error) {
      console.log('Auto login wait timed out. If a checkpoint appeared, you may need to complete it manually.');
    }
  } else {
    console.log('Please log in manually in the opened browser window.');
    console.log('Waiting for successful login (detecting feed)...');
    try {
      await page.goto('https://www.instagram.com/');
      await page.waitForSelector('svg[aria-label="Home"]', { timeout: 120000 });
      console.log('Login successful! Saving session...');
    } catch (error) {
      console.log('Login wait timed out or failed.');
    }
  }

  await context.close();
}

/**
 * Extracts the best caption text available in the current page's meta tags.
 * Note: only non-function declarations are allowed inside page.evaluate —
 * esbuild's __name helper (keepNames) wraps local function expressions and
 * throws ReferenceError inside the browser.
 */
async function extractCaption(page: Page): Promise<string> {
  const candidates = await page.evaluate(() => {
    const desc = document.querySelector('meta[name="description"]');
    const ogd = document.querySelector('meta[property="og:description"]');
    const ogd2 = document.querySelector('meta[name="og:description"]');
    const vals: string[] = [document.title || ''];
    if (desc) vals.push((desc.getAttribute('content') || '').trim());
    if (ogd) vals.push((ogd.getAttribute('content') || '').trim());
    if (ogd2) vals.push((ogd2.getAttribute('content') || '').trim());
    return vals;
  });

  let best = '';
  for (const c of candidates) {
    if (c.length > best.length) best = c;
  }
  return best;
}

function extractTags(caption: string): string[] {
  const tags = caption.match(/#(\w+)/g) || [];
  return [...new Set(tags.map(t => t.replace('#', '')))];
}

/**
 * Scrapes saved posts/reels from Instagram using an authenticated session.
 * Opens the saved collection page, scrolls to load items, then visits each
 * item to extract its caption/tags. Results are written to saved_reels.json.
 */
export async function scrapeSavedReels(username: string, maxItems = 25): Promise<LocalReel[]> {
  const userDataDir = path.resolve(__dirname, '../../.playwright-session');

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false, // Visible browser is more reliable with Instagram
    viewport: { width: 1280, height: 720 },
  });

  try {
    const page = context.pages()[0] || await context.newPage();

    const savedUrl = `https://www.instagram.com/${encodeURIComponent(username)}/saved/all-posts/`;
    console.log(`Navigating to ${savedUrl}`);
    await page.goto(savedUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // If redirected to login, the session is not valid.
    if (page.url().includes('login') || (await page.locator('input[name="username"]').count()) > 0) {
      throw new Error('Not logged in to Instagram. Please login first (sidebar > Login to Instagram).');
    }

    // Wait for the saved posts grid to render.
    try {
      await page.waitForSelector('a[href*="/reel/"], a[href*="/p/"]', { timeout: 45000 });
    } catch {
      console.log('No saved posts found on the saved page.');
      await context.close();
      return [];
    }

    // Scroll to load more saved items and collect their URLs.
    const urls = new Set<string>();
    for (let i = 0; i < 20; i++) {
      await page.evaluate(() => window.scrollBy(0, 1200));
      await page.waitForTimeout(800);

      const found = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a[href*="/reel/"], a[href*="/p/"]'))
          .map(a => (a as HTMLAnchorElement).href)
          .filter(h => !h.includes('/reels/audio/'))
      );
      found.forEach(u => urls.add(u));
      if (urls.size >= maxItems) break;
    }

    const allUrls = [...urls].slice(0, maxItems);
    console.log(`Found ${allUrls.length} saved post/reel URLs. Extracting captions...`);

    const items: LocalReel[] = [];
    for (const url of allUrls) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(1200);
        const caption = await extractCaption(page);
        const productType = url.includes('/reel/') ? 'clips' : 'post';

        items.push({
          reelUrl: url,
          caption: caption || 'No caption available',
          tags: extractTags(caption),
          product_type: productType,
          audio_name: '',
          transcript: '',
          createdAt: new Date().toISOString(),
        });
      } catch (e) {
        console.log(`Skipping ${url}:`, e);
      }
    }

    if (items.length > 0) {
      writeLocalReels(items);
      console.log(`Saved ${items.length} reels to saved_reels.json`);
    }

    return items;
  } finally {
    await context.close();
  }
}
