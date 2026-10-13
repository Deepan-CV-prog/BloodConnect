require("dotenv").config();
const mongoose = require("mongoose");
const BloodRequest = require("./src/models/BloodRequest");
const Allocation = require("./src/models/Allocation");

async function runMigration() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB for migration...");

    const requests = await BloodRequest.find();
    let updatedCount = 0;

    console.log("---------------------------------------------------------------------------------------------------");
    console.log(String("Request ID").padEnd(30) + String("Old Status").padEnd(20) + String("Total").padEnd(10) + String("Allocated").padEnd(15) + String("Released").padEnd(10) + String("New Status").padEnd(20));
    console.log("---------------------------------------------------------------------------------------------------");

    for (const request of requests) {
      const allAllocations = await Allocation.find({ requestId: request._id });

      const totalCount = allAllocations.length;
      const allocatedCount = allAllocations.filter(a => a.status === "allocated").length;
      const releasedCount = allAllocations.filter(a => a.status === "released").length;
      const allAssigned = allocatedCount + releasedCount;

      let newStatus = request.status;
      const oldStatus = request.status;

      // Do NOT downgrade a genuinely completed request
      if (oldStatus === "completed") {
        continue;
      }

      if (releasedCount >= request.quantity) {
        newStatus = "completed";
      } else if (allocatedCount >= request.quantity) {
        newStatus = "allocated";
      } else if (allAssigned > 0) {
        newStatus = "partially_allocated";
      } else if (allAssigned === 0 && (oldStatus === "allocated" || oldStatus === "partially_allocated")) {
        newStatus = "approved"; // Fallback if it was falsely marked as allocated
      }

      if (oldStatus !== newStatus) {
        request.status = newStatus;
        await request.save();
        updatedCount++;

        const reqId = request.requestId || request._id.toString();

        // Print row
        console.log(
          String(reqId).padEnd(30) +
          String(oldStatus).padEnd(20) +
          String(totalCount).padEnd(10) +
          String(allocatedCount).padEnd(15) +
          String(releasedCount).padEnd(10) +
          String(newStatus).padEnd(20)
        );
      }
    }

    console.log("---------------------------------------------------------------------------------------------------");
    console.log(`Migration complete. ${updatedCount} requests updated.`);

  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    mongoose.disconnect();
  }
}

runMigration();
