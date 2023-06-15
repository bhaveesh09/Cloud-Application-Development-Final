// FILL WITH STUFF
const { DataTypes } = require('sequelize')
const sequelize = require('../lib/sequelize')
const bcrypt = require('bcryptjs')
const { Assignment } = require('./assignments')
const { User } = require('./users')

const CourseSchema = {
    subject: { required: true },
    number: { required: true },
    title: { required: true },
    term: { required: true },
    instructorId: { required: true }
}
exports.CourseSchema = CourseSchema

exports.CourseClientFields = [
	'subject',
	'number',
	'title',
	'term',
	'instructorId'
]

const Course = sequelize.define('course', {
    subject: { type: DataTypes.STRING, allowNull: false },
    number: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    term: { type: DataTypes.STRING, allowNull: false }
})
exports.Course = Course

function getCoursePage(page) {
    return new Promise(async (resolve, reject) => {
    	try {
        	const pageSize = 10; // Page size set to 10
        	const offset = (page - 1) * pageSize
  
        	if (isNaN(offset) || isNaN(pageSize)) {
        		throw new Error('Invalid pagination values.')
    		}
  
        	const { count, rows } = await Course.findAndCountAll({
        		offset: offset,
        		limit: pageSize,
        		order: [['id', 'ASC']]
        	})
  
    		const lastPage = Math.ceil(count / pageSize)
  
        	resolve({
        		courses: rows,
    			currentPage: page,
        		totalPages: lastPage,
        		pageSize: pageSize,
        		totalCourses: count
        	})
    	} catch (err) {
    		reject(err)
    	}
    })
}
exports.getCoursePage = getCoursePage

async function getCourseById(id, includeRelations) {
    try {
    	const includeOptions = includeRelations ? [{ model: Assignment }] : []
  
    	const course = await Course.findByPk(id, { include: includeOptions })
  
    	return course ? course.toJSON() : null
    } catch (err) {
    	console.error(err)
    	return null
    }
  }

exports.getCourseById = getCourseById

exports.getInstructorId = async (id) => {
	try {
	  const course = await Course.findByPk(id, { attributes: ['instructorId'] });
  
	  if (!course) {
		throw new Error('Course not found.');
	  }
	  return course.instructorId;
	} catch (err) {
	  console.error(err);
	  return null;
	}
  };

exports.getCSV = async function (id) {
	try {
	  const course = await Course.findByPk(id, { include: User });
	  
	  if (!course) {
		throw new Error('Course not found.');
	  }
  
	  const students = course.users.filter(user => user.role === 'student');
  
	  let csv = 'ID,Name,Email\n';
  
	  students.forEach(student => {
		csv += `${student.id},${student.name},${student.email}\n`;
	  });
  
	  return csv;
	} catch (err) {
	  console.error(err);
	  return null;
	}
  };

