// import Student from "../models/Student.js";

import mongoose from "mongoose";

import Student from "../models/Student.js";
import Course from "../models/Course.js";
import Batch from "../models/Batch.js";

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
//       const match =
//         latestStudent.rollNo.match(
//           /RN(\d+)/
//         );

//       if (match) {
//         nextNumber =
//           Number(match[1]) + 1;
//       }
//     }

//     let rollNo = `RN${String(
//       nextNumber
//     ).padStart(8, "0")}`;

//     let exists =
//       await Student.exists({
//         rollNo,
//       });

//     while (exists) {
//       nextNumber += 1;

//       rollNo = `RN${String(
//         nextNumber
//       ).padStart(8, "0")}`;

//       exists =
//         await Student.exists({
//           rollNo,
//         });
//     }

//     return rollNo;
//   };

const escapeRegex = (
  value
) => {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

export const getStudents =
  async (req, res, next) => {
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

      const pageNumber =
        Math.max(
          Number(page) || 1,
          1
        );

      const limitNumber =
        Math.min(
          Math.max(
            Number(limit) || 10,
            1
          ),
          100
        );

      const skip =
        (pageNumber - 1) *
        limitNumber;

      const filter = {};

      if (status) {
        filter.status = status;
      }

      if (course_id) {
        if (!mongoose.Types.ObjectId.isValid(course_id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid course ID.",
          });
        }

        filter.course_id = course_id;
      }

      if (batch_id) {
        if (!mongoose.Types.ObjectId.isValid(batch_id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid batch ID.",
          });
        }

        filter.batch_id = batch_id;
      }

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

      if (search.trim()) {
        const searchRegex =
          new RegExp(
            escapeRegex(
              search.trim()
            ),
            "i"
          );

        filter.$or = [
          {
            firstName:
              searchRegex,
          },
          {
            surname:
              searchRegex,
          },
          {
            fatherName:
              searchRegex,
          },
          {
            mobile:
              searchRegex,
          },
          {
            email:
              searchRegex,
          },
          {
            rollNo:
              searchRegex,
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

      const safeSortBy =
        allowedSortFields.includes(
          sortBy
        )
          ? sortBy
          : "createdAt";

      const safeSortOrder =
        sortOrder === "asc"
          ? 1
          : -1;

      const [
        students,
        total,
      ] = await Promise.all([
        Student.find(filter)
        .populate({
          path: "course_id",
          select: "_id courseTitle courseType status",
        })
        .populate({
          path: "batch_id",
          select: "_id batch_name course_id status",
        })
          .sort({
            [safeSortBy]:
              safeSortOrder,
          })
          .skip(skip)
          .limit(limitNumber)
          .lean(),

        Student.countDocuments(
          filter
        ),
      ]);

      const totalPages =
        Math.ceil(
          total / limitNumber
        );

      return res.status(200).json({
        success: true,

        data: {
          students,
          pagination: {
            page: pageNumber,
            limit: limitNumber,
            total,
            totalPages,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

export const getStudent =
  async (req, res, next) => {
    try {
      // const student =
      //   await Student.findById(
      //     req.params.id
      //   ).lean();

      const student =
        await Student.findById(
          req.params.id
        )
          .populate({
            path: "course_id",
            select: "_id courseTitle courseType status",
          })
          .populate({
            path: "batch_id",
            select: "_id batch_name course_id status",
          })
          .lean();

      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "Student not found.",
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

export const createStudent =
  async (req, res, next) => {
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
        course_id,
        batch_id,
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
          message:
            "First name is required.",
        });
      }

      if (!mobile?.trim()) {
        return res.status(400).json({
          success: false,
          message:
            "Mobile number is required.",
        });
      }

      const normalizedEmail =
        email?.trim()
          ? email
              .trim()
              .toLowerCase()
          : "";

    //   const rollNo =
    //     await createRollNumber();

      if (!course_id) {
          return res.status(400).json({
            success: false,
            message: "Course is required.",
          });
        }

        if (!batch_id) {
          return res.status(400).json({
            success: false,
            message: "Batch is required.",
          });
        }

        if (!mongoose.Types.ObjectId.isValid(course_id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid course.",
          });
        }

        if (!mongoose.Types.ObjectId.isValid(batch_id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid batch.",
          });
        }

        const courseDocument = await Course.findById(course_id)
          .select("_id courseTitle")
          .lean();

        if (!courseDocument) {
          return res.status(404).json({
            success: false,
            message: "Selected course not found.",
          });
        }

        const batchDocument = await Batch.findOne({
          _id: batch_id,
          course_id,
        })
          .select("_id batch_name course_id")
          .lean();

        if (!batchDocument) {
          return res.status(400).json({
            success: false,
            message:
              "Selected batch does not belong to the selected course.",
          });
        }

      const student =
        await Student.create({
          rollNo: rollNo.trim(),

          firstName:
            firstName.trim(),

          surname:
            surname?.trim() || "",

          fatherName:
            fatherName?.trim() || "",

          motherName:
            motherName?.trim() || "",

          relationship:
            relationship?.trim() ||
            "Father",

          dob:
            dob || null,

          gender:
            gender || "",

          mobile:
            mobile.trim(),

          alternateMobile:
            alternateMobile?.trim() ||
            "",

          email:
            normalizedEmail,

          address:
            address?.trim() || "",

          pincode:
            pincode?.trim() || "",

           course_id: courseDocument._id,
           batch_id: batchDocument._id,

          profileImage:
            req.files?.profileImage?.[0]
              ? `/uploads/students/${req.files.profileImage[0].filename}`
              : "",

          signature:
            req.files?.signature?.[0]
              ? `/uploads/students/${req.files.signature[0].filename}`
              : "",

          showFatherName:
            showFatherName !==
            undefined
              ? showFatherName ===
                "true"
              : true,

          showSurname:
            showSurname !==
            undefined
              ? showSurname ===
                "true"
              : true,

          status:
            status || "active",
        });

      return res.status(201).json({
        success: true,
        message:
          "Student created successfully.",
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
    //   rollNo,
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
      course_id,
      batch_id,
      status,
      showFatherName,
      showSurname,
    } = req.body;

    // ==========================================
    // ROLL NUMBER VALIDATION
    // ==========================================

    // if (rollNo !== undefined) {
    //   const normalizedRollNo = String(rollNo).trim();

    //   if (!normalizedRollNo) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "Roll number is required",
    //     });
    //   }

    //   const duplicateStudent = await Student.findOne({
    //     rollNo: normalizedRollNo,
    //     _id: { $ne: id },
    //   });

    //   if (duplicateStudent) {
    //     return res.status(409).json({
    //       success: false,
    //       message: "This roll number is already assigned to another student",
    //     });
    //   }

    //   student.rollNo = normalizedRollNo;
    // }

    // ==========================================
    // BASIC INFORMATION
    // ==========================================

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

    // ==========================================
    // CONTACT
    // ==========================================

    if (mobile !== undefined) {
      student.mobile = mobile.trim();
    }

    if (alternateMobile !== undefined) {
      student.alternateMobile = alternateMobile.trim();
    }

    if (email !== undefined) {
      student.email = email.trim().toLowerCase();
    }

    // ==========================================
    // ADDRESS
    // ==========================================

    if (address !== undefined) {
      student.address = address.trim();
    }

    if (pincode !== undefined) {
      student.pincode = pincode.trim();
    }

    // ==========================================
    // COURSE / BATCH
    // ==========================================

    const nextCourseId =
      course_id !== undefined
        ? course_id
        : student.course_id;

    const nextBatchId =
      batch_id !== undefined
        ? batch_id
        : student.batch_id;

    if (!nextCourseId) {
      return res.status(400).json({
        success: false,
        message: "Course is required.",
      });
    }

    if (!nextBatchId) {
      return res.status(400).json({
        success: false,
        message: "Batch is required.",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        nextCourseId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID.",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        nextBatchId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid batch ID.",
      });
    }

    const courseDocument =
      await Course.findById(nextCourseId)
        .select("_id courseTitle")
        .lean();

    if (!courseDocument) {
      return res.status(404).json({
        success: false,
        message: "Selected course not found.",
      });
    }

    const batchDocument =
      await Batch.findOne({
        _id: nextBatchId,
        course_id: nextCourseId,
      })
        .select("_id batch_name course_id")
        .lean();

    if (!batchDocument) {
      return res.status(400).json({
        success: false,
        message:
          "Selected batch does not belong to the selected course.",
      });
    }

    student.course_id = courseDocument._id;
    student.batch_id = batchDocument._id;

    // ==========================================
    // STATUS
    // ==========================================

    if (status !== undefined) {
      student.status = status;
    }

    // ==========================================
    // CERTIFICATE OPTIONS
    // ==========================================

    if (showFatherName !== undefined) {
      student.showFatherName =
        showFatherName === true || showFatherName === "true";
    }

    if (showSurname !== undefined) {
      student.showSurname =
        showSurname === true || showSurname === "true";
    }

    // ==========================================
    // PROFILE IMAGE
    // ==========================================

    if (req.files?.profileImage?.[0]) {
      student.profileImage = `/uploads/students/${req.files.profileImage[0].filename}`;
    }

    // ==========================================
    // SIGNATURE
    // ==========================================

    if (req.files?.signature?.[0]) {
      student.signature = `/uploads/students/${req.files.signature[0].filename}`;
    }

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

export const deleteStudent =
  async (req, res, next) => {
    try {
      const student =
        await Student.findById(
          req.params.id
        );

      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "Student not found.",
        });
      }

      await student.deleteOne();

      return res.status(200).json({
        success: true,
        message:
          "Student deleted successfully.",
      });
    } catch (error) {
      next(error);
    }
  };

export const updateStudentStatus =
  async (req, res, next) => {
    try {
      const {
        status,
      } = req.body;

      const allowedStatuses = [
        "active",
        "inactive",
        "suspended",
      ];

      if (
        !allowedStatuses.includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid student status.",
        });
      }

      const student =
        await Student.findByIdAndUpdate(
          req.params.id,
          {
            status,
          },
          {
            new: true,
            runValidators: true,
          }
        );

      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "Student not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Student status updated successfully.",
        data: student,
      });
    } catch (error) {
      next(error);
    }
  };
