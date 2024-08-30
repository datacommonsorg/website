# Send Email Tool

To send an email using this tool, run:

```bash
./run.sh -r <RECIPIENT> -f <EMAIL_CONTENT_FILE>
```

- RECIPIENT is the email address to send the email to
- EMAIL_CONTENT_FILE is the path to the file with the email content. This should be a json file of the following format:

```
{
  'subject': <subject of the email as a string>,
  'message': <email content as a string> 
}
```