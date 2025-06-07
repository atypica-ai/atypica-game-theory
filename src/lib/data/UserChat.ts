// "use server";
// // export async function createUserChat<TKind extends UserChatWithMessages["kind"]>(
// export async function createUserChat<TKind extends "misc" | "scout">(
//   kind: TKind,
//   { role, content }: { role: "user" | "assistant"; content: string },
// ): Promise<ServerActionResult<Omit<UserChat, "kind"> & { kind: TKind }>> {
//   return withAuth(async (user) => {
//     const message: Message = {
//       id: generateId(),
//       role,
//       content,
//       parts: [{ type: "text", text: content }],
//     };
//     const userChat = await prisma.userChat.create({
//       data: {
//         userId: user.id,
//         title: message.content.substring(0, 50),
//         kind,
//         token: generateToken(),
//       },
//     });
//     await prisma.chatMessage.create({
//       data: {
//         messageId: generateId(),
//         userChatId: userChat.id,
//         role,
//         content,
//         parts: message.parts as InputJsonValue,
//       },
//     });
//     return {
//       success: true,
//       data: {
//         ...userChat,
//         kind: userChat.kind as TKind,
//         messages: [message],
//       },
//     };
//   });
// }

// export async function deleteMessageFromUserChat(
//   userChatId: number,
//   messageId: string,
// ): Promise<ServerActionResult<Message[]>> {
//   return withAuth(async (user) => {
//     const userChat = await prisma.userChat.findUnique({
//       where: { id: userChatId },
//     });
//     if (userChat?.userId != user.id) {
//       return {
//         success: false,
//         code: "forbidden",
//         message: "UserChat does not belong to the current user",
//       };
//     }
//     const newMessages = [...messages];
//     const index = newMessages.findIndex((message) => message.id === messageId);
//     if (index >= 0 && newMessages[index].role === "user") {
//       if (newMessages[index + 1]?.role === "assistant") {
//         newMessages.splice(index, 2);
//       } else {
//         newMessages.splice(index, 1);
//       }
//     }
//     await prisma.userChat.update({
//       where: { id: userChatId },
//       data: { messages: newMessages as unknown as InputJsonValue },
//     });
//     return {
//       success: true,
//       data: newMessages,
//     };
//   });
// }
