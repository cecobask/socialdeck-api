const express = require('express');
const {ApolloServer} = require('apollo-server-express');
const schema = require('./schema');
const mongoose = require('mongoose');
const logger = require('morgan');
const path = require('path');
const createError = require('http-errors');
const cookieParser = require('cookie-parser');
const indexRouter = require('./routes/index');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const cors = require('cors');
const https = require('https');
require('dotenv')
    .config();

// Connect to a cloud MongoDB instance.
const connString = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@mongocluster-yevae.mongodb.net/${process.env.MONGO_DB_NAME}?retryWrites=true&w=majority`;
mongoose.connect(connString, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: false,
    })
    .then(db => {
        const conn = db.connection;
        console.log(
            `Connected to database ['${process.env.MONGO_DB_NAME}'] at ${conn.host}:${conn.port}`);
    })
    .catch(err => {
        throw new Error(err);
    });

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

// Create https server.
https.createServer({
        cert: process.env.SERVER_CERT,
        key: process.env.SERVER_KEY,
    },
    app)
    .listen({port: process.env.PORT || 7000}, () => {
            if (!process.env.ON_HEROKU)
                console.log(
                    `Server ready at https://localhost:7000${apollo.graphqlPath}`);
            else
                console.log(
                    `Server ready at ${process.env.HEROKU_APP_URL}${apollo.graphqlPath}`);
        },
    );