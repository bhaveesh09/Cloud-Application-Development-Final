const jwt = require('jsonwebtoken')

const secretKey = "TEEHEESECRETKEY"
exports.secretKey = secretKey

exports.generateAuthToken = function (id, role) {
    const payload = { sub: id, role: role }
    return jwt.sign(payload, secretKey, { expiresIn: "24h" })
}

// Basically from lecture notes, it lines up pretty well
exports.requireAuthentication = function (req, res, next) {
    const authHeader = req.get('Authorization') || ''
    const authHeaderParts = authHeader.split(' ')
    const token = authHeaderParts[0] === 'Bearer' ? authHeaderParts[1] : null

    try {
        const payload = jwt.verify(token, secretKey)
        req.user = payload.sub
		req.role = payload.role
        next()
    } catch (err) {
        console.error('== Error verifying token:', err)
        res.status(401).send({
            error: err
        })
    }
}
