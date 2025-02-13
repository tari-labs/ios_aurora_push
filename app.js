const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('pino-http');
const middleware = require('./middleware');

const indexRouter = require('./routes/index');
const registerRouter = require('./routes/register');
const sendRouter = require('./routes/send');
const cancelRouter = require('./routes/cancel_reminders');
const adminRouter = require('./routes/admin');
const healthRouter = require('./routes/health');
const firebaseRouter = require('./routes/sendFirebase');

const app = express();

// Setup middleware
app.use(middleware.create_env);
app.use(logger());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/register', registerRouter);
app.use('/send', sendRouter);
app.use('/send-firebase', firebaseRouter);
app.use('/cancel-reminders', cancelRouter);
app.use('/super-duper-only', adminRouter);
app.use('/health', healthRouter);

app.use(function (err, _req, res, next) {
    if (res.headersSent) {
        return next(err);
    }
    console.error(err);
    return res.json(err);
});
module.exports = app;
