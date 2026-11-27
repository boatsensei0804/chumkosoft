import { readAdms, receiveAdms } from "@/features/faces/services/zkteco-adms";

type Context = { params: Promise<{ command: string }> };

export async function GET(request: Request, { params }: Context): Promise<Response> {
  const command = (await params).command.toLowerCase().replace(/\.aspx$/u, "");
  return readAdms(request, command, "tunnel");
}

export async function POST(request: Request, { params }: Context): Promise<Response> {
  const command = (await params).command.toLowerCase().replace(/\.aspx$/u, "");
  return receiveAdms(request, command, "tunnel");
}
