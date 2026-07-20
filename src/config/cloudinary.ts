import { v2 as cloudinary } from "cloudinary";
import { env } from "./env";
import { ApiError } from "../middleware/errorHandler";

const isConfigured = !!(
  env.CLOUDINARY_CLOUD_NAME &&
  env.CLOUDINARY_API_KEY &&
  env.CLOUDINARY_API_SECRET
);

if (isConfigured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}

export function assertCloudinaryConfigured(): void {
  if (!isConfigured) {
    throw new ApiError(
      500,
      "File uploads are not configured on this server yet — add Cloudinary credentials to .env",
    );
  }
}

export default cloudinary;
