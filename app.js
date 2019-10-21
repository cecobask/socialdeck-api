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

// Connect to the local MongoDB instance.
mongoose.connect('mongodb://localhost:27017/usersDb', {
    useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true
}).then(db => {
    const conn = db.connection;
    console.log(`Connected to database ['${conn.name}'] at ${conn.host}:${conn.port}`);
}).catch(err => {
    throw new Error(err);
});

const app = express();
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
app.use(function (err, req, res, next) {
    // Set locals, only providing error in development.
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // Render the error page.
    res.status(err.status || 500);
    res.render('error');
});

app.listen({port: 4000}, () =>
    console.log(`🚀🚀🚀🚀Server ready at http://localhost:4000${server.graphqlPath}`)
);

// Generates context for each request sent to the API.
const context = ({req}) => {
    // Authorization header, if present.
    const authorization = req.headers.authorization || '';
    try {
        // Return user object if token is valid.
        return jwt.verify(authorization.split(' ')[1], 'secret!');
    } catch (e) {}
};

// Create an Apollo server with specified typeDefs & resolvers + context.
const server = new ApolloServer({
    schema,
    context
});
server.applyMiddleware({app});