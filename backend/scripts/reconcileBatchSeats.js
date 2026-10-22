import "dotenv/config";
import mongoose from "mongoose";

import Batch from "../src/models/Batch.js";
import Student from "../src/models/Student.js";
import dns from "dns";

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const reconcileBatchSeats = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const batches = await Batch.find({})
      .select("_id max_seats")
      .lean();

    for (const batch of batches) {
      const assignedStudents = await Student.countDocuments({
        batch_id: batch._id,
      });

      const availableSeats = Math.max(
        Number(batch.max_seats) - assignedStudents,
        0
      );

      await Batch.updateOne(
        { _id: batch._id },
        { $set: { available_seats: availableSeats } }
      );

      console.log(
        `Batch ${batch._id}: assigned=${assignedStudents}, available=${availableSeats}`
      );
    }

    console.log("Batch seat reconciliation completed.");
  } catch (error) {
    console.error("Batch seat reconciliation failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

reconcileBatchSeats();