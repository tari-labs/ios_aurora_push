const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const middleware = require('./middleware');

const indexRouter = require('./routes/index');
const registerRouter = require('./routes/register');
const adminRouter = require('./routes/admin');

const app = express();

// Setup middleware
app.use(middleware.create_env);
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/register', registerRouter);
app.use('/super-duper-only', adminRouter);

module.exports = app;
