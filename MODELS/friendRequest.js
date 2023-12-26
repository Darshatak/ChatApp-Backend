 const mongoose = require('mongoose')

 const requestSchema = new mongoose.Schema({
    sender:{
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    },
    recipient:{
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    },
    createdAt:{
        type: Date,
        default: Date.now(),
    }
 })

 const FriendRequest = new mongoose.model("friendRequest",requestSchema);

 module.exports = FriendRequest;