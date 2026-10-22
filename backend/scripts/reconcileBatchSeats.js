
import "dotenv/config";
import mongoose from "mongoose";

import Batch from "../src/models/Batch.js";
import Student from "../src/models/Student.js";

import dns from "dns";

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const reconcileBatchSeats = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error(
        "MONGO_URI is missing. Check the backend .env file."
      );
    }

    await mongoose.connect(process.env.MONGO_URI);

    const batches = await Batch.find({})
      .select("_id batch_name max_seats available_seats")
      .lean();

    // Count assigned students for every batch in one query.
    const assignedCounts = await Student.aggregate([
      {
        $match: {
          batch_id: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$batch_id",
          assignedStudents: { $sum: 1 },
        },
      },
    ]);

    const assignedByBatch = new Map(
      assignedCounts.map((item) => [
        String(item._id),
        item.assignedStudents,
      ])
    );

    // Validate every batch before changing any seat counts.
    // Never silently hide over-capacity data.
    const problems = [];

    for (const batch of batches) {
      const maxSeats = Number(batch.max_seats);
      const assignedStudents =
        assignedByBatch.get(String(batch._id)) || 0;

      if (
        !Number.isInteger(maxSeats) ||
        maxSeats < 1
      ) {
        problems.push(
          `${batch.batch_name} (${batch._id}): invalid max_seats=${batch.max_seats}`
        );
        continue;
      }

      if (assignedStudents > maxSeats) {
        problems.push(
          `${batch.batch_name} (${batch._id}): assigned=${assignedStudents}, capacity=${maxSeats}`
        );
      }
    }

    if (problems.length > 0) {
      console.error(
        "\nReconciliation stopped. No seat counts were changed."
      );

      problems.forEach((problem) =>
        console.error(`- ${problem}`)
      );

      console.error(
        "\nResolve these data issues, then run the script again."
      );

      process.exitCode = 1;
      return;
    }

    // All batches passed validation; correct the stored counters.
    for (const batch of batches) {
      const maxSeats = Number(batch.max_seats);
      const assignedStudents =
        assignedByBatch.get(String(batch._id)) || 0;

      const availableSeats =
        maxSeats - assignedStudents;

      if (batch.available_seats !== availableSeats) {
        await Batch.updateOne(
          { _id: batch._id },
          { $set: { available_seats: availableSeats } }
        );
      }

      console.log(
        `${batch.batch_name}: assigned=${assignedStudents}, ` +
        `available=${availableSeats}, capacity=${maxSeats}`
      );
    }

    console.log(
      "\nBatch seat reconciliation completed successfully."
    );
  } catch (error) {
    console.error(
      "Batch seat reconciliation failed:",
      error.message
    );
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
};

reconcileBatchSeats();
