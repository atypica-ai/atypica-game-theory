"use client";
import { FileAttachment } from "@/components/chat/FileAttachment";
import { FileUploadButton } from "@/components/chat/FileUploadButton";
import { FileUploadStatus } from "@/components/chat/FileUploadStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFileUploadManager } from "@/hooks/use-file-upload-manager";
import { FILE_UPLOAD_LIMITS } from "@/lib/fileUploadLimits";

export default function TestFileUploadPage() {
  const { uploadedFiles, handleFileUploaded, handleRemoveFile, clearFiles, getStatus } =
    useFileUploadManager();

  const status = getStatus();

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">File Upload Limits Test</h1>
          <p className="text-muted-foreground mt-2">
            Test the file upload limits functionality with maximum {FILE_UPLOAD_LIMITS.MAX_IMAGES}{" "}
            images and {FILE_UPLOAD_LIMITS.MAX_DOCUMENTS} documents.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload Files</CardTitle>
            <CardDescription>
              Try uploading different file types to test the limits. You should see error messages
              when limits are exceeded.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <FileUploadButton
                onFileUploadedAction={handleFileUploaded}
                existingFiles={uploadedFiles}
              />
              <FileUploadStatus files={uploadedFiles} showDetails />
              {uploadedFiles.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearFiles}>
                  Clear All
                </Button>
              )}
            </div>

            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium">Uploaded Files:</h3>
                <div className="flex flex-wrap gap-2">
                  {uploadedFiles.map((file, index) => (
                    <FileAttachment
                      key={index}
                      attachment={{
                        url: file.url,
                        name: file.name,
                        contentType: file.mimeType,
                      }}
                      onRemove={() => handleRemoveFile(index)}
                    />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium">Images</div>
                <div className={status.imageCount >= FILE_UPLOAD_LIMITS.MAX_IMAGES ? "text-red-500" : ""}>
                  {status.imageCount} / {FILE_UPLOAD_LIMITS.MAX_IMAGES}
                </div>
              </div>
              <div>
                <div className="font-medium">Documents</div>
                <div className={status.documentCount >= FILE_UPLOAD_LIMITS.MAX_DOCUMENTS ? "text-red-500" : ""}>
                  {status.documentCount} / {FILE_UPLOAD_LIMITS.MAX_DOCUMENTS}
                </div>
              </div>
              <div>
                <div className="font-medium">Total Size</div>
                <div className={!status.canUploadBySize ? "text-red-500" : ""}>
                  {(status.totalSize / (1024 * 1024)).toFixed(2)} MB
                </div>
              </div>
              <div>
                <div className="font-medium">Can Upload More</div>
                <div className={!status.canUploadImage && !status.canUploadDocument ? "text-red-500" : "text-green-500"}>
                  {status.canUploadImage || status.canUploadDocument ? "Yes" : "No"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Limits Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>• Maximum images: {FILE_UPLOAD_LIMITS.MAX_IMAGES}</div>
              <div>• Maximum documents: {FILE_UPLOAD_LIMITS.MAX_DOCUMENTS}</div>
              <div>• Maximum total size: {FILE_UPLOAD_LIMITS.MAX_TOTAL_SIZE / (1024 * 1024)} MB</div>
              <div>• Supported image types: JPEG, PNG, GIF, WebP, BMP, SVG</div>
              <div>• Supported document types: PDF, Word, Excel, PowerPoint, Text, CSV, JSON</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
