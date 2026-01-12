require('dotenv').config();
const { fetchRedditNews } = require('../src/services/fetchers/reddit');
const { fetchHackerNews } = require('../src/services/fetchers/hackernews');
const { fetchNewsData } = require('../src/services/fetchers/newsdata');

describe('Manual Fetchers', () => {
  test('should fetch Reddit news', async () => {
    const reddit = await fetchRedditNews();
    expect(Array.isArray(reddit)).toBe(true);
    if (reddit.length > 0) {
      expect(reddit[0]).toHaveProperty('title');
    }
  }, 30000);

  test('should fetch HackerNews', async () => {
    const hn = await fetchHackerNews();
    expect(Array.isArray(hn)).toBe(true);
    if (hn.length > 0) {
      expect(hn[0]).toHaveProperty('title');
    }
  }, 30000);

  test('should fetch NewsData', async () => {
    const nd = await fetchNewsData();
    if (nd) {
      expect(Array.isArray(nd)).toBe(true);
      if (nd.length > 0) {
        expect(nd[0]).toHaveProperty('title');
      }
    }
  }, 30000);
});