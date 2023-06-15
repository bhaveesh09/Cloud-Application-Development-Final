// FILL WITH STUFF
const { DataTypes } = require('sequelize')
const sequelize = require('../lib/sequelize')
const bcrypt = require('bcryptjs')

const SubmissionSchema = {
	assignmentId: { required: true },
	studentId: { required: true },
    timestamp: { required: true },
    grade: { required: false }
}
exports.SubmissionSchema = SubmissionSchema

exports.SubmissionClientFields = [
	'assignmentId',
	'studentId',
	'timestamp',
	'grade',
	'file'
]

const Submission = sequelize.define('submission', {
    timestamp: { type: DataTypes.STRING, allowNull: false },
    grade: { type: DataTypes.FLOAT, allowNull: true },
    file: { type: DataTypes.STRING, allowNull: false }
})
exports.Submission = Submission


