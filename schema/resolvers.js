const User = require('../models/users');
const {ApolloError} = require('apollo-server-express');

const resolvers = {
    Query: {
        users() {
            return User.find({});
        },

        findUserById(parent, args) {
            return User.findById(args._id).then(user => {
                return user;
            }).catch(err => {
                throw new ApolloError(`FUUUCK. No user found with this ID! ${err}`);
            })
        }
    },

};

module.exports = resolvers;