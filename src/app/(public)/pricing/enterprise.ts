import { createUserChat } from "@/data/UserChat";
import { getDeployRegion } from "@/lib/deployRegion";

export const sayHelloToSales = async () => {
  const result = await createUserChat("misc", {
    role: "user",
    content:
      getDeployRegion() === "mainland"
        ? "我是企业用户，想了解一下企业版"
        : "I want to learn about the enterprise version",
  });
  if (!result.success) {
    throw result;
  }
  const chat = result.data;
  window.location.href = `/agents/hello/${chat.id}`;
};
