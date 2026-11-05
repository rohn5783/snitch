import ImageKit from "@imagekit/nodejs";
import { ApiError } from "@/lib/server/errors";
import { requiredEnv } from "@/lib/server/env";

const maximumImageSize = 5 * 1024 * 1024;
const maximumImages = 7;

export async function uploadImages(form: FormData) {
  const files = form.getAll("images").filter((entry): entry is File => entry instanceof File);
  if (!files.length) throw new ApiError("At least one product image is required", 400);
  if (files.length > maximumImages) throw new ApiError("You can upload up to 7 images", 400);
  if (files.some((file) => !file.type.startsWith("image/"))) {
    throw new ApiError("Only image files can be uploaded", 400);
  }
  if (files.some((file) => file.size > maximumImageSize)) {
    throw new ApiError("Each image must be smaller than 5 MB", 400);
  }

  const imageKit = new ImageKit({ privateKey: requiredEnv("IMAGEKIT_PRIVATE_KEY") });
  const images = await Promise.all(files.map(async (file) => {
    const result = await imageKit.files.upload({
      file: await ImageKit.toFile(Buffer.from(await file.arrayBuffer())),
      fileName: file.name,
      folder: "snitch",
    });
    return { url: result.url };
  }));
  return images;
}
