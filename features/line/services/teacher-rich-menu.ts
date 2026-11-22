import "server-only";

const API = "https://api.line.me/v2/bot";
const TEACHER_MENU_NAMES = ["Chumkosoft teacher v2", "Chumkosoft teacher v1"];

function token(): string | null {
  return process.env.LINE_CHANNEL_ACCESS_TOKEN || null;
}

async function lineRequest(path: string, method = "GET"): Promise<Response | null> {
  const accessToken = token();
  if (!accessToken) return null;
  return fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
}

async function publishedTeacherMenus(): Promise<string[] | null> {
  const response = await lineRequest("/richmenu/list");
  if (!response?.ok) return null;
  const { richmenus = [] } = await response.json() as { richmenus?: { richMenuId: string; name: string }[] };
  return TEACHER_MENU_NAMES.flatMap((name) => richmenus.filter((menu) => menu.name === name).map((menu) => menu.richMenuId));
}

export async function teacherRichMenuId(): Promise<string | null> {
  return (await publishedTeacherMenus())?.[0] ?? null;
}

export async function linkTeacherRichMenu(lineUserId: string, menuId?: string): Promise<boolean> {
  const id = menuId ?? await teacherRichMenuId();
  if (!id) return false;
  const response = await lineRequest(`/user/${encodeURIComponent(lineUserId)}/richmenu/${encodeURIComponent(id)}`, "POST");
  return Boolean(response?.ok);
}

export async function unlinkTeacherRichMenu(lineUserId: string): Promise<boolean> {
  const current = await lineRequest(`/user/${encodeURIComponent(lineUserId)}/richmenu`);
  if (current?.status === 404) return true;
  if (!current?.ok) return false;
  const data = await current.json() as { richMenuId?: string };
  const teacherMenus = await publishedTeacherMenus();
  if (!teacherMenus) return false;
  if (!data.richMenuId || !teacherMenus.includes(data.richMenuId)) return true;
  const response = await lineRequest(`/user/${encodeURIComponent(lineUserId)}/richmenu`, "DELETE");
  return Boolean(response?.ok);
}
