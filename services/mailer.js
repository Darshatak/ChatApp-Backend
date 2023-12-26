// const sgMail = require("@sendgrid/mail");
// const dotenv = require('dotenv');
// dotenv.config({path:'../congif.env'})

// sgMail.setApiKey(process.env.SG_KEY);

// const sendSGMail = async ({
//   to,
//   sender,
//   subject,
//   html,
//   attachments,
//   text,
// }) => {
//   try {
//     const from = "darshatakvyas@gmail.com";

//     const msg = {
//       to: to, // Change to your recipient
//       from: from, // Change to your verified sender
//       subject: subject,
//       html: html,
//       // text: text,
//       attachments,
//     };

    
//     return sgMail.send(msg);
//   } catch (error) {
//     console.log(error);
//   }
// };

// exports.sendEmail = async (args) => {
//   if (!process.env.NODE_ENV === "development") {
//     return Promise.resolve();
//   } else {
//     return sendSGMail(args);
//   }
// };


const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: smtp.gmail.com,
  port: 587,
  secure: true,
  auth: {
    // TODO: replace `user` and `pass` values from <https://forwardemail.net>
    user: "heistofdevil@gmail.com",
    pass: "gvmw dtrs bmga yvqb"
    ,
  },
 
});

module.exports = transporter;