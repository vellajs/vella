Operations
----------

> 💡 Most contributors will not need this level of access.

If you believe you need access to any of the following you can request access in a Github issue, but access is almost entirely restricted to core contributors for security reasons.

##### Overview:

- We use AWS for static site hosting via S3
- We use Cloudflare for DNS + SSL Certificates
- We use namecheap.com for the domain hosting.
- We store secrets in the Vella keybase organization.
- Once you've configured keybase locally, you can deploy via `bash run ci deploy`

##### Getting Started:

For local deployments, just ensure you have access to the keybase organization.  Everything else is automated.
For CI deployments, the keybase paper key needs to be added to the repository secrets in settings.

To deploy simply run:

```bash
bash run ci deploy
```

##### Adding secrets to keybase

If you are a member of the keybase organization, simply clone the repo and add an item to the env file then push.
The resulting commit will be safely encrypted.

```bash
git clone keybase://team/vella/secrets vella-secrets
```

##### AWS Access

You should never need access to the AWS console, but all admins have access and you can request an invite.  If you have keybase access you'll have access to the S3 buckets after pulling down the repo.  From there you can run debugging commands e.g.:

```bash
aws s3 vellajs.org ls
```