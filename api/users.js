const { Router } = require('express')
const jwt = require('jsonwebtoken')
const { validateAgainstSchema, extractValidFields } = require('../lib/validation')
const { ValidationError } = require('sequelize')

const { User } = require('../models/users')

const router = Router()
const { UserSchema, insertNewUser, getUserById, validateUser } = require('../models/users')
const { generateAuthToken, requireAuthentication, secretKey } = require('../lib/auth')

// Create a new user
router.post('/', async function (req, res, next) {
	if (!validateAgainstSchema(req.body, UserSchema)) {
		res.status(400).send({
			error: "Request body is not a valid User object"
		})
		return
	}
	
	if (req.body.role == 'admin' || req.body.role == 'instructor') {
		const authHeader = req.get('Authorization') || ''
		const authHeaderParts = authHeader.split(' ')
		const token = authHeaderParts[0] === 'Bearer' ? authHeaderParts[1] : null
	
		let payload
		try {
			payload = jwt.verify(token, secretKey)
		} catch (err) {
			console.error('== Error verifying token:', err)
			res.status(403).send({
				error: err
			})
			return
		}
	
		if (payload.role != 'admin') {
			res.status(403).send({
				error: 'Creating an admin or instructor user requires admin privileges'
			})
			return
		}
	}

	const user = extractValidFields(req.body, UserSchema)

	if (
		user.role != 'student' &&
		user.role != 'instructor' &&
		user.role != 'admin'
	) {
		res.status(400).send({
			error: 'Request body is not a valid User object'
		})
	}
	
	let id
	try {
		id = await insertNewUser(req.body)
	} catch (err) {
		if (err instanceof ValidationError) {
			res.status(400).send({
				error: 'Request body was not a valid User object'
			})
			return
		} else {
			next(err)
			return
		}
	}
	
	res.status(201).json({
		id: id,
		links: {
			user: `/users/${id}`
		}
	})
})

// Log-in a user
router.post('/login', async function (req, res, next) {
    if (!req.body || !req.body.email || !req.body.password) {
		res.status(400).send({
			error: "Request body requires `email` and `password`"
		})
		return
	}
	
	let result
	try {
		result = await validateUser(req.body.email, req.body.password);
	} catch (err) {
		next(err)
	}

	console.log('  -- validateUser result:', result)
	if (result.auth) {
		const token = generateAuthToken(result.user.id, result.user.role);
		res.status(200).send({
			token: token
		})
	} else {
		res.status(401).send({
			error: "Invalid authentication credentials"
		})
	}
})

// Fetch data about a specific user
router.get('/:id', requireAuthentication, async function (req, res, next) {
    const id = parseInt(req.params.id)
    const usr = await getUserById(req.user, true)
    if (usr.role == 'admin' || (usr.role == 'instructor' && usr.id == id)) {
        try {
            const search = await getUserById(id, true)
            search.password = ""
            res.status(200).send(search)
        } catch (err) {
            res.status(404).send({
                "error": `Specified Course ${id} not found`
            })
        }
    } else {
        res.status(403).send({
            "error": "Bad user...bad!"
        })
    }
})

module.exports = router
