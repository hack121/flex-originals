const mongoose = require("mongoose");
const UserModel = mongoose.model("User");
const AccessTokenModel = mongoose.model("AccessToken");
const httpStatus = require("../helpers/httpStatus");
const logs = require("../helpers/logs");

const auth = async (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(httpStatus.UNAUTHORIZED).json({
      status: httpStatus.UNAUTHORIZED,
      message: "Not authorized"
    });
  }
  let token = req.headers.authorization;
  try {
    let user = await UserModel.findByToken(token);

    if (user) {
      const AccessTokenUser = await AccessTokenModel.findOne({
        userId: user._id,
        token: token,
        status: true
      });

      if (AccessTokenUser && AccessTokenUser._id) {
        req.user = user.toJSON();
        next();
      } else {
        return res.status(httpStatus.UNAUTHORIZED).json({
          status: httpStatus.UNAUTHORIZED,
          message: "Not authorized"
        });
      }
    } else {
      return res.status(httpStatus.UNAUTHORIZED).json({
        status: httpStatus.UNAUTHORIZED,
        message: "Not authorized"
      });
    }
  } catch (e) {
    logs(`Error [${e}]`);
    return res.status(httpStatus.UNAUTHORIZED).json({
      status: httpStatus.UNAUTHORIZED,
      message: "Not authorized"
    });
  }
};

module.exports = auth;
