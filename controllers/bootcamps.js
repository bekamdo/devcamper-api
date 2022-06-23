const ErrorResponse = require("../utils/errorResponse");
const path = require("path");
const Bootcamp = require("./../models/Bootcamp");
const geocoder = require("./../utils/geocoder");
const asyncHandler = require("./../middleware/async");

// @desc get all bootcamps
//@route GET /api/v1/bootcamps
//@access public
exports.getBootCamps = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});
// @desc get  bootcamp
//@route GET /api/v1/bootcamps/:id
//@access public
exports.getBootCamp = asyncHandler(async (req, res, next) => {
  const bootcamp = await Bootcamp.findById(req.params.id);
  if (!bootcamp) {
    return next(
      new ErrorResponse(
        `Bootcamp not found with with id of ${req.params.id}`,
        404
      )
    );
  }
  res.status(200).json({ success: true, data: bootcamp });
});

// @desc create new bootcamp
//@route POST /api/v1/bootcamps
//@access private
exports.createBootCamp = asyncHandler(async (req, res, next) => {
  // add user to req.body
  req.body.user = req.user.id;

  // check for public bootcamps
  const publishedBootcamp = await Bootcamp.findOne({ user: req.user.id });

  //if the user is an admin they can only add one bootcamp
  if (publishedBootcamp && req.user.role !== "admin") {
    return next(
      new ErrorResponse(
        `The user with id ${req.user.id} has already published a bootcamp`,
        400
      )
    );
  }

  const bootcamp = await Bootcamp.create(req.body);
  res.status(201).json({
    success: true,
    data: bootcamp,
  });
});

// @desc update bootcamp
//@route PUT /api/v1/bootcamp/:id
//@access private
exports.updateBootCamp = asyncHandler(async (req, res, next) => {
  let bootcamp = await Bootcamp.findById(req.params.id);
  if (!bootcamp) {
    return next(
      new ErrorResponse(
        `Bootcamp not found with with id of ${req.params.id}`,
        404
      )
    );
  }
  //make sure user is bootcamp owner
  if (bootcamp.user.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new ErrorResponse(
        `User ${req.params.id} is not authorized to update this bootcamp`,
        401
      )
    );
  }
  bootcamp = await Bootcamp.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, data: bootcamp });
});

// @desc delete bootcamp
//@route DELETE /api/v1/bootcamp/:id
//@access private
exports.deleteBootCamp = asyncHandler(async (req, res, next) => {
  const bootcamp = await Bootcamp.findById(req.params.id);
  if (!bootcamp) {
    return next(
      new ErrorResponse(
        `Bootcamp not found with with id of ${req.params.id}`,
        404
      )
    );
  }
  if (bootcamp.user.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new ErrorResponse(
        `User ${req.params.id} is not authorized to delete this bootcamp`,
        401
      )
    );
  }
  bootcamp.remove();
  res.status(200).json({ success: true, data: {} });
});

// @desc get a bootcamp within a given redius
//@route GET /api/v1/bootcamp/raduis/:zipcode/:distance
//@access private
exports.getBootCampsInRadius = asyncHandler(async (req, res, next) => {
  const { zipcode, distance } = req.params;

  //get latidute and longitude from geocoder
  const loc = await geocoder.geocode(zipcode);
  const lat = loc[0].latitude;
  const lng = loc[0].longitude;

  //Calc raduis using radians
  //divide distance by raduis of earth
  //Earth radius = 3,963 miles /6,378 km
  const radius = distance / 6378;
  const bootcamps = await Bootcamp.find({
    location: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });
  res.status(200).json({
    success: true,
    count: bootcamps.length,
    data: bootcamps,
  });
});

// @desc upload photo for bootcamp
//@route PUT /api/v1/bootcamp/:id/photo
//@access private
exports.bootcampPhotoUpload = asyncHandler(async (req, res, next) => {
  const bootcamp = await Bootcamp.findById(req.params.id);
  if (!bootcamp) {
    return next(
      new ErrorResponse(
        `Bootcamp not found with with id of ${req.params.id}`,
        404
      )
    );
  }
  if (!req.files) {
    return next(new ErrorResponse(`Please upload a file`, 400));
  }
  if (bootcamp.user.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new ErrorResponse(
        `User ${req.params.id} is not authorized to update this bootcamp`,
        401
      )
    );
  }
  const file = req.files.file;
  //make sure the image is a photo
  if (!file.mimetype.startsWith("image")) {
    return next(new ErrorResponse(`Please upload an Image file`, 400));
  }
  //check file size
  if (file.size > process.env.MAX_FILE_UPLOAD) {
    return next(
      new ErrorResponse(
        `Please upload an image less than ${process.env.MAX_FILE_UPLOAD}`,
        400
      )
    );
  }
  //create custom filename
  file.name = `photo_${bootcamp._id}${path.parse(file.name).ext}`;
  file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async (err) => {
    if (err) {
      console.log(err);
      return next(new ErrorResponse(`Problem with file upload`, 500));
    }
    await Bootcamp.findByIdAndUpdate(req.params.id, { photo: file.name });
    res.status(200).json({
      success: true,
      data: file.name,
    });
  });
});
