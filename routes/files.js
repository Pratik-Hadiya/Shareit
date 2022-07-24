const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const File = require('../models/file');
const { v4: uuid4 } = require('uuid');
const file = require('../models/file');

let storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName)
    }
})

let upload = multer({
    storage,
    limit: {fileSize: 1000000 * 100},
}).single('myfile');

router.post('/', (req, res) => {
    
        
    // Store file
        upload(req, res, async(err) => {
            // validate request
            if(!req.file) {
                return res.json({eror: 'All fields are required.'});
            }

            if(err) {
                return res.status(500).send({eror: err.message})
            }

            // Store into Database
            const file = new File({
                filename: req.file.filename,
                uuid: uuid4(),
                path: req.file.path,
                size: req.file.size
            });

            const response = await file.save();
            return res.json({file: `${process.env.APP_BASE_URL}/files/${response.uuid}`});
            // http://localhost:3000/files/48451fdfd-d1f54sfdvv
        })

    

    // Response -> Link

});

router.post('/send', async(req, res) => {
    const { uuid, emailTo, emailFrom } = req.body;
    // Validate request
    if(!uuid || !emailTo || !emailFrom){
        return res.status(422).send({ eror: 'All fields are required.'});
    }

    // Get data from database
    const file = await File.findOne({uuid: uuid});
    if(file.sender){
        return res.status(422).send({ eror: 'Email already sent.'});
    }

    file.sender = emailFrom;
    file.receiver = emailTo;
    const response = await file.save();

    // Send email
    const sendMail = require('../services/emailService');
    sendMail({
        from: emailFrom,
        to: emailTo,
        subject: 'Shareit file sharing',
        text: `${emailFrom} shared a file with you.`,
        html: require('../services/emailTemplate')({
            emailFrom: emailFrom,
            downloadLink: `${process.env.APP_BASE_URL}/files/${file.uuid}`,
            size: parseInt(file.size/1000) + ' KB',
            expires: 'Tommorow at 2 A.M.'
        })
    });
    return res.send({success: true});
});

module.exports = router;