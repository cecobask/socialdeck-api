const chai = require('chai');
const expect = chai.expect;
const url = 'https://localhost:7000';
const server = require('../../../server');
const request = require('supertest');
const agent = request.agent(url, {ca: process.env.SERVER_CERT});
const User = require('../../../models/users');
const Post = require('../../../models/posts');
const {MongoMemoryServer} = require('mongodb-memory-server');
const mongoose = require('mongoose');
const moment = require('moment');
const _ = require('lodash');
require('dotenv')
    .config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
let mongoServer;

describe('SocialDeck GraphQL API', function() {
    before(async function() {
        mongoServer = new MongoMemoryServer({
            instance: {
                port: 27015,
                dbName: 'socialDeckDB',
            },
        });
        const connString = await mongoServer.getConnectionString();
        await mongoose.connect(connString, {
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
            await mongoServer.stop();
            await server.close();
        }
        catch (e) {
            console.warn(e);
        }
    });
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
        describe('\u2043 logIn() - mutation', function() {
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
                            const text = JSON.parse(res.text);
                            expect(text.data).to.not.be.null;
                            expect(text.data.logIn)
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
        
        describe('\u2043 logOut() - mutation', function() {
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
        
        describe('\u2043 signUp() - mutation', function() {
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
    });
    
    describe('\u2022 Queries', function() {
        describe('\u2043 me() - query', function() {
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
        
        describe('\u2043 users() - query', function() {
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
                            .members(['test@gmail.com', 'tfarrell@yahoo.com']);
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
    'shares': [testUser._id],
});