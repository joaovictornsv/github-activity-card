export function formatTimeAgo(isoDate) {
  const then = new Date(isoDate).getTime();
  const now = Date.now();
  const seconds = Math.max(0, Math.floor((now - then) / 1000));

  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return days === 1 ? '1 day ago' : `${days} days ago`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return months === 1 ? '1 month ago' : `${months} months ago`;
  }

  const years = Math.floor(months / 12);
  return years === 1 ? '1 year ago' : `${years} years ago`;
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

export function normalizeEvent(raw) {
  const repo = raw.repo?.name ?? 'unknown/repo';
  const timeAgo = formatTimeAgo(raw.created_at);
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
        timeAgo,
        icon: 'commit',
      };
    }

    case 'PullRequestEvent': {
      const pr = asRecord(payload.pull_request);
      const action = asString(payload.action);
      const number = pr ? asNumber(pr.number) : undefined;
      const title = pr ? firstLine(asString(pr.title)) : '';
      const htmlUrl = pr ? asString(pr.html_url) : undefined;
      const merged = pr ? pr.merged === true : false;

      let verb = actionLabel(action);
      if (action === 'closed' && merged) verb = 'Merged';

      const actionText = number
        ? `${verb} pull request #${number}`
        : `${verb} pull request`;

      return {
        kind: 'activity',
        action: actionText,
        description: title,
        repo,
        url: htmlUrl ?? null,
        timeAgo,
        icon: 'pull-request',
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
        timeAgo,
        icon: 'issue',
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
        timeAgo,
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
        timeAgo,
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
        timeAgo,
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
        timeAgo,
        icon: refType === 'tag' ? 'tag' : 'branch',
      };
    }

    default:
      return null;
  }
}
