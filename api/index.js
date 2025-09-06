const express = require('express');
const puppeteer = require('puppeteer');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');

  let browser;
  
  try {
    console.log('Starting to scrape NCA news...');
    
    // Launch browser with Chrome executable path for Vercel
    browser = await puppeteer.launch({ 
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--single-process',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    await page.goto('https://nca.gov.sa/en/news', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000 
    });

    await page.waitForSelector('.card-body', { timeout: 5000 });

    const items = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('.card-body'));
      return nodes.slice(0, 5).map((node, index) => {
        const title = node.querySelector('h3')?.innerText?.trim();
        const linkElement = node.querySelector('a');
        const link = linkElement?.href;
        const desc = node.querySelector('p')?.innerText?.trim();
        
        if (title && link) {
          return { 
            title, 
            link: link.startsWith('http') ? link : `https://nca.gov.sa${link}`,
            desc: desc || 'No description available',
            pubDate: new Date().toUTCString()
          };
        }
        return null;
      }).filter(item => item !== null);
    });

    const rssItems = items.map(item => `
    <item>
      <title><![CDATA[${item.title}]]></title>
      <link>${item.link}</link>
      <description><![CDATA[${item.desc}]]></description>
      <pubDate>${item.pubDate}</pubDate>
    </item>`).join('\n');

    const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>NCA News Feed</title>
    <link>https://nca.gov.sa/en/news</link>
    <description>Automated RSS feed from NCA</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${rssItems}
  </channel>
</rss>`;

    res.send(rssFeed);
    
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    res.status(500).json({ 
      error: 'Failed to generate RSS feed', 
      message: error.message 
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
