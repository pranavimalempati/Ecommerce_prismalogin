const { PrismaClient } = require("@prisma/client");
const jwt =require('jsonwebtoken')
const bcrypt = require("bcryptjs");
const nodemailer = require('nodemailer');
const appConst = require("../appConstants");

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
    let data =[] 
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
          where:{
            userName: String(user.userName)
          },
          data:{
            userName:user.userName,
            password:find_user.password,
            token:user.token}
          });

          data.push(resp)
      } else {
        errMsg.push({message:appConst.status.in_correct_password})
      }
    } else {
      errMsg.push({message:appConst.status.in_correct_userName})
    }
  } else {
    req.session.views = 1
    errMsg.push({message:appConst.status.session_expire})
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
    let data =[] 
    let errMsg = [] 
    const find_user = await prisma.user.findUnique({
      where: {
        email: String(user.email),
      },
    });
    if(find_user) {
      user.forgettoken = jwt.sign({ email: find_user.email },process.env.secretKey);
       
      const resp = await prisma.user.update({
        where: {
          email: String(user.email),
        },
        data: {
          forgettoken: user.forgettoken,
        },
      });
      const find_email = await prisma.user.findFirst({
        where: {
          email: String(user.email),
          forgettoken: String(user.forgettoken)
        },
      });
      if(find_email){
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
            errMsg.push({message:err.message})
            return err;
          }
          console.log("Mail Sent" + info.response);
        });
      }else{
        errMsg.push({message:appConst.status.invalid_email})
      }
      data.push(resp)
    }else{
      errMsg.push({message:appConst.status.user_notexist})
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
      status:appConst.status.fail,
      message: error.message,
    });
  }
};

// creating the new password
const changepswd = async(req,res)=>{
  let user = JSON.parse(JSON.stringify(req.body.user));
  try {
    const find_user = await prisma.user.findFirst({
      where: {
        email: String(user.email),
        forgettoken: String(user.forgettoken)
      },
    });
    if(find_user){
      const salt = await bcrypt.genSalt(10);
      const encryptedPassword = await bcrypt.hash(user.password, salt);
      user.password = encryptedPassword;
      const resp = await prisma.user.update({
        where:{
          email: String(user.email)
        },
        data:{
          password:user.password,
          forgettoken:null
         }
        });
        res.status(200).json({
          status: appConst.status.success,
          response:resp,
          message: appConst.status.success,
      });
    }else{
      res.status(400).json({
        status:appConst.status.fail,
        message: appConst.status.invalid_email,
      });
    }
  } catch (error) {
    res.status(400).json({
      status:appConst.status.fail,
      message: error.message,
    });
  }
}

module.exports = { add,login,emailSend,changepswd};
