const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const UserSchema = new mongoose.Schema({
        firstName: {type: String, unique: true},
        lastName: {type: String, unique: true}
    },
    {collection: 'users'});
UserSchema.plugin(uniqueValidator);

module.exports = mongoose.model('User', UserSchema);