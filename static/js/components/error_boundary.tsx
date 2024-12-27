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
 * Container to catch errors within a tree of components. This prevents
 * errors in one component from disabling the entire page. Only catches errors
 * that occur during rendering, in lifecycle methods or in constructors, i.e.
 * does not catch async errors.
 */

import React, { ErrorInfo } from "react";

interface ErrorBoundaryPropType {
  // Custom element to display when there's an error instead of the default.
  customError?: React.ReactNode;
}

interface ErrorBoundaryStateType {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryPropType,
  ErrorBoundaryStateType
> {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Display fallback UI
    this.setState({ hasError: true });
    console.log(error, info);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <>
          {" "}
          {this.props.customError ? (
            this.props.customError
          ) : (
            <div className="alert alert-warning" role="alert">
              Error rendering this component.
            </div>
          )}
        </>
      );
    }
    return this.props.children;
  }
}
