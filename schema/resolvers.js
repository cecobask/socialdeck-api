const User = require('../models/users');
const Post = require('../models/posts');
const {ApolloError, AuthenticationError} = require('apollo-server-express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {DateTimeResolver, URLResolver} = require('graphql-scalars');
const moment = require('moment');

const resolvers = {
    DateTime: DateTimeResolver,
    URL: URLResolver,

    User: {
        // Nested query that fetches all posts by a user.
        posts(user) {
            return Post.find({'creatorID': user._id});
        },
    },

    Query: {
        // Get all users in the database.
        users() {
            return User.find({})
                .then(users => {
                    if (!users.length) 
                        throw new ApolloError('No users in the database.', 'INVALID_QUERY_ERROR');
                
                    return users;
                });
        },

        findUserById(parent, {_id}) {
            return User.findById(_id).then(user => user).catch(err => {
                throw new ApolloError(`No user found with this ID! ${err}`, 'INVALID_QUERY_ERROR');
            });
        },

        // Get currently authenticated user.
        me(_, args, {user}) {
            if (!user)
                throw new AuthenticationError('You aren\'t authenticated!');

            return User.findById(user._id);
        },

        // Get all users in the database.
        posts() {
            return Post.find({})
                .then(posts => {
                    if (!posts.length) 
                        throw new ApolloError('No posts in the database.', 'INVALID_QUERY_ERROR');
                    
                    return posts;
                });
        },

        findPostById(parent, {_id}) {
            return Post.findById(_id)
                .then(post => post)
                .catch(err => {
                    throw new ApolloError(`No post found with this ID! ${err}`, 'INVALID_QUERY_ERROR');
                });
        },
    },

    Mutation: {
        async signUp(parent, {email, password, firstName, lastName}) {
            const user = new User({
                'email': email,
                'password': await bcrypt.hash(password, 10),
                'firstName': firstName,
                'lastName': lastName,
            });

            // Save user to the database.
            await user.save()
                .catch(err => {
                    throw new ApolloError(err);
                });

            // Return json web token.
            return jwt.sign({
                user: {
                    _id: user._id,
                    email: user.email,
                },
            }, 'secret!', {expiresIn: '10m'});
        },

        async logIn(_, {email, password}) {
            // Find user with matching email.
            const user = await User.findOne({'email': email});

            if (!user)
                throw new ApolloError(`No user with email ${email}!`, 'INVALID_QUERY_ERROR');

            // Compare password from arguments to hashed password from db.
            const match = await bcrypt.compare(password, user.password);

            if (!match)
                throw new AuthenticationError('Incorrect password!');

            // Return json web token.
            return jwt.sign(
                {
                    user: {
                        _id: user._id,
                        email: user.email,
                    },
                },
                'secret!',
                {expiresIn: '10m'},
            );
        },

        deleteUserById(parent, {_id}) {
            return User.findByIdAndDelete(_id).then(user => user).catch(err => {
                throw new ApolloError(`No user found with this ID! ${err}`,
                    'INVALID_QUERY_ERROR');
            });
        },

        deleteAllUsers() {
            return User.deleteMany({}).then(result => {
                // Means the users database is empty.
                if (result.n === 0)
                    throw new ApolloError('No users in the database!', 'INVALID_QUERY_ERROR');

                return 'Successfully deleted all users!';
            }).catch(err => {
                throw new ApolloError(err);
            });
        },

        async createPost(parent, {creatorID, message, links}) {
            const post = new Post({
                'creatorID': creatorID,
                'createdTime': moment().utc(true).format(),
                'message': message,
                'links': links.map(link => link.url.href),
            });

            // Save post to the database.
            return await post.save()
                .catch(err => {
                    throw new ApolloError(err);
                });
        },

        deletePostById(_, {_id}) {
            return Post.findByIdAndDelete(_id)
                .then(post => post)
                .catch(err => {
                    throw new ApolloError(`No post found with this ID! ${err}`,
                        'INVALID_QUERY_ERROR');
                });
        },

        deleteAllPosts() {
            return Post.deleteMany({})
                .then(result => {
                // Means the posts database is empty.
                    if (result.n === 0)
                        throw new ApolloError('No posts in the database!');

                    return 'Successfully deleted all posts!';
                })
                .catch(err => {
                    throw new ApolloError(err);
                });
        },

        sharePost(_, {postID}, {user}) {
            if (!user) throw new AuthenticationError(
                'You must authenticate first!');
            // Adds the user id to the the 'shares' array, if it doesn't exist there.
            return Post.findOneAndUpdate({'_id': postID},
                {'$addToSet': {'shares': user._id}})
                .catch(err => {
                    throw new ApolloError(`Invalid post ID! ${err}`,
                        'INVALID_QUERY_ERROR');
                });
        },
    },

};

module.exports = resolvers;