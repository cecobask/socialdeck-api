const chai = require('chai');
const expect = chai.expect;
const url = 'https://localhost:7000';
const server = require('../../../server');
const request = require('supertest');
const fs = require('fs');
const agent = request.agent(url, {ca: fs.readFileSync('./secrets/cert.cert')});
const User = require('../../../models/users');
const Post = require('../../../models/posts');
const mongoose = require('mongoose');
const moment = require('moment');
const _ = require('lodash');
require('dotenv')
    .config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

describe('SocialDeck', function() {
    before(async function() {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true,
            useFindAndModify: false,
        }, err => {
            if (err) throw err;
        });
        await mongoose.connection.db.dropDatabase();
    });
    after(async function() {
        try {
            await mongoose.disconnect();
            await server.close();
        }
        catch (e) {
            console.warn(e);
        }
    });
    describe('GraphQL API', function() {
        beforeEach(async function() {
            await Post.deleteMany({});
            await User.deleteMany({});
            await User.insertMany([testUser, testUser2], err => {
                if (err) throw err;
            });
            await Post.insertMany([testPost, testPost2], err => {
                if (err) throw err;
            });
        });
        afterEach(async function() {
            await logOutAgent();
        });
        
        describe('\u2022 Authentication', function() {
            describe('\u25E6 signUp()', function() {
                it('should be able to sign up with a valid email',
                    async function() {
                        await User.deleteOne({'email': 'valid@gmail.com'});
                        await request(url)
                            .post('/graphql')
                            .set('Accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .send({
                                query: `mutation {
                                        signUp(
                                            email: "valid@gmail.com"
                                            password: "$2y$10$QnKjQZIIygthGubSkkwxku34vBV5h1gBnykx4s3IGNOgP9ApOo/GW"
                                            firstName: "Valid"
                                            lastName: "Burton"
                                        )
                                    }`,
                            })
                            .expect(200)
                            .then(res => {
                                const response = JSON.parse(res.text);
                                expect(response.data).to.not.be.null;
                                expect(response.data.signUp)
                                    .to
                                    .be
                                    .a('string')
                                    .and
                                    .satisfy(token => token.startsWith('eyJ'));
                            });
                    });
                it('should return error if email is not unique',
                    async function() {
                        await request(url)
                            .post('/graphql')
                            .set('Accept', 'application/json')
                            .send({
                                query: `mutation {
                                        signUp(
                                            email: "${testUser.email}"
                                            password: "${testUser.password}"
                                            firstName: "${testUser.firstName}"
                                            lastName: "${testUser.lastName}"
                                        )
                                    }`,
                            })
                            .expect(200)
                            .then(res => {
                                const response = JSON.parse(res.text);
                                expect(response.data).to.be.null;
                                expect(response.errors).to.not.be.null;
                                expect(response.errors)
                                    .to
                                    .have
                                    .length(1);
                                expect(response.errors[0].extensions.code)
                                    .to
                                    .equal('INTERNAL_SERVER_ERROR');
                                expect(response.errors[0].message)
                                    .to
                                    .equal(
                                        `User with email ${testUser.email} already exists!`);
                            });
                    });
                it('should return error if the user is already logged in',
                    async function() {
                        await authenticateAgent(testUser.email, 'secret');
                        await agent
                            .post('/graphql')
                            .set('Accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .send({
                                query: `mutation {
                                        signUp(
                                            email: "${testUser.email}"
                                            password: "secret"
                                            firstName: "${testUser.firstName}"
                                            lastName: "${testUser.lastName}"
                                        )
                                    }`,
                            })
                            .expect(200)
                            .then(res => {
                                const response = JSON.parse(res.text);
                                expect(response.data).to.be.null;
                                expect(response.errors).to.not.be.null;
                                expect(response.errors)
                                    .to
                                    .have
                                    .length(1);
                                expect(response.errors[0].extensions.code)
                                    .to
                                    .equal('ALREADY_AUTHENTICATED');
                                expect(response.errors[0].message)
                                    .to
                                    .equal(
                                        'You cannot sign up while you are logged in!');
                            });
                    });
            });
            
            describe('\u25E6 logIn()', function() {
                it('should be able to log in with valid credentials',
                    async function() {
                        await request(url)
                            .post('/graphql')
                            .set('Accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .send({
                                query: `mutation {
                                        logIn(
                                            email: "${testUser.email}"
                                            password: "secret"
                                        )
                                    }`,
                            })
                            .expect(200)
                            .then(res => {
                                const response = JSON.parse(res.text);
                                expect(response.data).to.not.be.null;
                                expect(response.data.logIn)
                                    .to
                                    .be
                                    .a('string')
                                    .and
                                    .satisfy(token => token.startsWith('eyJ'));
                                expect(res.headers)
                                    .to
                                    .have
                                    .property('set-cookie')
                                    .and
                                    .satisfy(cookies =>
                                        cookies[0].startsWith('ebimumaykata') &&
                                        cookies.pop()
                                            .split(';')[0].length > 90,
                                    );
                            });
                    });
                
                it('should return error if the user is already logged in',
                    async function() {
                        await authenticateAgent(testUser.email, 'secret');
                        await agent
                            .post('/graphql')
                            .set('Accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .send({
                                query: `mutation {
                                        logIn(
                                            email: "${testUser.email}"
                                            password: "secret"
                                        )
                                    }`,
                            })
                            .expect(200)
                            .then(res => {
                                const response = JSON.parse(res.text);
                                expect(response.data).to.be.null;
                                expect(response.errors).to.not.be.null;
                                expect(response.errors)
                                    .to
                                    .have
                                    .length(1);
                                expect(response.errors[0].extensions.code)
                                    .to
                                    .equal('ALREADY_AUTHENTICATED');
                                expect(response.errors[0].message)
                                    .to
                                    .equal('You are already logged in!');
                            });
                    });
                it('should return error if user\'s email is not in the db',
                    async function() {
                        await request(url)
                            .post('/graphql')
                            .set('Accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .send({
                                query: `mutation {
                                        logIn(
                                            email: "invalid@gmail.com"
                                            password: "secret"
                                        )
                                    }`,
                            })
                            .expect(200)
                            .then(res => {
                                const response = JSON.parse(res.text);
                                expect(response.data).to.be.null;
                                expect(response.errors).to.not.be.null;
                                expect(response.errors)
                                    .to
                                    .have
                                    .length(1);
                                expect(response.errors[0].extensions.code)
                                    .to
                                    .equal('INVALID_QUERY_ERROR');
                                expect(response.errors[0].message)
                                    .to
                                    .equal(
                                        'No user with email invalid@gmail.com!');
                            });
                    });
                it('should return error if user\'s password does not match the db record',
                    async function() {
                        await request(url)
                            .post('/graphql')
                            .set('Accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .send({
                                query: `mutation {
                                        logIn(
                                            email: "${testUser.email}"
                                            password: "invalidPassword"
                                        )
                                    }`,
                            })
                            .expect(200)
                            .then(res => {
                                const response = JSON.parse(res.text);
                                expect(response.data).to.be.null;
                                expect(response.errors).to.not.be.null;
                                expect(response.errors)
                                    .to
                                    .have
                                    .length(1);
                                expect(response.errors[0].extensions.code)
                                    .to
                                    .equal('UNAUTHENTICATED');
                                expect(response.errors[0].message)
                                    .to
                                    .equal('Incorrect password!');
                            });
                    });
            });
            
            describe('\u25E6 logOut()', function() {
                it('should be able to log out an authenticated user',
                    async function() {
                        await authenticateAgent(testUser.email, 'secret');
                        await agent
                            .post('/graphql')
                            .set('Accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .send({
                                query: `mutation {
                                        logOut
                                    }`,
                            })
                            .expect(200)
                            .then(res => {
                                const response = JSON.parse(res.text);
                                expect(response.data).to.not.be.null;
                                expect(response.data.logOut)
                                    .to
                                    .be
                                    .a('string')
                                    .and
                                    .satisfy(result => result ===
                                                       'Successfully logged out.');
                                expect(res.headers)
                                    .to
                                    .have
                                    .property('set-cookie')
                                    .and
                                    .satisfy(cookies => cookies[0].startsWith(
                                        'ebimumaykata=;'));
                            });
                    });
                it('should return error if the user has not logged in',
                    async function() {
                        await request(url)
                            .post('/graphql')
                            .set('Accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .send({
                                query: `mutation {
                                        logOut
                                    }`,
                            })
                            .expect(200)
                            .then(res => {
                                const response = JSON.parse(res.text);
                                expect(response.data).to.be.null;
                                expect(response.errors).to.not.be.null;
                                expect(response.errors)
                                    .to
                                    .have
                                    .length(1);
                                expect(response.errors[0].extensions.code)
                                    .to
                                    .equal('UNAUTHENTICATED');
                                expect(response.errors[0].message)
                                    .to
                                    .equal(
                                        'You cannot log out before you are logged in!');
                            });
                    });
            });
        });
        
        describe('\u2022 Queries', function() {
            describe('\u25E6 me()', function() {
                it('should be able to return currently authenticated user',
                    async function() {
                        await authenticateAgent(testUser.email, 'secret');
                        await agent
                            .post('/graphql')
                            .set('Accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .send({
                                query: `query {
                                        me {
                                            _id
                                            email
                                            password
                                            firstName
                                            lastName
                                            posts {
                                                _id
                                                creatorID
                                                createdTime
                                                message
                                                updatedTime
                                                links
                                                shares
                                            }
                                        }
                                    }`,
                            })
                            .expect(200)
                            .then(res => {
                                const response = JSON.parse(res.text);
                                const user = response.data.me;
                                expect(response.data).to.not.be.null;
                                expect(user.email)
                                    .to
                                    .equal('test@gmail.com');
                                expect(user.firstName)
                                    .to
                                    .equal('Test');
                                expect(user.lastName)
                                    .to
                                    .equal('Johnson');
                                expect(user.posts).to.not.be.empty;
                                expect(user.posts[0].creatorID)
                                    .to
                                    .equal(user._id);
                            });
                    });
                it('should return error if the user has not logged in',
                    async function() {
                        await request(url)
                            .post('/graphql')
                            .set('Accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .send({
                                query: `query {
                                        me {
                                            _id
                                            email
                                            password
                                            firstName
                                            lastName
                                            posts {
                                                _id
                                                creatorID
                                                createdTime
                                                message
                                                updatedTime
                                                links
                                                shares
                                            }
                                        }
                                    }`,
                            })
                            .expect(200)
                            .then(res => {
                                const response = JSON.parse(res.text);
                                expect(response.data).to.be.null;
                                expect(response.errors).to.not.be.null;
                                expect(response.errors)
                                    .to
                                    .have
                                    .length(1);
                                expect(response.errors[0].message)
                                    .to
                                    .equal('You must authenticate first!');
                                expect(response.errors[0].extensions.code)
                                    .to
                                    .equal('UNAUTHENTICATED');
                            });
                    });
            });
            
            describe('\u25E6 users()', function() {
                it('should return all users from the db', async function() {
                    await authenticateAgent(testUser2.email, 'secret');
                    await agent
                        .post('/graphql')
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .send({
                            query: `query {
                                    users {
                                        _id
                                        email
                                        password
                                        firstName
                                        lastName
                                        posts {
                                            _id
                                            creatorID
                                            createdTime
                                            message
                                            updatedTime
                                            links
                                            shares
                                        }
                                    }
                                }`,
                        })
                        .expect(200)
                        .then(res => {
                            const response = JSON.parse(res.text);
                            const users = response.data.users;
                            expect(response.data).to.not.be.null;
                            expect(users)
                                .to
                                .have
                                .length(2);
                            expect(_.map(users, 'email'))
                                .to
                                .have
                                .deep
                                .members(
                                    ['test@gmail.com', 'tfarrell@yahoo.com']);
                        });
                });
                it('should return error if the user has not logged in',
                    async function() {
                        await request(url)
                            .post('/graphql')
                            .set('Accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .send({
                                query: `query {
                                        users {
                                            _id
                                            email
                                            password
                                            firstName
                                            lastName
                                            posts {
                                                _id
                                                creatorID
                                                createdTime
                                                message
                                                updatedTime
                                                links
                                                shares
                                            }
                                        }
                                    }`,
                            })
                            .expect(200)
                            .then(res => {
                                const response = JSON.parse(res.text);
                                expect(response.data).to.be.null;
                                expect(response.errors).to.not.be.null;
                                expect(response.errors)
                                    .to
                                    .have
                                    .length(1);
                                expect(response.errors[0].message)
                                    .to
                                    .equal('You must authenticate first!');
                                expect(response.errors[0].extensions.code)
                                    .to
                                    .equal('UNAUTHENTICATED');
                            });
                    });
                it('should return error if there are no users in the db',
                    async function() {
                        await authenticateAgent(testUser.email, 'secret');
                        await User.deleteMany({});
                        await agent
                            .post('/graphql')
                            .set('Accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .send({
                                query: `query {
                                        users {
                                            _id
                                            email
                                            password
                                            firstName
                                            lastName
                                            posts {
                                                _id
                                                creatorID
                                                createdTime
                                                message
                                                updatedTime
                                                links
                                                shares
                                            }
                                        }
                                    }`,
                            })
                            .expect(200)
                            .then(res => {
                                const response = JSON.parse(res.text);
                                expect(response.data).to.be.null;
                                expect(response.errors).to.not.be.null;
                                expect(response.errors)
                                    .to
                                    .have
                                    .length(1);
                                expect(response.errors[0].message)
                                    .to
                                    .equal('No users in the database!');
                                expect(response.errors[0].extensions.code)
                                    .to
                                    .equal('INVALID_QUERY_ERROR');
                            });
                    });
            });
            
            describe('\u25E6 findUserById()', function() {
                it('should fetch existing user', async function() {
                    await authenticateAgent(testUser.email, 'secret');
                    await agent
                        .post('/graphql')
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .send({
                            query: `query {
                                    findUserById(_id:"${testUser2._id}") {
                                        _id
                                        email
                                        password
                                        firstName
                                        lastName
                                        posts {
                                            _id
                                            creatorID
                                            createdTime
                                            message
                                            updatedTime
                                            links
                                            shares
                                        }
                                    }
                                }`,
                        })
                        .expect(200)
                        .then(res => {
                            const response = JSON.parse(res.text);
                            const user = response.data.findUserById;
                            expect(response.errors).to.be.undefined;
                            expect(user).to.not.be.null;
                            expect(user.email)
                                .to
                                .equal(testUser2.email);
                            expect(user.firstName)
                                .to
                                .equal(testUser2.firstName);
                            expect(user.lastName)
                                .to
                                .equal(testUser2.lastName);
                            expect(user.posts)
                                .to
                                .have
                                .length(1)
                                .and
                                .satisfy(posts =>
                                    user.posts[0].message === posts[0].message,
                                );
                        });
                });
                it('should return error if the user has not logged in',
                    async function() {
                        await request(url)
                            .post('/graphql')
                            .set('Accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .send({
                                query: `query {
                                        findUserById(_id:"${testUser2._id}") {
                                            _id
                                            email
                                            password
                                            firstName
                                            lastName
                                            posts {
                                                _id
                                                creatorID
                                                createdTime
                                                message
                                                updatedTime
                                                links
                                                shares
                                            }
                                        }
                                    }`,
                            })
                            .expect(200)
                            .then(res => {
                                const response = JSON.parse(res.text);
                                expect(response.data).to.be.null;
                                expect(response.errors).to.not.be.null;
                                expect(response.errors)
                                    .to
                                    .have
                                    .length(1);
                                expect(response.errors[0].message)
                                    .to
                                    .equal('You must authenticate first!');
                                expect(response.errors[0].extensions.code)
                                    .to
                                    .equal('UNAUTHENTICATED');
                            });
                    });
                it('should return error if the user does not exist',
                    async function() {
                        await authenticateAgent(testUser.email, 'secret');
                        await User.deleteOne({'_id': testUser2._id});
                        await agent
                            .post('/graphql')
                            .set('Accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .send({
                                query: `query {
                                        findUserById(_id:"${testUser2._id}") {
                                            _id
                                            email
                                            password
                                            firstName
                                            lastName
                                            posts {
                                                _id
                                                creatorID
                                                createdTime
                                                message
                                                updatedTime
                                                links
                                                shares
                                            }
                                        }
                                    }`,
                            })
                            .expect(200)
                            .then(res => {
                                const response = JSON.parse(res.text);
                                expect(response.data).to.be.null;
                                expect(response.errors).to.not.be.null;
                                expect(response.errors)
                                    .to
                                    .have
                                    .length(1);
                                expect(response.errors[0].extensions.code)
                                    .to
                                    .equal('INVALID_QUERY_ERROR');
                                expect(response.errors[0].message)
                                    .to
                                    .equal(
                                        `No user with ID ${testUser2._id} found!`);
                            });
                    });
            });
            
            describe('\u25E6 posts()', function() {
                it('should return all posts from the db', async function() {
                    await authenticateAgent(testUser.email, 'secret');
                    await agent
                        .post('/graphql')
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .send({
                            query: `query {
                                    posts {
                                        _id
                                        creatorID
                                        createdTime
                                        message
                                        updatedTime
                                        links
                                        shares
                                    }
                                }`,
                        })
                        .expect(200)
                        .then(res => {
                            const response = JSON.parse(res.text);
                            const posts = response.data.posts;
                            expect(response.data).to.not.be.null;
                            expect(posts)
                                .to
                                .have
                                .length(2);
                            expect(_.map(posts, 'creatorID'))
                                .to
                                .have
                                .deep
                                .members([
                                    testUser._id.toString(),
                                    testUser2._id.toString()]);
                            expect(posts[0].shares)
                                .to
                                .have
                                .length(1)
                                .and
                                .satisfy(shares =>
                                    shares[0] === testUser2._id.toString());
                            expect(posts[1].shares)
                                .to
                                .be
                                .empty;
                        });
                });
                it('should return error if the user has not logged in',
                    async function() {
                        await request(url)
                            .post('/graphql')
                            .set('Accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .send({
                                query: `query {
                                        posts {
                                            _id
                                            creatorID
                                            createdTime
                                            message
                                            updatedTime
                                            links
                                            shares
                                        }
                                    }`,
                            })
                            .expect(200)
                            .then(res => {
                                const response = JSON.parse(res.text);
                                expect(response.data).to.be.null;
                                expect(response.errors).to.not.be.null;
                                expect(response.errors)
                                    .to
                                    .have
                                    .length(1);
                                expect(response.errors[0].message)
                                    .to
                                    .equal('You must authenticate first!');
                                expect(response.errors[0].extensions.code)
                                    .to
                                    .equal('UNAUTHENTICATED');
                            });
                    });
                it('should return error if there are no posts in the db',
                    async function() {
                        await authenticateAgent(testUser.email, 'secret');
                        await Post.deleteMany({});
                        await agent
                            .post('/graphql')
                            .set('Accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .send({
                                query: `query {
                                        posts {
                                            _id
                                            creatorID
                                            createdTime
                                            message
                                            updatedTime
                                            links
                                            shares
                                        }
                                }`,
                            })
                            .expect(200)
                            .then(res => {
                                const response = JSON.parse(res.text);
                                expect(response.data).to.be.null;
                                expect(response.errors).to.not.be.null;
                                expect(response.errors)
                                    .to
                                    .have
                                    .length(1);
                                expect(response.errors[0].message)
                                    .to
                                    .equal('No posts in the database!');
                                expect(response.errors[0].extensions.code)
                                    .to
                                    .equal('INVALID_QUERY_ERROR');
                            });
                    });
            });
            
            describe('\u25E6 findPostById()', function() {
                it('should fetch existing post', async function() {
                    await authenticateAgent(testUser.email, 'secret');
                    await agent
                        .post('/graphql')
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .send({
                            query: `query {
                                    findPostById(_id:"${testPost._id}") {
                                        _id
                                        creatorID
                                        createdTime
                                        message
                                        updatedTime
                                        links
                                        shares
                                    }
                                }`,
                        })
                        .expect(200)
                        .then(res => {
                            const response = JSON.parse(res.text);
                            const post = response.data.findPostById;
                            expect(response.errors).to.be.undefined;
                            expect(post).to.not.be.null;
                            expect(post.creatorID)
                                .to
                                .equal(testUser._id.toString());
                            expect(post.message)
                                .to
                                .equal(testPost.message);
                            expect(post.updatedTime)
                                .to
                                .be
                                .null;
                            expect(post.links)
                                .to
                                .have
                                .length(2)
                                .and
                                .satisfy(links =>
                                    expect(links)
                                        .to
                                        .deep
                                        .equal(testPost.links),
                                );
                            expect(post.shares)
                                .to
                                .have
                                .length(1)
                                .and
                                .satisfy(shares =>
                                    expect(shares[0])
                                        .to
                                        .deep
                                        .equal(testPost.shares[0].toString()),
                                );
                        });
                });
                it('should return error if the user has not logged in',
                    async function() {
                        await request(url)
                            .post('/graphql')
                            .set('Accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .send({
                                query: `query {
                                        findPostById(_id:"${testPost._id}") {
                                            _id
                                            creatorID
                                            createdTime
                                            message
                                            updatedTime
                                            links
                                            shares
                                        }
                                    }`,
                            })
                            .expect(200)
                            .then(res => {
                                const response = JSON.parse(res.text);
                                expect(response.data).to.be.null;
                                expect(response.errors).to.not.be.null;
                                expect(response.errors)
                                    .to
                                    .have
                                    .length(1);
                                expect(response.errors[0].message)
                                    .to
                                    .equal('You must authenticate first!');
                                expect(response.errors[0].extensions.code)
                                    .to
                                    .equal('UNAUTHENTICATED');
                            });
                    });
                it('should return error if the post does not exist',
                    async function() {
                        await authenticateAgent(testUser.email, 'secret');
                        await Post.deleteOne({'_id': testPost._id});
                        await agent
                            .post('/graphql')
                            .set('Accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .send({
                                query: `query {
                                        findPostById(_id:"${testPost._id}") {
                                            _id
                                            creatorID
                                            createdTime
                                            message
                                            updatedTime
                                            links
                                            shares
                                        }
                                    }`,
                            })
                            .expect(200)
                            .then(res => {
                                const response = JSON.parse(res.text);
                                expect(response.data).to.be.null;
                                expect(response.errors).to.not.be.null;
                                expect(response.errors)
                                    .to
                                    .have
                                    .length(1);
                                expect(response.errors[0].extensions.code)
                                    .to
                                    .equal('INVALID_QUERY_ERROR');
                                expect(response.errors[0].message)
                                    .to
                                    .equal(
                                        `No post with ID ${testPost._id} found!`);
                            });
                    });
            });
        });
        describe('\u2022 Mutations', function() {
            describe('\u25E6 deleteUserById()', function() {
                it('should delete an existing user', async function() {
                    await authenticateAgent(testUser.email, 'secret');
                    await agent
                        .post('/graphql')
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .send({
                            query: `mutation {
                                    deleteUserById(_id:"${testUser2._id}") {
                                        _id
                                        email
                                        password
                                        firstName
                                        lastName
                                        posts {
                                            _id
                                            creatorID
                                            createdTime
                                            message
                                            updatedTime
                                            links
                                            shares
                                        }
                                    }
                                }`,
                        })
                        .expect(200)
                        .then(async res => {
                            const response = JSON.parse(res.text);
                            const user = response.data.deleteUserById;
                            const users = await User.find({});
                            expect(response.errors).to.be.undefined;
                            expect(user).to.not.be.null;
                            expect(user.email)
                                .to
                                .equal(testUser2.email);
                            expect(user.firstName)
                                .to
                                .equal(testUser2.firstName);
                            expect(user.lastName)
                                .to
                                .equal(testUser2.lastName);
                            expect(user.posts)
                                .to
                                .be
                                .empty;
                            expect(users)
                                .to
                                .have
                                .length(1);
                        });
                });
                it('should return error if the user has not logged in',
                    async function() {
                        await request(url)
                            .post('/graphql')
                            .set('Accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .send({
                                query: `mutation {
                                        deleteUserById(_id:"${testUser2._id}") {
                                            _id
                                            email
                                            password
                                            firstName
                                            lastName
                                            posts {
                                                _id
                                                creatorID
                                                createdTime
                                                message
                                                updatedTime
                                                links
                                                shares
                                            }
                                        }
                                    }`,
                            })
                            .expect(200)
                            .then(res => {
                                const response = JSON.parse(res.text);
                                expect(response.data).to.be.null;
                                expect(response.errors).to.not.be.null;
                                expect(response.errors)
                                    .to
                                    .have
                                    .length(1);
                                expect(response.errors[0].message)
                                    .to
                                    .equal('You must authenticate first!');
                                expect(response.errors[0].extensions.code)
                                    .to
                                    .equal('UNAUTHENTICATED');
                            });
                    });
                it('should return error if the user does not exist',
                    async function() {
                        await authenticateAgent(testUser.email, 'secret');
                        await User.deleteOne({'_id': testUser2._id});
                        await agent
                            .post('/graphql')
                            .set('Accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .send({
                                query: `mutation {
                                        deleteUserById(_id:"${testUser2._id}") {
                                            _id
                                            email
                                            password
                                            firstName
                                            lastName
                                            posts {
                                                _id
                                                creatorID
                                                createdTime
                                                message
                                                updatedTime
                                                links
                                                shares
                                            }
                                        }
                                    }`,
                            })
                            .expect(200)
                            .then(res => {
                                const response = JSON.parse(res.text);
                                expect(response.data).to.be.null;
                                expect(response.errors).to.not.be.null;
                                expect(response.errors)
                                    .to
                                    .have
                                    .length(1);
                                expect(response.errors[0].extensions.code)
                                    .to
                                    .equal('INVALID_QUERY_ERROR');
                                expect(response.errors[0].message)
                                    .to
                                    .equal(
                                        `No user with ID ${testUser2._id} found!`);
                            });
                    });
            });
            describe('\u25E6 deleteAllUsers()', function() {
                it('should delete all existing users', async function() {
                    await authenticateAgent(testUser.email, 'secret');
                    await agent
                        .post('/graphql')
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .send({
                            query: `mutation {
                                    deleteAllUsers
                                }`,
                        })
                        .expect(200)
                        .then(async res => {
                            const response = JSON.parse(res.text);
                            const users = await User.find({});
                            expect(response.data).to.not.be.null;
                            expect(response.data.deleteAllUsers)
                                .to
                                .equal('Successfully deleted all users!');
                            expect(users).to.be.empty;
                        });
                });
                it('should return error if the user has not logged in',
                    async function() {
                        await request(url)
                            .post('/graphql')
                            .set('Accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .send({
                                query: `mutation {
                                        deleteAllUsers
                                    }`,
                            })
                            .expect(200)
                            .then(res => {
                                const response = JSON.parse(res.text);
                                expect(response.data).to.be.null;
                                expect(response.errors).to.not.be.null;
                                expect(response.errors)
                                    .to
                                    .have
                                    .length(1);
                                expect(response.errors[0].message)
                                    .to
                                    .equal('You must authenticate first!');
                                expect(response.errors[0].extensions.code)
                                    .to
                                    .equal('UNAUTHENTICATED');
                            });
                    });
                it('should return error if \'users\' database is empty',
                    async function() {
                        await authenticateAgent(testUser.email, 'secret');
                        await User.deleteMany({});
                        await agent
                            .post('/graphql')
                            .set('Accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .send({
                                query: `mutation {
                                        deleteAllUsers
                                    }`,
                            })
                            .expect(200)
                            .then(async res => {
                                const response = JSON.parse(res.text);
                                const users = await User.find({});
                                expect(users).to.be.empty;
                                expect(response.data).to.be.null;
                                expect(response.errors).to.not.be.null;
                                expect(response.errors)
                                    .to
                                    .have
                                    .length(1);
                                expect(response.errors[0].extensions.code)
                                    .to
                                    .equal('INVALID_QUERY_ERROR');
                                expect(response.errors[0].message)
                                    .to
                                    .equal('No users in the database!');
                            });
                    });
            });
            
            describe('\u25E6 createPost()', function() {
                it('should create a new post', async function() {
                    await authenticateAgent(testUser.email, 'secret');
                    await agent
                        .post('/graphql')
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .send({
                            query: `mutation {
                                    createPost(
                                        message: "Deeply emotional message <3"
                                        links: [
                                            {
                                                url: "https://test.com/"
                                            }
                                        ]
                                    ) {
                                        _id
                                        creatorID
                                        createdTime
                                        message
                                        updatedTime
                                        links
                                        shares
                                    }
                                }`,
                        })
                        .expect(200)
                        .then(async res => {
                            const response = JSON.parse(res.text);
                            const post = response.data.createPost;
                            const posts = await Post.find({});
                            expect(response.errors).to.be.undefined;
                            expect(post).to.not.be.null;
                            expect(post.creatorID)
                                .to
                                .equal(testUser._id.toString());
                            expect(post.message)
                                .to
                                .equal('Deeply emotional message <3');
                            expect(post.updatedTime)
                                .to
                                .be
                                .null;
                            expect(post.links)
                                .to
                                .have
                                .length(1)
                                .and
                                .satisfy(links =>
                                    expect(links[0])
                                        .to
                                        .equal('https://test.com/'));
                            expect(post.shares).to.be.empty;
                            expect(posts)
                                .to
                                .have
                                .length(3);
                        });
                });
                it('should return error if the user has not logged in',
                    async function() {
                        await request(url)
                            .post('/graphql')
                            .set('Accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .send({
                                query: `mutation {
                                        createPost(
                                            message: "Deeply emotional message <3"
                                            links: [
                                                {
                                                    url: "https://test.com/"
                                                }
                                            ]
                                        ) {
                                            _id
                                            creatorID
                                            createdTime
                                            message
                                            updatedTime
                                            links
                                            shares
                                        }
                                    }`,
                            })
                            .expect(200)
                            .then(res => {
                                const response = JSON.parse(res.text);
                                expect(response.data).to.be.null;
                                expect(response.errors).to.not.be.null;
                                expect(response.errors)
                                    .to
                                    .have
                                    .length(1);
                                expect(response.errors[0].message)
                                    .to
                                    .equal('You must authenticate first!');
                                expect(response.errors[0].extensions.code)
                                    .to
                                    .equal('UNAUTHENTICATED');
                            });
                    });
                it('should return error if \'links\' argument contains a badly formatted URL',
                    async function() {
                        await authenticateAgent(testUser.email, 'secret');
                        await agent
                            .post('/graphql')
                            .set('Accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .send({
                                query: `mutation {
                                        createPost(
                                            message: "Deeply emotional message <3"
                                            links: [
                                                {
                                                    url: "this_will_not_work"
                                                }
                                            ]
                                        ) {
                                            _id
                                            creatorID
                                            createdTime
                                            message
                                            updatedTime
                                            links
                                            shares
                                        }
                                    }`,
                            })
                            .expect(400)
                            .then(res => {
                                const response = JSON.parse(res.text);
                                expect(response.data).to.be.undefined;
                                expect(response.errors).to.not.be.null;
                                expect(response.errors)
                                    .to
                                    .have
                                    .length(1);
                                expect(response.errors[0].extensions.code)
                                    .to
                                    .equal('GRAPHQL_VALIDATION_FAILED');
                                expect(response.errors[0].message)
                                    .to
                                    .equal(
                                        'Expected type URL!, found "this_will_not_work"; Invalid URL: this_will_not_work');
                            });
                    });
            });
            describe('\u25E6 deletePostById()', function() {
                it('should delete an existing post', async function() {
                    await authenticateAgent(testUser.email, 'secret');
                    await agent
                        .post('/graphql')
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .send({
                            query: `mutation {
                                    deletePostById(_id:"${testPost._id}") {
                                        _id
                                        creatorID
                                        createdTime
                                        message
                                        updatedTime
                                        links
                                        shares
                                    }
                                }`,
                        })
                        .expect(200)
                        .then(async res => {
                            const response = JSON.parse(res.text);
                            const post = response.data.deletePostById;
                            const deletedPost = await Post.findById(
                                testPost._id);
                            expect(response.errors).to.be.undefined;
                            expect(post).to.not.be.null;
                            expect(post.creatorID)
                                .to
                                .equal(testPost.creatorID.toString());
                            expect(post.message)
                                .to
                                .equal(testPost.message);
                            expect(post.updatedTime)
                                .to
                                .be
                                .null;
                            expect(post.links)
                                .to
                                .have
                                .length(2)
                                .and
                                .satisfy(links =>
                                    expect(links)
                                        .to
                                        .have
                                        .deep
                                        .members(testPost.links));
                            expect(post.shares)
                                .to
                                .have
                                .length(1)
                                .and
                                .satisfy(shares =>
                                    expect(shares[0])
                                        .to
                                        .equal(testUser2._id.toString()));
                            expect(deletedPost)
                                .to
                                .be
                                .null;
                        });
                });
                it('should return error if the user has not logged in',
                    async function() {
                        await request(url)
                            .post('/graphql')
                            .set('Accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .send({
                                query: `mutation {
                                        deletePostById(_id:"${testPost._id}") {
                                            _id
                                            creatorID
                                            createdTime
                                            message
                                            updatedTime
                                            links
                                            shares
                                        }
                                    }`,
                            })
                            .expect(200)
                            .then(res => {
                                const response = JSON.parse(res.text);
                                expect(response.data).to.be.null;
                                expect(response.errors).to.not.be.null;
                                expect(response.errors)
                                    .to
                                    .have
                                    .length(1);
                                expect(response.errors[0].message)
                                    .to
                                    .equal('You must authenticate first!');
                                expect(response.errors[0].extensions.code)
                                    .to
                                    .equal('UNAUTHENTICATED');
                            });
                    });
                it('should return error if the post does not exist',
                    async function() {
                        await authenticateAgent(testUser.email, 'secret');
                        await Post.deleteOne({'_id': testPost._id});
                        await agent
                            .post('/graphql')
                            .set('Accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .send({
                                query: `mutation {
                                        deletePostById(_id:"${testPost._id}") {
                                                _id
                                                creatorID
                                                createdTime
                                                message
                                                updatedTime
                                                links
                                                shares
                                        }
                                    }`,
                            })
                            .expect(200)
                            .then(res => {
                                const response = JSON.parse(res.text);
                                expect(response.data).to.be.null;
                                expect(response.errors).to.not.be.null;
                                expect(response.errors)
                                    .to
                                    .have
                                    .length(1);
                                expect(response.errors[0].extensions.code)
                                    .to
                                    .equal('INVALID_QUERY_ERROR');
                                expect(response.errors[0].message)
                                    .to
                                    .equal(
                                        `No post with ID ${testPost._id} found!`);
                            });
                    });
            });
            
            describe('\u25E6 deleteAllPosts()', function() {
                it('should delete all existing posts', async function() {
                    await authenticateAgent(testUser.email, 'secret');
                    await agent
                        .post('/graphql')
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .send({
                            query: `mutation {
                                    deleteAllPosts
                                }`,
                        })
                        .expect(200)
                        .then(async res => {
                            const response = JSON.parse(res.text);
                            const posts = await Post.find({});
                            expect(response.data).to.not.be.null;
                            expect(response.data.deleteAllPosts)
                                .to
                                .equal('Successfully deleted all posts!');
                            expect(posts).to.be.empty;
                        });
                });
                it('should return error if the user has not logged in',
                    async function() {
                        await request(url)
                            .post('/graphql')
                            .set('Accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .send({
                                query: `mutation {
                                        deleteAllPosts
                                    }`,
                            })
                            .expect(200)
                            .then(res => {
                                const response = JSON.parse(res.text);
                                expect(response.data).to.be.null;
                                expect(response.errors).to.not.be.null;
                                expect(response.errors)
                                    .to
                                    .have
                                    .length(1);
                                expect(response.errors[0].message)
                                    .to
                                    .equal('You must authenticate first!');
                                expect(response.errors[0].extensions.code)
                                    .to
                                    .equal('UNAUTHENTICATED');
                            });
                    });
                it('should return error if \'posts\' database is empty',
                    async function() {
                        await authenticateAgent(testUser.email, 'secret');
                        await Post.deleteMany({});
                        await agent
                            .post('/graphql')
                            .set('Accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .send({
                                query: `mutation {
                                        deleteAllPosts
                                    }`,
                            })
                            .expect(200)
                            .then(async res => {
                                const response = JSON.parse(res.text);
                                const posts = await Post.find({});
                                expect(posts).to.be.empty;
                                expect(response.data).to.be.null;
                                expect(response.errors).to.not.be.null;
                                expect(response.errors)
                                    .to
                                    .have
                                    .length(1);
                                expect(response.errors[0].extensions.code)
                                    .to
                                    .equal('INVALID_QUERY_ERROR');
                                expect(response.errors[0].message)
                                    .to
                                    .equal('No posts in the database!');
                            });
                    });
            });
            
            describe('\u25E6 sharePost()', function() {
                it('should share an existing post', async function() {
                    await authenticateAgent(testUser.email, 'secret');
                    await agent
                        .post('/graphql')
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .send({
                            query: `mutation {
                                    sharePost(postID: "${testPost2._id}") {
                                        _id
                                        creatorID
                                        createdTime
                                        message
                                        updatedTime
                                        links
                                        shares
                                    }
                                }`,
                        })
                        .expect(200)
                        .then(async res => {
                            const response = JSON.parse(res.text);
                            const sharedPost = response.data.sharePost;
                            const updatedTime = moment.utc(
                                sharedPost.updatedTime);
                            const createdTime = moment.utc(
                                sharedPost.createdTime);
                            const posts = await Post.find({});
                            expect(response.errors).to.be.undefined;
                            expect(sharedPost).to.not.be.null;
                            expect(sharedPost.creatorID)
                                .to
                                .equal(testUser2._id.toString());
                            expect(sharedPost.message)
                                .to
                                .equal(testPost2.message);
                            expect(sharedPost.updatedTime)
                                .to
                                .not
                                .be
                                .null;
                            expect(updatedTime.isAfter(createdTime)).to.be.true;
                            expect(sharedPost.links)
                                .to
                                .have
                                .length(2)
                                .and
                                .satisfy(links =>
                                    expect(links)
                                        .to
                                        .have
                                        .members(testPost2.links));
                            expect(sharedPost.shares)
                                .to
                                .have
                                .length(1)
                                .and
                                .satisfy(shares =>
                                    expect(shares[0])
                                        .to
                                        .equal(testUser._id.toString()));
                            expect(posts)
                                .to
                                .have
                                .length(2);
                        });
                });
                it('should return error if the user has not logged in',
                    async function() {
                        await request(url)
                            .post('/graphql')
                            .set('Accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .send({
                                query: `mutation {
                                        sharePost(postID: "${testPost2._id}") {
                                            _id
                                            creatorID
                                            createdTime
                                            message
                                            updatedTime
                                            links
                                            shares
                                        }
                                    }`,
                            })
                            .expect(200)
                            .then(res => {
                                const response = JSON.parse(res.text);
                                expect(response.data).to.be.null;
                                expect(response.errors).to.not.be.null;
                                expect(response.errors)
                                    .to
                                    .have
                                    .length(1);
                                expect(response.errors[0].message)
                                    .to
                                    .equal('You must authenticate first!');
                                expect(response.errors[0].extensions.code)
                                    .to
                                    .equal('UNAUTHENTICATED');
                            });
                    });
                it('should return error if the post does not exist',
                    async function() {
                        await authenticateAgent(testUser.email, 'secret');
                        await Post.deleteOne({'_id': testPost._id});
                        await agent
                            .post('/graphql')
                            .set('Accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .send({
                                query: `mutation {
                                        sharePost(postID: "${testPost._id}") {
                                            _id
                                            creatorID
                                            createdTime
                                            message
                                            updatedTime
                                            links
                                            shares
                                        }
                                    }`,
                            })
                            .expect(200)
                            .then(res => {
                                const response = JSON.parse(res.text);
                                expect(response.data).to.be.null;
                                expect(response.errors).to.not.be.null;
                                expect(response.errors)
                                    .to
                                    .have
                                    .length(1);
                                expect(response.errors[0].extensions.code)
                                    .to
                                    .equal('INVALID_QUERY_ERROR');
                                expect(response.errors[0].message)
                                    .to
                                    .equal(
                                        `No post with ID ${testPost._id} found!`);
                            });
                    });
            });
            
            describe('\u25E6 updatePost()', function() {
                it('should update an existing post', async function() {
                    await authenticateAgent(testUser.email, 'secret');
                    await agent
                        .post('/graphql')
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .send({
                            query: `mutation {
                                    updatePost(
                                        postID: "${testPost._id}"
                                        message: "THIS WAS UPDATED!"
                                        links: [
                                            {
                                                url: "https://graphql.org/"
                                            }
                                            {
                                                url: "https://last.fm/"
                                            }
                                        ]
                                    ) {
                                        _id
                                        creatorID
                                        createdTime
                                        message
                                        updatedTime
                                        links
                                        shares
                                    }
                                }`,
                        })
                        .expect(200)
                        .then(async res => {
                            const response = JSON.parse(res.text);
                            const updatedPost = response.data.updatePost;
                            const updatedTime = moment.utc(
                                updatedPost.updatedTime);
                            const createdTime = moment.utc(
                                updatedPost.createdTime);
                            const posts = await Post.find({});
                            expect(response.errors).to.be.undefined;
                            expect(updatedPost).to.not.be.null;
                            expect(updatedPost.creatorID)
                                .to
                                .equal(testUser._id.toString());
                            expect(updatedPost.message)
                                .to
                                .equal('THIS WAS UPDATED!');
                            expect(updatedPost.updatedTime)
                                .to
                                .not
                                .be
                                .null;
                            expect(updatedTime.isAfter(createdTime)).to.be.true;
                            expect(updatedPost.links)
                                .to
                                .have
                                .length(2)
                                .and
                                .have
                                .members(
                                    [
                                        'https://graphql.org/',
                                        'https://last.fm/']);
                            expect(updatedPost.shares)
                                .to
                                .have
                                .length(1)
                                .and
                                .have
                                .members([`${testUser2._id.toString()}`]);
                            expect(posts)
                                .to
                                .have
                                .length(2);
                        });
                });
                it('should return error if the user has not logged in',
                    async function() {
                        await request(url)
                            .post('/graphql')
                            .set('Accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .send({
                                query: `mutation {
                                        updatePost(
                                            postID: "${testPost._id}"
                                            message: "THIS WAS UPDATED!"
                                            links: [
                                                {
                                                    url: "https://graphql.org/"
                                                }
                                                {
                                                    url: "https://last.fm/"
                                                }
                                            ]
                                        ) {
                                            _id
                                            creatorID
                                            createdTime
                                            message
                                            updatedTime
                                            links
                                            shares
                                        }
                                    }`,
                            })
                            .expect(200)
                            .then(res => {
                                const response = JSON.parse(res.text);
                                expect(response.data).to.be.null;
                                expect(response.errors).to.not.be.null;
                                expect(response.errors)
                                    .to
                                    .have
                                    .length(1);
                                expect(response.errors[0].message)
                                    .to
                                    .equal('You must authenticate first!');
                                expect(response.errors[0].extensions.code)
                                    .to
                                    .equal('UNAUTHENTICATED');
                            });
                    });
                it('should return error if the post does not exist',
                    async function() {
                        await authenticateAgent(testUser.email, 'secret');
                        await Post.deleteOne({'_id': testPost._id});
                        await agent
                            .post('/graphql')
                            .set('Accept', 'application/json')
                            .set('Content-Type', 'application/json')
                            .send({
                                query: `mutation {
                                        updatePost(
                                            postID: "${testPost._id}"
                                            message: "THIS WAS UPDATED!"
                                            links: [
                                                {
                                                    url: "https://graphql.org/"
                                                }
                                                {
                                                    url: "https://last.fm/"
                                                }
                                            ]
                                        ) {
                                            _id
                                            creatorID
                                            createdTime
                                            message
                                            updatedTime
                                            links
                                            shares
                                        }
                                    }`,
                            })
                            .expect(200)
                            .then(res => {
                                const response = JSON.parse(res.text);
                                expect(response.data).to.be.null;
                                expect(response.errors).to.not.be.null;
                                expect(response.errors)
                                    .to
                                    .have
                                    .length(1);
                                expect(response.errors[0].extensions.code)
                                    .to
                                    .equal('INVALID_QUERY_ERROR');
                                expect(response.errors[0].message)
                                    .to
                                    .equal(
                                        `No post with ID ${testPost._id} found!`);
                            });
                    });
            });
        });
    });
    describe('Other tests', function() {
        it('should get index page', async function() {
            await request(url)
                .get('/')
                .expect(200)
                .then(res => {
                    expect(res.text)
                        .to
                        .be
                        .a('string')
                        .and
                        .satisfy(text => text.startsWith('<!DOCTYPE html>'));
                });
        });
    });
});

function authenticateAgent(email, password) {
    return agent
        .post('/graphql')
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .send({
            query: `mutation {
                        logIn(
                            email: "${email}"
                            password: "${password}"
                        )
                    }`,
        });
}

function logOutAgent() {
    return agent
        .post('/graphql')
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .send({
            query: `mutation {
                        logOut
                    }`,
        });
}

const testUser = new User({
    email: 'test@gmail.com',
    password: '$2b$10$u8JvPqJ3v08S.s9zL6LOy.su65KlcQr3dmYUqhv0rzUXYqtpgV7O2',
    firstName: 'Test',
    lastName: 'Johnson',
});
const testUser2 = new User({
    email: 'tfarrell@yahoo.com',
    password: '$2b$10$u8JvPqJ3v08S.s9zL6LOy.su65KlcQr3dmYUqhv0rzUXYqtpgV7O2',
    firstName: 'Thomas',
    lastName: 'Farrell',
});
const testPost = new Post({
    'creatorID': testUser._id,
    'createdTime': moment()
        .utc(true)
        .format(),
    'message': 'Test message by user 1...',
    'updatedTime': null,
    'links': [
        'https://github.com/Urigo/graphql-scalars/',
        'https://moodle.wit.ie/',
    ],
    'shares': [testUser2._id],
});
const testPost2 = new Post({
    'creatorID': testUser2._id,
    'createdTime': moment()
        .utc(true)
        .format(),
    'message': 'Test message by user 2...',
    'updatedTime': null,
    'links': [
        'https://mongoosejs.com/docs/api/',
        'https://developer.github.com/',
    ],
    'shares': [],
});