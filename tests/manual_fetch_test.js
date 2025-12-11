require('dotenv').config();
const { fetchRedditNews } = require('../src/services/fetchers/reddit');
const { fetchHackerNews } = require('../src/services/fetchers/hackernews');
const { fetchNewsData } = require('../src/services/fetchers/newsdata');

async function testAll() {
  console.log('--- Testing Reddit ---');
  const reddit = await fetchRedditNews();
  console.log(reddit[0]); // Print first item to verify structure

  console.log('\n--- Testing HackerNews ---');
  const hn = await fetchHackerNews();
  console.log(hn[0]);

  console.log('\n--- Testing NewsData ---');
  const nd = await fetchNewsData();
  console.log(nd[0]);
}

testAll();