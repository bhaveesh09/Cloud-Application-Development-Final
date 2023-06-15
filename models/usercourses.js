// FILL WITH STUFF
const { DataTypes } = require('sequelize')
const sequelize = require('../lib/sequelize')
const bcrypt = require('bcryptjs')

const UserCourseSchema = {
    userId: { required: true },
	courseId: { required: true }
}
exports.UserCourseSchema = UserCourseSchema

exports.UserCourseClientFields = [
	'userId',
	'courseId'
]

const UserCourse = sequelize.define('usercourse', {  })
exports.UserCourse = UserCourse
