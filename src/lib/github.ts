export interface GitHubUserInfo {
  login: string;
  name: string;
  avatar_url: string;
}

export async function validateGitHubToken(token: string): Promise<{ valid: boolean; user?: GitHubUserInfo; error?: string }> {
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'GitPulse-Automation-App',
      },
    });

    if (!res.ok) {
      if (res.status === 401) return { valid: false, error: 'Invalid or expired GitHub Personal Access Token' };
      return { valid: false, error: `GitHub API error: ${res.statusText}` };
    }

    const data = await res.json();
    return {
      valid: true,
      user: {
        login: data.login,
        name: data.name || data.login,
        avatar_url: data.avatar_url,
      },
    };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Failed to connect to GitHub' };
  }
}

export async function verifyRepositoryAccess(
  token: string,
  owner: string,
  repo: string,
  branch: string
): Promise<{ success: boolean; defaultBranch?: string; error?: string }> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'GitPulse-Automation-App',
      },
    });

    if (!res.ok) {
      if (res.status === 404) return { success: false, error: 'Repository not found or token lacks access' };
      return { success: false, error: `GitHub error: ${res.statusText}` };
    }

    const repoData = await res.json();
    const targetBranch = branch || repoData.default_branch || 'main';

    // Verify branch ref
    const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${targetBranch}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'GitPulse-Automation-App',
      },
    });

    if (!refRes.ok) {
      return { success: false, error: `Branch '${targetBranch}' does not exist on repository` };
    }

    return { success: true, defaultBranch: repoData.default_branch };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error checking repository' };
  }
}

export async function pushEmptyCommit(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  customMessage?: string
): Promise<{ success: boolean; commitSha?: string; commitUrl?: string; error?: string }> {
  try {
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'GitPulse-Automation-App',
    };

    // 1. Get HEAD reference
    const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`, {
      headers,
    });

    if (!refRes.ok) {
      return { success: false, error: `Failed to fetch branch reference: ${refRes.statusText}` };
    }

    const refData = await refRes.json();
    const parentCommitSha = refData.object.sha;

    // 2. Get latest commit details to get root tree SHA
    const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits/${parentCommitSha}`, {
      headers,
    });

    if (!commitRes.ok) {
      return { success: false, error: `Failed to fetch parent commit: ${commitRes.statusText}` };
    }

    const commitData = await commitRes.json();
    const treeSha = commitData.tree.sha;

    // 3. Create empty commit using the exact same tree
    const defaultMessages = [
      'chore: maintenance ping [skip ci]',
      'docs: update activity heartbeat',
      'refactor: routine system sync',
      'ci: heartbeat check [skip ci]',
      'build: update pulse record',
      'chore(core): regular sync check',
      'perf: automated heartbeat update',
    ];

    const randomMsg = defaultMessages[Math.floor(Math.random() * defaultMessages.length)];
    const message = customMessage || `${randomMsg} (${new Date().toLocaleTimeString('en-US', { hour12: false })})`;

    const newCommitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message,
        tree: treeSha,
        parents: [parentCommitSha],
      }),
    });

    if (!newCommitRes.ok) {
      const errBody = await newCommitRes.text();
      return { success: false, error: `Failed to create empty commit: ${errBody}` };
    }

    const newCommitData = await newCommitRes.json();
    const newCommitSha = newCommitData.sha;

    // 4. Update the branch reference (fast-forward push)
    const updateRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        sha: newCommitSha,
        force: false,
      }),
    });

    if (!updateRefRes.ok) {
      const errBody = await updateRefRes.text();
      return { success: false, error: `Failed to update branch ref: ${errBody}` };
    }

    const commitUrl = `https://github.com/${owner}/${repo}/commit/${newCommitSha}`;
    return {
      success: true,
      commitSha: newCommitSha,
      commitUrl,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unexpected error while pushing empty commit' };
  }
}
