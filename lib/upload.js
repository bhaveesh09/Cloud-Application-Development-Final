const multer = require('multer')
const crypto = require('node:crypto')
const path = require('path')

const upload = multer({
    storage: multer.diskStorage({
        destination: `${__dirname}/../uploads`,
        filename: (req, file, callback) => {
            const filename  = crypto.pseudoRandomBytes(16).toString('hex')
            const extension = path.extname(file.originalname) // from StackOverflow
			console.log('  -- filename + extension:', filename + extension)
            callback(null, filename + extension)
        }
    })
})
exports.upload = upload