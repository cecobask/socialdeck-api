const User = require('../models/users');
const Post = require('../models/posts');
const {ApolloError, AuthenticationError} = require('apollo-server-express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {DateTimeResolver, URLResolver, EmailAddressResolver} = require(
    'graphql-scalars');
const moment = require('moment');
require('dotenv')
    .config();
const jwtKey = process.env.JWT_SECRET;

const resolvers = {
    DateTime: DateTimeResolver,
    URL: URLResolver,
    EmailAddress: EmailAddressResolver,
    
    User: {
        // Nested query that fetches all posts by a user.
        posts(user) {
            return Post.find({'creatorID': user._id});
        },
    },
    
    Query: {
        // Get all users in the database.
        users(_, __, {user}) {
            if (!user) throw new AuthenticationError(
                'You must authenticate first!');
            
            return User.find({})
                .then(users => {
                    if (!users.length)
                        throw new ApolloError(
                            'No users in the database!',
                            'INVALID_QUERY_ERROR');
                    
                    return users;
                });
        },
        
        async findUserById(_, {_id}, {user}) {
            if (!user) throw new AuthenticationError(
                'You must authenticate first!');
            
            const foundUser = await User.findById(_id);
            
            if (!foundUser) throw new ApolloError(
                `No user found with ID ${_id}`,
                'INVALID_QUERY_ERROR');
            
            return foundUser;
        },
        
        // Get currently authenticated user.
        me(_, __, {user}) {
            if (!user)
                throw new AuthenticationError('You must authenticate first!');
            
            return User.findById(user._id);
        },
        
        // Get all users in the database.
        posts(_, __, {user}) {
            if (!user) throw new AuthenticationError(
                'You must authenticate first!');
            
            return Post.find({})
                .then(posts => {
                    if (!posts.length)
                        throw new ApolloError(
                            'No posts in the database.',
                            'INVALID_QUERY_ERROR');
                    
                    return posts;
                });
        },
        
        findPostById(_, {_id}, {user}) {
            if (!user) throw new AuthenticationError(
                'You must authenticate first!');
            
            return Post.findById(_id)
                .then(post => post)
                .catch(err => {
                    throw new ApolloError(
                        `No post found with this ID! ${err}`,
                        'INVALID_QUERY_ERROR');
                });
        },
    },
    
    Mutation: {
        async signUp(_, {email, password, firstName, lastName}, {req, user}) {
            if (user)
                throw new ApolloError(
                    'You cannot sign up while you are logged in!',
                    'ALREADY_AUTHENTICATED');
            
            // Check if user exists in the database.
            const existingUser = await User.findOne({'email': email});
            
            if (existingUser)
                throw new ApolloError(
                    `User with email ${email} already exists!`);
            
            const newUser = new User({
                'email': email,
                'password': await bcrypt.hash(password, 10),
                'firstName': firstName,
                'lastName': lastName,
            });
            
            // Save user to the database.
            await newUser.save()
                .catch(err => {
                    throw new ApolloError(err);
                });
            
            req.session.user = newUser;
            
            // Return json web token.
            return jwt.sign(
                {
                    user: newUser,
                },
                jwtKey,
                {
                    expiresIn: '1h',
                },
            );
        },
        
        async logIn(_, {email, password}, {req, user}) {
            if (user)
                throw new ApolloError('You are already logged in!',
                    'ALREADY_AUTHENTICATED');
            
            // Find user with matching email.
            const existingUser = await User.findOne({'email': email});
            
            if (!existingUser)
                throw new ApolloError(`No user with email ${email}!`,
                    'INVALID_QUERY_ERROR');
            
            // Compare password from arguments to hashed password from db.
            const match = await bcrypt.compare(password, existingUser.password);
            
            if (!match)
                throw new AuthenticationError('Incorrect password!');
            
            req.session.user = existingUser;
            
            // Return json web token.
            return jwt.sign(
                {
                    user: existingUser,
                },
                jwtKey,
                {
                    expiresIn: '1h',
                },
            );
        },
        
        async logOut(_, __, {req, res, user}) {
            if (!user)
                throw new AuthenticationError(
                    'You cannot log out before you are logged in!');
            
            await req.session.destroy();
            res.clearCookie('ebimumaykata');
            return 'Successfully logged out.';
        },
        
        async deleteUserById(_, {_id}, {user}) {
            if (!user) throw new AuthenticationError(
                'You must authenticate first!');
            
            const userToDelete = await User.findById(_id);
            
            if (!userToDelete)
                throw new ApolloError(
                    `No user found with ID ${_id}`,
                    'INVALID_QUERY_ERROR');
            
            // Delete the user's posts first.
            Post.deleteMany({'creatorID': _id})
                .catch(err => {
                    throw new ApolloError(err);
                });
            
            await User.deleteOne({'_id': _id});
            
            return userToDelete;
        },
        
        deleteAllUsers(_, __, {user}) {
            if (!user) throw new AuthenticationError(
                'You must authenticate first!');
            
            // Delete all user posts first.
            Post.deleteMany({})
                .catch(err => {
                    throw new ApolloError(err);
                });
            
            return User.deleteMany({})
                .then(result => {
                    // Means the users database is empty.
                    if (result.n === 0)
                        throw new ApolloError(
                            'No users in the database!',
                            'INVALID_QUERY_ERROR');
                    
                    return 'Successfully deleted all users!';
                });
        },
        
        async createPost(_, {message, links}, {user}) {
            if (!user) throw new AuthenticationError(
                'You must authenticate first!');
            
            const post = new Post({
                'creatorID': user._id,
                'createdTime': moment()
                    .utc(true)
                    .format(),
                'message': message,
                'links': links.map(link => link.url.href),
            });
            
            // Save post to the database.
            return await post.save()
                .catch(err => {
                    throw new ApolloError(err);
                });
        },
        
        deletePostById(_, {_id}, {user}) {
            if (!user) throw new AuthenticationError(
                'You must authenticate first!');
            
            return Post.findByIdAndDelete(_id)
                .then(post => post)
                .catch(err => {
                    throw new ApolloError(
                        `No post found with this ID! ${err}`,
                        'INVALID_QUERY_ERROR');
                });
        },
        
        deleteAllPosts(_, __, {user}) {
            if (!user) throw new AuthenticationError(
                'You must authenticate first!');
            
            return Post.deleteMany({})
                .then(result => {
                    // Means the posts database is empty.
                    if (result.n === 0)
                        throw new ApolloError(
                            'No posts in the database!');
                    
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
                {
                    '$addToSet': {
                        'shares': user._id,
                    },
                },
                {
                    new: true,
                })
                .catch(err => {
                    throw new ApolloError(`Invalid post ID! ${err}`,
                        'INVALID_QUERY_ERROR');
                });
        },
        
        updatePost(_, {postID, message, links}, {user}) {
            if (!user) throw new AuthenticationError(
                'You must authenticate first!');
            return Post.findOneAndUpdate({'_id': postID},
                {
                    '$set': {
                        'message': message,
                        'links': links.map(link => link.url.href),
                        'updatedTime': moment()
                            .utc(true)
                            .format(),
                    },
                },
                {
                    new: true,
                })
                .catch(err => {
                    throw new ApolloError(`Invalid post ID! ${err}`,
                        'INVALID_QUERY_ERROR');
                });
        },
    },
    
};

module.exports = resolvers;