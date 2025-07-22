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
│   ├── [id]/
│   │   ├── page.tsx                  # Persona detail & chat page
│   │   ├── PersonaChatPage.tsx       # Chat interface component
│   │   └── layout.tsx                # Layout for persona chat pages
│   └── page.tsx                      # User's personas list page
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
├── chat/route.ts                     # Secure chat API with permission checks
└── followup/route.ts                 # Follow-up interview API
```

## Key Features

### 1. Secure Access Control

- Users can only access personas they created (through PersonaImport)
- Admins with `MANAGE_PERSONAS` permission can access all personas
- Implemented via `checkPersonaAccess()` function in `actions.ts`
- Follow-up interviews are also protected by user ownership

### 2. Persona Chat Interface (`/personas/[id]`)

- Real-time chat with AI personas
- Collapsible sidebar showing persona details
- Persona metadata display (tags, tier, source, etc.)
- Full persona prompt visibility
- Navigation back to personas list

### 3. Personas Management (`/personas`)

- Grid view of user's personas
- Persona cards with key information
- Detail modal with full persona data
- Quick access to chat with each persona
- Empty state with call-to-action

### 4. API Security

- **Chat API**: `/api/persona/chat` - Secure chat API with permission checks
- **Follow-up API**: `/api/persona/followup` - Protected follow-up interview API
- Both endpoints validate user ownership and authentication
- Proper error handling and authorization

## Usage

### For Users

1. Import interview data via `/persona-import`
2. View generated personas at `/personas`
3. Click on any persona to start chatting at `/personas/[id]`
4. Access follow-up interviews via generated share links

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
user.hasPermission(MANAGE_PERSONAS) || persona.personaImport.userId === user.id;
```

### Follow-up Interview Access

```typescript
// Access is granted if:
userChat.userId === user.id && personaImport.userId === user.id;
```

## Integration Points

- Integrates with existing persona import workflow
- Links added to `PersonaSummary` component for chat access
- Updated admin personas list to use new chat URLs
- Maintains compatibility with existing persona generation system
- Follow-up interviews use secure token-based access

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

- Original `/api/chat/persona` route has been replaced with `/api/persona/chat`
- Follow-up interviews moved from `/api/chat/persona/followup` to `/api/persona/followup`
- Persona chat pages moved from `/persona/[id]` to `/personas/[id]`
- Follow-up interviews moved from `/persona/followup/[token]` to `/persona-followup/[token]`
- Layout file moved to specific chat page to prevent conflicts
