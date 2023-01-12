const { PrismaClient } = require("@prisma/client");
const jwt = require('jsonwebtoken')
const bcrypt = require("bcryptjs");
const nodemailer = require('nodemailer');
const appConst = require("../appConstants");
const moment = require('moment')

const prisma = new PrismaClient();
//post
const add = async (req, res) => {
  try {
    const salt = await bcrypt.genSalt(10);
    const encryptedPassword = await bcrypt.hash(req.body.password, salt);
    req.body.password = encryptedPassword;
    console.log("password::   " + encryptedPassword);
    const resp = await prisma.user.create({
      data: req.body,
    });
    res.status(200).json({
      message: appConst.status.success,
      Response: resp,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      message: appConst.status.fail,
      Response: error.message,
    });
  }
};
//token updation
const login = async (req, res) => {
  try {
    let data = []
    let errMsg = []
    if (req.session.views) {
      req.session.views++
      let user = JSON.parse(JSON.stringify(req.body.user));
      const find_user = await prisma.user.findUnique({
        where: {
          userName: String(user.userName),
        },
      });
      if (find_user) {
        const issame = await bcrypt.compare(user.password, find_user.password);

        if (issame) {
          user.token = jwt.sign({ id: find_user.id }, process.env.secretKey);
          console.log(user.token);

          const resp = await prisma.user.update({
            where: {
              userName: String(user.userName)
            },
            data: {
              userName: user.userName,
              password: find_user.password,
              token: user.token
            }
          });

          data.push(resp)
        } else {
          errMsg.push({ message: appConst.status.in_correct_password })
        }
      } else {
        errMsg.push({ message: appConst.status.in_correct_userName })
      }
    } else {
      req.session.views = 1
      errMsg.push({ message: appConst.status.session_expire })
    }
    if (errMsg.length > 0) {
      res.status(400).json({
        status: appConst.status.fail,
        response: errMsg,
        message: appConst.status.invalid_request,
      });
    } else {
      res.status(200).json({
        status: appConst.status.success,
        response: { data },
        message: appConst.status.success,
      });
    }
  } catch (error) {
    res.status(400).json({
      status: appConst.status.fail,
      response: null,
      message: error.message,
    });
  }
};

// generating the token and sending the mail
const emailSend = async (req, res) => {
  let user = JSON.parse(JSON.stringify(req.body.user));
  try {
    let data = []
    let errMsg = []
    const find_user = await prisma.user.findUnique({
      where: {
        email: String(user.email),
      },
    });
    if (find_user) {
      user.forgettoken = jwt.sign({ email: find_user.email }, process.env.secretKey);
      const date = moment().format();
      const time = moment(date).add(1, 'minutes'); 
      // const time = moment(date).add(5, 'minutes'); 
      const expiretime = moment(time).format('LTS')
      // const date = new Date()
      // const time = new Date(date.getTime() + 5 * 60000).toLocaleTimeString()
      const resp = await prisma.user.update({
        where: {
          email: String(user.email),
        },
        data: {
          forgettoken: user.forgettoken,
          expiretime: expiretime
        },
      });
      const find_email = await prisma.user.findFirst({
        where: {
          email: String(user.email),
          forgettoken: String(user.forgettoken)
        },
      });
      if (find_email) {
        let transporter = nodemailer.createTransport({
          host: "smtp.mailtrap.io",
          port: 2525,
          auth: {
            user: "ad7fb6ca913baa",
            pass: "87bc1cfd769d78",
          },
        });
        let mailOptions = {
          from: "pranavimalempati2000@gmail.com",
          to: "pranavimalempati2000@gmail.com",
          subject: "link to resetpassword",
          text: "reset your passord",
          html: `<h2>Hi,</h2>
          <h4> please click the below link to resetpassword</h4>
          <a href="">http://localhost:${process.env.PORT}/resetpswd/${user.forgettoken}</a>`,
        };
        transporter.sendMail(mailOptions, (err, info) => {
          if (err) {
            errMsg.push({ message: err.message })
            return err;
          }
          console.log("Mail Sent" + info.response);
        });
      } else {
        errMsg.push({ message: appConst.status.invalid_email })
      }
      data.push(resp)
    } else {
      errMsg.push({ message: appConst.status.user_notexist })
    }
    if (errMsg.length > 0) {
      res.status(400).json({
        status: appConst.status.fail,
        response: errMsg,
        message: appConst.status.invalid_request,
      });
    } else {
      res.status(200).json({
        status: appConst.status.success,
        response: { data },
        message: appConst.status.mail_sent,
      });
    }
  } catch (error) {
    console.log(error.message);
    res.status(400).json({
      status: appConst.status.fail,
      message: error.message,
    });
  }
};

// creating the new password
const changepswd = async (req, res) => {
  let user = JSON.parse(JSON.stringify(req.body.user));
  try {
    let data = []
    let errMsg = []
    const find_user = await prisma.user.findFirst({
      where: {
        email: String(user.email),
        forgettoken: String(user.forgettoken)
      },
    });
    const currenttime =  moment().format('LTS');
    console.log(currenttime)
    // const date = new Date()
    // const currenttime = new Date(date.getTime()).toLocaleTimeString()
    if (currenttime <= find_user.expiretime) {
      if (find_user) {
        const salt = await bcrypt.genSalt(10);
        const encryptedPassword = await bcrypt.hash(user.password, salt);
        user.password = encryptedPassword;
        const resp = await prisma.user.update({
          where: {
            email: String(user.email)
          },
          data: {
            password: user.password,
            // forgettoken: null
          }
        });
        data.push(resp)
      } else {
        errMsg.push({ message: appConst.status.invalid_email })
      }
    } else {

      errMsg.push({ message: `token expired ${moment(find_user.expiretime,"hh:mm:ss A").fromNow()}` })
    }
    if (errMsg.length > 0) {
      res.status(400).json({
        status: appConst.status.fail,
        response: errMsg,
        message: appConst.status.invalid_request,
      });
    } else {
      res.status(200).json({
        status: appConst.status.success,
        response: { data },
        message: appConst.status.success,
      });
    }
  } catch (error) {
    res.status(400).json({
      status: appConst.status.fail,
      message: error.message,
    });
  }
}





// const expire = async (req, res) => {
//   let user = JSON.parse(JSON.stringify(req.body.user));
//   try {
//     // let date = new Date()
//     const find_user = await prisma.user.findUnique({
//       where: {
//         email: String(user.email),
//       },
//     });
//     if (find_user) {
//       user.forgettoken = jwt.sign({ email: find_user.email }, process.env.secretKey);
//       const date = moment().format();
//       console.log(date)
//       // const time = moment(date).add(2, 'minutes'); 
//       // const expiretime = moment(time).format()
//       // console.log(expiretime);
//       // const currenttime =  moment().format('LTS');
//       // console.log(currenttime);
//       // const expiretime = moment(time).format('LTS')
//       // console.log(expiretime)
//       // const date = new Date()
//       // const time = new Date(date.getTime() + 5 * 60000).toLocaleTimeString()
//       // const currenttime = new Date(date.getTime()).toLocaleTimeString()
//       // const resp = await prisma.user.update({
//       //   where: {
//       //     email: String(user.email),
//       //   },
//       //   data: {
//       //     forgettoken: user.forgettoken,
//       //     expiretime: expiretime
//       //   },
//       // });
//       // console.log(find_user.expiretime)
//       if(date <= find_user.expiretime){
//         console.log("success")
//       }else{
//         console.log("expire")
//       }
//     }
//   } catch (error) {
//     res.status(400).json({
//       status: appConst.status.fail,
//       message: error.message,
//     });
//   }
// }

// const forgetPassword = async (req, res) => 
// { try 
//   {
//      const findEmail = await prisma.user.findFirst(
//       { where: { email: req.body.email }, });
//        if (findEmail) {
//          const token = jwt.sign({ data: req.body.email, }, "mysterykeytokengeneratedrandomly", { expiresIn: "15m", });
//           mail.sendForgetPasswordMail(token, req.body.email, findEmail.firstName); 
//           await prisma.user.update({ where: { email: req.body.email }, data: { changedPassword: true, }, }); 
//           res.send({ message: token }); 
//         } else { 
//           res.send({ message: "oops! looks like you need to register with us first!", status: "Failed", }); 
//         }
//        } catch (error) { 
//         res.send({ message: "no user found", status: "failed" }); 
//       }
//      };
//     const checkForgetPassword = async (req, res) => {
//        try { 
//           const decoded = jwt.verify(req.body.token, "mysterykeytokengeneratedrandomly"); 
//           const checkMail = await prisma.user.findFirst({ where: { email: decoded.data }, }); 
//           if (decoded && checkMail.changedPassword) {
//              encryptedPassword = await bcrypt.hash(req.body.password, 10); 
//              const findEmail = await prisma.user.update({ where: { email: decoded.data }, data: { password: encryptedPassword, changedPassword: false, resetPassword: false, }, }); 
//              res.send({ message: "changed succesfully" });
//              } else {
//               res.send({ message: "", status: "failed" });
//              } 
//             } catch (error) { 
//               res.send({ error: error, status: "failed" }); 
//             }
//            };

module.exports = { add, login, emailSend, changepswd};
