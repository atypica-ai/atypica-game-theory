# File Upload Limits Implementation

This document describes the implementation of file upload limits across the application, restricting users to a maximum of 5 images and 3 documents.

## Features Implemented

### 1. File Type and Count Limits

- **Images**: Maximum 5 files (JPEG, PNG, GIF, WebP, BMP, SVG)
- **Documents**: Maximum 3 files (PDF, Word, Excel, PowerPoint, Text, CSV, JSON)
- **Total Size**: Maximum 50MB across all files

### 2. User Feedback

- **Toast Notifications**: Users receive immediate feedback when limits are exceeded
- **Status Display**: Shows current upload count (e.g., "3/5 images, 2/3 documents")
- **Visual Indicators**: File counters turn red when limits are reached

### 3. Server-Side Validation

- Backend validation in `createStudyUserChat` and `createProductRnDStudyUserChat`
- Prevents bypass of client-side restrictions

## Files Modified/Created

### Core Logic

- `src/lib/fileUploadLimits.ts` - Constants, validation functions, and utilities
- `src/hooks/use-file-upload-manager.ts` - Reusable hook for file upload management

### Components

- `src/components/chat/FileUploadButton.tsx` - Updated with limit checking
- `src/components/chat/FileUploadStatus.tsx` - New status display component
- `src/components/chat/UserChatSession.tsx` - Integrated with new limits
- `src/components/NewStudyInputBox.tsx` - Integrated with new limits

### Server Actions

- `src/app/(study)/study/actions.ts` - Added server-side validation

### Translations

- `messages/zh-CN.json` - Chinese translations for limit messages
- `messages/en-US.json` - English translations for limit messages

### Test Page

- `src/app/test-file-upload/page.tsx` - Demo page for testing limits

## Constants

```typescript
export const FILE_UPLOAD_LIMITS = {
  MAX_IMAGES: 5,
  MAX_DOCUMENTS: 3,
  MAX_TOTAL_SIZE: 50 * 1024 * 1024, // 50MB
} as const;
```

## Key Functions

### `checkFileUploadLimits(existingFiles, newFile)`

Validates if a new file can be uploaded based on:

- File type support
- Image count limit
- Document count limit
- Total size limit

### `categorizeFiles(files)`

Separates files into images, documents, and others based on MIME type.

### `getFileUploadStatus(files)`

Returns current upload status including counts and capacity.

## Usage Example

```typescript
import { useFileUploadManager } from "@/hooks/use-file-upload-manager";

function MyComponent() {
  const {
    uploadedFiles,
    handleFileUploaded,
    handleRemoveFile,
    clearFiles,
    isUploadDisabled
  } = useFileUploadManager();

  return (
    <div>
      <FileUploadButton
        onFileUploadedAction={handleFileUploaded}
        existingFiles={uploadedFiles}
        disabled={isUploadDisabled()}
      />
      <FileUploadStatus files={uploadedFiles} showDetails />
    </div>
  );
}
```

## Error Messages

Users see appropriate error messages when limits are exceeded:

- **Images**: "最多只能上传 5 张图片" / "Maximum 5 images allowed"
- **Documents**: "最多只能上传 3 个文档" / "Maximum 3 documents allowed"
- **Size**: "文件总大小超出限制" / "Total file size limit exceeded"
- **Type**: "不支持的文件类型" / "Unsupported file type"

## Testing

Visit `/test-file-upload` to test the implementation:

- Upload various file types
- Exceed the limits to see error handling
- View real-time status updates

## Architecture Benefits

1. **Centralized Logic**: All limit logic is in one place (`fileUploadLimits.ts`)
2. **Reusable Hook**: `useFileUploadManager` can be used across components
3. **Type Safety**: TypeScript ensures consistent file type checking
4. **Simple Translations**: Direct string constants for better maintainability
5. **Client + Server Validation**: Prevents both user errors and malicious bypasses
