const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
        firstName: String,
        lastName: String
    },
    {collection: 'users'});

module.exports = mongoose.model('User', UserSchema);