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
        });

module.exports = mongoose;