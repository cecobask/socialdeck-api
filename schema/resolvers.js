const User = require('../models/users');
const {ApolloError} = require('apollo-server-express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const resolvers = {
    Query: {
        // Get all users in the database.
        users() {
            return User.find({});
        },

        findUserById(parent, {_id}) {
            return User.findById(_id)
                .then(user => user)
                .catch(err => {
                    throw new ApolloError(`No user found with this ID! ${err}`)
                });
        },

        // Get currently authenticated user.
        me(_, args, {user}) {
            if (!user) {
                throw new ApolloError("You aren't authenticated!");
            }
            return User.findById(user._id);
        }
    },

    Mutation: {
        async signUp(parent, {email, password, firstName, lastName}) {
            const user = new User({
                "email": email,
                "password": await bcrypt.hash(password, 10),
                "firstName": firstName,
                "lastName": lastName
            });

            // Save user to the database.
            await user.save()
                .catch(err => {
                    throw new ApolloError(err)
                });

            // Return json web token.
            return jwt.sign({
                user: {
                    _id: user._id,
                    email: user.email
                }
            }, 'secret!', {expiresIn: '10m'})
        },

        async logIn(_, {email, password}, context) {
            // Find user with matching email.
            const user = await User.findOne({"email": email});

            if (!user) {
                throw new ApolloError(`No user with email ${email}!`);
            }

            // Compare password from arguments to hashed password from db.
            const match = await bcrypt.compare(password, user.password);

            if (!match) {
                throw new ApolloError('Incorrect password!')
            }

            // Return json web token.
            return jwt.sign(
                {
                    user: {
                        _id: user._id,
                        email: user.email
                    }
                },
                'secret!',
                {expiresIn: '10m'}
            )
        },

        deleteUserById(parent, {_id}) {
            return User.findByIdAndDelete(_id)
                .then(user => user)
                .catch(err => {
                    throw new ApolloError(`No user found with this ID! ${err}`)
                })
        },

        deleteAllUsers() {
            return User.deleteMany({})
                .then(result => {
                    // Means the users database is empty.
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