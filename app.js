// File: app.js
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var CORS = require("cors");

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var skillSetInfoRouter = require("./routes/SkillSetInfo");
var empDetailsRouter = require("./routes/EmpDetails");
var employeeDetailsRouter = require("./routes/EmployeeDetails");
var AutoMailRouter=require("./routes/AutoMail");
var LMS_page=require("./routes/LMS-details");

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(CORS());
app.use("/files", express.static("files"));
app.use("/images", express.static("images"));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use("/employeePortal", empDetailsRouter);
app.use("/empPortal", skillSetInfoRouter);
app.use("/employeeDetails", employeeDetailsRouter);
app.use("/autoMail",AutoMailRouter);
app.use("/LMS-page",LMS_page);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
