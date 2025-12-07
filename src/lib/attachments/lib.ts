import "server-only";

// export async function attachmentFileObjectUrlToHttpUrl(attachmentFile: AttachmentFile) {
//   const { id, objectUrl } = attachmentFile;
//   let extra = attachmentFile.extra as unknown as NonNullable<AttachmentFileExtra>;
//   let url: string;
//   if (
//     extra?.s3SignedUrl &&
//     extra?.s3SignedUrlExpiresAt &&
//     extra.s3SignedUrlExpiresAt > Date.now() + 60 * 60 * 1000
//   ) {
//     // s3SignedUrl exists and expires in the next hour
//     url = extra.s3SignedUrl;
//   } else {
//     const signingDate = new Date();
//     const expiresIn = 7 * 24 * 3600; // in seconds
//     url = await s3SignedUrl(objectUrl, { signingDate, expiresIn });
//     extra = {
//       ...extra,
//       s3SignedUrl: url,
//       s3SignedUrlExpiresAt: signingDate.valueOf() + expiresIn * 1000,
//     };
//     waitUntil(
//       new Promise((resolve) => {
//         prisma.attachmentFile
//           .update({ where: { id }, data: { extra } })
//           .finally(() => resolve(null));
//       }),
//     );
//   }
//   return url;
// }
