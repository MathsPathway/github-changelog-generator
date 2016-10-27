/*!
 * Piwik - free/libre analytics platform
 *
 * @link http://piwik.org
 * @license http://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
 */

var limitExceeded = false;
var repositoriesDone;
var releases = [];

function setup(repo, token)
{
    if (repo) {
        $('#repository').val(repo);
    }

    if (token) {
        $('#authtoken').val(token);
    }

    var releases = [];
    $.each(getRepositories(), function (index, repository) {
          getReleases(repository, releases);
      });
    

    $("#goReleases").on('click', function () {

        var releaseTime = $("#releases").val();

        if (!releaseTime) {
            alert('Please select a release.');
            return;
        }

        //var isoDate = date + 'T' + time + ':00Z';

        onStart();

        $.each(getRepositories(), function (index, repository) {
            fetchIssuesSince(repository, [], releaseTime, 1);
            
        });
    });


    $("#goBetweenReleases").on('click', function() {

        var release1 = $("#releasesB1").val();
        var release2 = $("#releasesB2").val()

        if (!release1 || ! release2 || release1===release2) {
            alert('Please select releases.');
            return;
        }

        //var isoDate = date + 'T' + time + ':00Z';

        onStart();

        $.each(getRepositories(), function (index, repository) {
            fetchIssuesFromTaggedCommits(repository, [], release1, release2);
        });
    });

    $("#go").on('click', function() {

        var date = $("#issuedate").val();
        var time = $("#issuetime").val();

        if (!date || !time) {
            alert('Please select a date and time.');
            return;
        }

        var dateCheck = /^20\d{2}-\d{2}-\d{2}$/;
        if (!dateCheck.test(date)) {
            alert('Date must be in format YYYY-MM-DD');
            return;
        }

        var timeCheck = /^\d{2}:\d{2}$/;
        if (!timeCheck.test(time)) {
            alert('Time must be in format HH:MM');
            return;
        }

        var isoDate = date + 'T' + time + ':00Z';

        onStart();

        $.each(getRepositories(), function (index, repository) {
            fetchIssuesSince(repository, [], isoDate, 1);
        });
    });
}

function getReleases(repository, releases) {
    callGithubApi({
        service : 'repos/' + repository + '/releases',
        success : function(result, xhr) {

            $.each(result, function (index, release) {
                releases.push(release);
            });
            renderReleases(releases);
        }
    }, true);
}

function renderReleases(releases) {
    $.each(releases, function (index, release) {
        $("#releases").append($('<option></option>').val(release.published_at).html(release.name));

        $("#releasesB1").append($('<option></option>').val(release.tag_name).html(release.name));
        $("#releasesB2").append($('<option></option>').val(release.tag_name).html(release.name));
    });
}


function getStoryPoints(repository, repoId, issueId, name, arr, callback) {
    if (!getZenhubAuthToken()) {
        callback(0, name, arr);
    }
    callZenhubApi({
        service: "repositories/" + repoId + "/issues/" + issueId,
        success: function (result, xhr) {
            console.log("adding " + result.estimate.value + " to " + name);
            callback(result.estimate.value, name, arr);
        }
    });

}

function getSortRankingOfLabel(memo, label)
{
    var value = _.lastIndexOf(config.sortByLabels, label, false);

    if (value !== -1) {
        memo += (value + 1);
    }

    return memo;
}

function sortIssues(issueA, issueB)
{
    var labelsA = getLabelsFromIssue(issueA);
    var labelsB = getLabelsFromIssue(issueB);

    var indexA = _.reduce(labelsA, getSortRankingOfLabel, 0);
    var indexB = _.reduce(labelsB, getSortRankingOfLabel, 0);

    if (indexA === indexB) {
        return 0;
    }

    return indexA > indexB ? -1 : 1;
}

function sortLabels(labelA, labelB)
{
    var indexA = _.lastIndexOf(config.sortByLabels, labelA, false);
    var indexB = _.lastIndexOf(config.sortByLabels, labelB, false);

    if (indexA === indexB) {
        return 0;
    }

    return indexA > indexB ? -1 : 1;
}

function getTagFriendlyName(tag) {
  return config.labelFriendlyNames[tag];
}

function renderIssues(repository, issues)
{
    if (config.sortByLabels.length) {
        issues.sort(sortIssues);
    }

    var $issues = $('#issues');
    
    var allLabels = [];
    $.each(issues, function(index, issue) {
    var issueLabels = getLabelsFromIssue(issue);
      var filteredLabels = _.filter(issueLabels, function(l) { return !_.some(config.labelsToNotReport, function (ignore) { return ignore == l; }); });
        allLabels = _.union(allLabels, filteredLabels);
    });
    
    allLabels.sort(sortLabels);
    
    $.each(allLabels, function (index, label) {

      var matchingIssues = _.filter(issues, function(i) { return _.some(i.labels, function(issueLabel) { return issueLabel.name == label; }); });
      
      $issues.append("\n\n<br/><div class='notAnIssue'>### " + getTagFriendlyName(label) + "</div>\n\n");
    if (matchingIssues && matchingIssues.length === 0) {
        $issues.append('<li class="notAnIssue">No ' + getTagFriendlyName(label) + ' found</li>' + "\n");
      } else {
          $.each(matchingIssues, function (index, issue) {
              var description = formatChangelogEntry(issue, issue.assignees);

              $('#issues').append('<li>' + description + '</li>' + "\n");
          });
    }

      
    });
    
   /* var bugs = _.filter(issues, function(i) { return _.some(i.labels, function(label) { return label.name == "bug"; }); });
    var features = _.filter(issues, function(i) { return _.some(i.labels, function(label) { return label.name == "feature"; }); });

    $issues.append("\n\n<br/><div class='notAnIssue'>" + repository + " - Features Completed</div>\n\n");

    if (features && features.length === 0) {
        $issues.append('<li class="notAnIssue">No features found</li>' + "\n");
    } else {
        $.each(features, function (index, issue) {
            var description = formatChangelogEntry(issue, issue.authors);

            $('#issues').append('<li>' + description + '</li>' + "\n");
        });
    }
    
    $issues.append("\n\n<br/><div class='notAnIssue'>" + repository + " - Bugs Fixed</div>\n\n");
    
    if (bugs && bugs.length === 0) {
        $issues.append('<li class="notAnIssue">No bugs found</li>' + "\n");
    } else {
        $.each(bugs, function (index, issue) {
            var description = formatChangelogEntry(issue, issue.authors);

            $('#issues').append('<li>' + description + '</li>' + "\n");
        });
    }*/
}

function onStart()
{
    repositoriesDone = {};

    $('#issues').html('');
    $('#go').attr('disabled', 'disabled');
    $('#goReleases').attr('disabled', 'disabled');
    $('#goBetweenReleases').attr('disabled', 'disabled');
    $('#status').text('Fetching issues in progress');
    $('#numIssues').text('');
}

function onEnd(repository)
{
    repositoriesDone[repository] = true;

    if (!haveAllRepositoriesEnded()) {
        return;
    }

    $('#go').attr('disabled', null);
    $('#goReleases').attr('disabled', null);

    $('#goBetweenReleases').attr('disabled', null);
    $('#status').text('');

    var numIssuesClosed = $('#issues').find('li:not(.notAnIssue)').length;

    $('#numIssues').text('Found ' + numIssuesClosed + ' closed issues');
}

function haveAllRepositoriesEnded()
{
    var done = true;
    $.each(getRepositories(), function (i, repository) {
        if (!(repository in repositoriesDone)) {
            done = false;
        }
    });

    return done;
}

function onLimitExceeded()
{
    limitExceeded = true;
    $('#status').text('Limit exceeded!');
    $('#limit').addClass('exceeded');
    $('#go').attr('disabled', null);
    $('#goReleases').attr('disabled', null);
}

function formatAuthor(user)
{
    return '<a href="' + user.html_url + '">@' + user.login + '</a>';
}

function encodedStr(rawStr)
{
    return rawStr.replace(/[\u00A0-\u9999<>\&]/gim, function (i) {
        return '&#' + i.charCodeAt(0) + ';';
    });
}

function formatChangelogEntry(issue, authors)
{
    var description = '<a href="' + issue.html_url + '">#' + issue.number + '</a> ' + encodedStr(issue.title);

    if (authors && authors.length) {
        description += ' [by ' + _.pluck(authors, 'login').join(', ') + ']';
    }

    return description;
}

function logContribution(commits, issues, storyPoints, name, fullname, arr) {
    if (_.some(arr, function(c) { return c.name === name; })) {
        //edit
        _.each(arr, function (c) {
            if (c.name === name) {
                c.commits += commits;
                c.issues += issues;
                c.storyPoints += storyPoints;
                if (fullname && fullname !== "" && !c.fullname) {
                    c.fullname = fullname;
                }
            }
        });
        return arr;
    } else {
        //add new
        arr.push({ name: name, commits: commits, issues: issues, storyPoints: storyPoints, fullname: fullname });
        return arr;
    }
}

function renderContributors(contributors) {
    $("#contributors")[0].innerHTML = "";

    contributors = _.sortBy(contributors, function (c) { return 1000 - c.storyPoints; });

    var str = "### Contributors";
    var points = 0;
    var commits = 0;
    var issues = 0;

    _.each(contributors, function (c) {
        str = str + "<p>**" + c.fullname + "** Story Points: " + c.storyPoints + " Issues: " + c.issues + " Commits: " + c.commits + "</p>";
        points += c.storyPoints;
        issues += c.issues;
        commits += c.commits;
    });

    str = str + "<p>**Total:** Story Points: " + points + " Issues: " + issues + " Commits: " + commits + "</p>";
    $("#contributors")[0].innerHTML = str;

    
}

function fetchIssuesFromTaggedCommits(repository, issues, fromTag, toTag) {

    callGithubApi({
        service: "repos/" + repository,
        success: function(repo, xhr) {

            var contributors = [];

            callGithubApi({
                service: 'repos/' + repository + '/compare/' + fromTag + "..." + toTag,
                //data : {since: isoDate, state: 'closed', direction: 'asc', filter: 'all', page: page},
                success: function (result, xhr) {
                    var issuesAdded = [];
                    var re = /#[0-9]+/g;
                    $.each(result.commits, function (index, commit) {
                        //console.log(commit);
                        var num = re.exec(commit.commit.message);
                        while (num !== null) {
                            if (!_.contains(issuesAdded, num[0].substr(1))) {
                                issuesAdded.push(num[0].substr(1));
                            }
                            num = re.exec(commit.message);
                        }

                        contributors = logContribution(1, 0, 0, commit.author.login, commit.commit.author.name, contributors);

                    });

                    $.each(issuesAdded, function (i, issue) {
                        callGithubApi({
                            service: "repos/" + repository + "/issues/" + issue,
                            success: function (result, xhr) {
                                //console.log(result);
                                issues.push(result);
                                if (issuesAdded.length === issues.length) {
                                    renderIssues(repository, issues);


                                    _.each(issues, function (issue) {
                                        _.each(issue.assignees, function(assignee) {
                                            contributors = logContribution(0, 1, 0, assignee.login, "", contributors);
                                        });
                                        
                                    });
                                    _.each(issues, function(issue) {
                                        _.each(issue.assignees, function(assignee) {
                                            getStoryPoints(repository, repo.id, issue.number, assignee.login, contributors, function(points, name, contribs) {
                                                contribs = logContribution(0, 0, points, name, "", contribs);
                                                renderContributors(contribs);
                                            });

                                        });

                                    });
                                    onEnd(repository);
                                }
                            }
                        }, false);

                    });

                },
            }, false);
        }
    },false);


}

function fetchIssuesSince (repository, issues, isoDate, page)
{
    callGithubApi({
        service : 'repos/' + repository + '/issues',
        data : {since: isoDate, state: 'closed', direction: 'asc', filter: 'all', page: page},
        success : function(result, xhr) {

            $.each(result, function (index, issue) {

                if (hasIssueAnIgnoredLabel(issue)) {
                    return;
                }

                if (hasIssueAnIgnoredMilestone(issue)) {
                    return;
                }

                if (!issue.closed_at || isDateOlderThan(issue.closed_at, isoDate)) {
                    console.log('ignore this issue because it was updated within your date range, but it was already closed before', issue);
                    return;
                }

                if (isPullRequest(issue)) { // && !isPullRequestMerged(issue)) {
                    //console.log('Ignoring issue as it was not merged', issue);
                    return;
                }

                var showAuthors = $("#showAuthors").is(":checked");
                if (showAuthors) {
                  issue.authors = getCommitter(issue, 1);
                }
                issues.push(issue);
            });

            if (hasNextPage(xhr)) {
                issues = fetchIssuesSince(repository, issues, isoDate, page + 1);
            } else {
                renderIssues(repository, issues);
                onEnd(repository);
            }
        }
    }, true);

    return issues;
}

function isPullRequest(issue)
{
    return !!issue.pull_request;
}

function isPullRequestMerged(issue)
{
    var pullRequest = getPullRequest(issue.pull_request.url);

    return pullRequest && pullRequest.merged;
}

function getLabelsFromIssue(issue)
{
    if (!issue.labels) {
        return [];
    }

    var labels = [];

    for (index = 0; index < issue.labels.length; index++) {
        labels.push(issue.labels[index].name);
    }

    return labels;
}

function hasIssueAnIgnoredLabel(issue)
{
    var labels = getLabelsFromIssue(issue);

    if (!labels.length) {
        return false;
    }

    var labelsToIgnore = config.labelsToIgnore;
    var index, label;

    for (index = 0; index < labels.length; index++) {
        label = labels[index];

        if (-1 !== labelsToIgnore.indexOf(label)) {
            console.log('issue has an ignored label ', label, issue);
            return true;
        }
    }

    return false;
}

function hasIssueAnIgnoredMilestone(issue)
{
    if (!issue || !issue.milestone || !issue.milestone.title) {
        return false;
    }

    var milestone = issue.milestone.title;

    var milestonesToIgnore = config.milestonesToIgnore;
    var index, milestoneToIgnore;

    for (index = 0; index < milestonesToIgnore.length; index++) {
        milestoneToIgnore = milestonesToIgnore[index];

        var re = new RegExp( milestoneToIgnore );

        if (re.test(milestone)) {
            console.log('issue has an ignored milestone ', milestoneToIgnore, issue);
            return true;
        }
    }

    return false;
}

function isDateOlderThan(isoDate, isoDateToCompare)
{
    var date1        = new Date(isoDate);
    var date2Compare = new Date(isoDateToCompare);

    var diff = date1 - date2Compare;

    if (0 > diff) {
        console.log(isoDate, ' is older than ', isoDateToCompare);
        return true;
    }

    return false;
}

function logXRateLimit(xhr)
{
    if (!xhr) {
        return;
    }

    var current = xhr.getResponseHeader('X-RateLimit-Remaining');
    var total   = xhr.getResponseHeader('X-RateLimit-Limit');
    var limit   = 'Remaining requests: ' + current + ' of ' + total;

    if (0 === current || '0' === current) {
        onLimitExceeded();
    }

    $('#limit').html(limit);
}

function hasNextPage(xhr)
{
    var link = xhr.getResponseHeader('Link');

    if (!link) {
        return false;
    }

    return -1 !== link.indexOf('rel="next"');
}

function makeArrayUnique(array){
    return array.filter(function(el, index, arr) {
        return index == arr.indexOf(el);
    });
}

function getPullRequest(url)
{
    var pullRequest;

    callGithubApi({
        async: false,
        service : url.replace('https://api.github.com/', ''),
        success : function(result) {
            pullRequest = result;
        }
    }, false);

    return pullRequest;
}

function getCommitter(issue, page)
{
    var authors = [];

    if (isPullRequest(issue)) {
        var formatted = formatAuthor(issue.user);
        authors.push(formatted);
    }

    callGithubApi({
        async: false,
        service : issue.events_url,
        data : {page: page},
        success : function(result, xhr) {

            $.each(result, function (index, event) {
                if (event.event != 'referenced' && event.event != 'closed' && event.event != 'assigned') {
                    // we want to list only authors who have contributed code
                    return;
                }

                // the "assigned" event does not require a commit_id as we always credit the assigned user
                var onlyCreditAuthorWhenCommitFound = (event.event == 'referenced' || event.event == 'closed');
                if (onlyCreditAuthorWhenCommitFound && !event.commit_id) {
                    console.log('Found a event.event = ' + event.event + ' but it has no commit_id so we do not credit this author', event);
                    return;
                }

                var formatted = formatAuthor(event.actor);
                authors.push(formatted);
            });

            if (hasNextPage(xhr)) {
                var nextPageAuthors = getCommitter(issue, page + 1);
                authors = authors.concat(nextPageAuthors);
            }
        }
    }, true);

    authors = makeArrayUnique(authors);

    return authors;
}

function getRepositories()
{
    return $('#repository').val().split(',');
}

function getAuthToken()
{
    return $('#authtoken').val();
}

var zenhubToken = "";

function getZenhubAuthToken() {
    return config.zenhubToken;
}

function callZenhubApi(params, expectArray) {
    if (limitExceeded) {
        console.log('Ignoring call to GitHub API, limit exceeded', params);
        return;
    }

    if (0 === params.service.indexOf('https://')) {
        params.url = params.service;
    } else {
        params.url = "https://api.zenhub.io/p1/" + params.service;//repositories/:repo_id/issues/:issue_number
    }

    params.error = function (result) {
        console.log('error fetching resource', result);

        var message = 'Error while requesting GitHub API: ';

        if (result && result.responseJSON && result.responseJSON.message) {
            message += result.responseJSON.message;
        } else {
            message += 'see console';
        }

        alert(message);
        onEnd();
    };

    if (getAuthToken()) {
        params.headers = { "X-Authentication-Token": getZenhubAuthToken() };
    }

    if ($.support.cors) {
        var success = params.success;
        if ($.isFunction(success)) {
            params.success = function (result, status, xhr) {
                console.log('got api response', arguments);

                if (!result || (expectArray && !$.isArray(result))) {
                    alert('Got an unexpected response');
                    return;
                }

                logXRateLimit(xhr);

                success.call(this, result, xhr)
            }
        }
    } else {
        alert('CORS is not supported, please try another browser');
        return;
    }

    $.ajax(params);
}

function callGithubApi(params, expectArray)
{
    if (limitExceeded) {
        console.log('Ignoring call to GitHub API, limit exceeded', params);
        return;
    }

    if (0 === params.service.indexOf('https://')) {
        params.url = params.service;
    } else {
        params.url = "https://api.github.com/" + params.service;
    }

    params.error = function (result) {
        console.log('error fetching resource', result);

        var message = 'Error while requesting GitHub API: ';

        if (result && result.responseJSON && result.responseJSON.message) {
            message += result.responseJSON.message;
        } else {
            message += 'see console';
        }

        alert(message);
        onEnd();
    };

    if (getAuthToken()) {
        params.headers = {"Authorization": 'token ' + getAuthToken()};
    }

    if ($.support.cors) {
        var success = params.success;
        if ($.isFunction(success)) {
            params.success = function (result, status, xhr) {
                console.log('got api response', arguments);

                if (!result || (expectArray && !$.isArray(result))) {
                    alert('Got an unexpected response');
                    return;
                }

                logXRateLimit(xhr);

                success.call(this, result, xhr)
            }
        }
    } else {
        alert('CORS is not supported, please try another browser');
        return;
    }

    $.ajax(params);
}
