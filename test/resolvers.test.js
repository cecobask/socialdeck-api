const chai = require('chai');
const expect = chai.expect;
const url = 'https://localhost:7000';
const server = require('../server');
const request = require('supertest');
const agent = request.agent(url, {ca: process.env.SERVER_CERT});
const User = require('../models/users');
const Post = require('../models/posts');
const debug = require('debug')('SocialDeck-resolvers.test');
const {MongoMemoryServer} = require('mongodb-memory-server');
const mongoose = require('mongoose');
require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
let mongoServer;

const testUser = new User({
    email: 'test@gmail.com',
    password: '$2b$10$u8JvPqJ3v08S.s9zL6LOy.su65KlcQr3dmYUqhv0rzUXYqtpgV7O2',
    firstName: 'Test',
    lastName: 'Johnson',
});

function authenticatedAgent(email, password) {
    return agent
        .post('/graphql')
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .send({
            query: `mutation logIn {
                                logIn(
                                    email: "${email}"
                                    password: "${password}"
                                )
                            }`,
        });
}

describe('SocialDeck GraphQL API', function() {
    before(async function() {
        mongoServer = new MongoMemoryServer();
        const connString = await mongoServer.getConnectionString();
        await mongoose.connect(connString, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true,
            useFindAndModify: false,
        }, err => {
            if (err) throw err;
        });
        await User.deleteMany({});
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
    
    describe('User', function() {
        before(async function() {
            await User.create(testUser, err => {
                if (err) throw err;
            });
        });
        after(async function() {
            await User.deleteMany({'email': {$in:[testUser.email, 'valid@gmail.com']}});
        });
        describe('logIn() - mutation', function() {
            it('should be able to log in with valid credentials',
                async function() {
                    await request(url)
                        .post('/graphql')
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .send({
                            query: `mutation logIn {
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
                                .satisfy(cookie => cookie[0].startsWith(
                                    'ebimumaykata'));
                        });
                });
    
            it('should return error if the user is already logged in', async function() {
                await authenticatedAgent(testUser.email, 'secret');
                await agent
                    .post('/graphql')
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({
                        query: `mutation logIn {
                                logIn(
                                    email: "${testUser.email}"
                                    password: "secret"
                                )
                            }`,
                    })
                    .expect(200)
                    .then(res => {
                        const response = JSON.parse(res.text);
                        expect(response.errors)
                            .to
                            .have
                            .length(1);
                        expect(response.errors[0].extensions.code)
                            .to
                            .eql('ALREADY_AUTHENTICATED');
                        expect(response.errors[0].message).to.equal('You are already logged in!');
                        expect(response.data).to.be.null;
                    });
            });
        });
        
        describe('logOut() - mutation', function() {
            it('should be able to log out an authenticated user',
                async function() {
                    await authenticatedAgent(testUser.email, 'secret');
                    await agent.post('/graphql')
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .send({
                            query: 'mutation logOut {logOut}',
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
                        });
                },
            );
        });
        
        describe('signUp() - mutation', function() {
            it('should be able to sign up with a valid email',
                async function() {
                    await request(url)
                        .post('/graphql')
                        .set('Accept', 'application/json')
                        .set('Content-Type', 'application/json')
                        .send({
                            query: `mutation signUp {
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
            it('should return error if email is not unique', async function() {
                await User.create(testUser)
                    .then(user => {
                        request(url)
                            .post('/graphql')
                            .set('Accept', 'application/json')
                            .send({
                                query: `mutation signUp {
                                signUp(
                                    email: "${user.email}"
                                    password: "${user.password}"
                                    firstName: "${user.firstName}"
                                    lastName: "${user.lastName}"
                                )
                            }`,
                            })
                            .expect(200)
                            .then(res => {
                                const response = JSON.parse(res.text);
                                console.log(response);
                                expect(response.errors)
                                    .to
                                    .have
                                    .length(1);
                                expect(response.data).to.be.null;
                            });
                    });
            });
        });
    });
});