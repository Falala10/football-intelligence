export type Commentary = {
  source: "human" | "automatic";
  fetchedAtUtc: string;
  items: { id: string; minute: string | null; text: string }[];
};
export type CommentaryResult = { status: "ok"; data: Commentary } | { status: "none" } | { status: "unavailable" };
