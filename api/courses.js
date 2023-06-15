const express = require('express')
const router = express.Router()
const { validateAgainstSchema, extractValidFields } = require('../lib/validation')
const { ValidationError } = require('sequelize')

const { Course,
    CourseSchema,
    CourseClientFields, 
    getCoursePage,
    getCourseById,
    getCSV } = require('../models/courses')

const { UserSchema,
    User,
    insertNewUser,
    getUserById,
    validateUser,
    getUserByEmail} = require('../models/users')
const { Assignment,
    AssignmentSchema } = require('../models/assignments')
const { UserCourse, UserCourseSchema } = require('../models/usercourses')
const { generateAuthToken, requireAuthentication } = require('../lib/auth')

router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const coursePage = await getCoursePage(page);
        coursePage.links = {};

        if (coursePage.currentPage < coursePage.totalPages) {
            coursePage.links.nextPage = `/courses?page=${coursePage.currentPage + 1}`;
            coursePage.links.lastPage = `/courses?page=${coursePage.totalPages}`;
        }
        if (coursePage.currentPage > 1) {
            coursePage.links.prevPage = `/courses?page=${coursePage.currentPage - 1}`;
            coursePage.links.firstPage = '/courses?page=1';
        }

        res.status(200).send(coursePage);
    } catch (err) {
        console.error(err);
        res.status(500).send({
            error: "Error fetching courses list. Please try again later."
        });
    }
});

router.get('/:id', async (req, res, next) => {

    //Hiding student and assignment info.
    const course = await getCourseById(req.params.id, false);

    //don't hide any course info in the log.
    const courseLog = await getCourseById(req.params.id, true);
    console.log("== course:\n", courseLog);

    if (course) {

        //return course info.
        res.status(200).send({
            course: course
        });

    } else {
        res.status(404).send({
            error: "Specified Course id not found."
        });
    }

});

router.get('/:id/students', requireAuthentication, async (req, res, next) => {

    //get course information.
    const course = await getCourseById(req.params.id, true);

    //confirm that the course exists.
    if (course) {

        //only admins and the course instructor can get student info.
        console.log("== course.instructorid: ", course.instructorid);
        console.log("== req.userId: ", req.userId);
        if (req.role == "admin" || (course.instructorId == req.user) && req.role === "instructor" ) {

            const students = await UserCourse.findAll({where: {courseId: parseInt(req.params.id)}})
            //return course student info.
            res.status(200).send({
                
                students: students
                
            });

        } else {
            res.status(403).send({
                error: "The request was not made by an authenticated User satisfying the authorization criteria."
            });
        }

    } else {
        res.status(404).send({
            error: "Specified Course id not found."
        });
    }

});

router.get('/:id/assignments', async (req, res, next) => {

    const course = await getCourseById(req.params.id, true);

    if (course) {

        //return course assignment info.
        res.status(200).send({
            assignments: course.assignments
        });

    } else {
        res.status(404).send({
            error: "Course id not found."
        });
    }

});

router.get('/:id/roster', requireAuthentication, async (req, res, next) => {


    const course = await getCourseById(req.params.id, true);

    //confirm that the course exists.
    if (course) {

        //only admins and the course instructor can get student info.
        console.log("== course.instructorid: ", course.instructorId);
        console.log("== req.userId: ", req.user);
        if (req.role == "admin" || (course.instructorId == req.user) && req.role === "instructor" ) {

            //return the CSV.
            const csv = await getCSV(req.params.id);
            res.attachment("Roster.csv");
            res.status(200).send(csv);

        } else {
            res.status(403).send({
                error: "User not authenticaed."
            });
        }

    } else {
        res.status(404).send({
            error: "Course id not found."
        });
    }

});


router.post('/', requireAuthentication, async function (req, res, next) {
    if (req.role != 'admin') {
        res.status(403).send({
            error: 'Must have admin role to create a new course'
        })
        return
    }

    if (!validateAgainstSchema(req.body, CourseSchema)) {
        res.status(400).send({
            error: 'Request body is not a valid Course object'
        })
        return
    }

    let course = extractValidFields(req.body, CourseSchema)

    const instructor = await getUserById(course.instructorId, false)
    console.log('  -- instructor:', instructor)
    if (!instructor) {
        res.status(400).send({
            error: 'Request body is not a valid Course object'
        })
        return
    }

    if (instructor.role != 'instructor') {
        res.status(400).send({
            error: 'instructorId must point to a user with the role \'instructor\''
        })
        return
    }

    try {
        course = await Course.create(course)
    } catch (err) {
        if (err instanceof ValidationError) {
            res.status(400).send({
                error: 'Request body is not a valid Course object'
            })
            return
        } else {
            next(err)
            return
        }
    }

    console.log('  -- course:', course)
    res.status(201).json({
        id: course.id,
        links: {
            course: `courses/${course.id}`
        }
    })
})

router.post('/:id/students', requireAuthentication, async function (req, res, next) {
	const id = parseInt(req.params.id)

	if (req.role != 'admin' && req.role != 'instructor') {
		res.status(403).send({
			error: 'Must have admin or instructor role to enroll/unenroll students in a course'
		})
		return
	}

	const course = await getCourseById(id, false)
	if (!course) {
		res.status(404).send({
			error: 'Requested course does not exist'
		})
		return
	}

	if (req.role == 'instructor' && (req.user.id != course.instructorId)) {
		res.status(403).send({
			error: 'Must be an instructor of the specified course to enroll/unenroll students in the course'
		})
		return
	}

	if (!req.body.add && !req.body.remove) {
		res.status(400).send({
			error: 'Request body must have at least an \'add\' or \'remove\' field'
		})
		return
	}

	const addList = req.body.add || []
	for (let i = 0; i < addList.length; ++i) {
		const userId = addList[i]
		const user = await getUserById(userId, false)
		if (!user) { continue }
		if (user.role != 'student') { continue }
		try {
			const test = await UserCourse.create({ userId: userId, courseId: id })
		} catch (err) {
			//console.log('  -- err:', err.name)
			if (err.name == 'SequelizeUniqueConstraintError')
				continue // power through exceptions about uniqueness constraints
			next(err)
		}
	}

	const removeList = req.body.remove || []
	for (let i = 0; i < removeList.length; ++i) {
		const userId = removeList[i]
		const user = await getUserById(userId, false)
		if (!user) { continue }
		try {
			const test = await UserCourse.destroy( { where: { userId: userId, courseId: id } })
		} catch (err) {
			next(err)
		}
	}

	res.status(200).send()
})

router.delete('/:id', requireAuthentication, async function (req, res, next) {
    const id = parseInt(req.params.id)
    const usr = await getUserById(req.user)
    const cors = await Course.findAll({ where: { id: id}})
    if (usr.role === 'admin') {
        const course = await getCourseById(id, false)
        const result = await Course.destroy({ where: { id: id }})
        if (result > 0) {
            const usrincrs = await UserCourse.destroy({ where: { courseId: id}})
            const ass = await Assignment.destroy({ where: { courseId: id }})
            res.status(204).send()
        } else {
            res.status(404).send({
                "error": "ID NOT FOUND"
            })
        }
    } else {
        res.status(403).send({ "error": "Incorrect Authentication Level" })
    }
})

router.patch('/:courseId', requireAuthentication, async function (req, res, next) {
    const id = parseInt(req.params.courseId)
    const usr = await getUserById(req.user)
    const courses = await Course.findAll({ where: {id: id}})
    if (courses.length <= 0) {
        res.status(404).send({"error": "ID NOT FOUND"})
        return;
    }
    const instructor = courses[0].instructorId
    if (usr.role === "admin" || (usr.role === "instructor" && usr.id == instructor)) {
        if (req.body &&
            req.body.subject &&
            req.body.number &&
            req.body.title &&
            req.body.term &&
            req.body.instructorId) {
            try {
                const result = await Course.update(req.body, {
                    where: { id: id },
                    fields: CourseClientFields
                })
                if (result[0] > 0) {
                    res.status(200).send()
                } else {
                    next()
                }
            } catch (e) {
                next(e)
            }

        } else {
            res.status(400).json({
                "error": "Request body needs to have every field (subject, number, title, term, and instructorId)"
            })
        }
    } else {
        res.status(403).json({
            "error": "You simply cannot...try being authenticated for once!"
        })
    }
})

router.post('/:id/users', requireAuthentication, async function (req, res, next) {
    //asdf
})

module.exports = router;
