import { expenseOptionsSeed, jobsSeed } from "../data/catalog.js";
import { ExpenseOption } from "../models/ExpenseOption.js";
import { Job } from "../models/Job.js";

export async function seedCatalog() {
  await Job.bulkWrite(
    jobsSeed.map((job) => ({
      updateOne: {
        filter: { title: job.title },
        update: { $set: job },
        upsert: true
      }
    }))
  );

  await ExpenseOption.bulkWrite(
    expenseOptionsSeed.map((option) => ({
      updateOne: {
        filter: { category: option.category, tier: option.tier },
        update: { $set: option },
        upsert: true
      }
    }))
  );
}
