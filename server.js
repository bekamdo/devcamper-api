const express = require("express");
const dotenv = require("dotenv");
const morgan = require("morgan");
const colors = require("colors");
const mongoSanitize = require("express-mongo-sanitize");
const cookieParser = require("cookie-parser");
const path = require("path");
const helmet = require("helmet");
const xss = require("xss-clean");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const cors = require("cors");
const fileupload = require("express-fileupload");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/error");

//load vars
dotenv.config({ path: "./config/config.env" });

//connect to database
connectDB();
//routes
const bootcamps = require("./routes/bootcamps");
const courses = require("./routes/courses");
const reviews = require("./routes/reviews");
const auth = require("./routes/auth");
const users = require("./routes/user");

const app = express();

//body parser
app.use(express.json());
// cookie parser
app.use(cookieParser());
// dev logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
// file uploading
app.use(fileupload());

//sanitize data
app.use(mongoSanitize());

//set security headers
app.use(helmet());

//prevent xss attacks
app.use(xss());

//rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10  min
  max: 100,
});
app.use(limiter);
//prevent http param polution
app.use(hpp());
//enable cors
app.use(cors());
//set static folder
app.use(express.static(path.join(__dirname, "public")));
//Mount routers
app.use("/api/v1/bootcamps", bootcamps);
app.use("/api/v1/courses", courses);
app.use("/api/v1/auth", auth);
app.use("/api/v1/users", users);
app.use("/api/v1/reviews", reviews);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(
    `Server running on ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold
  );
});

//handle unhandled  promise rejection
process.on("unhandledRejection", (error, promise) => {
  console.log(`Error:${error.message}`.red);
  //close server and exit process
  server.close(() => process.exit(1));
});
