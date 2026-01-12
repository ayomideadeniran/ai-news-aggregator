const express = require('express');
const { getTrendingNews, searchNews, saveArticle, getSavedArticles } = require('../controllers/newsController');

const router = express.Router();

router.get('/', getTrendingNews);
router.get('/search', searchNews);
router.post('/save', saveArticle);
router.get('/saved', getSavedArticles);

module.exports = router;