// FILL WITH STUFF
const { DataTypes } = require('sequelize')
const sequelize = require('../lib/sequelize')
const bcrypt = require('bcryptjs')

const {Submission} = require('./submissions')

const AssignmentSchema = {
    courseId: { required: true },
    title: { required: true },
    points: { required: true },
    due: { required: true }
}
exports.AssignmentSchema = AssignmentSchema

exports.AssignmentClientFields = [
	'courseId',
	'title',
	'points',
	'due'
]

const Assignment = sequelize.define('assignment', {
    title: { type: DataTypes.STRING, allowNull: false },
    points: { type: DataTypes.INTEGER, allowNull: false },
    due: { type: DataTypes.STRING, allowNull: false }
})
exports.Assignment = Assignment

async function getAssignmentById(id) {
    const assignment = await Assignment.findByPk(id)
    return assignment
}
exports.getAssignmentById = getAssignmentById


exports.assignmentExists = async (aid) => {
    try {
      const assignment = await Assignment.findByPk(aid);
  
      return !!assignment;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  async function getSubmissionPage(query) {
    try {
      const assignment = await Assignment.findByPk(query.assignmentid);
  
      if (!assignment) {
        throw new Error('Invalid assignment ID');
      }
  
      const pageSize = 5;
      const offset = (query.page - 1) * pageSize;
      
      console.log(query)
      const where = {
        assignmentId: query.assignmentid,
      };
  
      if (query.studentId) {
        where.studentId = query.studentId;
      }
  
      const { count, rows: submissions } = await Submission.findAndCountAll({
        
        where,
        order: [['id', 'ASC']],
        offset,
        limit: pageSize,
      });
  
      const totalPages = Math.max(Math.ceil(count / pageSize), 1);
  
      const results = submissions.map(sub => ({
        assignmentid: sub.assignmentId,
        studentid: sub.studentId,
        timestamp: sub.timestamp,
        file: "/uploads/" + sub.filename,
      }));
  
      const url = `/assignments/${query.assignmentid}/submissions?${query.studentId ? `studentId=${query.studentId}&` : ""}page=`;
  
      return {
        submissions: results,
        results: count,
        page: query.page,
        totalPages: totalPages,
        first: url + "1",
        next: url + Math.min(query.page + 1, totalPages).toString(),
        last: url + totalPages.toString(),
      };
    } catch (err) {
      console.error(err);
      return null;
    }
  }
  
  exports.getSubmissionPage = getSubmissionPage;