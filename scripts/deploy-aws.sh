#!/bin/bash

AWS_HOST="samoc-dev-server.twlght.com"
AWS_ROOT="/home/ec2-user/samoc/samoc-webapp"
AWS_USER="ec2-user"
PEM_FILE="./.ssh/aws68-samoc-dev-us-west-2.pem"

if [ -z "$1" ]; then
	echo "Error: Missing environment, please specify a target environment [dev, clndev, or prod]."
	exit 0;
else
	if [ $1 = "dev" ]; then
		AWS_HOST="samoc-dev-server.twlght.com"
		PEM_FILE="./.ssh/aws68-samoc-dev-us-west-2.pem"
	elif [ $1 = "clndev" ]; then
	  AWS_HOST=o"macs-clientdev-server.twlght.com"
	  PEM_FILE="./.ssh/aws68-samoc-clientdev-us-west-2.pem"
	elif [ $1 = "qa" ]; then
	  AWS_HOST="10.59.5.201" #"samoc-qa-server.twlght.com"
	  PEM_FILE="./.ssh/aws88-samoc-qa-us-west-2.pem"
	elif [ $1 = "prod" ]; then
	  AWS_HOST="samoc-server.twlght.com"
	  PEM_FILE="./.ssh/aws69-samoc-prod-us-west-2.pem"
	fi
fi

echo "### Deploying to ${AWS_HOST} using ${PEM_FILE} ###"

SCRIPT_PATH=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
cd "$SCRIPT_PATH/.."

echo "Removing Old Dist via ssh"
ssh -i ${PEM_FILE} ${AWS_USER}@${AWS_HOST} "rm -fr ${AWS_HOST}/dist"
echo "Uploading New Dist via ssh"
rsync --progress -rave "ssh -i ${PEM_FILE}" ./dist ${AWS_USER}@${AWS_HOST}:${AWS_ROOT}
echo "Running deploy script to push to s3 via ssh"
ssh -i ${PEM_FILE} ${AWS_USER}@${AWS_HOST} "~/deploys3.sh"
