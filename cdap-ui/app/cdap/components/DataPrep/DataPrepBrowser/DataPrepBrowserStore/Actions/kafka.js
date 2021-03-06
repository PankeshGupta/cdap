/*
 * Copyright © 2018 Cask Data, Inc.
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

import {setActiveBrowser, setError} from './commons';
import DataPrepBrowserStore, {Actions as BrowserStoreActions} from 'components/DataPrep/DataPrepBrowser/DataPrepBrowserStore';
import NamespaceStore from 'services/NamespaceStore';
import MyDataPrepApi from 'api/dataprep';
import {objectQuery} from 'services/helpers';

const setKafkaAsActiveBrowser = (payload) => {
  let {kafka} = DataPrepBrowserStore.getState();

  if (kafka.loading) { return; }

  let {id: connectionId} = payload;

  DataPrepBrowserStore.dispatch({
    type: BrowserStoreActions.SET_KAFKA_CONNECTION_ID,
    payload: {
      connectionId
    }
  });
  setActiveBrowser(payload);
  setKafkaInfoLoading();

  let namespace = NamespaceStore.getState().selectedNamespace;

  let params = {
    namespace,
    connectionId
  };

  MyDataPrepApi.getConnection(params)
    .subscribe((res) => {
      let info = objectQuery(res, 'values', 0);

      MyDataPrepApi.listTopics({namespace}, info)
        .subscribe((topics) => {
          setKafkaProperties({
            info,
            topics: topics.values,
            connectionId: params.connectionId
          });
        }, (err) => {
          setError(err);
        });
    }, (err) => {
      setError(err);
    });
};

const setKafkaProperties = (payload) => {
  DataPrepBrowserStore.dispatch({
    type: BrowserStoreActions.SET_KAFKA_PROPERTIES,
    payload
  });
};

const setKafkaInfoLoading = () => {
  DataPrepBrowserStore.dispatch({
    type: BrowserStoreActions.SET_KAFKA_LOADING,
    payload: {
      loading: true
    }
  });
};

export {
  setKafkaAsActiveBrowser,
  setKafkaProperties,
  setKafkaInfoLoading
};
