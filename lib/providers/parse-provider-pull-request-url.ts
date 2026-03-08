import { RegisterFromProviderRequest } from "@/lib/schemas/register-from-provider";

export type ParsedProviderPullRequestUrl = Omit<
  RegisterFromProviderRequest,
  "workspaceId"
>;

const UNSUPPORTED_URL_ERROR =
  "Unsupported URL format. Use a GitHub PR URL or GitLab MR URL.";

type ParseResult =
  | { payload: ParsedProviderPullRequestUrl }
  | { error: string };

function toPositiveInteger(value: string): number | null {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function parseProviderPullRequestUrl(rawUrl: string): ParseResult {
  const trimmed = rawUrl.trim();

  if (!trimmed) {
    return { error: "PR/MR URL is required." };
  }

  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    return { error: UNSUPPORTED_URL_ERROR };
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const segments = url.pathname.split("/").filter(Boolean);

  if (host === "github.com") {
    if (segments.length < 4 || segments[2] !== "pull") {
      return { error: UNSUPPORTED_URL_ERROR };
    }

    const prNumber = toPositiveInteger(segments[3]);
    if (!prNumber) {
      return { error: "GitHub PR number is invalid." };
    }

    return {
      payload: {
        provider: "github",
        owner: segments[0],
        name: segments[1],
        prNumber,
      },
    };
  }

  const separatorIndex = segments.indexOf("-");
  if (
    separatorIndex > 0 &&
    segments[separatorIndex + 1] === "merge_requests" &&
    segments.length > separatorIndex + 2
  ) {
    const prNumber = toPositiveInteger(segments[separatorIndex + 2]);
    if (!prNumber) {
      return { error: "GitLab MR number is invalid." };
    }

    const projectPath = segments.slice(0, separatorIndex).join("/");
    if (!projectPath) {
      return { error: "GitLab project path is invalid." };
    }

    return {
      payload: {
        provider: "gitlab",
        projectPath,
        prNumber,
      },
    };
  }

  return { error: UNSUPPORTED_URL_ERROR };
}

