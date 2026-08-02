# infra

Terraform for addons.dosaki.net: a Lambda behind CloudFront, reached through a
Lambda Function URL locked to CloudFront with OAC.

State lives in `s3://tf-state-addons-dosaki-net`, versioned, with S3-native
locking (`use_lockfile`). Create that bucket once before the first `init`.

Two values are set out of band and are never in state or in git:

    # The App private key. Terraform ignores changes to this parameter's value.
    aws ssm put-parameter --name /addons-dosaki-net/app-private-key \
      --type SecureString --overwrite --value file://aia.private-key.pem

    # The installation id, passed at apply time.
    terraform apply -var app_installation_id=<id>

The ACM certificate is a data source. It already exists in us-east-1, covers
`*.dosaki.net`, and is shared with the other dosaki.net sites - this stack must
not manage or replace it.
