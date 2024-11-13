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

/**
 * A component to simplify the interface of SVGs, providing
 * simpler wrapping for commonly-used props for inline icons.
 */

import React, { ReactElement, SVGProps } from "react";

interface IconProps extends SVGProps<SVGSVGElement> {
  icon: (props: SVGProps<SVGSVGElement>) => ReactElement;
  color?: string;
  size?: number | string;
}

export const Icon = ({
  icon: IconComponent,
  color = "currentColor",
  size = "1em",
  ...props
}: IconProps): ReactElement | null => {
  return (
    <IconComponent
      width={size}
      height={size}
      fill={color}
      path={color}
      {...props}
    />
  );
};
