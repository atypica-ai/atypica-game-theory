import { createUserChat } from "@/data/UserChat";

export const sayHelloToSales = async () => {
  const result = await createUserChat("misc", {
    role: "user",
    content: "我是企业用户，想了解一下企业版",
  });
  if (!result.success) {
    throw result;
  }
  const chat = result.data;
  window.location.href = `/agents/hello/${chat.id}`;
};
