import { getDb } from "../config/db";
import { NewsletterSubscriber } from "../types/models";
import { NewsletterInput } from "../validators/newsletter.schema";

export async function subscribeToNewsletter(input: NewsletterInput) {
  const collection = getDb().collection<NewsletterSubscriber>(
    "newsletter_subscribers",
  );
  const existing = await collection.findOne({ email: input.email });
  if (existing) return existing;

  const subscriber: NewsletterSubscriber = {
    email: input.email,
    createdAt: new Date(),
  };
  const result = await collection.insertOne(subscriber);
  subscriber._id = result.insertedId;
  return subscriber;
}
