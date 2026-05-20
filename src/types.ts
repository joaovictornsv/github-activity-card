export type SlideIcon =
  | 'commit'
  | 'branch'
  | 'pull-request'
  | 'issue'
  | 'comment'
  | 'tag'
  | 'repo'
  | 'inbox';

export interface ActivitySlide {
  kind: 'activity' | 'empty';
  /** Short action line, e.g. "Pushed 1 commit to main" */
  action: string;
  /** Primary text: commit message, PR/issue title, comment excerpt */
  description: string;
  repo: string;
  url: string | null;
  timeAgo: string;
  icon: SlideIcon;
}

export interface GitHubPublicEvent {
  id: string;
  type: string;
  repo: { name: string };
  payload: Record<string, unknown>;
  created_at: string;
}

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'GitHubApiError';
  }
}
