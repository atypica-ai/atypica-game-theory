import { imageModel } from "@/ai/provider";
import { s3Bucket, s3Client } from "@/lib/attachments/s3";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { experimental_generateImage as generateImage } from "ai";
import { createHash } from "crypto";
import { unstable_cache } from "next/cache";

export const revalidate = 3600; // 1 hour fallback

export async function GET(req: Request, { params }: { params: Promise<{ prompt: string }> }) {
  const { prompt } = await params;

  // Generate hash for the prompt
  const promptHash = createHash("sha256").update(prompt).digest("hex").substring(0, 40);

  const getCachedImageUrl = unstable_cache(
    async () => {
      // Determine file extension and S3 key first
      const fileExtension = "png"; // Default to PNG for consistency
      const s3Key = `imagegen/${promptHash}.${fileExtension}`;
      // Check if image already exists in S3
      try {
        const headCommand = new HeadObjectCommand({
          Bucket: s3Bucket,
          Key: s3Key,
        });
        await s3Client.send(headCommand);
        // Image exists, return signed URL
        const getCommand = new GetObjectCommand({
          Bucket: s3Bucket,
          Key: s3Key,
        });
        return await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
      } catch (error) {
        // Image doesn't exist, generate it
      }

      // Generate the image
      const { image } = await generateImage({
        model: imageModel("imagen-4.0-ultra"),
        prompt,
        aspectRatio: "1:1",
        abortSignal: req.signal,
      });

      // Upload to S3
      await s3Client.send(
        new PutObjectCommand({
          Bucket: s3Bucket,
          Key: s3Key,
          Body: image.uint8Array,
          ContentType: image.mimeType,
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );

      // Return signed URL
      const getCommand = new GetObjectCommand({
        Bucket: s3Bucket,
        Key: s3Key,
      });
      return await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
    },
    ["imagegen-url", promptHash],
    {
      tags: ["imagegen"],
      revalidate: 3600, // 1 hour
    },
  );

  const signedUrl = await getCachedImageUrl();

  return Response.redirect(signedUrl, 302);
}
