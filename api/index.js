const express = require('express');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  try {
    console.log('Fetching NCA news...');
    
    const response = await fetch('https://nca.gov.sa/en/news', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Debug: Let's see what's actually on the page
    const debugInfo = {
      pageTitle: $('title').text(),
      cardBodies: $('.card-body').length,
      allCards: $('[class*="card"]').length,
      allArticles: $('article').length,
      allNews: $('[class*="news"]').length,
      allItems: $('[class*="item"]').length,
      bodyClasses: $('body').attr('class'),
      firstFewElements: []
    };
    
    // Get first 10 elements with common news-related classes
    $('div, article, section').each((i, el) => {
      if (i < 10) {
        const className = $(el).attr('class');
        const text = $(el).text().substring(0, 100);
        if (className && className.includes('card')) {
          debugInfo.firstFewElements.push({
            tag: el.tagName,
            class: className,
            text: text
          });
        }
      }
    });
    
    res.json(debugInfo);
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch page', message: error.message });
  }
};
