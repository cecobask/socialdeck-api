const express = require('express');
const {ApolloServer} = require('apollo-server-express');
const schema = require('./schema');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const logger = require('morgan');
const path = require('path');
const createError = require('http-errors');
const cookieParser = require('cookie-parser');
const indexRouter = require('./routes/index');
const https = require('https');
const http = require('http');
const fs = require('fs');

const configurations = {
    production: { ssl: true, port: 7000, hostname: 'localhost' },
    development: { ssl: false, port: 4000, hostname: 'localhost' }
};
const environment = process.env.NODE_ENV || 'production';
const config = configurations[environment];

// Generates context for each request sent to the API.
const context = ({req}) => {
    // Authorization header, if present.
    const authorization = req.headers.authorization || '';
    try {
        // Return user object if token is valid.
        return jwt.verify(authorization.split(' ')[1], 'secret!');
        // eslint-disable-next-line no-empty
    } catch (e) {}
};
// Creates an Apollo server with specified typeDefs & resolvers + context.
const apollo = new ApolloServer({
    schema,
    context,
    introspection: true,
    playground: true
});

const app = express();
apollo.applyMiddleware({app});

// Creates the HTTPS or HTTP server, per configuration.
let server;
if (config.ssl) 
    // Assumes certificates are in a .ssl folder of the package root.
    server = https.createServer(
        {
            key: fs.readFileSync('./.ssl/server.key'),
            cert: fs.readFileSync('./.ssl/server.cert')
        },
        app
    );
else 
    server = http.createServer(app);

server.listen({port: config.port}, () =>
    console.log(`Server ready at http${config.ssl ? 's' : ''}://${config.hostname}:${config.port}${apollo.graphqlPath}`)
);


// Connect to the local MongoDB instance.
mongoose.connect('mongodb://localhost:27017/usersDb', {
    useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true
}).then(db => {
    const conn = db.connection;
    console.log(`Connected to database ['${conn.name}'] at ${conn.host}:${conn.port}`);
}).catch(err => {
    throw new Error(err);
});

app.use(express.json());
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', indexRouter);

// Catch 404 and forward to error handler.
app.use(function (req, res, next) {
    if (req.url === '/graphql') next();
    else next(createError(404));
});

// Error handler.
app.use(function (err, req, res) {
    // Set locals, only providing error in development.
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // Render the error page.
    res.status(err.status || 500);
    res.render('error');
});