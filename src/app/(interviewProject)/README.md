# Interview Project System

A comprehensive interview management system that allows researchers to create projects, conduct interviews with both human participants and AI personas, and manage all sessions in one place.

## Features

### 1. Interview Project Management

- Create interview projects with detailed research briefs
- Manage project lists and view project details
- Delete projects and associated sessions

### 2. Human Interview Sessions

- Generate secure, encrypted share links for interview projects
- Participants can join interviews through shared links
- Real-time chat interface for conducting interviews
- Automatic session management and persistence

### 3. AI Persona Interviews

- Select from available AI personas for interviews
- Automated interview sessions with AI responses
- Persona-specific interview prompts and behaviors

### 4. Secure Access Control

- User authentication required for all operations
- Project ownership validation
- Encrypted share tokens with expiration
- Access control for interview sessions

## Architecture

### File Structure

```
src/app/(interviewProject)/
├── actions.ts                    # Server actions for CRUD operations
├── lib.ts                       # Utility functions and helpers
├── types.ts                     # TypeScript type definitions
├── layout.tsx                   # Layout component
├── api/
│   └── chat/
│       └── interviewSession/
│           └── route.ts         # Chat API for interview sessions
├── components/
│   ├── CreateProjectDialog.tsx  # Project creation dialog
│   ├── InterviewChat.tsx        # Chat interface component
│   ├── InterviewProjectsList.tsx # Project list component
│   ├── ProjectDetails.tsx       # Project detail view
│   └── ShareInterviewPage.tsx   # Shared interview landing page
├── projects/
│   ├── page.tsx                 # Projects list page
│   ├── [projectId]/
│   │   └── page.tsx            # Project details page
│   └── share/
│       └── [token]/
│           └── page.tsx        # Shared interview page
├── chat/
│   └── [token]/
│       └── page.tsx            # Interview chat page
└── test/
    └── page.tsx                # Test page for development
```

### Database Schema

The system uses the following Prisma models:

#### InterviewProject

```prisma
model InterviewProject {
  id     Int    @id @default(autoincrement())
  token  String @unique
  userId Int
  user   User   @relation(fields: [userId], references: [id])
  brief  String @db.Text

  createdAt DateTime @default(now()) @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @db.Timestamptz(6)

  sessions InterviewSession[]
}
```

#### InterviewSession

```prisma
model InterviewSession {
  id                   Int              @id @default(autoincrement())
  projectId            Int
  project              InterviewProject @relation(fields: [projectId], references: [id])
  userChatId           Int?             @unique
  userChat             UserChat?        @relation(fields: [userChatId], references: [id])
  intervieweeUserId    Int? // 受访的真人用户
  intervieweeUser      User?            @relation(fields: [intervieweeUserId], references: [id])
  intervieweePersonaId Int? // 受访的 AI 角色
  intervieweePersona   Persona?         @relation(fields: [intervieweePersonaId], references: [id])

  createdAt DateTime @default(now()) @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @db.Timestamptz(6)
}
```

## API Endpoints

### Server Actions

#### Project Management

- `createInterviewProject(input)` - Create a new interview project
- `fetchUserInterviewProjects()` - Get user's interview projects
- `fetchInterviewProjectById(id)` - Get specific project details
- `deleteInterviewProject(id)` - Delete a project
- `generateProjectShareToken(id, expiry?)` - Generate share link

#### Share Token Management

- `validateShareToken(token)` - Validate and decode share token
- `createHumanInterviewSession(input)` - Create session for human participant

#### Session Management

- `createPersonaInterviewSession(input)` - Create session for AI persona
- `fetchInterviewSession(id)` - Get session details
- `fetchInterviewSessionByChatToken(token)` - Get session by chat token

#### Persona Management

- `fetchAvailablePersonas()` - Get list of available AI personas

### Chat API

- `POST /api/chat/interview-agent` - Handle interview chat messages

## Usage Examples

### 1. Creating an Interview Project

```typescript
const result = await createInterviewProject({
  brief:
    "Research on user experience with mobile apps. We want to understand how users navigate through different features and what challenges they face.",
});

if (result.success) {
  console.log("Project created:", result.data.id);
}
```

### 2. Generating a Share Link

```typescript
const shareResult = await generateProjectShareToken(projectId, 24); // 24 hours expiry

if (shareResult.success) {
  const shareUrl = `${baseUrl}${shareResult.data.shareUrl}`;
  // Share this URL with participants
}
```

### 3. Starting an AI Interview

```typescript
const sessionResult = await createPersonaInterviewSession({
  projectId: 123,
  personaId: 456,
});

if (sessionResult.success) {
  // Redirect to chat interface
  window.location.href = `/chat/${sessionResult.data.chatToken}`;
}
```

## Security Features

### Encrypted Share Tokens

- Share tokens are encrypted using AES-256-CBC
- Tokens include expiration timestamps
- Automatic validation and cleanup of expired tokens

### Access Control

- Project owners can manage their projects
- Interview participants can only access sessions they're part of
- Authentication required for all operations

### Data Privacy

- Interview conversations are stored securely
- Access logs for audit trails
- Privacy notices displayed to participants

## Chat Interface Features

### Real-time Communication

- Uses AI SDK for streaming responses
- Smooth text rendering with chunking
- Auto-scroll to latest messages

### Interview Flow

- Automated conversation initialization
- Context-aware prompting based on project brief
- Support for both human and AI interviews

### UI Components

- Professional chat interface
- Project information sidebar
- Session status indicators
- Privacy notices and disclaimers

## Development

### Testing

Use the test page at `/test` to verify functionality:

- Basic component rendering
- Navigation between pages
- Link generation and validation

### Environment Variables

Ensure these are set in your environment:

- `CIPHER_PASSWORD` - For token encryption
- Database connection variables
- NextAuth configuration

### Dependencies

- Next.js 14+ with App Router
- Prisma for database operations
- AI SDK for chat functionality
- Tailwind CSS for styling
- Framer Motion for animations
- Sonner for toast notifications

## Deployment Considerations

1. **Database Migrations**: Run Prisma migrations for new schema
2. **Environment Variables**: Set encryption keys and API configurations
3. **Authentication**: Ensure NextAuth is properly configured
4. **File Uploads**: Configure file storage for attachments if needed
5. **Rate Limiting**: Implement rate limiting for chat endpoints

## Future Enhancements

- Interview recording and transcription
- Advanced analytics and reporting
- Multi-language support
- Integration with external survey tools
- Automated interview scheduling
- Real-time collaboration features
