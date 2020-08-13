import argparse
import smtplib
from google.cloud import secretmanager


arg_parser = argparse.ArgumentParser()
arg_parser.add_argument(
  '--email', help='Receiver email', type=str, required=True)
arg_parser.add_argument(
  '--short_sha', help='Commit short sha', type=str, required=True)
args = vars(arg_parser.parse_args())


port = 587  # For SSL
sender_email = 'datcom.ci@gmail.com'
gmail_smtp = 'smtp.gmail.com'
url_prefix = 'https://staging.datacommons.org/dev/screenshot/'


message = """\
Subject: Please check the screenshot from your PR

The screenshots can be found in this url: {}/{}
""".format(url_prefix, args['short_sha'])

secret_client = secretmanager.SecretManagerServiceClient()
secret_name = secret_client.secret_version_path('datcom-ci', 'gmailpw', '1')
secret_response = secret_client.access_secret_version(secret_name)
password = secret_response.payload.data.decode('UTF-8')

session = smtplib.SMTP(gmail_smtp, port)
session.starttls()
session.login(sender_email, password)
session.sendmail(sender_email, args['email'], message)
session.quit()
