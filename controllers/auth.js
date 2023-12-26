const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const otpGenerator = require("otp-generator");
const filterObj = require("../utils/filterObj");
const { promisify } = require("util");
const User = require("../MODELS/user");
// const mailService = require('../services/mailer');
const catchAsync = require("../utils/catchAsync");
// const { transporter } = require("../services/mailer");
const nodemailer = require("nodemailer");

const signToken = (user) => jwt.sign({ user }, process.env.JWT_SECRET);
const otp = require("../Templates/Mail/otp");
const resetPassword = require("../Templates/Mail/resetPassword");


// User Register


// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST,
//   port: process.env.SMTP_PORT,
//   secure: true,
//   auth: {
//     // TODO: replace `user` and `pass` values from <https://forwardemail.net>
//     user: process.env.SMTP_MAIL,
//     pass: process.env.SMTP_PASSWORD,
//   },
 
// });

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    // TODO: replace `user` and `pass` values from <https://forwardemail.net>
    user: "heistofdevil@gmail.com",
    pass: "gvmw dtrs bmga yvqb"
    ,
  },
 
});
exports.register = catchAsync(async (req, res, next) => {
  const { firstName, lastName, email, password } = req.body;

  const filteredBody = filterObj(
    req.body,
    "firstName",
    "lastName",
    "email",
    "password"
  );

  // check if a verified user with given email exists

  const existing_user = await User.findOne({ email: email });

  if (existing_user && existing_user.verified) {
    // user with this email already exists, Please login
    return res.status(400).json({
      status: "error",
      message: "Email already in use, Please login.",
    });
  } else if (existing_user) {
    // if not verified than update prev one

    await User.findOneAndUpdate({ email: email }, filteredBody, {
      new: true,
      validateModifiedOnly: true,
    });

    // generate an otp and send to email
    req.userId = existing_user._id;
    next();
  } else {
    // if user is not created before than create a new one
    const new_user = await User.create(filteredBody);

    // generate an otp and send to email
    req.userId = new_user._id;
    next();
  }
});

exports.sendOTP = catchAsync(async (req, res, next) => {
  const { userId } = req;
  const new_otp = otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    specialChars: false,
    lowerCaseAlphabets: false,
  });

  const otp_expiry_time = Date.now() + 10 * 60 * 1000; // 10 Mins after otp is sent

  const user = await User.findByIdAndUpdate(userId, {
    otp_expiry_time: otp_expiry_time,
  });

  user.otp = new_otp.toString();

  await user.save({ new: true, validateModifiedOnly: true });

  console.log(new_otp);

  // TODO send mail
  transporter.sendMail({
    from :"heistofdevil@gmail.com",
    to :user.email,
    subject :"Verification OTP send from Chat APP",
    html :otp(user.firstName, new_otp),
  
},function(error,info){
  if (error) {
    console.log("mail"+error)
  }else{
    console.log("Mail send on " + user.email)
  }

})
  // mailService.sendEmail({
  //   from: "shreyanshshah242@gmail.com",
  //   to: user.email,
  //   subject: "Verification OTP",
  //   html: otp(user.firstName, new_otp),
  //   attachments: [],
  // });

  res.status(200).json({
    status: "success",
    message: "OTP Sent Successfully!",
  });
});


exports.verifyOTP = catchAsync(async (req, res, next) => {
  // verify otp and update user accordingly
  const { email, otp } = req.body;
  const user = await User.findOne({
    email,
    otp_expiry_time: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({
      status: "error",
      message: "Email is invalid or OTP expired",
    });
  }

  if (user.verified) {
    return res.status(400).json({
      status: "error",
      message: "Email is already verified",
    });
  }

  if (!(await user.correctOTP(otp, user.otp))) {
    res.status(400).json({
      status: "error",
      message: "OTP is incorrect",
    });

    return;
  }

  // OTP is correct

  user.verified = true;
  user.otp = undefined;
  await user.save({ new: true, validateModifiedOnly: true });

  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    message: "OTP verified Successfully!",
    token,
    user_id: user._id,
  });
});

// Protect
exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return res.status(401).json({
      message: "You are not logged in! Please log in to get access.",
    });
  }
  // 2) Verification of token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // Object.entries(decoded).forEach(([key, value]) => {
  //   console.log(`${key}:`, value);
  // });

  // 3) Check if user still exists

  const this_user = await User.findById(decoded.user);
  // console.log("this_user" + this_user)
  if (!this_user) {
    return res.status(401).json({
      message: "The user belonging to this token does no longer exists.",
    });
  }
  // 4) Check if user changed password after the token was issued
  if (this_user.changedPasswordAfter(decoded.iat)) {
    return res.status(401).json({
      message: "User recently changed password! Please log in again.",
    });
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = this_user;
  next();
});

// User Login
exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;
  
    // console.log(email, password);
  
    if (!email || !password) {
      res.status(400).json({
        status: "error",
        message: "Both email and password are required",
      });
      return;
    }
  
    const userDoc = await User.findOne({ email: email }).select("+password");
  
    if (!userDoc || !userDoc.password) {
      res.status(400).json({
        status: "error",
        message: "Email or password is incorrect",
      });
  
      return;
    }
  
    if (!userDoc || !(await userDoc.correctPassword(password, userDoc.password))) {
      res.status(400).json({
        status: "error",
        message: "Email or password is incorrect",
      });
  
      return;
    }
  
    const token = signToken(userDoc._id);
  
    res.status(200).json({
      status: "success",
      message: "Logged in successfully!",
      token,
      user: userDoc._id,
    });
  });


  exports.forgotPassword = catchAsync(async (req, res, next) => {
    // 1) Get user based on POSTed email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "There is no user with email address.",
      });
    }
  
    // 2) Generate the random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });
  
    // 3) Send it to user's email
    try {
      const resetURL = `http://localhost:3000/auth/new-password?token=${resetToken}`;
      // // TODO => Send Email with this Reset URL to user's email address
  
      console.log(user.email);

      transporter.sendMail({
          from :"heistofdevil@gmail.com",
          to :user.email,
          subject :"Password reset request send from Chat APP",
          html :resetPassword(user.firstName, resetURL),
        
      },function(error,info){
        if (error) {
          console.log("mail"+error)
        }else{
          console.log("Mail send on " + user.email)
        }

      })

      res.status(200).json({
        status: "success",
        message: "Token sent to email!",
        //remove this when email is setuped
        token: resetURL,
      });
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
  
      return res.status(500).json({
        message: "There was an error sending the email. Try again later!",
      });
    }
  });
  
  exports.resetPassword = catchAsync(async (req, res, next) => {
    // 1) Get user based on the token
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.body.token)
      .digest("hex");
  
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });
  
    // 2) If token has not expired, and there is user, set the new password
    if (!user) {
      return res.status(400).json({
        status: "error",
        message: "Token is Invalid or Expired",
      });
    }
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
  
    // 3) Update changedPasswordAt property for the user
    // 4) Log the user in, send JWT
    const token = signToken(user._id);
  
    res.status(200).json({
      status: "success",
      message: "Password Reseted Successfully",
      token,
    });
  });