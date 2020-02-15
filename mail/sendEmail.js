const smtp = require("./config");
const logs = require("../helpers/logs");

const sendEmail = ({ to, from, template, subject }) => {
  return new Promise((resolve, reject) => {
    const options = {
      from: from || '"Fred Foo 👻" <foo@example.com>',
      to: to || "bar@example.com, baz@example.com",
      subject: subject || "Hello ✔",
      html: template || "<b>Hello world?</b>"
    };

    smtp.sendMail(options, (err, response) => {
      if (err) {
        logs(`Error on send message: ${err}`);
        reject(err);
      } else {
        logs(`Message sent.`);
        resolve(response);
      }
    });
  });
};
module.exports = sendEmail;
