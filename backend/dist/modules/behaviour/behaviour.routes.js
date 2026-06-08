"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const behaviour_controller_1 = require("./behaviour.controller");
const router = (0, express_1.Router)();
// Rating scales
router.get('/rating-scale', behaviour_controller_1.BehaviourController.getRatingScale);
router.put('/rating-scale', behaviour_controller_1.BehaviourController.updateRatingScale);
// Traits configuration
router.get('/behaviour-traits', behaviour_controller_1.BehaviourController.getTraits);
router.post('/behaviour-traits', behaviour_controller_1.BehaviourController.createTrait);
router.put('/behaviour-traits/:id', behaviour_controller_1.BehaviourController.updateTrait);
router.delete('/behaviour-traits/:id', behaviour_controller_1.BehaviourController.deleteTrait);
// Ratings
router.get('/behaviour-ratings', behaviour_controller_1.BehaviourController.getRatings);
router.post('/behaviour-ratings/bulk', behaviour_controller_1.BehaviourController.bulkUpsertRatings);
// Observations
router.get('/observations', behaviour_controller_1.BehaviourController.getObservations);
router.post('/observations/bulk', behaviour_controller_1.BehaviourController.bulkUpsertObservations);
// Observation canned phrases
router.get('/observation-phrases', behaviour_controller_1.BehaviourController.getPhrases);
router.post('/observation-phrases', behaviour_controller_1.BehaviourController.createPhrase);
router.delete('/observation-phrases/:id', behaviour_controller_1.BehaviourController.deletePhrase);
// Reports
router.get('/reports/behaviour/domain', behaviour_controller_1.BehaviourController.getDomainReport);
exports.default = router;
