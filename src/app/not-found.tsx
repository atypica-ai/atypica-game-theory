import { DefaultLayout } from "@/components/layout/DefaultLayout";
import { NotFound } from "@/components/NotFound";

export default function NotFoundPage() {
  return (
    <DefaultLayout header={true} footer={true}>
      <NotFound />
    </DefaultLayout>
  );
}
