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
    $('.card-body').each((index, element) => {
      if (index >= 5) return false; // Limit to 5 items
      
      const title = $(element).find('h3').text().trim();
      const link = $(element).find('a').attr('href');
      const desc = $(element).find('p').text().trim();
      
      if (title && link) {
        items.push({
          title,
          link: link.startsWith('http') ? link : `https://nca.gov.sa${link}`,
          desc: desc || 'No description available',
          pubDate: new Date().toUTCString()
        });
      }
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
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to generate RSS feed' });
  }
};
