# Copyright 2021 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""Authentication related routes"""

import json

# Third party libraries
from flask import Blueprint, redirect, request, url_for, current_app
from flask_login import (
    login_required,
    login_user,
    logout_user,
)
from oauthlib.oauth2 import WebApplicationClient
import requests

from google.cloud import storage
from google.cloud import secretmanager

# Internal imports
from routes.user import User
import lib.config as libconfig

cfg = libconfig.get_config()

secret_client = secretmanager.SecretManagerServiceClient()
secret_name = secret_client.secret_version_path(cfg.SECRET_PROJECT,
                                                'google-client-id', '1')
secret_response = secret_client.access_secret_version(name=secret_name)
GOOGLE_CLIENT_ID = secret_response.payload.data.decode('UTF-8')

secret_name = secret_client.secret_version_path(cfg.SECRET_PROJECT,
                                                'google-client-secret', '1')
secret_response = secret_client.access_secret_version(name=secret_name)
GOOGLE_CLIENT_SECRET = secret_response.payload.data.decode('UTF-8')

# Configuration
GOOGLE_DISCOVERY_URL = (
    "https://accounts.google.com/.well-known/openid-configuration")

# OAuth2 client setup
client = WebApplicationClient(GOOGLE_CLIENT_ID)

# Define blueprint
bp = Blueprint("auth", __name__, url_prefix='/auth')


@bp.route("/login")
def login():
    # Find out what URL to hit for Google login
    google_provider_cfg = get_google_provider_cfg()
    authorization_endpoint = google_provider_cfg["authorization_endpoint"]

    # Use library to construct the request for login and provide
    # scopes that let you retrieve user's profile from Google
    request_uri = client.prepare_request_uri(
        authorization_endpoint,
        redirect_uri=request.base_url + "/callback",
        scope=["openid", "email", "profile"],
    )
    return redirect(request_uri)


@bp.route("/login/callback")
def callback():
    # Get authorization code Google sent back to you
    code = request.args.get("code")

    # Find out what URL to hit to get tokens that allow you to ask for
    # things on behalf of a user
    google_provider_cfg = get_google_provider_cfg()
    token_endpoint = google_provider_cfg["token_endpoint"]

    # Prepare and send request to get tokens! Yay tokens!
    token_url, headers, body = client.prepare_token_request(
        token_endpoint,
        authorization_response=request.url,
        redirect_url=request.base_url,
        code=code,
    )
    token_response = requests.post(
        token_url,
        headers=headers,
        data=body,
        auth=(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET),
    )

    # Parse the tokens!
    client.parse_request_body_response(json.dumps(token_response.json()))

    # Now that we have tokens (yay) let's find and hit URL
    # from Google that gives you user's profile information,
    # including their Google Profile Image and Email
    userinfo_endpoint = google_provider_cfg["userinfo_endpoint"]
    uri, headers, body = client.add_token(userinfo_endpoint)
    userinfo_response = requests.get(uri, headers=headers, data=body)

    # We want to make sure their email is verified.
    # The user authenticated with Google, authorized our
    # app, and now we've verified their email through Google!
    if userinfo_response.json().get("email_verified"):
        unique_id = userinfo_response.json()["sub"]
        users_email = userinfo_response.json()["email"]
        picture = userinfo_response.json()["picture"]
        users_name = userinfo_response.json()["given_name"]
    else:
        return "User email not available or not verified by Google.", 400

    # Only allow google.com users
    if not users_email.endswith("google.com"):
        return "Only google.com users are allowed."

    # Create a user in our db with the information provided
    # by Google
    user = User(id=unique_id,
                name=users_name,
                email=users_email,
                profile_pic=picture)

    # Doesn't exist? Add to database
    if not User.get(unique_id):
        User.create(unique_id, users_name, users_email, picture)

    # Begin user session by logging the user in
    login_user(user)

    # Send user back to homepage
    return redirect(url_for("static.homepage"))


@bp.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("static.homepage"))


def get_google_provider_cfg():
    return requests.get(GOOGLE_DISCOVERY_URL).json()