const express = require('express');
const {ApolloServer} = require('apollo-server-express');
const schema = require('./schema');
const mongoose = require('mongoose');
const logger = require('morgan');
const path = require('path');
const createError = require('http-errors');
const cookieParser = require('cookie-parser');
const indexRouter = require('./routes/index');
const https = require('https');
const http = require('http');
const fs = require('fs');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const cors = require('cors');
const {
          mongoUsername,
          mongoPassword,
          mongoDatabaseName,
      } = require('./mongoDbCloudCredentials');

// Connect to a cloud MongoDB instance.
const connString = `mongodb+srv://${mongoUsername}:${mongoPassword}@mongocluster-yevae.mongodb.net/${mongoDatabaseName}?retryWrites=true&w=majority`;
mongoose.connect(connString, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: false,
    })
    .then(db => {
        const conn = db.connection;
        console.log(
            `Connected to database ['${mongoDatabaseName}'] at ${conn.host}:${conn.port}`);
    })
    .catch(err => {
        throw new Error(err);
    });

const configurations = {
    production: {
        ssl: true,
        port: 7000,
        hostname: 'localhost',
    },
    development: {
        ssl: false,
        port: 4000,
        hostname: 'localhost',
    },
};
const environment = process.env.NODE_ENV || 'production';
const config = configurations[environment];

const app = express();
app.use(express.json());
app.use(cookieParser());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(express.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', indexRouter);
// Apply session middleware to Express, used for auth.
app.use(session({
    name: 'ebimumaykata',
    secret: 'secret!',
    resave: false,
    saveUninitialized: false,
    // Save Express sessions to MongoDB.
    store: new MongoStore({mongooseConnection: mongoose.connection}),
    cookie: {
        secure: false,
        maxAge: 60 * 60 * 1000, // 1 hour.
        httpOnly: false,
    },
}));
app.set('trust proxy', true);
app.use(cors({
    origin: true,
    credentials: true,
}));

// Creates an Apollo server with specified typeDefs & resolvers + context.
const apollo = new ApolloServer({
    schema,
    context: ({req, res}) => {
        const user = req.session.user;
        return {
            req,
            user,
            res,
        };
    },
    introspection: true,
    playground: true,
});

apollo.applyMiddleware({
    app,
    cors: false, // Disable Apollo's cors and use a custom one.
});

// Catch 404 and forward to error handler.
app.use(function(req, res, next) {
    if (req.url === '/graphql') next();
    else next(createError(404));
});

// Error handler.
app.use(function(err, req, res) {
    // Set locals, only providing error in development.
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    
    // Render the error page.
    res.status(err.status || 500);
    res.render('error');
});

// Creates the HTTPS or HTTP server, per configuration.
let server;
if (config.ssl)
// Assumes certificates are in a .ssl folder of the package root.
    server = https.createServer(
        {
            key: fs.readFileSync('./.ssl/server.key'),
            cert: fs.readFileSync('./.ssl/server.cert'),
        },
        app,
    );
else
    server = http.createServer(app);

server.listen({port: config.port}, () =>
    console.log(`Server ready at http${config.ssl
        ? 's'
        : ''}://${config.hostname}:${config.port}${apollo.graphqlPath}`),
);