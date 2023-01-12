const router = require('express').Router();
const userController =require('../controller/controller')

router.post('/save',userController.add)
router.post('/login',userController.login)
router.post("/token",userController.emailSend)
router.post("/send",userController.changepswd)
// router.post("/time",userController.expire)


module.exports = router;
