const express = require('express');
const createError = require('http-errors');
const morgan = require('morgan');
const session = require('express-session')
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev'));
const router =require('./routes/api.route')
app.use(
  session({
       secret: "hello world",
      resave: true,
      saveUninitialized: false,
      cookie: {
           expires: 60000
      }
  })
);
async function run() {
    console.log(`server started...`);
    app.use("/", router)
  
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 @ http://localhost:${PORT}`));
  }
  run();
