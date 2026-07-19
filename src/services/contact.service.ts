import { getDb } from "../config/db";
import { ContactMessage } from "../types/models";
import { ContactInput } from "../validators/contact.schema";

export async function submitContactMessage(input: ContactInput) {
  const collection = getDb().collection<ContactMessage>("contact_messages");
  const doc: ContactMessage = {
    ...input,
    isRead: false,
    createdAt: new Date(),
  };
  const result = await collection.insertOne(doc);
  doc._id = result.insertedId;
  return doc;
}
