const express = require('express');
const {ApolloServer} = require('apollo-server-express');
const schema = require('./schema');
const server = new ApolloServer({schema});
const app = express();
const mongoose = require('mongoose');

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
server.applyMiddleware({app});
app.listen({port: 4000}, () =>
    console.log(`🚀🚀🚀🚀Server ready at http://localhost:4000${server.graphqlPath}`)
);