const express = require('express');
const { getTrendingNews, searchNews } = require('../controllers/newsController');

const router = express.Router();

router.get('/', getTrendingNews);
router.get('/search', searchNews);

module.exports = router;