/*!
 * Piwik - free/libre analytics platform
 *
 * @link http://piwik.org
 * @license http://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
 */

var config = {};

/**
 * GitHub Repository to fetch issues from. Multiple repositories can be specified comma separated.
 * @type {string}
 */
config.repository = 'MathsPathway/app';

/**
 * See https://developer.github.com/v3/oauth_authorizations/#create-a-new-authorization
 * @type {string}
 */
config.oauthToken = '';

/**
 * Ignore issues having at least one of those labels.
 * @type {Array}
 */
config.labelsToIgnore = ['invalid', 'wontfix', 'duplicate', 'worksforme', 'answered', 'not-in-changelog'];
config.labelsToNotReport = ['priority', 'epic', 'security'];

/**
 * Ignore issues that are assigned to one of these milestones. Supports regex.
 * @type {Array}
 */
config.milestonesToIgnore = ['3.0.0(.*)'];

/**
 * Issues will be sorted by those labels. An issue having the label 'Major' will be listed first while an issue having
 * the label 'Bug' will be listed last. An issue that has the label 'Major' and 'Bug' will be listed before a label having 
 * only 'Major'. The higher the index of the array item, the more important is the label.
 *
 * @type {Array}
 */
config.sortByLabels = ['feature', 'bug', 'Task', 'Enhancement', 'c: Performance', 'c: Security', 'c: New Plugin', 'Major', 'Critical']

config.labelFriendlyNames = {
  "bug": "Bugs",
  "optimization": "Optimisations",
  "feature": "Features",
  "hotfix": "Hot Fixes"
};
