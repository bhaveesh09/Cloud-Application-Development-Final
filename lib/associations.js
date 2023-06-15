const { User } = require('../models/users')
const { Course } = require('../models/courses')
const { Assignment } = require('../models/assignments')
const { Submission } = require('../models/submissions')
const { UserCourse } = require('../models/usercourses')

function setAssociations() {
	// many Assignments to one Course
	Course.hasMany(Assignment, {
		onDelete: 'CASCADE',
		onUpdate: 'CASCADE',
		foreignKey: { allowNull: false }
	})
	Assignment.belongsTo(Course)

	// many Courses to many Users
	Course.belongsToMany(User, {
		through: UserCourse
	})
	User.belongsToMany(Course, {
		through: UserCourse
	})

	// many Courses to one User via instructorId
	User.hasMany(Course, {
		onDelete: 'CASCADE',
		onUpdate: 'CASCADE',
		foreignKey: { name: 'instructorId', allowNull: false }
	})
	Course.belongsTo(User, {
		foreignKey: { name: 'instructorId', allowNull: false }
	})

	// many Submissions to one User
	User.hasMany(Submission, {
		onDelete: 'CASCADE',
		onUpdate: 'CASCADE',
		foreignKey: { name: 'studentId', allowNull: false }
	})
	Submission.belongsTo(User, {
		foreignKey: { name: 'studentId', allowNull: false }
	})

	// many Submissions to one Assignment
	Assignment.hasMany(Submission, {
		onDelete: 'CASCADE',
		onUpdate: 'CASCADE',
		foreignKey: { allowNull: false }
	})
	Submission.belongsTo(Assignment)
}
exports.setAssociations = setAssociations