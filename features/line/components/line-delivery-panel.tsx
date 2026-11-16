import { getLineDeliveryState } from "@/features/line/services/line-delivery-settings";
import LineDeliveryControl from "./line-delivery-control";
export default async function LineDeliveryPanel({ canManage }: { canManage: boolean }): Promise<React.ReactNode> {
  const state = await getLineDeliveryState();
  return <LineDeliveryControl key={`${state.enabled}-${state.updatedAt}-${state.available}`} initial={state} canManage={canManage} />;
}
