import RedeemGiftCardPage from "@/app/components/RedeemGiftCardPage";

export default async function RedeemGiftCardCodePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const code = decodeURIComponent(resolvedParams.code ?? "");
  return <RedeemGiftCardPage initialCode={code} initialPrintMode={resolvedSearchParams.print === "1"} />;
}
