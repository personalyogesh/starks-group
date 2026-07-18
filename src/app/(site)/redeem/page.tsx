import RedeemGiftCardPage from "@/app/components/RedeemGiftCardPage";

export default async function RedeemPage({
  searchParams,
}: {
  searchParams: Promise<{ print?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  return <RedeemGiftCardPage initialPrintMode={resolvedSearchParams.print === "1"} />;
}
