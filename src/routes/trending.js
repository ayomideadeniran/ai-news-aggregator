const express = require('express');
const { getTrendingNews } = require('../controllers/trendingController');

const router = express.Router();

router.get('/', getTrendingNews);

module.exports = router;