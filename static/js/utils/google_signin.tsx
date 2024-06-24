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

import {
  AuthError,
  GoogleAuthProvider,
  OAuthCredential,
  signInWithPopup,
  User,
  UserCredential,
} from "firebase/auth";
import React from "react";

import { auth } from "./firebase";

interface GoogleSignInProps {
  scopes: string[];
  onSignIn: (user: User, credential: OAuthCredential) => void;
}

export function GoogleSignIn(props: GoogleSignInProps): JSX.Element {
  const signInWithGoogle = (): void => {
    const provider = new GoogleAuthProvider();
    for (const scope of props.scopes) {
      provider.addScope(scope);
    }
    signInWithPopup(auth, provider)
      .then((result: UserCredential) => {
        props.onSignIn(
          result.user,
          GoogleAuthProvider.credentialFromResult(result)
        );
      })
      .catch((error: AuthError) => {
        // Handle errors here
        console.error(error);
      });
  };
  return <button onClick={signInWithGoogle}>Sign In with Google</button>;
}
