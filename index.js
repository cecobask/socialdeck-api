const express = require('express');
const {ApolloServer} = require('apollo-server-express');
const schema = require('./schema');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

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