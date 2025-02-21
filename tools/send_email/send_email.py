# Copyright 2024 Google LLC
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

from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import json
import logging
import smtplib

from absl import app
from absl import flags

from shared.lib.utils import get_gcp_secret

_SENDER = "datacommonsorg@gmail.com"
_SMTP_HOST = "smtp.gmail.com"
_SMTP_PORT = 587
_SECRET_PROJECT = 'datcom-ci'
_SECRET_NAME = 'gmailpw'
_SECRET_VERSION = '3'
_EMAIL_CONTENT_KEY_SUBJECT = 'subject'
_EMAIL_CONTENT_KEY_MESSAGE = 'message'
_HTML_MESSAGE_FORMAT = '<html><body>{msg}<body></html>'

FLAGS = flags.FLAGS

flags.DEFINE_string('recipient',
                    '',
                    'Email address to send email to.',
                    short_name='r')
flags.DEFINE_string(
    'email_content',
    '',
    'Filepath for a json file that specifies the subject and message to send in the email. The json file should have a "subject" field and "message" field.',
    short_name='f')


def _get_email_content(file):
  email_content = {}
  with open(file) as f:
    email_content = json.load(f)
  subject = email_content.get(_EMAIL_CONTENT_KEY_SUBJECT, '')
  message = email_content.get(_EMAIL_CONTENT_KEY_MESSAGE, '')
  return subject, message


def send_email(recipient, subject, message):
  # Prepare actual message
  msg_to_send = MIMEMultipart('alternative')
  html_message = _HTML_MESSAGE_FORMAT.format(msg=message)
  msg_to_send.attach(MIMEText(html_message, "html"))
  msg_to_send['Subject'] = subject
  msg_to_send['From'] = _SENDER
  msg_to_send['To'] = recipient

  # Get credentials for sending email
  password = get_gcp_secret(gcp_project=_SECRET_PROJECT,
                            gcp_path=_SECRET_NAME,
                            version=_SECRET_VERSION)

  # Send the email
  server = smtplib.SMTP(_SMTP_HOST, _SMTP_PORT)
  server.ehlo()
  server.starttls()
  server.login(_SENDER, password)
  server.sendmail(_SENDER, recipient, msg_to_send.as_string())
  server.close()


def main(_):
  if not FLAGS.recipient:
    logging.info("Please provide a recipient to send the email to.")
  if not FLAGS.email_content:
    logging.info("Please provide a file with the email content to send.")
  subject, message = _get_email_content(FLAGS.email_content)
  send_email(FLAGS.recipient, subject, message)


if __name__ == '__main__':
  app.run(main)
