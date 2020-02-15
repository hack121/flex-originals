const mongoose = require("mongoose");
const Guid = require("guid");
const { Schema } = mongoose;

const AccessTokenSchema = new Schema({
  _id: {
    type: String,
    default: () => Guid.raw()
  },
  userId: {
    type: String,
    required: true
  },
  token: {
    type: String,
    required: true
  },
  status: {
    type: Boolean,
    required: true,
    default: true
  },
  location: {
    type: String,
    required: true
  },
  ip: {
    type: String,
    required: true
  }
});

mongoose.model("AccessToken", AccessTokenSchema);
