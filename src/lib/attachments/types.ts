export interface S3UploadCredentials {
  putObjectUrl: string;
  getObjectUrl: string;
  objectUrl: string; // s3 object url without signature
}
