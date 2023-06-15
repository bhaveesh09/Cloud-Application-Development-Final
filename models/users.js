const { DataTypes } = require('sequelize')
const sequelize = require('../lib/sequelize')
const bcrypt = require('bcryptjs')

const UserSchema = {
    name: { required: true },
    email: { required: true },
    password: { required: true },
    role: { required: true }
}
exports.UserSchema = UserSchema

const User = sequelize.define('user', {
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: false }
})
exports.User = User

exports.insertNewUser = async function (user) {
    const hash = await bcrypt.hash(user.password, 8)
    user.password = hash
    console.log("  -- user:", user)
    const usr = await User.create(user)
    return usr.id
}

exports.getUserById = async function (userId, includePassword) {
    const usr = await User.findByPk(userId)
    if (usr == null) {
        return null
    }
    // Do basic projection for checking if truthy
    const projection = (includePassword) ? usr : (usr.password = 0)
    return usr
}

exports.validateUser = async function (email, password) {
    const usrs = await User.findAll( { where: { email: email } } )
    var usr
	if (!usrs || !usrs[0]) {
		return { user: null, auth: null }
	}
	console.log('  -- usrs[0].dataValues:', usrs[0].dataValues)
    for (var i = 0; i < usrs.length; i++) {
		console.log(`  -- comparing ${password} to ${usrs[i].dataValues.password}`)
        var res = await bcrypt.compare(password, usrs[i].dataValues.password)
        if (res) {
            usr = await User.findByPk(usrs[i].dataValues.id)
            break
        }
    }
    const auth = usr && await bcrypt.compare(password, usr.password)
	return { user: usr, auth: auth }
}

exports.getUserByEmail = async function (email, password) {
    const usrs = await User.findAll( { where: { email: email } } )
    var usr
    for (var i = 0; i < usrs.length; i++) {
        var res = await bcrypt.compare(password, usrs[i].password)
        if (res) {
            usr = await User.findByPk(usrs[i].id)
            break
        }
    }
    console.log(usr)
    return usr || {}
}
