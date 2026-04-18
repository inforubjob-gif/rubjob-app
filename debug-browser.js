const puppeteer = require('puppeteer-core');

(async () => {
    try {
        const browser = await puppeteer.connect({
            browserWSEndpoint: 'ws://localhost:9222/devtools/browser', // Or launch a new one if chromium exists
        });
    } catch (e) {
        // Fallback to fetch Chromium or just require puppeteer
        console.log("Error connecting, trying to launch standard puppeteer...");
        const browser = await require('puppeteer').launch({ headless: 'new' });
        const page = await browser.newPage();
        
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('BROWSER_ERROR:', msg.text());
            }
        });

        page.on('pageerror', err => {
            console.log('PAGE_ERROR:', err.toString());
        });

        await page.goto('http://localhost:3000/booking', { waitUntil: 'networkidle0' });
        
        // Wait a bit just in case
        await new Promise(r => setTimeout(r, 2000));
        await browser.close();
    }
})();
