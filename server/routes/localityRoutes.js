import express from 'express';
import { 
    getLocalityInsights, 
    getSimilarLocalities, 
    getRecommendations,
    getLocalitiesByCity,
    getPopularLocalities,
    searchLocalities,
    getPriceTrends,
    getLocalityReviews 
} from '../controllers/localityController.js';

const router = express.Router();

// List and search
router.get('/search', searchLocalities);
router.get('/popular', getPopularLocalities);
router.get('/city/:city', getLocalitiesByCity);

// Single locality details
router.get('/insights', getLocalityInsights);
router.get('/trends/:locality', getPriceTrends);
router.get('/reviews/:locality', getLocalityReviews);

// Recommendations
router.get('/similar', getSimilarLocalities);
router.get('/recommendations', getRecommendations);

export default router;
