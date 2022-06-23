const express = require("express");
const router = express.Router();
const {
  getBootCamp,
  getBootCamps,
  createBootCamp,
  updateBootCamp,
  deleteBootCamp,
  getBootCampsInRadius,
  bootcampPhotoUpload,
} = require("../controllers/bootcamps");

const Bootcamp = require("./../models/Bootcamp");
const { protect, authorize } = require("./../middleware/auth");

const advancedResults = require("./../middleware/advancedResults");

// include other resource routers
const courseRouter = require("./courses");
const reviewRouter = require("./reviews");

//reroute into other resource routers
router.use("/:bootcampId/courses", courseRouter);
router.use("/:bootcampId/reviews", reviewRouter);

router.route("/radius/:zipcode/:distance").get(getBootCampsInRadius);
router
  .route("/:id/photo")
  .put(protect, authorize("publisher", "admin"), bootcampPhotoUpload);
router
  .route("/")
  .get(advancedResults(Bootcamp, "courses"), getBootCamps)
  .post(protect, authorize("publisher", "admin"), createBootCamp);
router
  .route("/:id")
  .get(getBootCamp)
  .put(protect, authorize("publisher", "admin"), updateBootCamp)
  .delete(protect, authorize("publisher", "admin"), deleteBootCamp);

module.exports = router;
