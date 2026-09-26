# Approve Sai Vista media by email

Service account: **saivistaculturalcommittee@gmail.com**. Use this account for the Drive folder, Apps Script deployment, Gmail authorization and five-minute trigger. Changing a code setting does not transfer Google ownership or grant permissions.

Prepared reviewers:
- paresh218@gmail.com
- freakypriyank@gmail.com

Either reviewer can approve or reject. Two approvals are not required. Photos retain their existing immediate-publication behaviour; this workflow is for uploaded videos and Instagram Reel links.

## One-time activation

1. Sign in as **saivistaculturalcommittee@gmail.com** and open the **Sai Vista Photo Gallery** Apps Script project. The setup will refuse to run from a different account.
2. Replace **Code.gs** with the complete updated **photo-gallery.gs** and save. Keep `PHOTO_FOLDER_ID` unchanged.
3. At the top of the editor, select **setupMediaEmailApprovals** from the function dropdown and click **Run**.
4. Review and accept Google's requested Gmail, Drive and trigger permissions. Gmail access lets this script send review emails and search the deployment owner's mailbox for replies; Google grants broader Gmail access than this narrow workflow uses. Only the owner authorizes this; the two reviewers need no Apps Script access.
5. Run the setup function again if authorization interrupted it. It avoids adding a duplicate trigger for that account.
6. Select **Deploy → Manage deployments → Edit → New version → Deploy**. Keep the same `/exec` URL. No new website endpoint is needed.

The setup installs a five-minute background check in Apps Script. It also checks existing pending submissions immediately. Emails come from the deployment owner's Google account, and replies must return to that mailbox. Do not set up a second owner's trigger.

### If the project currently belongs to another Google account

Remove the old `processMediaEmailApprovals` trigger while signed into that account before activating the new one. Give the committee account access to the existing gallery folder and transfer ownership if appropriate, preserving the folder and its existing files. Create a committee-owned Apps Script project with the updated code, set `PHOTO_FOLDER_ID` to the existing folder, run setup while signed into the committee account, and deploy with **Execute as Me**. A new project/deployment gives a new `/exec` URL: send it back so the website configuration can be updated. Do not assume editing the email in code transfers the existing deployment. Google authorization must be completed by the account holder.

## What the reviewers do

1. Receive an email titled `[SV-MEDIA …] Sai Vista media review`.
2. Open the included link and review the video or Reel. Pending uploaded videos are shared privately with the two reviewer addresses so they can watch while signed in. The public cannot see the pending item.
3. Reply to that email with **APPROVE** as the first line to publish, or **REJECT** to decline. Keep the subject unchanged. Use the exact word alone, then put any notes on later lines.
4. Usually within the next five-minute check, the first valid reply processed decides the outcome. Both reviewers receive a confirmation email. At high volume, notifications and decisions can take longer because each run processes up to ten queued items and Google applies quotas.
5. Approved items become available in the website media feed. Visitors can click **Refresh videos** or reload to see them. Video approval makes that individual Drive video viewable by anyone with its link; Instagram playback remains subject to Instagram restrictions.

## Handling mistakes or issues

- Replies from other addresses, drafts, quoted commands, changed request codes and expired requests are ignored. Incoming replies must pass Gmail sender authentication; the owner's own sent reply is checked against their Sent mailbox.
- Each request has an unguessable code and expires after 30 days. Keep review emails private. For an expired request, use the manual `approveSelectedMedia` procedure in MEDIA_SETUP.md.
- The first decision is final for the email workflow. A later reply cannot overturn it. To withdraw an approved video, set its Drive sharing to Restricted and move it to Trash. Trash the metadata file to remove an approved Reel.
- Rejected items remain private for the committee and are not displayed. Identical Reel resubmissions are blocked; the committee can remove the rejected record if it wants to allow a fresh submission.
- If mail is delayed, inspect **Executions** and **Triggers** in Apps Script and the owner's Gmail Sent folder. Email quota/Drive-sharing failures are logged and retried. Rare delivery failures can cause a duplicate notification, but repeated replies do not re-publish a decided item.
- Stop automated checks by deleting the `processMediaEmailApprovals` trigger. This does not remove submissions or undo approvals.

## Verification after activation

Submit a permitted test Reel, confirm both recipients receive the request, reply APPROVE from one account, then refresh the website after processing. Repeat with REJECT on a different item and confirm it remains absent. No real emails have been sent and no live approvals have been made during local development; activation and this end-to-end check remain necessary.

Google documentation: https://developers.google.com/apps-script/guides/triggers/installable and https://developers.google.com/apps-script/reference/gmail/gmail-app
