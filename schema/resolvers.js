const User = require('../models/users');
const {ApolloError} = require('apollo-server-express');
const bcrypt = require('bcrypt');

const resolvers = {
    Query: {
        users() {
            return User.find({});
        },

        findUserById(parent, args) {
            return User.findById(args._id)
                .then(user => user)
                .catch(err => {
                    throw new ApolloError(`FUUUCK. No user found with this ID! ${err}`)
                });
        }
    },

    Mutation: {
        addUser(parent, args) {
            const user = new User({
                "email": args.email,
                "password": bcrypt.hash(args.password, 10),
                "firstName": args.firstName,
                "lastName": args.lastName
            });

            return user.save()
                .then(user => user)
                .catch(err => {
                    throw new ApolloError(err)
                })
        },

        deleteUserById(parent, args) {
            return User.findByIdAndDelete(args._id)
                .then(user => user)
                .catch(err => {
                    throw new ApolloError(`FUUUCK. No user found with this ID! ${err}`)
                })
        },

        deleteAllUsers(_, args) {
            return User.deleteMany({})
                .then(result => {
                    if (result.n === 0) {
                        throw new ApolloError("No users in the database!");
                    }
                    return "Successfully deleted all users!"
                })
                .catch(err => {
                    throw new ApolloError(err);
                })
        }
    }

};

module.exports = resolvers;