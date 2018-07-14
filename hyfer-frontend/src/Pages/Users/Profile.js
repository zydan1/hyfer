/* eslint react/prop-types: error */
import React from 'react';
import styles from '../../assets/styles/profile.css';
import { Link } from 'react-router-dom';
import { getAllGroupsWithIds } from '../../util';
import { errorMessage } from '../../notify';
import { inject, observer } from 'mobx-react';
import PropTypes from 'prop-types';

@inject('userStore')
@observer
export default class Profile extends React.Component {
  state = {
    classOptions: [],
    userProfile: {},
  };

  componentDidMount() {
    this.setState({
      userProfile: this.props.userStore.userProfile,
    });
    const getData = async () => {
      const groupData = await getAllGroupsWithIds().catch(errorMessage); // catching the error in the end of the line

      groupData.map(group => {
        return {
          groupsName: group.group_name,
          groupsId: group.id,
        };
      });

      this.setState({
        classOptions: groupData,
      });
    };
    getData();
    window.scrollTo(0, 0);
  }

  setInputActive = e => {
    e.target.parentElement.className += ' ' + styles.isActive;
    e.target.parentElement.className += ' ' + styles.isCompleted;
  };

  componentWillUnmount() {
    this.props.userStore.resetUserProfile();
  }

  checkHasValue(val) {
    return !val || val.length === 0 ? '' : styles.isCompleted;
  }
  changeFullName(value) {
    const userProfile = { ...this.state.userProfile };
    userProfile.full_name = value;
    this.setState({ userProfile });
  }
  changeRole(value) {
    const userProfile = { ...this.state.userProfile };
    userProfile.role = value;
    this.setState({ userProfile });
  }
  changeClass(groupName, groupId) {
    const userProfile = { ...this.state.userProfile };
    userProfile.group_id = groupId;
    userProfile.group_name = groupName;
    this.setState({ userProfile });
  }
  changeEmail(value) {
    const userProfile = { ...this.state.userProfile };
    userProfile.email = value;
    this.setState({ userProfile });
  }

  changeLinkedinUsername(value) {
    const userProfile = { ...this.state.userProfile };
    userProfile.linkedin_username = value;
    this.setState({ userProfile });
  }

  resetProfile = () => {
    let userProfile = { ...this.state.userProfile };
    userProfile = this.props.userStore.resetProfile;
    this.setState({ userProfile });

  }
  render() {
    const { full_name
      , group_name, role,
      email, linkedin_username, group_id,
    } = this.state.userProfile;
    return (
      <div className={styles.profilePage}>
        <Link to="/users">
          <input className={styles.backButton} type="button" value="&#8249;" />
        </Link>
        <h1>Edit Profile</h1>
        <div className={styles.profileContainer}>
          <div
            className={
              styles.matDiv + ' ' + this.checkHasValue(full_name)
            }
          >
            <label htmlFor="first-name" className={styles.matLabel}>
              First Name
            </label>
            <input
              className={styles.matInput}
              type="text"
              value={full_name}
              id="first-name"
              onChange={(e) => this.changeFullName(e.target.value)}
              onFocus={e => {
                this.setInputActive(e);
              }}
            />
          </div>

          <div
            className={
              styles.small + ' ' + styles.matDiv + ' ' + styles.isCompleted
            }
          >
            <label htmlFor="role" className={styles.matLabel}>
              Role
            </label>
            <select
              value={role}
              id="role"
              className={styles.matInput}
              onChange={e => {
                this.changeRole(e.target.value);
              }}
            >
              <option value="guest" disabled hidden>
                Role
              </option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </select>
          </div>

          <div
            className={
              styles.small + ' ' + styles.matDiv + ' ' + styles.isCompleted
            }
          >
            <label htmlFor="Class" className={styles.matLabel}>
              Class
            </label>
            <select
              className={styles.matInput}
              value={
                '{"name":"' +
                group_name +
                '","id":"' +
                group_id +
                '"}'
              }
              onChange={(e) => { this.changeClass(JSON.parse(e.target.value).name, +JSON.parse(e.target.value).id); }}
            >
              {this.state.classOptions.map(group => {
                const optionValue = `{"name":"${group.group_name}","id":"${
                  group.id
                  }"}`;
                return (
                  <option key={group.id} value={optionValue}>
                    {group.group_name}
                  </option>
                );
              })}
            </select>
          </div>
          <div
            className={
              styles.matDiv + ' ' + this.checkHasValue(email)
            }
          >
            <label htmlFor="e-mail" className={styles.matLabel}>
              e-mail
            </label>
            <input
              type="email"
              className={styles.matInput}
              //The default props 'value' of an input should be an empty string
              value={email || ''}
              id="e-mail"
              onChange={e => { this.changeEmail(e.target.value); }}
              onFocus={e => {
                this.setInputActive(e);
              }}
            />
          </div>

          <div
            className={
              styles.matDiv +
              ' ' +
              this.checkHasValue(linkedin_username)
            }
          >
            <label htmlFor="linkedin-username" className={styles.matLabel}>
              linkedin username
            </label>
            <input
              type="text"
              value={linkedin_username || ''}
              className={styles.matInput}
              id="linkedin_username"
              onChange={e => { this.changeLinkedinUsername(e.target.value); }}
              onFocus={e => {
                this.setInputActive(e);
              }}
            />
          </div>
          <Link to="/users">
            <input
              className={styles.saveProfile}
              type="submit"
              value="Save"
              onClick={() => this.props.userStore.saveProfile(this.state.userProfile, 'loadUsers')}
            />
          </Link>
          <input
            className={styles.resetProfile}
            type="reset"
            value="Reset"
            onClick={this.resetProfile}
          />
        </div>
      </div>
    );
  }
}
Profile.wrappedComponent.propTypes = {
  userStore: PropTypes.object.isRequired,
};