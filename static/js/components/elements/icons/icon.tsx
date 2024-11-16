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
  //The SVG icon to be rendered by the icon component
  icon: (props: SVGProps<SVGSVGElement>) => ReactElement;
  //The color of the SVG icon. If a color is not provided, this will be the
  //color of the containing element.
  color?: string;
  //the size of the icon. If not provided, this will default to 1em.
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
      stroke={color}
      {...props}
    />
  );
};
