import { Router } from 'express';
import { BehaviourController } from './behaviour.controller';

const router = Router();

// Rating scales
router.get('/rating-scale', BehaviourController.getRatingScale);
router.put('/rating-scale', BehaviourController.updateRatingScale);

// Traits configuration
router.get('/behaviour-traits', BehaviourController.getTraits);
router.post('/behaviour-traits', BehaviourController.createTrait);
router.put('/behaviour-traits/:id', BehaviourController.updateTrait);
router.delete('/behaviour-traits/:id', BehaviourController.deleteTrait);

// Ratings
router.get('/behaviour-ratings', BehaviourController.getRatings);
router.post('/behaviour-ratings/bulk', BehaviourController.bulkUpsertRatings);

// Observations
router.get('/observations', BehaviourController.getObservations);
router.post('/observations/bulk', BehaviourController.bulkUpsertObservations);

// Observation canned phrases
router.get('/observation-phrases', BehaviourController.getPhrases);
router.post('/observation-phrases', BehaviourController.createPhrase);
router.delete('/observation-phrases/:id', BehaviourController.deletePhrase);

// Reports
router.get('/reports/behaviour/domain', BehaviourController.getDomainReport);

export default router;
