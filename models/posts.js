const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const PostSchema = new mongoose.Schema({
        creatorID: {
            type: String,
            required: true,
        },
        createdTime: {
            type: Date,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        updatedTime: {type: Date},
        links: {
            type: Array,
            default: [],
        },
        shares: {
            type: Array,
            default: [],
        },
    },
    {collection: 'posts'});
PostSchema.plugin(uniqueValidator);

module.exports = mongoose.model('Post', PostSchema);