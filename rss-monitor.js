const Parser = require('rss-parser');
const { getAsync, allAsync, runAsync } = require('./db');
const whatsappBot = require('./whatsapp-bot');

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
  },
});

class RssMonitor {
  constructor() {
    this.interval = null;
  }

  async start() {
    const config = await getAsync('SELECT * FROM rss_config WHERE id = 1');
    if (!config) return;
    const minutes = config.check_interval_minutes || 10;
    this.stop();
    if (minutes > 0) {
      this.interval = setInterval(() => this.checkAll(), minutes * 60 * 1000);
    }
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async restart() {
    await this.start();
  }

  async checkAll() {
    const sources = await allAsync('SELECT * FROM rss_sources WHERE active = 1');
    const results = [];
    for (const source of sources) {
      try {
        const count = await this.checkSource(source);
        results.push({ source: source.name, count });
      } catch (err) {
        results.push({ source: source.name, error: err.message });
      }
    }
    return results;
  }

  async checkSource(source) {
    const feed = await parser.parseURL(source.feed_url);
    const keywords = await allAsync('SELECT * FROM rss_keywords WHERE active = 1');
    const existingGuids = new Set(
      (await allAsync('SELECT guid FROM rss_fetched_articles WHERE source_id = ?', [source.id]))
        .map(r => r.guid)
    );
    let count = 0;

    for (const item of feed.items) {
      const guid = item.guid || item.link;
      if (!guid || existingGuids.has(guid)) continue;

      if (keywords.length > 0) {
        const matchedKeywords = keywords.filter(k =>
          this.matchKeyword(item, k.keyword)
        );

        if (matchedKeywords.length > 0) {
          const keywordNames = matchedKeywords.map(k => k.keyword).join(', ');
          await runAsync(
            'INSERT OR IGNORE INTO rss_fetched_articles (source_id, guid, title, link, published_at, matched_keywords, found_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now","localtime"))',
            [source.id, guid, item.title, item.link, item.pubDate || item.isoDate || '', keywordNames]
          );
          await this.sendAlert(item, source, keywordNames);
          count++;
        }
      } else {
        await runAsync(
          'INSERT OR IGNORE INTO rss_fetched_articles (source_id, guid, title, link, published_at, matched_keywords, found_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now","localtime"))',
          [source.id, guid, item.title, item.link, item.pubDate || item.isoDate || '', 'Todas']
        );
        await this.sendAlert(item, source, 'Todas');
        count++;
      }
    }

    return count;
  }

  matchKeyword(item, keyword) {
    const kw = keyword.toLowerCase();
    const text = `${item.title || ''} ${item.contentSnippet || ''} ${item.content || ''}`.toLowerCase();
    return text.includes(kw);
  }

  async sendAlert(item, source, keywords) {
    const config = await getAsync('SELECT * FROM rss_config WHERE id = 1');
    if (!config || !config.whatsapp_active) return;
    if (!config.whatsapp_phone) return;
    if (!whatsappBot.ready) return;

    const message = `🔔 NOVA NOTICIA\n\n*Fonte:* ${source.name}\n*Titulo:* ${item.title}\n*Palavras:* ${keywords}\n*Link:* ${item.link}`;

    try {
      await whatsappBot.sendMessage(config.whatsapp_phone, message);
    } catch (err) {
      console.error('WhatsApp send error:', err.message);
    }
  }
}

module.exports = new RssMonitor();
