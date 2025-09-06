const express = require('express');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');

  try {
    console.log('Fetching NCA news...');
    
    const response = await fetch('https://nca.gov.sa/en/news', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const items = [];
    
    // Try multiple selectors to find news items
    const selectors = [
      '.news-item',
      '.post',
      'article',
      '.content',
      '[class*="news"]',
      '[class*="post"]',
      '[class*="article"]',
      '.item',
      '.card',
      '.box',
      '.tile',
      'div[class*="news"]',
      'div[class*="post"]',
      'div[class*="item"]',
      'div[class*="card"]'
    ];
    
    for (const selector of selectors) {
      const elements = $(selector);
      console.log(`Trying selector "${selector}": found ${elements.length} elements`);
      
      if (elements.length > 0) {
        elements.each((index, element) => {
          if (index >= 10) return false; // Limit to 10 items
          
          const $el = $(element);
          const title = $el.find('h1, h2, h3, h4, .title, [class*="title"]').first().text().trim();
          const link = $el.find('a').first().attr('href');
          const desc = $el.find('p, .description, [class*="desc"], [class*="content"]').first().text().trim();
          
          if (title && link) {
            items.push({
              title,
              link: link.startsWith('http') ? link : `https://nca.gov.sa${link}`,
              desc: desc || 'No description available',
              pubDate: new Date().toUTCString(),
              guid: `nca-${index}-${Date.now()}`
            });
          }
        });
        
        if (items.length > 0) {
          console.log(`Found ${items.length} items with selector "${selector}"`);
          break;
        }
      }
    }
    
    // If still no items, try to find any clickable elements with text
    if (items.length === 0) {
      console.log('Trying fallback: looking for any clickable elements with text');
      $('a').each((index, element) => {
        if (index >= 10) return false;
        
        const $el = $(element);
        const title = $el.text().trim();
        const link = $el.attr('href');
        
        if (title && link && title.length > 10 && title.length < 200) {
          const newsKeywords = ['news', 'update', 'announcement', 'press', 'release', 'statement'];
          const hasNewsKeyword = newsKeywords.some(keyword => 
            title.toLowerCase().includes(keyword)
          );
          
          if (hasNewsKeyword || title.length > 20) {
            items.push({
              title,
              link: link.startsWith('http') ? link : `https://nca.gov.sa${link}`,
              desc: 'No description available',
              pubDate: new Date().toUTCString(),
              guid: `nca-${index}-${Date.now()}`
            });
          }
        }
      });
    }
    
    // If still no items, create some sample items to ensure the feed works
    if (items.length === 0) {
      items.push({
        title: 'NCA News Feed - No recent articles found',
        link: 'https://nca.gov.sa/en/news',
        desc: 'This RSS feed is working but no recent articles were found on the NCA website.',
        pubDate: new Date().toUTCString(),
        guid: `nca-sample-${Date.now()}`
      });
    }
    
    console.log(`Total items found: ${items.length}`);

    const rssItems = items.map(item => `
    <item>
      <title><![CDATA[${item.title}]]></title>
      <link>${item.link}</link>
      <description><![CDATA[${item.desc}]]></description>
      <pubDate>${item.pubDate}</pubDate>
      <guid isPermaLink="false">${item.guid}</guid>
    </item>`).join('\n');

    const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>NCA News Feed</title>
    <link>https://nca.gov.sa/en/news</link>
    <description>Automated RSS feed from National Cybersecurity Authority (NCA) Saudi Arabia</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <pubDate>${new Date().toUTCString()}</pubDate>
    <ttl>60</ttl>
    <atom:link href="https://nca-rss-generator.vercel.app/rss" rel="self" type="application/rss+xml"/>
    <image>
      <url>https://nca.gov.sa/favicon.ico</url>
      <title>NCA News Feed</title>
      <link>https://nca.gov.sa/en/news</link>
    </image>
    ${rssItems}
  </channel>
</rss>`;

    res.send(rssFeed);
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to generate RSS feed' });
  }
};
