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

    Mutation: {
        addUser(parent, args) {
            const user = new User({"firstName":args.firstName, "lastName":args.lastName});
            return user.save()
                .then(user => user)
                .catch(err => {
                    throw new ApolloError(err)
                })
        },

        deleteUser(parent, args) {
            return User.findByIdAndDelete(args._id)
                .then(user => user)
                .catch(err => {
                    throw new ApolloError(`FUUUCK. No user found with this ID! ${err}`)
                })
        }
    }

};

module.exports = resolvers;