// FILL WITH STUFF
const express = require('express')
const router = express.Router()
const { validateAgainstSchema, extractValidFields } = require('../lib/validation')
const { ValidationError } = require('sequelize')
const { upload } = require('../lib/upload')

const { Assignment, AssignmentSchema, AssignmentClientFields, getAssignmentById, assignmentExists, getSubmissionPage } = require('../models/assignments')
const { Submission, SubmissionSchema, SubmissionClientFields } = require('../models/submissions')
const { Course, CourseClientFields, getCourseById, getInstructorId} = require('../models/courses')
const { UserCourse } = require('../models/usercourses')
const { generateAuthToken, requireAuthentication } = require('../lib/auth')
const { UserSchema,
    User,
    insertNewUser,
    getUserById,
    validateUser,
    getUserByEmail } = require('../models/users')

// Fetch data about a specific assignment
router.get('/:courseId', async function (req, res, next) {
    const id = parseInt(req.params.courseId)
    try {
        const assign = await Assignment.findAll({ where: { courseId: id }})
        const assignID = await Assignment.findAll({ where: { id: id }})
        if (assign.length > 0) {
            res.status(200).send(assign)
        } else if (assignID.length > 0) {
            res.status(200).send(assignID)
        } else {
            res.status(404).send({ "error": "Cannot find assignment" })
        }
    } catch (err) {
        next(err)
    }
})

// router.get('/:aid/submissions', requireAuthentication, async function (req, res) {
//     const assignmentId = parseInt(req.params.aid)
//     const usr = await getUserById(req.user, false)
//     const ass = await Assignment.findByPk(assignmentId)
//     if (!ass) {
//         res.status(404).send({"error": "ID NOT FOUND"})
//         return;
//     }
//     const courseId = parseInt(ass.courseId)
//     const courses = await Course.findAll({ where: { id: courseId }})
//     if (courses.length <= 0) {
//         res.status(404).send({"error": "ID NOT FOUND (courses)"})
//         return;
//     }
//     const courseInstructorId = courses[0].instructorId
//     if (usr.role === "admin" || (usr.role === "instructor" && usr.id == courseInstructorId)) {
//         try {
//             const subs = await Submission.findAll({ where: { assignmentId: assignmentId }})
//             if (subs.length > 0) {
//             res.status(200).json({
//                 submissions: subs
//             })
//             } else {
//                 res.status(200).send({
//                     "status": "No SUBMISSIONS for this ASSIGNMENT"
//                 })
//             }
//         } catch (err) {
//             res.status(404).json({
//                 "error": err
//             })
//         }
//     } else {
//         res.status(403).json({
//             "error": "Invalid access!"
//         })
//     }
// })


router.get('/:id/submissions', requireAuthentication, async (req, res, next) => {
    try {
      const assignmentId = req.params.id;
      const exists = await assignmentExists(assignmentId);
      if (!exists) {
        return res.status(404).send({
          error: "Assignment not found."
        });
      }
      
      const instructorId = await getInstructorId(assignmentId); // Modified function name
      const isAuthorized = req.role === "admin" || req.userId === instructorId; // Modified property names
      if (!isAuthorized) {
        return res.status(403).send({
          error: "User is not authorized."
        });
      }
  
      const submissionQuery = {
        assignmentid: assignmentId,
        studentid: req.query.studentid || null,
        page: req.query.page || 1
      };
  
      const resultPage = await getSubmissionPage(submissionQuery);
  
      res.status(200).send({ resultPage });
    } catch (err) {
      next(err);
    }
  });


router.post('/', requireAuthentication, async function (req, res, next) {
	if (req.role != 'admin' && req.role != 'instructor') {
		res.status(403).send({
			error: 'Must have admin or instructor role to create an assignment'
		})
		return
	}

	if (!validateAgainstSchema(req.body, AssignmentSchema)) {
		res.status(400).send({
			error: 'Request body is not a valid Assignment object'
		})
		return
	}

	let assignment = extractValidFields(req.body, AssignmentSchema)

	const course = await getCourseById(assignment.courseId, false)
	if (!course) {
		res.status(400).send({
			error: 'Request body is not a valid Assignment object'
		})
		return
	}

	if (req.role == 'instructor' && (req.user != course.instructorId)) {
		res.status(403).send({
			error: 'Must be an instructor of the specified course to add an assignment'
		})
		return
	}

	try {
		assignment = await Assignment.create(assignment)
	} catch (err) {
		if (err instanceof ValidationError) {
			res.status(400).send({
				error: 'Request body is not a valid Assignment object'
			})
			return
		} else {
			next(err)
			return
		}
	}

	console.log('  -- assignment:', assignment)
	res.status(201).json({
		id: assignment.id,
		links: {
			assignment: `assignments/${assignment.id}`
		}
	})
})

router.post('/:id/submissions', requireAuthentication, upload.single('file'), async function (req, res, next) {
	const id = parseInt(req.params.id)

	if (req.role != 'student') {
		res.status(403).send({
			error: 'Must have student role to make a submission'
		})
		return
	}

	const assignment = await getAssignmentById(id)
	if (!assignment) {
		res.status(404).send({
			error: 'Requested assignment does not exist'
		})
		return
	}

	const enrollment = await UserCourse.findAll({ where: { userId: req.user } })
	//console.log('  -- enrollment:', enrollment)
	let enrolled = false
	for (const uc of enrollment) {
		if (assignment.courseId == uc.courseId) {
			enrolled = true
			break
		}
	}
	if (!enrolled) {
		res.status(403).send({
			error: 'Must be enrolled in the course this assignment is from'
		})
		return
	}

	if (!req.file) {
        res.status(400).send({
            error: 'Invalid file'
        })
        return
    }

	if (!validateAgainstSchema(req.body, SubmissionSchema)) {
        res.status(400).send({
            error: 'Request body is not a valid Submission object'
        })
        return
    }

	const assignmentId = parseInt(req.body.assignmentId)
	if (assignmentId != id) {
		res.status(400).send({
			error: 'assignmentId must match the id specified in the URL'
		})
		return
	}

	const studentId = parseInt(req.body.studentId)
	if (studentId != req.user) {
		res.status(403).send({
			error: 'studentId must match your own User id'
		})
		return
	}

    let submission = {
        assignmentId: assignmentId,
		studentId: studentId,
		timestamp: req.body.timestamp,
		grade: null,
		file: `/uploads/${req.file.filename}`
    }
    try {
        submission = await Submission.create(submission)
		console.log('  -- submission:', submission)
        res.status(201).send({
            id: submission.id
        })
    } catch (err) {
        next(err)
    }
})

router.delete('/:id', requireAuthentication, async function (req, res, next) {
    const assignmentId = parseInt(req.params.id)
    const usr = await getUserById(req.user, false)
    const ass = await Assignment.findByPk(assignmentId)
    if (!ass) {
        res.status(404).send({"error": "ID NOT FOUND"})
        return;
    }
    const courseId = parseInt(ass.courseId)
    const courses = await Course.findAll({ where: { id: courseId }})
    if (courses.length <= 0) {
        res.status(404).send({"error": "ID NOT FOUND (courses)"})
        return;
    }
    const courseInstructorId = courses[0].instructorId
    if ((usr.role === 'admin' || (usr.role == 'instructor' && usr.id == courseInstructorId))) {
        try {
            if (ass.id == assignmentId) {
                try {
                    const result = await Assignment.destroy({ where: {id: assignmentId}})
                    const subsResult = await Submission.destroy({ where: {assignmentId: assignmentId}})
                    if (result > 0) {
                        res.status(204).send()
                    } else {
                        res.status(404).send({
                            "error": "Assignment id not found"
                        })
                    }
                } catch(e) {
                    next(e)
                }
            }
        } catch(err) {
            res.status(404).send({
                "error": "Assignment id not found"
            })
        }
    } else {
        res.status(403).json({
            "error": "Inauthentic user: path to authenticity is about facing reality"
        })
    }
})

router.patch('/:aid', requireAuthentication, async function (req, res, next) {
    const id = parseInt(req.params.aid)
    const usr = await getUserById(req.user, false)
    const ass = await Assignment.findAll({ where: {id: id}})
    if (ass.length <= 0) {
        res.status(404).send({"error": "ID NOT FOUND"})
        return;
    }
    const cid = ass[0].courseId
    const courses = await Course.findAll({ where: {id: cid}})
    const course = courses[0]
    if (courses.length <= 0) {
        res.status(404).send({"error": "There is no course for the courseId on this assignment...wild."})
        return;
    }
    const instructor = course.instructorId
    if (usr.role === "admin" || (usr.role === "instructor" && usr.id == instructor)) {
        if (req.body &&
            req.body.courseId &&
            req.body.title &&
            req.body.points &&
            req.body.due) {
            try {
                const result = await Assignment.update(req.body, {
                    where: { id: id },
                    fields: AssignmentClientFields
                })
                if (result[0] > 0) {
                    res.status(200).send()
                } else {
                    next()
                }
            } catch (err) {
                next(err)
            }
        } else {
            res.status(400).json({
                "error": "Request body needs to have the fields -> courseId, title, points, and due"
            })
        }
    } else {
        res.status(403).json({
            "error": "Not logged-in"
        })
    }
})

router.post('/:id/submissions', requireAuthentication, async function (req, res, next) {
	//asdf
})

module.exports = router
