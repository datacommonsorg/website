/**
 * Copyright 2023 Google LLC
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

import AppFooter from "../shared/AppFooter";
import AppHeader from "../shared/AppHeader";
import AppLayout from "../shared/AppLayout";
import AppLayoutContent from "../shared/AppLayoutContent";

const Topics = () => {
  return (
    <AppLayout>
      <AppHeader selected="topics" />
      <AppLayoutContent>
        <h3 style={{ margin: "2rem auto", textAlign: "center" }}>
          Topics coming soon...
        </h3>
      </AppLayoutContent>
      <AppFooter />
    </AppLayout>
  );
};
export default Topics;
