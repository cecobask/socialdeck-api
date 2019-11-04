const mongoose = require('mongoose');
const debug = require('debug')('SocialDeck-dbConnection');
require('dotenv')
    .config();

// Connect to a cloud MongoDB instance.
const dbName = process.env.MONGO_DB_NAME;
const connString = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@mongocluster-yevae.mongodb.net/${dbName}?retryWrites=true&w=majority`;

if (process.env.NODE_ENV !== 'test')
    mongoose.connect(connString, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true,
            useFindAndModify: false,
        })
        .then(db => {
            const conn = db.connection;
            debug(
                `Connected to database ['${dbName}'] at ${conn.host}:${conn.port}`,
            );
        })
        .catch(error =>
            debug(error));

module.exports = mongoose;


const res = [
    {
        '_id': '5dbff437f482e01d03fecd4b',
        'email': 'test@gmail.com',
        'password': '$2b$10$u8JvPqJ3v08S.s9zL6LOy.su65KlcQr3dmYUqhv0rzUXYqtpgV7O2',
        'firstName': 'Test',
        'lastName': 'Johnson',
        'posts': [
            {
                '_id': '5dbff437f482e01d03fecd4d',
                'creatorID': '5dbff437f482e01d03fecd4b',
                'createdTime': '2019-11-04T09:49:43.000Z',
                'message': 'Test message by user 1...',
                'updatedTime': null,
                'links': [
                    'https://github.com/Urigo/graphql-scalars/',
                    'https://moodle.wit.ie/',
                ],
                'shares': [
                    '5dbff437f482e01d03fecd4c',
                ],
            },
        ],
    },
    {
        '_id': '5dbff437f482e01d03fecd4c',
        'email': 'tfarrell@yahoo.com',
        'password': '$2b$10$u8JvPqJ3v08S.s9zL6LOy.su65KlcQr3dmYUqhv0rzUXYqtpgV7O2',
        'firstName': 'Thomas',
        'lastName': 'Farrell',
        'posts': [
            {
                '_id': '5dbff437f482e01d03fecd4e',
                'creatorID': '5dbff437f482e01d03fecd4c',
                'createdTime': '2019-11-04T09:49:43.000Z',
                'message': 'Test message by user 2...',
                'updatedTime': null,
                'links': [
                    'https://mongoosejs.com/docs/api/',
                    'https://developer.github.com/',
                ],
                'shares': [],
            },
        ],
    },
]