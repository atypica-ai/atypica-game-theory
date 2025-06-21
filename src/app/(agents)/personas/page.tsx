import { fetchUserChatByIdAction } from "@/app/(agents)/agents/actions";
import { checkTezignAuth } from "@/app/admin/actions";
import { throwServerActionError } from "@/lib/serverAction";
import PersonasList from "./PersonasList";

// 关闭 SSG，否则 build 环境会读取数据库
export const dynamic = "force-dynamic";

// type PageProps = {
//   searchParams?: { scoutUserChat?: string };
// };

export default async function PersonasPage({
  searchParams,
}: {
  searchParams: Promise<{
    scoutUserChat?: string;
    page?: string;
    search?: string;
  }>;
}) {
  await checkTezignAuth();
  const { scoutUserChat: userChatParam, page: pageStr, search } = await searchParams;
  const page = pageStr ? parseInt(pageStr) : undefined;
  if (userChatParam) {
    const scoutUserChatId = parseInt(userChatParam);
    const scoutUserChatResult = await fetchUserChatByIdAction(scoutUserChatId, "scout");
    if (!scoutUserChatResult.success) {
      throwServerActionError(scoutUserChatResult);
    }
    return (
      <PersonasList scoutUserChat={scoutUserChatResult.data} initialParams={{ page, search }} />
    );
  } else {
    return <PersonasList initialParams={{ page, search }} />;
  }
}
