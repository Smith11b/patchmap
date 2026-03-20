import crypto from "node:crypto";

type GitHubAppInstallationResponse = {
  id: number;
  account: {
    login: string;
    type: string;
    id: number;
  } | null;
  repository_selection: string;
};

type GitHubInstallationAccessTokenResponse = {
  token: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }

  return value;
}

function toBase64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function getGitHubAppPrivateKey() {
  return requireEnv("GITHUB_APP_PRIVATE_KEY").replace(/\\n/g, "\n");
}

function createGitHubAppJwt() {
  const issuedAt = Math.floor(Date.now() / 1000) - 60;
  const expiresAt = issuedAt + 9 * 60;

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const payload = {
    iat: issuedAt,
    exp: expiresAt,
    iss: requireEnv("GITHUB_APP_ID"),
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), getGitHubAppPrivateKey());

  return `${unsigned}.${toBase64Url(signature)}`;
}

async function fetchGitHubAppJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${createGitHubAppJwt()}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub App request failed (${response.status}): ${text}`);
  }

  return response.json() as Promise<T>;
}

export function getGitHubAppInstallUrl(state: string): string {
  const appSlug = requireEnv("GITHUB_APP_SLUG");
  return `https://github.com/apps/${appSlug}/installations/new?state=${encodeURIComponent(state)}`;
}

export async function getGitHubAppInstallation(installationId: number) {
  return fetchGitHubAppJson<GitHubAppInstallationResponse>(
    `https://api.github.com/app/installations/${installationId}`
  );
}

export async function createGitHubInstallationAccessToken(installationId: number): Promise<string> {
  const response = await fetchGitHubAppJson<GitHubInstallationAccessTokenResponse>(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
    }
  );

  return response.token;
}
