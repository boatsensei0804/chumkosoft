import "server-only";

import { isIP } from "node:net";
import prisma from "@/lib/prisma";

const id = "singleton";

export function normalizeAdmsIp(value: string): string | null {
  if (value.includes("%")) return null;
  const version = isIP(value);
  if (version === 4) return value;
  if (version === 6) return new URL("http://[" + value + "]").hostname.slice(1, -1);
  return null;
}

export function parseAdmsIpList(value: string): string[] | null {
  const addresses = new Set<string>();
  for (const address of splitAddresses(value)) {
    const normalized = normalizeAdmsIp(address);
    if (!normalized) return null;
    addresses.add(normalized);
  }
  return [...addresses];
}

function splitAddresses(value: string): string[] {
  return value.split(/[,\r\n]+/u).map((ip) => ip.trim()).filter(Boolean);
}

export async function getAdmsNetworks() {
  return await prisma.zktecoNetworkSetting.findUnique({
    where: { id },
    select: { allowedIps: true, revision: true },
  }) ?? {
    allowedIps: splitAddresses(process.env.ZKTECO_ADMS_ALLOWED_IPS ?? ""),
    revision: 0,
  };
}

export async function saveAdmsNetworks(allowedIps: string[], revision: number): Promise<boolean> {
  const result = revision === 0
    ? await prisma.zktecoNetworkSetting.createMany({ data: { id, allowedIps }, skipDuplicates: true })
    : await prisma.zktecoNetworkSetting.updateMany({
      where: { id, revision },
      data: { allowedIps, revision: { increment: 1 } },
    });
  return result.count === 1;
}
