var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var session = require("express-session");
var flash = require("connect-flash");
const fileUpload = require("express-fileupload");

const { Pool } = require("pg");
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "olxdb",
  password: "12345",
  port: 5432,
});

var adsRouter = require("./routes/ads")(pool);
var indexRouter = require("./routes/index")(pool);
var categoriesRouter = require("./routes/categories")(pool);
var usersRouter = require("./routes/users")(pool);
// var homeRouter = require("./routes/home")(pool);

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
// set view engine as EJS
// app.engine("html", require("ejs").renderFile);

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(flash());
app.use(fileUpload());
app.use(
  session({
    secret: `rubicamp`,
    // ini salt untuk session

    resave: true,
    // kalau ga pake resave jadi muncul deprecated undefined di nodemon pas refreshnya

    saveUninitialized: true,
  })
);

// Require static assets form public folder
app.use(express.static(path.join(__dirname, "public")));

// ini buat path
app.use("/", indexRouter);
app.use("/ads", adsRouter);
app.use("/categories", categoriesRouter);
app.use("/users", usersRouter);
// app.use("/home", homeRouter);
// app.use("/login", indexRouter);
// app.use("/register", indexRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
