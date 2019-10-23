const {importSchema} = require('graphql-import');
const {makeExecutableSchema} = require('graphql-tools');
const resolvers = require('./resolvers');
const typeDefs = importSchema('schema/typeDefs.graphql');

module.exports = makeExecutableSchema({
    resolvers,
    typeDefs,
});