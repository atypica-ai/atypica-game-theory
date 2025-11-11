# Interview Question Management Feature

## Overview

This document describes the implementation of a comprehensive question management system for the interview project feature, including image upload support, question editing, and UI improvements.

## Feature Summary

### 1. Simplified Project Creation Flow

**Previous Flow:**
- Users had to configure each question individually during project creation
- Image upload and question type selection happened upfront
- Complex UI with multiple steps in a modal

**New Flow:**
- Create project page now only requires:
  - Project brief (up to 5000 characters)
  - Preset questions (multi-line text input)
  - Question type preference (open-ended/multiple-choice/mixed)
- Question configuration (images, types) moved to project details page
- Cleaner, more focused creation experience

### 2. Editable Question List

**Implementation:**
- Replaced "Optimized Questions" section with "Question List"
- Each question displays:
  - Question number
  - Question text
  - Edit button (with icon and text)
  - Delete button (icon only)
- Questions stored in `InterviewProject.extra.questions` JSON field

**Data Structure:**
```typescript
{
  questionTypePreference: "open-ended" | "multiple-choice" | "mixed",
  questions: [
    {
      text: string,
      imageUrl?: string,
      imageObjectUrl?: string,
      imageFileName?: string,
      imageFileSize?: number,
      questionType?: "open" | "single-choice" | "multiple-choice"
    }
  ]
}
```

### 3. Question Edit Dialog

**Features:**
- Edit question text
- Upload/preview/delete question images
- Select question type (open-ended/single-choice/multiple-choice)
- Image validation (JPG/PNG/WebP/GIF, max 10MB)
- Direct S3 upload using existing infrastructure

**UI Optimizations:**
- Responsive dialog with max 90vh height
- Scrollable content area
- Compact image preview (64x64px thumbnail)
- Vertical layout for buttons to prevent overflow

### 4. Server Actions

**New Actions Created:**

#### `updateInterviewQuestion`
```typescript
updateInterviewQuestion(
  projectId: number,
  questionIndex: number,
  questionData: QuestionData
): Promise<ServerActionResult<InterviewProject>>
```
- Updates a specific question by index
- Validates user authorization
- Updates the questions array in JSON field

#### `deleteInterviewQuestion`
```typescript
deleteInterviewQuestion(
  projectId: number,
  questionIndex: number
): Promise<ServerActionResult<InterviewProject>>
```
- Removes a question from the array
- Validates user authorization
- Re-indexes remaining questions automatically

### 5. Component Refactoring

**RequestInteractionFormToolMessage** - Refactored from 421+ lines monolithic component to modular structure:

**New Structure:**
```
src/app/(interviewProject)/components/RequestInteractionForm/
├── RequestInteractionFormToolMessage.tsx  # Main component
├── config.ts                              # Configuration constants
├── types.ts                               # TypeScript interfaces
├── hooks.ts                               # Custom hooks
└── fields/
    ├── index.ts
    ├── TextField.tsx                      # Text input fields
    ├── ChoiceField.tsx                    # Single/multiple choice
    └── BooleanField.tsx                   # Yes/No fields
```

**Benefits:**
- Better code organization
- Easier to maintain and extend
- Separated concerns (UI, logic, types)
- Reusable field components

### 6. UI/UX Improvements

#### Interview Session Auto-Focus
- Text input box automatically appears and focuses when AI finishes streaming a text question
- Implemented in `FocusedInterviewChat.tsx`
- Improves user flow and reduces friction

#### Choice Question Confirmation Button
- **Alignment**: Right-aligned (changed from center)
- **Color**: Uses primary theme color (atypica green in dark mode)
- **Style**: `bg-primary hover:bg-primary/90 text-primary-foreground`
- **Disabled state**: Reduced opacity instead of custom colors
- Applied to both:
  - Single choice field individual OK button
  - Multiple choice fields unified OK button

#### Delete Button Styling
- Icon-only design (removed text label)
- Square button: `h-8 w-8 p-0`
- Initial color: `text-muted-foreground` (subtle gray)
- Hover color: `text-destructive` (red warning)

### 7. Question Optimization (Temporarily Disabled)

The automatic question optimization feature has been commented out (not deleted) for future consideration:

```typescript
// TODO: 暂时注释掉问题优化功能
// waitUntil(
//   processInterviewQuestionOptimization(project.id).catch((error) => {
//     rootLogger.error({ msg: "Question optimization failed:", error: (error as Error).message });
//   }),
// );
```

## File Changes

### New Files Created
- `src/app/(interviewProject)/interview/projects/new/page.tsx`
- `src/app/(interviewProject)/interview/projects/new/CreateInterviewProjectClient.tsx`
- `src/app/(interviewProject)/interview/project/[projectToken]/EditQuestionDialog.tsx`
- `src/app/(interviewProject)/components/RequestInteractionForm/` (entire directory)
  - `RequestInteractionFormToolMessage.tsx`
  - `config.ts`
  - `types.ts`
  - `hooks.ts`
  - `fields/TextField.tsx`
  - `fields/ChoiceField.tsx`
  - `fields/BooleanField.tsx`
  - `fields/index.ts`

### Modified Files
- `src/app/(interviewProject)/actions.ts` - Added question management actions
- `src/app/(interviewProject)/interview/project/[projectToken]/ProjectDetails.tsx` - Question list UI
- `src/app/(interviewProject)/interview/projects/InterviewProjectsClient.tsx` - Route to new page
- `src/app/(interviewProject)/types.ts` - Updated schemas
- `src/app/(interviewProject)/messages/zh-CN.json` - Added translations
- `src/app/(interviewProject)/messages/en-US.json` - Added translations
- `src/components/chat/FocusedInterviewChat.tsx` - Auto-focus input

### Deleted Files
- `src/app/(interviewProject)/components/RequestInteractionFormToolMessage.tsx` (replaced by modular version)

## Technical Details

### Image Upload Flow
1. User selects image file in EditQuestionDialog
2. Client-side validation (type, size)
3. Call `clientUploadFileToS3(file)` to get presigned URL
4. Direct upload to S3
5. Store `getObjectUrl` and `objectUrl` in question data
6. Save to database via `updateInterviewQuestion` action

### State Management
- Questions state managed in `ProjectDetails.tsx`
- Edit dialog state (`editingQuestion`, `editingQuestionIndex`, `questionEditDialogOpen`)
- Form submission triggers page refresh to show updated data
- Optimistic UI updates not implemented (shows toast then refreshes)

### Internationalization
All new UI text properly internationalized in both English and Chinese:
- Question list labels
- Edit dialog fields
- Error messages
- Success notifications

## Future Improvements

### Potential Enhancements
1. **Drag-and-drop reordering** - Allow users to reorder questions
2. **Bulk operations** - Select multiple questions for batch delete
3. **Question templates** - Save common question patterns
4. **Image optimization** - Automatic resize/compression before upload
5. **Question duplication** - Quick copy of existing questions
6. **Undo/Redo** - Question management history
7. **Optimistic updates** - Update UI before server response

### Re-enable Question Optimization
- Review AI-generated question optimization feature
- Consider making it opt-in rather than automatic
- Add progress indicator during optimization
- Allow editing optimized questions before accepting

## Testing Checklist

- [ ] Create new interview project with preset questions
- [ ] Verify questions appear in project details page
- [ ] Edit question text and save
- [ ] Upload image for question and verify preview
- [ ] Delete question image
- [ ] Change question type and save
- [ ] Delete question from list
- [ ] Verify changes persist after page refresh
- [ ] Test with multiple questions (5+)
- [ ] Test with long question text (200+ chars)
- [ ] Test image upload with different formats (JPG, PNG, WebP, GIF)
- [ ] Test file size validation (>10MB)
- [ ] Test in both English and Chinese locales
- [ ] Test on mobile/tablet viewports

## Commit Information

**Branch**: `feat/interview-improve`
**Commit**: `2c733c34`
**Files Changed**: 26 files, +1774 lines, -363 lines

### Key Changes Summary
- Simplified create project page to text-only input
- Added question management with edit/delete functionality
- Implemented S3 image upload for questions
- Refactored RequestInteractionForm into modular components
- Auto-focus input for text questions in interview sessions
- UI improvements: right-aligned OK button with primary color, icon-only delete button
