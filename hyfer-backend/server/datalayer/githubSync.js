/* eslint-disable camelcase */
const moment = require('moment');
const {
  getUsers,
  bulkInsertUsers,
  bulkUpdateUsers,
  bulkUpdateMemberships,
} = require('./users');
const { getGroups, addGroup } = require('./groups');
const { getTeamMembers } = require('../api/github');

const { insertSyncEvent } = require('./events');
/**
 * Gets a list of users from a GitHub team
 * @param {[]} githubTeam The GitHub team from which to extract the members.
 */
function getTeamUsers(githubTeam) {
  return githubTeam.members.map(member => ({
    username: member.login,
    full_name: member.name,
    email: member.email,
    role: githubTeam.teamName === 'teachers' ? 'teacher' : 'student',
  }));
}

/**
 * Get a list of unique users extracted from all GitHub class teams and
 * the teacher team.
 * @param {[team]} teams An array of GitHub teams
 */
function getUniqueUsersFromTeams(teams) {
  const userMap = new Map();
  teams
    .map(team => getTeamUsers(team))
    .forEach(team => team.forEach(user => userMap.set(user.username, user)));
  return [...userMap.values()].sort((a, b) => a.username.localeCompare(b.username));
}

/**
 * Returns a boolean indicating whether two user objects differ in their values of
 * full_name, email and role.
 * @param {*} user1 The first user object t compare
 * @param {*} user2 The second user object to compare
 */
function usersDiffer(user1, user2) {
  if (user1.username !== user2.username) {
    throw new Error('Invalid user comparison');
  }
  return user1.full_name !== user2.full_name
    || user1.email !== user2.email
    || user1.role !== user2.role;
}

/**
 * Creates classes for all GitHub class teams not yet in the IDBDatabase.
 * @param {*} con Database connection.
 * @param {[team]} githubTeams An array of GitHub teams.
 */
async function createNewClasses(con, githubTeams) {
  const groups = await getGroups(con);
  const newGroupNames = githubTeams
    .filter(team => /^class\d+/.test(team.teamName))
    .map(team => team.teamName)
    .filter(teamName => !groups.find(group => group.group_name === teamName));

  if (newGroupNames.length > 0) {
    const nextSunday = moment().day(7).valueOf();
    const promises = newGroupNames.map(groupName => addGroup(con, {
      group_name: groupName,
      starting_date: nextSunday,
      archived: 0,
    }));
    await Promise.all(promises);
  }
}

/**
 * Rebuilds the complete group_users table
 * @param {*} con Database connection.
 * @param {[]} githubTeams An array of GitHub teams.
 */
async function rebuildMemberships(con, githubTeams) {
  const hyferUsers = await getUsers(con);
  const groups = await getGroups(con);
  const groupAndUserIds = [];
  githubTeams.forEach((team) => {
    const group = groups.find(g => g.group_name === team.teamName);
    if (group) {
      const groupId = group.id;
      team.members.forEach((member) => {
        const user = hyferUsers.find(u => u.username === member.login);
        if (user) {
          groupAndUserIds.push([groupId, user.id]);
        }
      });
    }
  });

  bulkUpdateMemberships(con, groupAndUserIds);
}

function isTeamMember(member, teachersTeam) {
  return teachersTeam.members.find(teacher => teacher.login === member.login);
}

/**
 * Removes teachers from class teams
 * @param {[]} githubTeams Unfiltered GitHub teams
 */
function removeTeacherFromClasses(githubTeams) {
  const teachersTeam = githubTeams.find(team => team.teamName === 'teachers') || [];
  const classTeams = githubTeams.filter(team => /^class\d+$/.test(team.teamName));
  const teams = classTeams.map((team) => {
    const students = team.members.filter(member => !isTeamMember(member, teachersTeam));
    return Object.assign({}, team, { members: students });
  });
  teams.push(teachersTeam);
  return teams;
}

/**
 * Synchronizes all GitHub class teams and the teachers team
 */
async function githubSync(con, username, syncAll) {
  const githubTeams = await getTeamMembers(con, syncAll);
  const teams = removeTeacherFromClasses(githubTeams);
  const githubUsers = getUniqueUsersFromTeams(teams);
  let hyferUsers = await getUsers(con);
  hyferUsers = hyferUsers.map((user) => {
    if (user.full_name == null) {
      return Object.assign(user, { full_name: user.username });
    }
    return user;
  });

  const userInserts = [];
  const userUpdates = [];

  githubUsers.forEach((githubUser) => {
    const hyferUser = hyferUsers.find(user => user.username === githubUser.username);
    if (hyferUser) {
      if (usersDiffer(hyferUser, githubUser)) {
        const githubUserClone = Object.assign({}, githubUser);
        Object.keys(githubUserClone).forEach((prop) => {
          if (githubUserClone[prop] === null) {
            githubUserClone[prop] = hyferUser[prop];
          }
        });
        userUpdates.push(githubUserClone);
      }
    } else {
      userInserts.push(githubUser);
    }
  });

  if (userInserts.length > 0) {
    await bulkInsertUsers(con, userInserts);
  }

  if (userUpdates.length > 0) {
    await bulkUpdateUsers(con, userUpdates);
  }

  await createNewClasses(con, teams);
  await rebuildMemberships(con, teams);
  insertSyncEvent(con, 'GITHUB_SYNC', username);
}

module.exports = {
  githubSync,
};
