const User = require('../models/users');
const Post = require('../models/posts');
const {ApolloError, AuthenticationError} = require('apollo-server-express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {DateTimeResolver, URLResolver, EmailAddressResolver} = require(
    'graphql-scalars');
const moment = require('moment');
const fs = require('fs');
require('dotenv')
    .config();
const jwtKey = fs.readFileSync(__dirname + '/../secrets/jwtsecret.pem');

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
                `No user with ID ${_id} found!`,
                'INVALID_QUERY_ERROR');
            
            return foundUser;
        },
        
        // Get currently authenticated user.
        me(_, __, {user}) {
            if (!user)
                throw new AuthenticationError('You must authenticate first!');
            
            return User.findById(user._id);
        },
        
        // Get all posts in the database.
        posts(_, __, {user}) {
            if (!user) throw new AuthenticationError(
                'You must authenticate first!');
            
            return Post.find({})
                .then(posts => {
                    if (!posts.length)
                        throw new ApolloError(
                            'No posts in the database!',
                            'INVALID_QUERY_ERROR');
                    
                    return posts;
                });
        },
        
        async findPostById(_, {_id}, {user}) {
            if (!user) throw new AuthenticationError(
                'You must authenticate first!');
            
            const foundPost = await Post.findById(_id);
            
            if (!foundPost) throw new ApolloError(
                `No post with ID ${_id} found!`,
                'INVALID_QUERY_ERROR');
            
            return foundPost;
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
            await newUser.save();
            
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
                    `No user with ID ${_id} found!`,
                    'INVALID_QUERY_ERROR');
            
            // Delete the user's posts first.
            await Post.deleteMany({'creatorID': _id});
            
            await User.deleteOne({'_id': _id});
            
            return userToDelete;
        },
        
        async deleteAllUsers(_, __, {user}) {
            if (!user) throw new AuthenticationError(
                'You must authenticate first!');
            
            // Delete all user posts first.
            await Post.deleteMany({});
            
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
        
        createPost(_, {message, links}, {user}) {
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
            return post.save();
        },
        
        async deletePostById(_, {_id}, {user}) {
            if (!user) throw new AuthenticationError(
                'You must authenticate first!');
            
            const postToDelete = await Post.findById(_id);
            
            if (!postToDelete)
                throw new ApolloError(
                    `No post with ID ${_id} found!`,
                    'INVALID_QUERY_ERROR');
            
            if (postToDelete.creatorID !== user._id)
                throw new AuthenticationError(
                    'You cannot delete a post created by someone else!');
            
            await Post.deleteOne({'_id': _id});
            
            return postToDelete;
        },
        
        deleteAllPosts(_, __, {user}) {
            if (!user) throw new AuthenticationError(
                'You must authenticate first!');
            
            return Post.deleteMany({})
                .then(result => {
                    // Means the posts database is empty.
                    if (result.n === 0)
                        throw new ApolloError(
                            'No posts in the database!', 'INVALID_QUERY_ERROR');
                    
                    return 'Successfully deleted all posts!';
                });
        },
        
        async sharePost(_, {postID}, {user}) {
            if (!user) throw new AuthenticationError(
                'You must authenticate first!');
            
            // Adds the user id to the the 'shares' array, if it doesn't exist there.
            const updatedPost = await Post.findOneAndUpdate({'_id': postID},
                {
                    '$addToSet': {
                        'shares': user._id,
                    },
                    '$set': {
                        'updatedTime': moment()
                            .utc(true)
                            .format(),
                    },
                },
                {
                    new: true,
                });
            
            if (!updatedPost)
                throw new ApolloError(`No post with ID ${postID} found!`,
                    'INVALID_QUERY_ERROR');
            
            return updatedPost;
        },
        
        async updatePost(_, {postID, message, links}, {user}) {
            if (!user) throw new AuthenticationError(
                'You must authenticate first!');
            const updatedPost = await Post.findOneAndUpdate({'_id': postID},
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
                });
            
            if (!updatedPost)
                throw new ApolloError(`No post with ID ${postID} found!`,
                    'INVALID_QUERY_ERROR');
            
            return updatedPost;
        },
    },
    
};

module.exports = resolvers;