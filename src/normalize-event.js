import { ACTIVITY_COLORS } from './icons.js';

function pullRequestIconColor(action, merged) {
  if (action === 'opened') return ACTIVITY_COLORS.green;
  if (action === 'merged' || (action === 'closed' && merged)) {
    return ACTIVITY_COLORS.purple;
  }
  if (action === 'closed') return ACTIVITY_COLORS.red;
  return ACTIVITY_COLORS.blue;
}

function isMergedPullRequest(action, pr) {
  if (action === 'merged') return true;
  return pr?.merged === true;
}

function issueIconColor(action) {
  if (action === 'opened') return ACTIVITY_COLORS.green;
  if (action === 'closed') return ACTIVITY_COLORS.purple;
  return ACTIVITY_COLORS.blue;
}

function asRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value
    : null;
}

function asString(value) {
  return typeof value === 'string' ? value : undefined;
}

function asNumber(value) {
  return typeof value === 'number' ? value : undefined;
}

function actionLabel(action) {
  if (!action) return '';
  return action.charAt(0).toUpperCase() + action.slice(1);
}

function branchFromRef(ref) {
  if (!ref) return 'branch';
  return ref.replace(/^refs\/heads\//, '');
}

function truncate(text, max = 80) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function firstLine(text) {
  if (!text) return '';
  return truncate(text.split('\n')[0]?.trim() ?? text);
}

export function isMergePullRequestCommitMessage(message) {
  if (!message) return false;
  const line = message.split('\n')[0]?.trim() ?? message;
  return /^Merge pull request #\d+/i.test(line);
}

export function normalizeEvent(raw) {
  const repo = raw.repo?.name ?? 'unknown/repo';
  const payload = raw.payload ?? {};

  switch (raw.type) {
    case 'PushEvent': {
      const ref = asString(payload.ref);
      const branch = branchFromRef(ref);
      const commits = Array.isArray(payload.commits) ? payload.commits : [];
      const size = asNumber(payload.size) ?? commits.length;
      const count = size || commits.length || 1;
      const last = commits[commits.length - 1];
      const lastMsg =
        asRecord(last) && asString(last.message)
          ? firstLine(asString(last.message))
          : '';
      if (isMergePullRequestCommitMessage(lastMsg)) return null;

      const compare = asString(payload.compare);
      const head = asString(payload.head);
      const commitUrl =
        asRecord(last) && asString(last.url)
          ? asString(last.url)
          : head
            ? `https://github.com/${repo}/commit/${head}`
            : compare;

      return {
        kind: 'activity',
        action: `Pushed ${count} commit${count === 1 ? '' : 's'} to ${branch}`,
        description: lastMsg,
        repo,
        url: commitUrl ?? null,
        icon: 'commit',
      };
    }

    case 'PullRequestEvent': {
      const pr = asRecord(payload.pull_request);
      const action = asString(payload.action);
      const number = pr ? asNumber(pr.number) : undefined;
      const title = pr ? firstLine(asString(pr.title)) : '';
      const htmlUrl = pr ? asString(pr.html_url) : undefined;
      const merged = isMergedPullRequest(action, pr);

      let verb = actionLabel(action);
      if (merged && action === 'closed') verb = 'Merged';

      const actionText = number
        ? `${verb} pull request #${number}`
        : `${verb} pull request`;

      return {
        kind: 'activity',
        action: actionText,
        description: title,
        repo,
        url: htmlUrl ?? null,
        icon: 'pull-request',
        iconColor: pullRequestIconColor(action, merged),
      };
    }

    case 'IssuesEvent': {
      const issue = asRecord(payload.issue);
      const action = asString(payload.action);
      const number = issue ? asNumber(issue.number) : undefined;
      const title = issue ? firstLine(asString(issue.title)) : '';
      const htmlUrl = issue ? asString(issue.html_url) : undefined;

      return {
        kind: 'activity',
        action: number
          ? `${actionLabel(action)} issue #${number}`
          : `${actionLabel(action)} issue`,
        description: title,
        repo,
        url: htmlUrl ?? null,
        icon: 'issue',
        iconColor: issueIconColor(action),
      };
    }

    case 'PullRequestReviewEvent': {
      const review = asRecord(payload.review);
      const pr = asRecord(payload.pull_request);
      const state = review ? asString(review.state) : undefined;
      const htmlUrl = review
        ? asString(review.html_url)
        : pr
          ? asString(pr.html_url)
          : undefined;
      const number = pr ? asNumber(pr.number) : undefined;
      const title = pr ? firstLine(asString(pr.title)) : '';

      return {
        kind: 'activity',
        action: number
          ? `Reviewed pull request #${number}${state ? ` (${state})` : ''}`
          : 'Reviewed pull request',
        description: title,
        repo,
        url: htmlUrl ?? null,
        icon: 'pull-request',
      };
    }

    case 'IssueCommentEvent':
    case 'PullRequestReviewCommentEvent': {
      const comment = asRecord(payload.comment);
      const issue = asRecord(payload.issue);
      const htmlUrl = comment ? asString(comment.html_url) : undefined;
      const number = issue ? asNumber(issue.number) : undefined;
      const isPr = issue?.pull_request !== undefined;
      const body = comment ? firstLine(asString(comment.body)) : '';
      const issueTitle = issue ? firstLine(asString(issue.title)) : '';

      return {
        kind: 'activity',
        action: number
          ? `Commented on ${isPr ? 'pull request' : 'issue'} #${number}`
          : `Commented on ${isPr ? 'pull request' : 'issue'}`,
        description: body || issueTitle,
        repo,
        url: htmlUrl ?? null,
        icon: 'comment',
      };
    }

    case 'ReleaseEvent': {
      const release = asRecord(payload.release);
      const action = asString(payload.action);
      const tag = release ? asString(release.tag_name) : undefined;
      const name = release ? firstLine(asString(release.name)) : '';
      const htmlUrl = release ? asString(release.html_url) : undefined;

      return {
        kind: 'activity',
        action: tag
          ? `${actionLabel(action)} release ${tag}`
          : `${actionLabel(action)} release`,
        description: name || tag || '',
        repo,
        url: htmlUrl ?? null,
        icon: 'tag',
      };
    }

    case 'CreateEvent': {
      const refType = asString(payload.ref_type);
      const ref = asString(payload.ref);
      const label = refType === 'tag' ? 'tag' : 'branch';

      return {
        kind: 'activity',
        action: ref ? `Created ${label} ${ref}` : `Created ${label}`,
        description: ref ?? repo,
        repo,
        url: null,
        icon: refType === 'tag' ? 'tag' : 'branch',
      };
    }

    default:
      return null;
  }
}
