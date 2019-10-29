const chai = require('chai');
const expect = chai.expect;
const request = require('supertest')('https://localhost:7000/graphql');
const app = require('../app');
const User = require('../models/users');
const Post = require('../models/posts');
const server = require('../server');
const db = require('../dbConnection');

describe('SocialDeck GraphQL API', () => {
    before(done => {
        // Wait for database connection before running the tests.
        // The Test MongoDB instance is hosted on Atlas.
        db.once('open', () => {
            done();
        });
    });
    
    describe('User', () => {
        beforeEach(async () => {
            const newUser = new User({
                'email': 'basko@gmail.com',
                'password': 'secret',
                'firstName': 'Tsetso',
                'lastName': 'Dimov',
            });
            
            // Save user to the database.
            await newUser.save();
        });
        
        it('should get user', async function() {
            const user = await User.findOne({'email': 'basko@gmail.com'});
            console.log(user);
        });
        
        afterEach(async () => {
            await User.deleteMany({});
        });
    });
    
    after(done => {
        server.close(done);
    });
});