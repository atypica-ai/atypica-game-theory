# Persona Chat Feature

This directory contains the implementation of the persona chat functionality, which allows users to interact with AI personas generated from imported interview data.

## Overview

The persona chat feature enables users to:

- View and manage their generated personas
- Chat with personas in real-time
- Access persona details and metadata
- Navigate between different personas

## Directory Structure

```
(persona)/
├── personas/
│   └── page.tsx                      # User's personas list page
├── persona-chat/
│   ├── [userchattoken]/
│   │   ├── page.tsx                  # Token-based persona chat page
│   │   └── PersonaChatClient.tsx     # Chat interface component
│   └── layout.tsx                    # Layout for persona chat pages
├── persona-import/                   # Existing persona import functionality
├── persona-followup/                 # Follow-up interview functionality
│   └── [userChatToken]/
│       ├── FollowUpInterviewClient.tsx
│       └── page.tsx
├── actions.ts                        # Server actions (updated with new functions)
└── README.md                         # This file
```

## API Endpoints

```
/api/persona/
├── chat/route.ts                     # Token-based chat API with message persistence
└── followup/route.ts                 # Follow-up interview API using tokens
```

## Key Features

### 1. Secure Access Control

- Users can only access personas they created (through PersonaImport)
- Admins with `MANAGE_PERSONAS` permission can access all personas
- Implemented via `checkPersonaAccess()` function in `actions.ts`
- Follow-up interviews are also protected by user ownership

### 2. Persona Chat Interface (`/persona-chat/[userchattoken]`)

- Token-based chat sessions with message persistence
- Real-time chat with AI personas
- Persona details modal with metadata display
- Full persona prompt visibility
- Chat history preservation across sessions

### 3. Personas Management (`/personas`)

- Grid view of user's personas
- Persona cards with key information
- One-click chat creation with automatic UserPersonaChat management
- Import new interview action card
- Links to original analysis for each persona

### 4. Token-Based Chat System

- **UserPersonaChatRelation Management**: Automatic creation of chat sessions via `createOrGetUserPersonaChat`
- **Message Persistence**: All chat messages stored in database via UserChat
- **Chat API**: `/api/persona/chat` - Token-based chat with message history
- **Follow-up API**: `/api/persona/followup` - Token-based follow-up interviews
- Secure token validation and user ownership verification

## Usage

### For Users

1. Import interview data via `/persona-import`
2. View generated personas at `/personas`
3. Click "Start Chat" to automatically create a chat session at `/persona-chat/[token]`
4. Access follow-up interviews via generated share links
5. Chat history is automatically preserved across sessions

### For Developers

The implementation follows these patterns:

- Server actions for data fetching with proper auth
- Client components for interactive UI
- Secure API routes with permission validation
- Consistent error handling and user feedback

## Permission Model

### Persona Chat Access

```typescript
// Access is granted if:
userChat.userId === user.id && userPersonaChatRelation.userId === user.id;
// OR user.hasPermission(MANAGE_PERSONAS)
```

### Follow-up Interview Access

```typescript
// Access is granted if:
userChat.userId === user.id && personaImport.userId === user.id;
```

## Integration Points

- Integrates with existing persona import workflow via UserPersonaChatRelation
- Automatic chat session creation through `createOrGetUserPersonaChat`
- Updated all persona access points to use token-based routing
- Message persistence through existing UserChat system
- Follow-up interviews use secure token-based access
- Admin interface supports chat creation for any persona

## Technical Notes

- Uses `useChat` hook from AI SDK for real-time streaming
- Implements proper TypeScript types for all data structures
- Responsive design with collapsible sidebar
- Error boundaries and loading states throughout
- Follows existing UI/UX patterns from the application
- Layout file scoped to chat pages to avoid interfering with follow-up interviews

## Security Considerations

- All API endpoints require authentication
- User ownership is verified at multiple levels
- Follow-up interviews have additional token validation
- Proper error messages without information leakage
- Admin permissions are respected for management access

## Migration Notes

- Persona chat moved from `/personas/[id]` to `/persona-chat/[userchattoken]`
- Chat API now uses `userChatToken` instead of `personaId`
- Follow-up API updated to use `userChatToken` instead of `userChatId`
- All persona access points now create UserPersonaChatRelation and UserChat automatically
- Chat messages are now persisted to database via UserChat system
- Existing personas can be accessed through new token-based system
