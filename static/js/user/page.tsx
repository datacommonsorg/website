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
 * User Page.
 */

import axios from "axios";
import React, { useState } from "react";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";

export interface PagePropType {
  info: Map<string, string>;
  newUser: boolean;
}

export interface PageStateType {
  data: string;
}

export function Page(props: PagePropType): JSX.Element {
  const [modalOpen, setModalOpen] = useState(false);
  const [importName, setImportName] = useState(String);
  const [dataFiles, setDataFiles] = useState<File[]>([]);

  function onUpload(): void {
    const formData = new FormData();
    for (const f of dataFiles) {
      formData.append("files", f, f.name);
    }
    formData.append("importName", importName);
    axios.post("/user/upload", formData).then(() => {
      setModalOpen(false);
    });
  }

  function onAddFile(files: FileList): void {
    for (let i = 0; i < files.length; i++) {
      const file = files.item(i);
      setDataFiles((existing) => [...existing, file]);
    }
  }

  function onEditImportName(text: string): void {
    setImportName(text);
  }

  return (
    <div>
      Hello {props.info["name"]}!
      <br />
      {props.newUser && (
        <div>
          Welcome to Data Commons Import Portal. We have created a profile for
          you. Please add your imports.
        </div>
      )}
      <div id="imports">
        <div>All Imports</div>
        <Button
          id="add-import-open-modal-button"
          size="sm"
          color="light"
          onClick={() => setModalOpen(true)}
        >
          Add Import
        </Button>
        <Modal
          isOpen={modalOpen}
          className={"user-modal"}
          style={{ maxWidth: "90vw" }}
        >
          <ModalHeader toggle={() => setModalOpen(false)}>
            Add Import
          </ModalHeader>
          <ModalBody>
            <label htmlFor="import-name">Import name: </label>
            <input
              type="text"
              id="import-name"
              name="import-name"
              onChange={(event) => onEditImportName(event.target.value)}
            ></input>
            <span>Add CSV: </span>
            <input
              type="file"
              accept=".csv"
              onChange={(event) => onAddFile(event.target.files)}
            />
            <span>Add TMCF: </span>
            <input
              type="file"
              accept=".tmcf"
              onChange={(event) => onAddFile(event.target.files)}
            />
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onClick={onUpload}>
              Upload
            </Button>
          </ModalFooter>
        </Modal>
      </div>
      <a href="/user/auth/logout">
        <button>Logout</button>
      </a>
    </div>
  );
}
