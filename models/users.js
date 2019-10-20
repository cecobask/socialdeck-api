const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const UserSchema = new mongoose.Schema({
        email: {type: String, unique: true},
        password: {type: String},
        firstName: {type: String},
        lastName: {type: String}
    },
    {collection: 'users'});
UserSchema.plugin(uniqueValidator);

module.exports = mongoose.model('User', UserSchema);