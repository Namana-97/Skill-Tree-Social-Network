import { EvidenceType, Prisma } from '@prisma/client';

const GITHUB_API_BASE = 'https://api.github.com';
const MIN_RELEVANCE_SCORE = 35;
const RESERVED_PROFILE_PATHS = new Set([
  'about',
  'account',
  'collections',
  'contact',
  'customer-stories',
  'enterprise',
  'events',
  'explore',
  'features',
  'issues',
  'login',
  'marketplace',
  'new',
  'notifications',
  'orgs',
  'organizations',
  'pricing',
  'pulls',
  'search',
  'security',
  'sessions',
  'settings',
  'signup',
  'site',
  'sponsors',
  'team',
  'teams',
  'topics',
  'trending'
]);
const ROOT_MANIFEST_FILES = [
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'requirements.txt',
  'pyproject.toml',
  'Pipfile',
  'environment.yml',
  'go.mod',
  'Cargo.toml',
  'Dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  'main.tf',
  'versions.tf',
  'README.md'
] as const;

type UserGitHubIdentity = {
  id: number;
  githubLogin?: string | null;
  githubProfileUrl?: string | null;
};

type SkillRule = {
  key: string;
  aliases: string[];
  languages: string[];
  dependencyTokens: string[];
  textTokens: string[];
  fileTokens: string[];
  supportsGithub: boolean;
};

type GitHubUrlSpec =
  | {
      kind: 'profile';
      originalUrl: string;
      normalizedUrl: string;
      login: string;
    }
  | {
      kind: 'repo' | 'tree' | 'blob';
      originalUrl: string;
      normalizedUrl: string;
      owner: string;
      repo: string;
    }
  | {
      kind: 'pull_request';
      originalUrl: string;
      normalizedUrl: string;
      owner: string;
      repo: string;
      number: number;
    }
  | {
      kind: 'commit';
      originalUrl: string;
      normalizedUrl: string;
      owner: string;
      repo: string;
      sha: string;
    };

type GitHubIdentity = {
  login: string;
  profileUrl: string;
};

type VerifiedSkillEvidence = {
  type: EvidenceType;
  title: string;
  url: string;
  canonicalUrl: string;
  resourceType: string;
  ownerLogin: string | null;
  repositoryName: string | null;
  issuer: string;
  description: string;
  impact: string | null;
  verificationSummary: string;
  verificationScore: number;
  relevanceScore: number;
  metadata: Prisma.JsonObject;
  isVerified: true;
};

type VerificationResult = {
  skillKey: string;
  githubLogin: string;
  githubProfileUrl: string;
  primaryProofUrl: string;
  evidence: VerifiedSkillEvidence[];
  derivedLevel: number;
  trustScore: number;
  summary: string;
};

type RepoSummary = {
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  owner: {
    login: string;
    type: string;
    html_url: string;
  };
  stargazers_count?: number;
  forks_count?: number;
  topics?: string[];
  default_branch?: string;
  private?: boolean;
};

type PullFile = {
  filename: string;
  additions: number;
  deletions: number;
  changes: number;
  status: string;
};

type CommitFile = {
  filename: string;
  additions: number;
  deletions: number;
  changes: number;
  status: string;
};

type RepoInspection = {
  repo: RepoSummary;
  relevanceScore: number;
  matchedLanguages: string[];
  matchedDependencies: string[];
  matchedTexts: string[];
  matchedFiles: string[];
  manifestFiles: string[];
  verificationSummary: string;
  metadata: Prisma.JsonObject;
};

const SKILL_RULES: SkillRule[] = [
  {
    key: 'html',
    aliases: ['html', 'html5'],
    languages: ['HTML'],
    dependencyTokens: [],
    textTokens: ['html'],
    fileTokens: ['.html', '.htm'],
    supportsGithub: true
  },
  {
    key: 'python',
    aliases: ['python'],
    languages: ['Python'],
    dependencyTokens: ['python', 'fastapi', 'django', 'flask', 'numpy', 'pandas', 'tensorflow', 'pytorch'],
    textTokens: ['python', 'fastapi', 'django', 'flask', 'jupyter'],
    fileTokens: ['requirements.txt', 'pyproject.toml', 'setup.py', '.py'],
    supportsGithub: true
  },
  {
    key: 'javascript',
    aliases: ['javascript', 'js'],
    languages: ['JavaScript'],
    dependencyTokens: ['javascript', 'node', 'react', 'next', 'vue'],
    textTokens: ['javascript', 'js'],
    fileTokens: ['package.json', '.js'],
    supportsGithub: true
  },
  {
    key: 'typescript',
    aliases: ['typescript', 'ts'],
    languages: ['TypeScript'],
    dependencyTokens: ['typescript', 'ts-node', 'tsx'],
    textTokens: ['typescript'],
    fileTokens: ['tsconfig.json', '.ts', '.tsx'],
    supportsGithub: true
  },
  {
    key: 'react',
    aliases: ['react', 'reactjs'],
    languages: ['JavaScript', 'TypeScript'],
    dependencyTokens: ['react', 'react-dom'],
    textTokens: ['react'],
    fileTokens: ['package.json', '.jsx', '.tsx'],
    supportsGithub: true
  },
  {
    key: 'next.js',
    aliases: ['next.js', 'nextjs', 'next'],
    languages: ['JavaScript', 'TypeScript'],
    dependencyTokens: ['next'],
    textTokens: ['next.js', 'nextjs'],
    fileTokens: ['package.json', 'next.config.js', 'next.config.mjs', 'next.config.ts'],
    supportsGithub: true
  },
  {
    key: 'node',
    aliases: ['node', 'nodejs'],
    languages: ['JavaScript', 'TypeScript'],
    dependencyTokens: ['express', 'koa', 'fastify', 'nestjs', '@nestjs/core', 'hono'],
    textTokens: ['node', 'backend', 'api'],
    fileTokens: ['package.json', '.js', '.ts'],
    supportsGithub: true
  },
  {
    key: 'sql',
    aliases: ['sql', 'postgresql', 'postgres'],
    languages: ['SQL'],
    dependencyTokens: ['prisma', 'sequelize', 'typeorm', 'knex', 'pg', 'postgres'],
    textTokens: ['sql', 'postgres', 'database'],
    fileTokens: ['schema.prisma', '.sql'],
    supportsGithub: true
  },
  {
    key: 'docker',
    aliases: ['docker'],
    languages: [],
    dependencyTokens: ['docker'],
    textTokens: ['docker', 'container'],
    fileTokens: ['dockerfile', 'docker-compose.yml', 'docker-compose.yaml'],
    supportsGithub: true
  },
  {
    key: 'kubernetes',
    aliases: ['kubernetes', 'k8s'],
    languages: ['YAML'],
    dependencyTokens: ['kubernetes', 'helm'],
    textTokens: ['kubernetes', 'k8s', 'helm'],
    fileTokens: ['deployment.yaml', 'service.yaml', 'chart.yaml', 'helm'],
    supportsGithub: true
  },
  {
    key: 'terraform',
    aliases: ['terraform'],
    languages: ['HCL'],
    dependencyTokens: ['terraform'],
    textTokens: ['terraform'],
    fileTokens: ['main.tf', 'versions.tf', '.tf'],
    supportsGithub: true
  },
  {
    key: 'go',
    aliases: ['go', 'golang'],
    languages: ['Go'],
    dependencyTokens: ['go'],
    textTokens: ['golang', 'go'],
    fileTokens: ['go.mod', '.go'],
    supportsGithub: true
  },
  {
    key: 'rust',
    aliases: ['rust'],
    languages: ['Rust'],
    dependencyTokens: ['rust'],
    textTokens: ['rust'],
    fileTokens: ['cargo.toml', '.rs'],
    supportsGithub: true
  },
  {
    key: 'vue',
    aliases: ['vue', 'vuejs'],
    languages: ['JavaScript', 'TypeScript'],
    dependencyTokens: ['vue'],
    textTokens: ['vue'],
    fileTokens: ['package.json', '.vue'],
    supportsGithub: true
  },
  {
    key: 'css',
    aliases: ['css'],
    languages: ['CSS'],
    dependencyTokens: ['tailwindcss', 'sass', 'postcss'],
    textTokens: ['css', 'tailwind'],
    fileTokens: ['.css', '.scss'],
    supportsGithub: true
  },
  {
    key: 'graphql',
    aliases: ['graphql'],
    languages: ['JavaScript', 'TypeScript'],
    dependencyTokens: ['graphql', '@apollo/client', 'apollo-server'],
    textTokens: ['graphql'],
    fileTokens: ['package.json', '.graphql'],
    supportsGithub: true
  },
  {
    key: 'tensorflow',
    aliases: ['tensorflow'],
    languages: ['Python'],
    dependencyTokens: ['tensorflow'],
    textTokens: ['tensorflow'],
    fileTokens: ['requirements.txt', 'pyproject.toml', '.py'],
    supportsGithub: true
  },
  {
    key: 'fastapi',
    aliases: ['fastapi'],
    languages: ['Python'],
    dependencyTokens: ['fastapi'],
    textTokens: ['fastapi'],
    fileTokens: ['requirements.txt', 'pyproject.toml', '.py'],
    supportsGithub: true
  },
  {
    key: 'redis',
    aliases: ['redis'],
    languages: ['JavaScript', 'TypeScript', 'Python', 'Go', 'Rust'],
    dependencyTokens: ['redis', 'ioredis'],
    textTokens: ['redis'],
    fileTokens: ['package.json', 'requirements.txt', 'go.mod', 'cargo.toml'],
    supportsGithub: true
  },
  {
    key: 'grpc',
    aliases: ['grpc'],
    languages: ['Go', 'Rust', 'TypeScript', 'JavaScript', 'Python'],
    dependencyTokens: ['grpc', '@grpc/grpc-js', 'tonic'],
    textTokens: ['grpc'],
    fileTokens: ['.proto', 'go.mod', 'cargo.toml', 'package.json'],
    supportsGithub: true
  },
  {
    key: 'aws',
    aliases: ['aws'],
    languages: ['TypeScript', 'JavaScript', 'Python', 'Go'],
    dependencyTokens: ['aws-sdk', '@aws-sdk', 'boto3', 'aws-cdk', 'serverless'],
    textTokens: ['aws', 'lambda', 's3', 'cloudformation'],
    fileTokens: ['serverless.yml', 'cdk.json', '.tf'],
    supportsGithub: true
  },
  {
    key: 'mlops',
    aliases: ['mlops'],
    languages: ['Python'],
    dependencyTokens: ['mlflow', 'kubeflow', 'airflow', 'wandb'],
    textTokens: ['mlops', 'mlflow', 'kubeflow'],
    fileTokens: ['requirements.txt', 'pyproject.toml', 'dockerfile'],
    supportsGithub: true
  },
  {
    key: 'linux',
    aliases: ['linux'],
    languages: [],
    dependencyTokens: [],
    textTokens: [],
    fileTokens: [],
    supportsGithub: false
  },
  {
    key: 'figma',
    aliases: ['figma'],
    languages: [],
    dependencyTokens: [],
    textTokens: [],
    fileTokens: [],
    supportsGithub: false
  }
];

export async function verifyGitHubSkillProof(input: {
  user: UserGitHubIdentity;
  skillName: string;
  candidateUrls: string[];
}): Promise<VerificationResult> {
  const rule = getSkillRule(input.skillName);
  if (!rule || !rule.supportsGithub) {
    throw new Error(
      `"${input.skillName}" cannot be verified from GitHub alone. Use a skill that has real public GitHub signals.`
    );
  }

  const urls = [...new Set(input.candidateUrls.map((item) => item.trim()).filter(Boolean))];
  if (!urls.length) {
    throw new Error('A public GitHub proof link is required for every skill.');
  }

  const parsed = urls.map(parseGitHubUrl);
  let identity: GitHubIdentity | null = input.user.githubLogin
    ? {
        login: input.user.githubLogin,
        profileUrl:
          input.user.githubProfileUrl ||
          `https://github.com/${input.user.githubLogin}`
      }
    : null;

  const evidence: VerifiedSkillEvidence[] = [];
  const seen = new Set<string>();

  for (const spec of parsed) {
    const result = await resolveGitHubUrl({
      spec,
      expectedIdentity: identity,
      skillName: input.skillName,
      rule
    });

    if (!identity) {
      identity = result.identity;
    } else if (result.identity.login.toLowerCase() !== identity.login.toLowerCase()) {
      throw new Error('This GitHub link does not match your verified GitHub identity.');
    }

    for (const item of result.evidence) {
      const key = item.canonicalUrl || item.url;
      if (seen.has(key)) continue;
      seen.add(key);
      evidence.push(item);
    }
  }

  if (!identity) {
    throw new Error('Could not establish a public GitHub identity from the provided proof.');
  }

  if (!evidence.length) {
    throw new Error(
      `No public GitHub evidence relevant to "${input.skillName}" was found in the provided link.`
    );
  }

  evidence.sort(
    (left, right) =>
      right.verificationScore - left.verificationScore ||
      right.relevanceScore - left.relevanceScore
  );

  const derivedLevel = deriveGitHubSkillLevel(evidence);
  const trustScore = deriveGitHubTrustScore(evidence);
  const strongest = evidence[0];

  return {
    skillKey: rule.key,
    githubLogin: identity.login,
    githubProfileUrl: identity.profileUrl,
    primaryProofUrl: strongest.canonicalUrl || strongest.url,
    evidence,
    derivedLevel,
    trustScore,
    summary: strongest.verificationSummary
  };
}

function getSkillRule(skillName: string) {
  const compositeParts = splitCompositeSkillName(skillName);
  if (compositeParts.length > 1) {
    throw new Error(
      `Add one skill at a time. "${skillName}" combines multiple skills. Add ${compositeParts
        .map((part) => `"${part}"`)
        .join(' and ')} separately.`
    );
  }

  const normalized = normalizeSkillIdentifier(skillName);
  return findSkillRuleByNormalizedName(normalized);
}

export function resolveSkillRuleKey(skillName: string) {
  return getSkillRule(skillName)?.key || null;
}

function findSkillRuleByNormalizedName(normalized: string) {
  return SKILL_RULES.find((rule) =>
    [rule.key, ...rule.aliases].some(
      (alias) => normalizeSkillIdentifier(alias) === normalized
    )
  );
}

function normalizeSkillIdentifier(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function splitCompositeSkillName(value: string) {
  return value
    .split(/[\/,&]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseGitHubUrl(rawUrl: string): GitHubUrlSpec {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Proof links must be valid public GitHub URLs.');
  }

  const host = url.hostname.toLowerCase();
  if (host !== 'github.com' && host !== 'www.github.com') {
    throw new Error('Only public github.com links are accepted for skill proof right now.');
  }

  const segments = url.pathname.split('/').filter(Boolean);
  if (!segments.length) {
    throw new Error('GitHub proof must point to a public profile, repo, PR, or commit.');
  }

  if (segments.length === 1) {
    const login = segments[0];
    if (RESERVED_PROFILE_PATHS.has(login.toLowerCase())) {
      throw new Error('This GitHub URL is not a public user profile.');
    }
    return {
      kind: 'profile',
      originalUrl: rawUrl,
      normalizedUrl: `https://github.com/${login}`,
      login
    };
  }

  const [owner, repo, resource, resourceId] = segments;
  if (!owner || !repo) {
    throw new Error('GitHub proof must point to a public profile, repo, PR, or commit.');
  }

  const normalizedRepoUrl = `https://github.com/${owner}/${repo}`;
  if (!resource) {
    return {
      kind: 'repo',
      originalUrl: rawUrl,
      normalizedUrl: normalizedRepoUrl,
      owner,
      repo
    };
  }

  if (resource === 'tree' || resource === 'blob') {
    return {
      kind: resource,
      originalUrl: rawUrl,
      normalizedUrl: normalizedRepoUrl,
      owner,
      repo
    };
  }

  if (resource === 'pull' && resourceId) {
    const number = Number.parseInt(resourceId, 10);
    if (!Number.isFinite(number) || number <= 0) {
      throw new Error('The GitHub pull request link is not valid.');
    }
    return {
      kind: 'pull_request',
      originalUrl: rawUrl,
      normalizedUrl: `${normalizedRepoUrl}/pull/${number}`,
      owner,
      repo,
      number
    };
  }

  if (resource === 'commit' && resourceId) {
    return {
      kind: 'commit',
      originalUrl: rawUrl,
      normalizedUrl: `${normalizedRepoUrl}/commit/${resourceId}`,
      owner,
      repo,
      sha: resourceId
    };
  }

  throw new Error(
    'Only public GitHub profile, repo, file/tree, pull request, and commit links are accepted.'
  );
}

async function resolveGitHubUrl(input: {
  spec: GitHubUrlSpec;
  expectedIdentity: GitHubIdentity | null;
  skillName: string;
  rule: SkillRule;
}): Promise<{ identity: GitHubIdentity; evidence: VerifiedSkillEvidence[] }> {
  switch (input.spec.kind) {
    case 'profile':
      return resolveGitHubProfile(input.spec, input.expectedIdentity, input.rule, input.skillName);
    case 'repo':
    case 'tree':
    case 'blob':
      return resolveGitHubRepo(input.spec, input.expectedIdentity, input.rule, input.skillName);
    case 'pull_request':
      return resolveGitHubPullRequest(
        input.spec,
        input.expectedIdentity,
        input.rule,
        input.skillName
      );
    case 'commit':
      return resolveGitHubCommit(input.spec, input.expectedIdentity, input.rule, input.skillName);
  }
}

async function resolveGitHubProfile(
  spec: Extract<GitHubUrlSpec, { kind: 'profile' }>,
  expectedIdentity: GitHubIdentity | null,
  rule: SkillRule,
  skillName: string
): Promise<{ identity: GitHubIdentity; evidence: VerifiedSkillEvidence[] }> {
  const user = await fetchGitHub<{
    login: string;
    type: string;
    html_url: string;
    public_repos: number;
  }>(`/users/${spec.login}`);

  if (!user || user.type !== 'User') {
    throw new Error('This GitHub profile is not public or does not belong to a user account.');
  }

  if (
    expectedIdentity &&
    expectedIdentity.login.toLowerCase() !== user.login.toLowerCase()
  ) {
    throw new Error('This GitHub profile does not match your verified GitHub identity.');
  }

  const repos = (await fetchGitHub<RepoSummary[]>(
    `/users/${user.login}/repos?per_page=15&sort=updated&type=owner`
  )) || [];

  const quickCandidates = repos
    .map((repo) => ({
      repo,
      score: quickRepoSignal(repo, rule)
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);

  const evidence: VerifiedSkillEvidence[] = [];
  for (const candidate of quickCandidates) {
    const inspected = await inspectRepo(candidate.repo.owner.login, candidate.repo.name, rule);
    if (inspected.relevanceScore < MIN_RELEVANCE_SCORE) continue;
    evidence.push(
      createRepoEvidence(inspected, {
        type: 'profile',
        sourceUrl: spec.normalizedUrl,
        skillName,
        identityLogin: user.login,
        sourceLabel: 'Matched from public GitHub profile scan'
      })
    );
  }

  if (!evidence.length) {
    throw new Error(
      `This GitHub profile does not show enough public ${skillName} evidence to accept the skill.`
    );
  }

  return {
    identity: {
      login: user.login,
      profileUrl: user.html_url
    },
    evidence
  };
}

async function resolveGitHubRepo(
  spec: Extract<GitHubUrlSpec, { kind: 'repo' | 'tree' | 'blob' }>,
  expectedIdentity: GitHubIdentity | null,
  rule: SkillRule,
  skillName: string
): Promise<{ identity: GitHubIdentity; evidence: VerifiedSkillEvidence[] }> {
  const repo = await fetchGitHub<RepoSummary>(`/repos/${spec.owner}/${spec.repo}`);
  if (!repo || repo.private) {
    throw new Error('This GitHub repository is not public.');
  }

  const identity = expectedIdentity
    ? expectedIdentity
    : repo.owner.type === 'User'
      ? {
          login: repo.owner.login,
          profileUrl: repo.owner.html_url
        }
      : null;

  if (!identity) {
    throw new Error(
      'Link a GitHub profile first, or use a PR/commit that clearly belongs to you for organization repositories.'
    );
  }

  const authentic =
    repo.owner.login.toLowerCase() === identity.login.toLowerCase() ||
    (await userContributedToRepo(identity.login, spec.owner, spec.repo));

  if (!authentic) {
    throw new Error('This GitHub repository cannot be tied to your public GitHub identity.');
  }

  const inspected = await inspectRepo(spec.owner, spec.repo, rule);
  if (inspected.relevanceScore < MIN_RELEVANCE_SCORE) {
    throw new Error(
      `This GitHub repository does not show enough public ${skillName} evidence to accept the skill.`
    );
  }

  return {
    identity,
    evidence: [
      createRepoEvidence(inspected, {
        type: 'repo',
        sourceUrl: spec.originalUrl,
        skillName,
        identityLogin: identity.login,
        sourceLabel:
          spec.kind === 'repo'
            ? 'Verified from public GitHub repository'
            : 'Verified from public GitHub repository path'
      })
    ]
  };
}

async function resolveGitHubPullRequest(
  spec: Extract<GitHubUrlSpec, { kind: 'pull_request' }>,
  expectedIdentity: GitHubIdentity | null,
  rule: SkillRule,
  skillName: string
): Promise<{ identity: GitHubIdentity; evidence: VerifiedSkillEvidence[] }> {
  const pr = await fetchGitHub<{
    html_url: string;
    title: string;
    user: { login: string; html_url: string } | null;
    additions: number;
    changed_files: number;
    merged_at: string | null;
    base: { repo: RepoSummary };
  }>(`/repos/${spec.owner}/${spec.repo}/pulls/${spec.number}`);

  if (!pr || !pr.user) {
    throw new Error('This GitHub pull request is not public or cannot be attributed to a user.');
  }

  const identity = expectedIdentity || {
    login: pr.user.login,
    profileUrl: pr.user.html_url
  };

  if (identity.login.toLowerCase() !== pr.user.login.toLowerCase()) {
    throw new Error('This GitHub pull request does not match your verified GitHub identity.');
  }

  const files =
    (await fetchGitHub<PullFile[]>(
      `/repos/${spec.owner}/${spec.repo}/pulls/${spec.number}/files?per_page=100`
    )) || [];

  const inspected = await inspectRepo(spec.owner, spec.repo, rule, {
    fileHints: files.map((file) => file.filename)
  });

  const changedFileScore = matchFileTokens(
    files.map((file) => file.filename.toLowerCase()),
    rule.fileTokens
  ).length
    ? 15
    : 0;

  const relevanceScore = Math.min(100, inspected.relevanceScore + changedFileScore);
  if (relevanceScore < MIN_RELEVANCE_SCORE) {
    throw new Error(
      `This GitHub pull request does not show enough public ${skillName} evidence to accept the skill.`
    );
  }

  const evidence: VerifiedSkillEvidence = {
    type: 'pull_request',
    title: `${spec.owner}/${spec.repo} PR #${spec.number}`,
    url: pr.html_url,
    canonicalUrl: pr.html_url,
    resourceType: 'pull_request',
    ownerLogin: pr.user.login,
    repositoryName: `${spec.owner}/${spec.repo}`,
    issuer: 'GitHub',
    description: pr.title,
    impact: pr.merged_at ? 'Merged public pull request.' : 'Open public pull request.',
    verificationSummary: `Verified as ${pr.user.login}'s public pull request with ${skillName}-relevant repo signals.`,
    verificationScore: Math.min(
      100,
      35 + relevanceScore + Math.min(15, Math.floor((pr.additions || 0) / 40))
    ),
    relevanceScore,
    metadata: {
      additions: pr.additions,
      changed_files: pr.changed_files,
      merged_at: pr.merged_at,
      files: files.map((file) => file.filename).slice(0, 20),
      repo: inspected.metadata
    },
    isVerified: true
  };

  return {
    identity,
    evidence: [evidence]
  };
}

async function resolveGitHubCommit(
  spec: Extract<GitHubUrlSpec, { kind: 'commit' }>,
  expectedIdentity: GitHubIdentity | null,
  rule: SkillRule,
  skillName: string
): Promise<{ identity: GitHubIdentity; evidence: VerifiedSkillEvidence[] }> {
  const commit = await fetchGitHub<{
    html_url: string;
    sha: string;
    author: { login: string; html_url: string } | null;
    commit: { message: string };
    files?: CommitFile[];
  }>(`/repos/${spec.owner}/${spec.repo}/commits/${spec.sha}`);

  if (!commit || !commit.author) {
    throw new Error('This GitHub commit is not public or cannot be attributed to a user.');
  }

  const identity = expectedIdentity || {
    login: commit.author.login,
    profileUrl: commit.author.html_url
  };

  if (identity.login.toLowerCase() !== commit.author.login.toLowerCase()) {
    throw new Error('This GitHub commit does not match your verified GitHub identity.');
  }

  const files = commit.files || [];
  const inspected = await inspectRepo(spec.owner, spec.repo, rule, {
    fileHints: files.map((file) => file.filename)
  });
  const changedFileScore = matchFileTokens(
    files.map((file) => file.filename.toLowerCase()),
    rule.fileTokens
  ).length
    ? 14
    : 0;
  const relevanceScore = Math.min(100, inspected.relevanceScore + changedFileScore);

  if (relevanceScore < MIN_RELEVANCE_SCORE) {
    throw new Error(
      `This GitHub commit does not show enough public ${skillName} evidence to accept the skill.`
    );
  }

  const evidence: VerifiedSkillEvidence = {
    type: 'commit',
    title: `${spec.owner}/${spec.repo}@${commit.sha.slice(0, 7)}`,
    url: commit.html_url,
    canonicalUrl: commit.html_url,
    resourceType: 'commit',
    ownerLogin: commit.author.login,
    repositoryName: `${spec.owner}/${spec.repo}`,
    issuer: 'GitHub',
    description: commit.commit.message.split('\n')[0] || 'Public commit',
    impact: files.length
      ? `Touches ${files.length} public file${files.length === 1 ? '' : 's'}.`
      : null,
    verificationSummary: `Verified as ${commit.author.login}'s public commit with ${skillName}-relevant repo signals.`,
    verificationScore: Math.min(
      100,
      32 + relevanceScore + Math.min(12, Math.floor(files.length / 2))
    ),
    relevanceScore,
    metadata: {
      files: files.map((file) => file.filename).slice(0, 20),
      repo: inspected.metadata
    },
    isVerified: true
  };

  return {
    identity,
    evidence: [evidence]
  };
}

async function inspectRepo(
  owner: string,
  repoName: string,
  rule: SkillRule,
  options: { fileHints?: string[] } = {}
): Promise<RepoInspection> {
  const repo = await fetchGitHub<RepoSummary>(`/repos/${owner}/${repoName}`);
  if (!repo || repo.private) {
    throw new Error('This GitHub repository is not public.');
  }

  const languages =
    (await fetchGitHub<Record<string, number>>(`/repos/${owner}/${repoName}/languages`)) || {};
  const contents =
    (await fetchGitHub<Array<{ name: string; type: string }>>(
      `/repos/${owner}/${repoName}/contents`
    )) || [];

  const manifestFiles = contents
    .filter((item) => item.type === 'file')
    .map((item) => item.name)
    .filter((name) => ROOT_MANIFEST_FILES.includes(name as (typeof ROOT_MANIFEST_FILES)[number]))
    .slice(0, 5);

  const manifestTexts = await Promise.all(
    manifestFiles.map((fileName) => fetchRepoFileText(owner, repoName, fileName))
  );

  const textHaystack = [
    repo.name,
    repo.full_name,
    repo.description || '',
    ...(repo.topics || []),
    ...manifestTexts
  ]
    .join('\n')
    .toLowerCase();

  const fileNames = [
    ...contents.map((item) => item.name.toLowerCase()),
    ...(options.fileHints || []).map((item) => item.toLowerCase())
  ];

  const matchedLanguages = Object.keys(languages).filter((language) =>
    rule.languages.some((item) => item.toLowerCase() === language.toLowerCase())
  );
  const dependencyMatches = uniqueMatches(
    rule.dependencyTokens.filter((token) => textHaystack.includes(token.toLowerCase()))
  );
  const matchedTexts = uniqueMatches(
    rule.textTokens.filter((token) => textHaystack.includes(token.toLowerCase()))
  );
  const matchedFiles = matchFileTokens(fileNames, rule.fileTokens);

  let relevanceScore = 0;
  if (matchedLanguages.length) relevanceScore += 45;
  relevanceScore += Math.min(24, dependencyMatches.length * 12);
  relevanceScore += Math.min(18, matchedTexts.length * 9);
  relevanceScore += Math.min(15, matchedFiles.length * 5);
  relevanceScore += Math.min(8, quickRepoSignal(repo, rule));
  relevanceScore = Math.min(100, relevanceScore);

  const summaryBits = [
    matchedLanguages.length ? `languages: ${matchedLanguages.join(', ')}` : null,
    dependencyMatches.length ? `deps: ${dependencyMatches.join(', ')}` : null,
    matchedTexts.length ? `repo text: ${matchedTexts.join(', ')}` : null,
    matchedFiles.length ? `files: ${matchedFiles.join(', ')}` : null
  ].filter(Boolean);

  return {
    repo,
    relevanceScore,
    matchedLanguages,
    matchedDependencies: dependencyMatches,
    matchedTexts,
    matchedFiles,
    manifestFiles,
    verificationSummary: summaryBits.length
      ? `Public repo shows ${summaryBits.join(' · ')}.`
      : 'Public repo does not show relevant GitHub signals.',
    metadata: {
      repo_url: repo.html_url,
      stargazers: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      primary_language: repo.language,
      matched_languages: matchedLanguages,
      matched_dependencies: dependencyMatches,
      matched_text: matchedTexts,
      matched_files: matchedFiles,
      manifest_files: manifestFiles
    }
  };
}

function createRepoEvidence(
  inspected: RepoInspection,
  input: {
    type: 'profile' | 'repo';
    sourceUrl: string;
    skillName: string;
    identityLogin: string;
    sourceLabel: string;
  }
): VerifiedSkillEvidence {
  const baseScore = input.type === 'profile' ? 22 : 30;
  const evidenceType: EvidenceType = input.type === 'profile' ? 'profile' : 'repo';

  return {
    type: evidenceType,
    title: inspected.repo.full_name,
    url: inspected.repo.html_url,
    canonicalUrl: inspected.repo.html_url,
    resourceType: input.type === 'profile' ? 'profile_match_repo' : 'repo',
    ownerLogin: inspected.repo.owner.login,
    repositoryName: inspected.repo.full_name,
    issuer: 'GitHub',
    description:
      inspected.repo.description ||
      `${input.sourceLabel} for ${input.skillName}.`,
    impact: inspected.matchedDependencies.length
      ? `Matched dependencies: ${inspected.matchedDependencies.join(', ')}`
      : inspected.matchedLanguages.length
        ? `Matched languages: ${inspected.matchedLanguages.join(', ')}`
        : null,
    verificationSummary: `${input.sourceLabel}. ${inspected.verificationSummary}`,
    verificationScore: Math.min(
      100,
      baseScore +
        inspected.relevanceScore +
        (inspected.repo.owner.login.toLowerCase() === input.identityLogin.toLowerCase() ? 12 : 6)
    ),
    relevanceScore: inspected.relevanceScore,
    metadata: {
      source_url: input.sourceUrl,
      source_type: input.type,
      ...inspected.metadata
    },
    isVerified: true
  };
}

function quickRepoSignal(repo: RepoSummary, rule: SkillRule) {
  const text = [repo.name, repo.description || '', ...(repo.topics || [])]
    .join(' ')
    .toLowerCase();

  let score = 0;
  if (repo.language && rule.languages.some((item) => item.toLowerCase() === repo.language?.toLowerCase())) {
    score += 20;
  }

  if (rule.textTokens.some((token) => text.includes(token.toLowerCase()))) {
    score += 12;
  }

  if (rule.aliases.some((token) => text.includes(token.toLowerCase()))) {
    score += 12;
  }

  return score;
}

function matchFileTokens(fileNames: string[], fileTokens: string[]) {
  return uniqueMatches(
    fileTokens.filter((token) =>
      fileNames.some((fileName) => fileName.includes(token.toLowerCase()))
    )
  );
}

function uniqueMatches(values: string[]) {
  return [...new Set(values)];
}

async function userContributedToRepo(login: string, owner: string, repo: string) {
  const contributors =
    (await fetchGitHub<Array<{ login: string }>>(
      `/repos/${owner}/${repo}/contributors?per_page=100`
    )) || [];

  return contributors.some(
    (contributor) => contributor.login.toLowerCase() === login.toLowerCase()
  );
}

async function fetchRepoFileText(owner: string, repo: string, filePath: string) {
  const file = await fetchGitHub<{
    content?: string;
    encoding?: string;
    download_url?: string | null;
  }>(`/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`);

  if (!file) return '';
  if (file.content && file.encoding === 'base64') {
    return Buffer.from(file.content, 'base64').toString('utf8').toLowerCase();
  }
  return '';
}

async function fetchGitHub<T>(path: string): Promise<T | null> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'SkillForge-GitHub-Verification',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(`${GITHUB_API_BASE}${path}`, {
    headers,
    cache: 'no-store'
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('GitHub verification is temporarily unavailable due to API limits.');
    }
    throw new Error('GitHub verification failed while checking the provided proof.');
  }

  return (await response.json()) as T;
}

function deriveGitHubSkillLevel(evidence: VerifiedSkillEvidence[]) {
  const aggregate = evidence.reduce((total, item, index) => {
    const multiplier = Math.max(0.45, 1 - index * 0.22);
    return total + item.verificationScore * multiplier;
  }, 0);

  if (aggregate >= 170) return 5;
  if (aggregate >= 120) return 4;
  if (aggregate >= 65) return 3;
  if (aggregate >= 30) return 2;
  return 1;
}

function deriveGitHubTrustScore(evidence: VerifiedSkillEvidence[]) {
  const strongest = evidence[0]?.verificationScore || 0;
  const aggregate = evidence.reduce((total, item, index) => {
    const multiplier = Math.max(0.35, 1 - index * 0.2);
    return total + item.relevanceScore * multiplier;
  }, 0);

  return Math.min(100, Math.round(strongest * 0.65 + aggregate * 0.35));
}
