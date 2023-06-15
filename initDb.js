/*
 * This file contains a simple script to populate the database with initial
 * data from the files in the data/ directory.
 */

const sequelize = require('./lib/sequelize')
const { User, UserClientFields, insertNewUser } = require('./models/users')
const { Course, CourseClientFields } = require('./models/courses')
const { Assignment, AssignmentClientFields } = require('./models/assignments')
const { Submission, SubmissionClientFields } = require('./models/submissions')

const usrData = require('./data/users.json')
const crsData = require('./data/courses.json')
const assData = require('./data/assignments.json')
const subData = require('./data/submissions.json')

sequelize.sync().then(async function () {
  for (const u of usrData) {
	await insertNewUser(u)
  }
  //await Course.bulkCreate(crsData, { fields: CourseClientFields })
  //await Assignment.bulkCreate(assData, { fields: AssignmentClientFields })
  //await Submission.bulkCreate(subData, { fields: SubmissionClientFields })
})
