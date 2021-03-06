/*
 * Copyright © 2016-2018 Cask Data, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

import PropTypes from 'prop-types';

import React, { Component } from 'react';
import {objectQuery} from 'services/helpers';
import {MyAppApi} from 'api/app';
import ExploreTablesStore from 'services/ExploreTables/ExploreTablesStore';
import {fetchTables} from 'services/ExploreTables/ActionCreator';
import OverviewMetaSection from 'components/Overview/OverviewMetaSection';
import T from 'i18n-react';
import isEmpty from 'lodash/isEmpty';
import NamespaceStore from 'services/NamespaceStore';
import BreadCrumb from 'components/BreadCrumb';
import AppDetailedViewTab from 'components/AppDetailedView/Tabs';
import uuidV4 from 'uuid/v4';
import {Redirect} from 'react-router-dom';
import FastActionToMessage from 'services/fast-action-message-helper';
import EntityIconMap from 'services/entity-icon-map';
import capitalize from 'lodash/capitalize';
import Page404 from 'components/404';
import PlusButton from 'components/PlusButton';
import Helmet from 'react-helmet';
import OverviewHeader from 'components/Overview/OverviewHeader';
import {MyMetadataApi} from 'api/metadata';
import EntityType from 'services/metadata-parser/EntityType';
import {SCOPES} from 'services/global-constants';
import {Theme} from 'services/ThemeHelper';
require('./AppDetailedView.scss');

export default class AppDetailedView extends Component {
  constructor(props) {
    super(props);
    this.state = {
      entityDetail: objectQuery(this.props.location, 'state', 'entityDetail') || {
        programs: [],
        datasets: [],
        streams: [],
        routeToHome: false,
        selectedNamespace: null,
        successMessage: null,
        notFound: false
      },
      loading: true,
      isInvalid: false,
      previousPathName: null
    };
  }
  componentWillMount() {
    let selectedNamespace = NamespaceStore.getState().selectedNamespace;
    let {namespace, appId} = this.props.match.params;
    let previousPathName = objectQuery(this.props.location, 'state', 'previousPathname') ||
      `/ns/${selectedNamespace}?overviewid=${appId}&overviewtype=application`;
    if (!namespace) {
      namespace = NamespaceStore.getState().selectedNamespace;
    }
    ExploreTablesStore.dispatch(
      fetchTables(namespace)
    );
    this.setState({
      previousPathName
    });
    if (this.state.entityDetail.programs.length === 0) {
      const metadataParams = {
        namespace,
        entityType: 'apps',
        entityId: appId,
        scope: SCOPES.SYSTEM
      };
      MyMetadataApi
        .getProperties(metadataParams)
        .combineLatest(
          MyAppApi.get({
            namespace,
            appId
          })
        )
        .subscribe(
          res => {
            let entityDetail = res[1];
            let properties = res[0];
            if (isEmpty(entityDetail)) {
              this.setState({
                notFound: true,
                loading: false
              });
            }
            let programs = entityDetail.programs.map(prog => {
              prog.uniqueId = uuidV4();
              return prog;
            });
            let datasets = entityDetail.datasets.map(dataset => {
              dataset.entityId = {
                dataset: dataset.name,
                entity: EntityType.dataset
              };
              dataset.uniqueId = uuidV4();
              return dataset;
            });
            let streams = entityDetail.streams.map(stream => {
              stream.entityId = {
                stream: stream.name,
                entity: EntityType.stream
              };
              stream.uniqueId = uuidV4();
              return stream;
            });
            entityDetail.streams = streams;
            entityDetail.datasets = datasets;
            entityDetail.programs = programs;
            entityDetail.properties = properties;
            entityDetail.id = appId;
            entityDetail.type = 'application';
            this.setState({
              entityDetail,
              loading: false
            });
          },
          err => {
            if (err.statusCode === 404) {
              this.setState({
                notFound: true,
                loading: false
              });
            }
          }
      );
    }
    if (this.state.entityDetail.name) {
      this.setState({
        loading: false
      });
    }
  }
  goToHome(action) {
    if (action === 'delete') {
      let selectedNamespace = NamespaceStore.getState().selectedNamespace;
      this.setState({
        selectedNamespace,
        routeToHome: true
      });
    }
    let successMessage;
    if (action === 'setPreferences') {
      successMessage = FastActionToMessage(action, {entityType: capitalize(this.state.entityDetail.type)});
    } else {
      successMessage = FastActionToMessage(action);
    }
    this.setState({
      successMessage
    }, () => {
      setTimeout(() => {
        this.setState({
          successMessage: null
        });
      }, 3000);
    });
  }
  render() {
    if (this.state.notFound) {
      return (
        <Page404
          entityType="application"
          entityName={this.props.match.params.appId}
        />
      );
    }
    if (this.state.loading) {
      return (
        <div className="app-detailed-view">
          <div className="fa fa-spinner fa-spin fa-3x"></div>
        </div>
      );
    }
    let previousPaths = [{
      pathname: this.state.previousPathName,
      label: T.translate('commons.back')
    }];
    let artifactName = objectQuery(this.state, 'entityDetail', 'artifact', 'name');
    let icon = EntityIconMap[artifactName] || EntityIconMap['application'];
    return (
      <div className="app-detailed-view">
        <Helmet
          title={T.translate('features.AppDetailedView.Title', {
            appId: this.props.match.params.appId,
            productName: Theme.productName,
          })}
        />
        <div className="bread-crumb-wrapper">
          <BreadCrumb
            previousPaths={previousPaths}
            currentStateIcon={icon}
            currentStateLabel={T.translate('commons.application')}
          />
          <PlusButton mode={PlusButton.MODE.resourcecenter} />
        </div>
        <OverviewHeader successMessage={this.state.successMessage} />
        <OverviewMetaSection
          entity={this.state.entityDetail}
          onFastActionSuccess={this.goToHome.bind(this)}
          onFastActionUpdate={this.goToHome.bind(this)}
          showFullCreationTime={true}
        />
        <AppDetailedViewTab
          params={this.props.match.params}
          pathname={this.props.location.pathname}
          entity={this.state.entityDetail}
        />
        {
          this.state.routeToHome ?
            <Redirect to={`/ns/${this.state.selectedNamespace}`} />
          :
            null
        }
      </div>
    );
  }

}

AppDetailedView.propTypes = {
  entity: PropTypes.object,
  match: PropTypes.object,
  location: PropTypes.object
};
