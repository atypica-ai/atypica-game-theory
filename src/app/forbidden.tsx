import { Forbidden } from "@/components/Forbidden";
import { DefaultLayout } from "@/components/layout/DefaultLayout";

export default function ForbiddenPage() {
  return (
    <DefaultLayout header={true} footer={true}>
      <Forbidden />
    </DefaultLayout>
  );
}
