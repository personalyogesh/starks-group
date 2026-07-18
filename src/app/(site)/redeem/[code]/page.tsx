import RedeemGiftCardPage from "@/app/components/RedeemGiftCardPage";

export default async function RedeemGiftCardCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const resolvedParams = await params;
  const code = decodeURIComponent(resolvedParams.code ?? "");
  return <RedeemGiftCardPage initialCode={code} />;
}
