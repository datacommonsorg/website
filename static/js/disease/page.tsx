/**
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Main component for bio.
 */

import React from "react";

interface PagePropType {
  dcid: string;
  nodeName: string;
}

export class Page extends React.Component<PagePropType> {
  constructor(props: PagePropType) {
    super(props);
  }

  componentDidMount(): void {
    // TOOD: add data fetching here.
  }

  render(): JSX.Element {
    return <div> Disease Data</div>;
  }
}
