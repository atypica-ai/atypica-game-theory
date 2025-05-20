export type ChatMessageAttachment = {
  objectUrl: string; // s3 object url without signature
  name: string;
  mimeType: string;
  size: number; // bytes
};
