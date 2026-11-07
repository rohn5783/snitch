import ImageKit from "@imagekit/nodejs";
import { requiredEnv } from "@/lib/server/env";
import { AppError } from "@/lib/server/errors/api-error";

const maximumImageSize = 5 * 1024 * 1024;
const maximumImages = 7;

export async function uploadImages(form: FormData): Promise<Array<{ url: string }>> {
  const files = form.getAll("images").filter((entry): entry is File => entry instanceof File);
  if (!files.length) throw AppError.badRequest("At least one product image is required");
  if (files.length > maximumImages) throw AppError.badRequest("You can upload up to 7 images");
  if (files.some((file) => !file.type.startsWith("image/"))) {
    throw AppError.badRequest("Only image files can be uploaded");
  }
  if (files.some((file) => file.size > maximumImageSize)) {
    throw AppError.badRequest("Each image must be smaller than 5 MB");
  }

  const imageKit = new ImageKit({ privateKey: requiredEnv("IMAGEKIT_PRIVATE_KEY") });
  const images = await Promise.all(
    files.map(async (file) => {
      const result = await imageKit.files.upload({
        file: await ImageKit.toFile(Buffer.from(await file.arrayBuffer())),
        fileName: file.name,
        folder: "snitch",
      });
      return { url: String(result.url || "") };
    }),
  );
  return images;
}
