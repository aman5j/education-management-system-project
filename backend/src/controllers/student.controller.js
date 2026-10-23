// import Student from "../models/Student.js";

import mongoose from "mongoose";

import Student from "../models/Student.js";
import StudentAdmission from "../models/StudentAdmission.js";
import Course from "../models/Course.js";
import Batch from "../models/Batch.js";

// Atomically reserve one seat so concurrent requests cannot consume
// the same remaining seat. Reconcile stored seat counts before using this.
const reserveBatchSeat = async (batchId) =>
  Batch.findOneAndUpdate(
    {
      _id: batchId,
      status: { $in: ["Upcoming", "Ongoing"] },
      available_seats: { $gt: 0 },
    },
    { $inc: { available_seats: -1 } },
    {
      new: true,
      projection: { _id: 1 },
    }
  ).lean();

  const releaseBatchSeat = async (batchId) => {
    if (!batchId) return;

    // Never allow the stored available-seat count to exceed capacity.
    await Batch.updateOne(
      { _id: batchId },
      [
        {
          $set: {
            available_seats: {
              $min: [
                {
                  $add: [
                    { $ifNull: ["$available_seats", 0] },
                    1,
                  ],
                },
                "$max_seats",
              ],
            },
          },
        },
      ]
    );
  };

// const createRollNumber =
//   async () => {
//     const latestStudent =
//       await Student.findOne({
//         rollNo: {
//           $exists: true,
//           $ne: "",
//         },
//       })
//         .sort({
//           createdAt: -1,
//         })
//         .select("rollNo")
//         .lean();

//     let nextNumber = 1;

//     if (latestStudent?.rollNo) {
//       const match = latestStudent.rollNo.match(/RN(\d+)/);

//       if (match) {
//         nextNumber = Number(match[1]) + 1;
//       }
//     }

//     let rollNo = `RN${String(nextNumber).padStart(8, "0")}`;

//     let exists = await Student.exists({ rollNo });

//     while (exists) {
//       nextNumber += 1;
//       rollNo = `RN${String(nextNumber).padStart(8, "0")}`;
//       exists = await Student.exists({ rollNo });
//     }

//     return rollNo;
//   };

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const getAttendanceRoster = async (req, res, next) => {
  try {
    const { course_id, batch_id } = req.query;

    if (
      !course_id ||
      !batch_id ||
      !mongoose.Types.ObjectId.isValid(course_id) ||
      !mongoose.Types.ObjectId.isValid(batch_id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid course_id and batch_id are required.",
      });
    }

    // Verify that the selected batch belongs to the selected course.
    const batch = await Batch.findOne({
      _id: batch_id,
      course_id,
    })
      .select("_id")
      .lean();

    if (!batch) {
      return res.status(400).json({
        success: false,
        message: "Selected batch does not belong to the selected course.",
      });
    }

    // Return only active students in this exact course and batch.
    // Do not expose addresses, phone numbers, documents, or other
    // private student-management fields to the attendance screen.
    // const students = await Student.find({
    //   course_id,
    //   batch_id,
    //   status: "active",
    // })
    //   .select("_id rollNo firstName surname")
    //   .sort({ firstName: 1, surname: 1, rollNo: 1 })
    //   .lean();

    const admissions = await StudentAdmission.find({
      course_id,
      batch_id,
      status: "Active",
    })
      .select("student_id")
      .populate({
        path: "student_id",
        select: "_id rollNo firstName surname status",
        match: { status: "active" },
      })
      .lean();

    const students = admissions
      .map((admission) => admission.student_id)
      .filter(Boolean)
      .filter(
        (student, index, all) =>
          all.findIndex(
            (item) => String(item._id) === String(student._id)
          ) === index
      )
      .sort((a, b) =>
        `${a.firstName} ${a.surname} ${a.rollNo}`.localeCompare(
          `${b.firstName} ${b.surname} ${b.rollNo}`
        )
      );

    return res.status(200).json({
      success: true,
      data: { students },
    });
  } catch (error) {
    next(error);
  }
};

// export const getAttendanceRoster = async (req, res, next) => {
//   try {
//     const { course_id, batch_id } = req.query;

//     if (
//       !course_id ||
//       !batch_id ||
//       !mongoose.Types.ObjectId.isValid(course_id) ||
//       !mongoose.Types.ObjectId.isValid(batch_id)
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Valid course_id and batch_id are required.",
//       });
//     }

//     // Verify that the selected batch belongs to the selected course.
//     const batch = await Batch.findOne({
//       _id: batch_id,
//       course_id,
//     })
//       .select("_id")
//       .lean();

//     if (!batch) {
//       return res.status(400).json({
//         success: false,
//         message: "Selected batch does not belong to the selected course.",
//       });
//     }

//     // Query active admissions for this exact course and batch,
//     // and populate the active student records.
//     const admissions = await StudentAdmission.find({
//       course_id,
//       batch_id,
//       status: "Active",
//     })
//       .populate({
//         path: "student_id",
//         select: "_id rollNo firstName surname status",
//       })
//       .lean();

//     const students = admissions
//       .map((admission) => admission.student_id)
//       .filter((student) => student && student.status === "active")
//       .sort((a, b) => {
//         const firstNameCompare = (a.firstName || "").localeCompare(b.firstName || "");
//         if (firstNameCompare !== 0) return firstNameCompare;

//         const surnameCompare = (a.surname || "").localeCompare(b.surname || "");
//         if (surnameCompare !== 0) return surnameCompare;

//         return (a.rollNo || "").localeCompare(b.rollNo || "");
//       })
//       .map((student) => ({
//         _id: student._id,
//         rollNo: student.rollNo,
//         firstName: student.firstName,
//         surname: student.surname,
//       }));

//     return res.status(200).json({
//       success: true,
//       data: { students },
//     });
//   } catch (error) {
//     next(error);
//   }
// };

export const getStudents = async (req, res, next) => {
  try {
    const {
      search = "",
      status = "",
      course_id = "",
      batch_id = "",
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const skip = (pageNumber - 1) * limitNumber;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (course_id && !mongoose.Types.ObjectId.isValid(course_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID.",
      });
    }

    if (batch_id && !mongoose.Types.ObjectId.isValid(batch_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch ID.",
      });
    }

    if (course_id || batch_id) {
      const admissionFilter = {};

      if (course_id) admissionFilter.course_id = course_id;
      if (batch_id) admissionFilter.batch_id = batch_id;

      if (course_id && batch_id) {
        const batchExists = await Batch.exists({
          _id: batch_id,
          course_id,
        });

        if (!batchExists) {
          return res.status(400).json({
            success: false,
            message: "Selected batch does not belong to the selected course.",
          });
        }
      }

      const admissions = await StudentAdmission.find(admissionFilter)
        .distinct("student_id");

      filter._id = { $in: admissions };
    }

    if (String(search).trim()) {
      const searchRegex = new RegExp(
        escapeRegex(String(search).trim()),
        "i"
      );

      filter.$and = [
        ...(filter.$and || []),
        {
          $or: [
            { firstName: searchRegex },
            { surname: searchRegex },
            { fatherName: searchRegex },
            { mobile: searchRegex },
            { email: searchRegex },
            { rollNo: searchRegex },
          ],
        },
      ];
    }

    const allowedSortFields = [
      "createdAt",
      "firstName",
      "surname",
      "rollNo",
      "mobile",
      "status",
    ];

    const safeSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : "createdAt";

    const safeSortOrder = sortOrder === "asc" ? 1 : -1;

    const [students, total] = await Promise.all([
      Student.find(filter)
        .sort({ [safeSortBy]: safeSortOrder })
        .skip(skip)
        .limit(limitNumber)
        .lean(),

      Student.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        students,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          totalPages: Math.ceil(total / limitNumber),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getStudent = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID.",
      });
    }

    const student = await Student.findById(req.params.id).lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

export const createStudent = async (req, res, next) => {
  try {
    const {
      rollNo,
      firstName,
      surname,
      fatherName,
      motherName,
      relationship,
      dob,
      gender,
      mobile,
      alternateMobile,
      email,
      address,
      pincode,
      // course_id,
      // batch_id,
      showFatherName,
      showSurname,
      status,
    } = req.body;

    if (!rollNo?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Roll number is required.",
      });
    }

    const existingRollNo = await Student.findOne({
      rollNo: rollNo.trim(),
    });

    if (existingRollNo) {
      return res.status(409).json({
        success: false,
        message: "This roll number is already assigned to another student.",
      });
    }

    if (!firstName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "First name is required.",
      });
    }

    if (!mobile?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required.",
      });
    }

    const normalizedEmail = email?.trim()
      ? email.trim().toLowerCase()
      : "";

    // if (!course_id) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Course is required.",
    //   });
    // }

    // if (!batch_id) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Batch is required.",
    //   });
    // }

    // if (!mongoose.Types.ObjectId.isValid(course_id)) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Invalid course.",
    //   });
    // }

    // if (!mongoose.Types.ObjectId.isValid(batch_id)) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Invalid batch.",
    //   });
    // }

    // const courseDocument = await Course.findById(course_id)
    //   .select("_id courseTitle")
    //   .lean();

    // if (!courseDocument) {
    //   return res.status(404).json({
    //     success: false,
    //     message: "Selected course not found.",
    //   });
    // }

    // const batchDocument = await Batch.findOne({
    //   _id: batch_id,
    //   course_id,
    // })
    //   .select("_id batch_name course_id max_seats")
    //   .lean();

    // if (!batchDocument) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Selected batch does not belong to the selected course.",
    //   });
    // }

    // Reserve a seat atomically before creating the student.
    // const reservedBatch = await reserveBatchSeat(batchDocument._id);

    // if (!reservedBatch) {
    //   return res.status(409).json({
    //     success: false,
    //     message: "This batch is full. Please select another batch.",
    //   });
    // }

    let student;

    // try {
      student = await Student.create({
        rollNo: rollNo.trim(),
        firstName: firstName.trim(),
        surname: surname?.trim() || "",
        fatherName: fatherName?.trim() || "",
        motherName: motherName?.trim() || "",
        relationship: relationship?.trim() || "Father",
        dob: dob || null,
        gender: gender || "",
        mobile: mobile.trim(),
        alternateMobile: alternateMobile?.trim() || "",
        email: normalizedEmail,
        address: address?.trim() || "",
        pincode: pincode?.trim() || "",
        // course_id: courseDocument._id,
        // batch_id: batchDocument._id,

        profileImage: req.files?.profileImage?.[0]
          ? `/uploads/students/${req.files.profileImage[0].filename}`
          : "",

        signature: req.files?.signature?.[0]
          ? `/uploads/students/${req.files.signature[0].filename}`
          : "",

        showFatherName:
          showFatherName !== undefined
            ? showFatherName === "true"
            : true,

        showSurname:
          showSurname !== undefined
            ? showSurname === "true"
            : true,

        status: status || "active",
      });
    // } catch (error) {
    //   await releaseBatchSeat(batchDocument._id);
    //   throw error;
    // }

    return res.status(201).json({
      success: true,
      message: "Student created successfully.",
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

export const updateStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const {
      firstName,
      surname,
      fatherName,
      motherName,
      relationship,
      dob,
      gender,
      mobile,
      alternateMobile,
      email,
      address,
      pincode,
      // course_id,
      // batch_id,
      status,
      showFatherName,
      showSurname,
    } = req.body;

    // Roll number remains unchanged when editing a student.

    if (firstName !== undefined) {
      student.firstName = firstName.trim();
    }

    if (surname !== undefined) {
      student.surname = surname.trim();
    }

    if (fatherName !== undefined) {
      student.fatherName = fatherName.trim();
    }

    if (motherName !== undefined) {
      student.motherName = motherName.trim();
    }

    if (relationship !== undefined) {
      student.relationship = relationship;
    }

    if (dob !== undefined) {
      student.dob = dob;
    }

    if (gender !== undefined) {
      student.gender = gender;
    }

    if (mobile !== undefined) {
      student.mobile = mobile.trim();
    }

    if (alternateMobile !== undefined) {
      student.alternateMobile = alternateMobile.trim();
    }

    if (email !== undefined) {
      student.email = email.trim().toLowerCase();
    }

    if (address !== undefined) {
      student.address = address.trim();
    }

    if (pincode !== undefined) {
      student.pincode = pincode.trim();
    }

    // const nextCourseId =
    //   course_id !== undefined ? course_id : student.course_id;

    // const nextBatchId =
    //   batch_id !== undefined ? batch_id : student.batch_id;

    // if (!nextCourseId) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Course is required.",
    //   });
    // }

    // if (!nextBatchId) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Batch is required.",
    //   });
    // }

    // if (!mongoose.Types.ObjectId.isValid(nextCourseId)) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Invalid course ID.",
    //   });
    // }

    // if (!mongoose.Types.ObjectId.isValid(nextBatchId)) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Invalid batch ID.",
    //   });
    // }

    // const courseDocument = await Course.findById(nextCourseId)
    //   .select("_id courseTitle")
    //   .lean();

    // if (!courseDocument) {
    //   return res.status(404).json({
    //     success: false,
    //     message: "Selected course not found.",
    //   });
    // }

    // const batchDocument = await Batch.findOne({
    //   _id: nextBatchId,
    //   course_id: nextCourseId,
    // })
    //   .select("_id batch_name course_id max_seats")
    //   .lean();

    // if (!batchDocument) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Selected batch does not belong to the selected course.",
    //   });
    // }

    // const oldBatchId = student.batch_id
    //   ? String(student.batch_id)
    //   : "";

    // const newBatchId = String(batchDocument._id);
    // let destinationSeatReserved = false;

    // // Only reserve a new seat if the student is changing batches.
    // if (oldBatchId !== newBatchId) {
    //   const reservedBatch = await reserveBatchSeat(batchDocument._id);

    //   if (!reservedBatch) {
    //     return res.status(409).json({
    //       success: false,
    //       message: "The selected batch is full. Please select another batch.",
    //     });
    //   }

    //   destinationSeatReserved = true;
    // }

    // student.course_id = courseDocument._id;
    // student.batch_id = batchDocument._id;

    if (status !== undefined) {
      student.status = status;
    }

    if (showFatherName !== undefined) {
      student.showFatherName =
        showFatherName === true || showFatherName === "true";
    }

    if (showSurname !== undefined) {
      student.showSurname =
        showSurname === true || showSurname === "true";
    }

    if (req.files?.profileImage?.[0]) {
      student.profileImage =
        `/uploads/students/${req.files.profileImage[0].filename}`;
    }

    if (req.files?.signature?.[0]) {
      student.signature =
        `/uploads/students/${req.files.signature[0].filename}`;
    }

    // try {
    //   await student.save();
    // } catch (error) {
    //   if (destinationSeatReserved) {
    //     await releaseBatchSeat(batchDocument._id);
    //   }

    //   throw error;
    // }

    // Release the old seat only after the student has been saved.
    // if (oldBatchId && oldBatchId !== newBatchId) {
    //   await releaseBatchSeat(oldBatchId);
    // }

    await student.save();

    return res.status(200).json({
      success: true,
      message: "Student updated successfully",
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    // const previousBatchId = student.batch_id
    //   ? String(student.batch_id)
    //   : "";

    await student.deleteOne();

    // if (previousBatchId) {
    //   await releaseBatchSeat(previousBatchId);
    // }

    return res.status(200).json({
      success: true,
      message: "Student deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const updateStudentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "active",
      "inactive",
      "suspended",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student status.",
      });
    }

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { status },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Student status updated successfully.",
      data: student,
    });
  } catch (error) {
    next(error);
  }
};