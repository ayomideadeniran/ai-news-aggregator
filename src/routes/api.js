// File: src/routes/api.js

const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');

// Route for fetching the highly scored trending articles
router.get('/trending', newsController.getTrendingNews);

// Route for searching the cached articles
router.get('/search', newsController.searchNews);

module.exports = router;

