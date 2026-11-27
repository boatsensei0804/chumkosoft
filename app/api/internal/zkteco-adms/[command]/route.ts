import { readAdms, receiveAdms } from "@/features/faces/services/zkteco-adms";

type Context = { params: Promise<{ command: string }> };

export async function GET(request: Request, { params }: Context): Promise<Response> {
  return readAdms(request, (await params).command, "gateway");
}

export async function POST(request: Request, { params }: Context): Promise<Response> {
  return receiveAdms(request, (await params).command, "gateway");
}
