import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";

import Student from "../models/Student.js";

const documentsDirectory =
  path.resolve(
    process.cwd(),
    "private_uploads",
    "students",
    "documents"
  );

const getDocumentById = (
  student,
  documentId
) => {
  if (
    !Array.isArray(
      student.uploadDocument
    )
  ) {
    return null;
  }

  return student.uploadDocument.find(
    (document) =>
      String(document._id) ===
      String(documentId)
  );
};

const getSafeStoredFilePath = (
  document
) => {
  if (!document?.fileName) {
    return null;
  }

  const safeFileName =
    path.basename(
      document.fileName
    );

  if (
    safeFileName !==
    document.fileName
  ) {
    return null;
  }

  return path.join(
    documentsDirectory,
    safeFileName
  );
};

/*
|--------------------------------------------------------------------------
| GET STUDENT DOCUMENTS
|--------------------------------------------------------------------------
*/

export const getStudentDocuments =
  async (req, res, next) => {
    try {
      const { studentId } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          studentId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid student ID.",
        });
      }

      const student =
        await Student.findById(
          studentId
        )
          .select(
            "_id rollNo firstName surname uploadDocument"
          )
          .lean();

      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "Student not found.",
        });
      }

      const documents =
        Array.isArray(
          student.uploadDocument
        )
          ? [
              ...student.uploadDocument,
            ].sort(
              (a, b) =>
                new Date(
                  b.uploadedAt || 0
                ).getTime() -
                new Date(
                  a.uploadedAt || 0
                ).getTime()
            )
          : [];

      return res.status(200).json({
        success: true,

        data: {
          student: {
            _id: student._id,
            rollNo:
              student.rollNo,
            name: [
              student.firstName,
              student.surname,
            ]
              .filter(Boolean)
              .join(" "),
          },

          documents,
        },
      });
    } catch (error) {
      next(error);
    }
  };

/*
|--------------------------------------------------------------------------
| UPLOAD MULTIPLE STUDENT DOCUMENTS
|--------------------------------------------------------------------------
*/

export const uploadStudentDocuments =
  async (req, res, next) => {
    const uploadedFiles =
      req.files || [];

    try {
      const { studentId } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          studentId
        )
      ) {
        for (const file of uploadedFiles) {
          await fs
            .unlink(file.path)
            .catch(() => {});
        }

        return res.status(400).json({
          success: false,
          message:
            "Invalid student ID.",
        });
      }

      if (!uploadedFiles.length) {
        return res.status(400).json({
          success: false,
          message:
            "Please select at least one document.",
        });
      }

      const student =
        await Student.findById(
          studentId
        );

      if (!student) {
        for (const file of uploadedFiles) {
          await fs
            .unlink(file.path)
            .catch(() => {});
        }

        return res.status(404).json({
          success: false,
          message:
            "Student not found.",
        });
      }

      const documents =
        uploadedFiles.map(
          (file) => ({
            originalName:
              file.originalname,

            fileName:
              file.filename,

            filePath:
              path
                .relative(
                  process.cwd(),
                  file.path
                )
                .replace(
                  /\\/g,
                  "/"
                ),

            mimeType:
              file.mimetype,

            fileSize:
              file.size,

            uploadedAt:
              new Date(),
          })
        );

      student.uploadDocument.push(
        ...documents
      );

      await student.save();

      return res.status(201).json({
        success: true,

        message:
          `${documents.length} document${
            documents.length > 1
              ? "s"
              : ""
          } uploaded successfully.`,

        data: {
          documents:
            student.uploadDocument,
        },
      });
    } catch (error) {
      for (const file of uploadedFiles) {
        await fs
          .unlink(file.path)
          .catch(() => {});
      }

      next(error);
    }
  };

/*
|--------------------------------------------------------------------------
| VIEW DOCUMENT
|--------------------------------------------------------------------------
*/

export const viewStudentDocument =
  async (req, res, next) => {
    try {
      const {
        studentId,
        documentId,
      } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          studentId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid student ID.",
        });
      }

      const student =
        await Student.findById(
          studentId
        )
          .select(
            "uploadDocument"
          )
          .lean();

      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "Student not found.",
        });
      }

      const document =
        getDocumentById(
          student,
          documentId
        );

      if (!document) {
        return res.status(404).json({
          success: false,
          message:
            "Document not found.",
        });
      }

      const filePath =
        getSafeStoredFilePath(
          document
        );

      if (!filePath) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid document path.",
        });
      }

      await fs.access(
        filePath
      );

      res.setHeader(
        "Content-Type",
        document.mimeType ||
          "application/octet-stream"
      );

      res.setHeader(
        "Content-Disposition",
        `inline; filename="${encodeURIComponent(
          document.originalName
        )}"`
      );

      return res.sendFile(
        filePath
      );
    } catch (error) {
      if (
        error.code ===
        "ENOENT"
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Document file not found on server.",
        });
      }

      next(error);
    }
  };

/*
|--------------------------------------------------------------------------
| DOWNLOAD DOCUMENT
|--------------------------------------------------------------------------
*/

export const downloadStudentDocument =
  async (req, res, next) => {
    try {
      const {
        studentId,
        documentId,
      } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          studentId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid student ID.",
        });
      }

      const student =
        await Student.findById(
          studentId
        )
          .select(
            "uploadDocument"
          )
          .lean();

      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "Student not found.",
        });
      }

      const document =
        getDocumentById(
          student,
          documentId
        );

      if (!document) {
        return res.status(404).json({
          success: false,
          message:
            "Document not found.",
        });
      }

      const filePath =
        getSafeStoredFilePath(
          document
        );

      if (!filePath) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid document path.",
        });
      }

      await fs.access(
        filePath
      );

      return res.download(
        filePath,
        document.originalName,
        (error) => {
          if (
            error &&
            !res.headersSent
          ) {
            next(error);
          }
        }
      );
    } catch (error) {
      if (
        error.code ===
        "ENOENT"
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Document file not found on server.",
        });
      }

      next(error);
    }
  };

/*
|--------------------------------------------------------------------------
| DELETE DOCUMENT
|--------------------------------------------------------------------------
*/

export const deleteStudentDocument =
  async (req, res, next) => {
    try {
      const {
        studentId,
        documentId,
      } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          studentId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid student ID.",
        });
      }

      const student =
        await Student.findById(
          studentId
        );

      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "Student not found.",
        });
      }

      const document =
        getDocumentById(
          student,
          documentId
        );

      if (!document) {
        return res.status(404).json({
          success: false,
          message:
            "Document not found.",
        });
      }

      const filePath =
        getSafeStoredFilePath(
          document
        );

      student.uploadDocument =
        student.uploadDocument.filter(
          (item) =>
            String(item._id) !==
            String(documentId)
        );

      await student.save();

      if (filePath) {
        await fs
          .unlink(filePath)
          .catch(() => {});
      }

      return res.status(200).json({
        success: true,
        message:
          "Document deleted successfully.",
        data: {
          documentId,
        },
      });
    } catch (error) {
      next(error);
    }
  };