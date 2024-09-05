/**
 * Copyright 2024 Google LLC
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

import React, { ReactElement } from "react";

import { FooterMenu, Labels, Routes } from "../../shared/types/base";
import Footer from "./components/footer";

interface FooterAppProps {
  hideFullFooter: boolean;
  hideSubFooter: boolean;
  subFooterExtra: string;
  brandLogoLight: boolean;
  footerMenu: FooterMenu[];
  labels: Labels;
  routes: Routes;
}

export function FooterApp({
  hideFullFooter,
  hideSubFooter,
  subFooterExtra,
  brandLogoLight,
  footerMenu,
  labels,
  routes,
}: FooterAppProps): ReactElement {
  return (
    <Footer
      hideFullFooter={hideFullFooter}
      hideSubFooter={hideSubFooter}
      subFooterExtra={subFooterExtra}
      brandLogoLight={brandLogoLight}
      footerMenu={footerMenu}
      labels={labels}
      routes={routes}
    />
  );
}
