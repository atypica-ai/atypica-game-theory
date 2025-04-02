import { redirect } from "next/navigation";

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect: string }>;
}) {
  const redirectUrl = (await searchParams).redirect;
  if (redirectUrl) {
    redirect(redirectUrl);
  }
  redirect("/");
}
