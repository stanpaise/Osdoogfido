const fs = require('fs').promises;

/**
 * Playwright ships as an npm package, but the actual browser binary it
 * drives (Chromium) is a separate download fetched by `npx playwright
 * install`. A fresh `npm install` alone leaves that binary missing, so the
 * slideshow video renderer fails at generation time instead of at startup
 * unless this is checked explicitly.
 */
async function checkPlaywrightChromium() {
  try {
    const { chromium } = require('playwright');
    await fs.access(chromium.executablePath());
    return true;
  } catch (error) {
    return false;
  }
}

function playwrightInstallHint() {
  return 'Chromium (used to render video slideshows) is not installed. Run: npx playwright install chromium';
}

module.exports = { checkPlaywrightChromium, playwrightInstallHint };
