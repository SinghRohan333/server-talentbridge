import { ObjectId } from "mongodb";
import { getDb } from "../config/db";
import { Interaction, InteractionType } from "../types/models";

export async function logInteraction(
  seekerId: string,
  jobId: ObjectId,
  type: InteractionType,
) {
  await getDb()
    .collection<Interaction>("interactions")
    .insertOne({
      seekerId: new ObjectId(seekerId),
      jobId,
      type,
      createdAt: new Date(),
    });
}
