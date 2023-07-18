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
import React from "react";

/**
 * NL Chat sidebar showing query history
 */
export function Sidebar() {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <a href="/nl" className="chat-link">
          <span className="material-icons">add_icon</span>
          <span className="chat-link-text">New Chat</span>
        </a>
      </div>
      <div className="sidebar-recent">
        <h5>Recent</h5>
        <ul>
          <li>
            <a href="/nl/#q=Which%20countries%20emit%20the%20most%20greenhouse%20gases?">
              <span className="material-icons">chat_bubble_outline_icon</span>
              <span className="text">
                Which countries emit the most Greenhouse gases?
              </span>
            </a>
          </li>
          <li>
            <a href="/nl/#q=What%20are%20the%20primary%20crops%20grown%20in%20California?">
              <span className="material-icons">chat_bubble_outline_icon</span>
              <span className="text">
                What are the primary crops grown in California?
              </span>
            </a>
          </li>
        </ul>
      </div>
      <div className="sidebar-footer">
        Powered by{" "}
        <a
          href="https://datacommons.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          datacommons.org
        </a>
      </div>
    </div>
  );
}
