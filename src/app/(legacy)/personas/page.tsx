import { fetchUserChatById } from "@/lib/data/UserChat";
import { throwServerActionError } from "@/lib/serverAction";
import PersonasList from "./PersonasList";
import { fetchPersonas } from "./actions";

// 关闭 SSG，否则 build 环境会读取数据库
export const dynamic = "force-dynamic";

// type PageProps = {
//   searchParams?: { scoutUserChat?: string };
// };

export default async function PersonasPage({
  searchParams,
}: {
  searchParams: Promise<{ scoutUserChat?: string; page?: string }>;
}) {
  const userChatParam = (await searchParams)?.scoutUserChat;
  // Extract page from search params
  const pageParam = (await searchParams)?.page;
  const page = pageParam ? parseInt(pageParam) : 1;
  if (userChatParam) {
    const scoutUserChatId = parseInt(userChatParam);
    const scoutUserChatResult = await fetchUserChatById(scoutUserChatId, "scout");
    const personasResult = await fetchPersonas({
      scoutUserChatId,
      page,
    });
    if (!scoutUserChatResult.success) {
      throwServerActionError(scoutUserChatResult);
    }
    if (!personasResult.success) {
      throwServerActionError(personasResult);
    }
    return (
      <PersonasList
        initialPersonas={personasResult.data}
        paginationInfo={personasResult.pagination}
        scoutUserChat={scoutUserChatResult.data}
      />
    );
  } else {
    const personasResult = await fetchPersonas({ page });
    if (!personasResult.success) {
      throwServerActionError(personasResult);
    }
    return (
      <PersonasList
        initialPersonas={personasResult.data}
        paginationInfo={personasResult.pagination}
      />
    );
  }
}
