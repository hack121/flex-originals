const nodemailer = require("nodemailer");
const user = require("../config/env")[process.env.NODE_ENV].mail.user;
const pass = require("../config/env")[process.env.NODE_ENV].mail.pass;

const smtpTransport = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.google.com",
  auth: {
    user,
    pass
  }
});
module.exports = smtpTransport;
