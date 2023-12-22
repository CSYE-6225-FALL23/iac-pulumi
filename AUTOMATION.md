# Automation with Github Actions

## Introduction
This documentation outlines the step-by-step process for running integration tests and building an Amazon Machine Image (AMI) using GitHub Actions. These processes are crucial to ensure the application functions as expected and to create a reliable AMI for deployment. There are 3 parts in the automation workflows
- Integration Testing
- Steps to build AMI
- Post Build Steps

## Integration Testing
Integration tests are designed to verify that different parts of your system work well together. In this case, we will be using Chai-HTTP to test a database health check endpoint in a Node.js application.

#### Install PostgreSQL
```bash
sudo apt-get install postgresql
sudo service postgresql start
```

#### Create Database and Change Password
> [!IMPORTANT]
> Store sensitive information in Github secrets

```bash
sudo -u postgres psql -c "CREATE DATABASE ${{ secrets.POSTGRES_DB }} OWNER ${{ secrets.POSTGRES_USER }};"
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD ${{ secrets.POSTGRES_PASSWORD }};"
```

#### Run Integration Tests
This step involves running your integration tests to ensure that the application behaves as expected in the intended environment. Upon passing of all tests, we can proceed to AMI creation.
```bash
# Install Dependencies
cd ./database && npm install
cd ../server && npm install

# Run Integration Tests
cd ./server && npm run test
```

## Steps to Build AMI
It's important to check the formatting and make sure the packer file is valid. Only if the above checks pass, we proceed to build the AMI.

#### Packer format check
```bash
# Packer format command with a check flag returns boolean
if ! packer fmt -check .; then
  echo "Packer formatting check failed. Run 'packer fmt' to fix the formatting issues."
  exit 1
else
  echo "Packer format check passed"
fi
```

#### Packer validation check
```bash
# Packer validate command to ensure correct syntax
if ! packer validate -var "zip_file_path=../../webapp.zip" .; then
  echo "Packer validation check failed."
  exit 1
else
  echo "Packer validation check passed"
fi
```

#### Build AMI
AMI takes care of essential installations and setup required for the application to run. It includes
- Installing CloudWatch agent and NodeJS
- Copy the Zip file and extract to a known location
- Give necessary permissions for files/folders
- Start the app using systemd (We need to restart the app after `pulumi up` to incorporate environment variables)

> We have the packer file in `deployment/ami` folder inside the `webapp` repository. The packer build command builds the AMI in our AWS account configured in the file.

> [!IMPORTANT]
> Variables passed to packer command are stored as either Github secrets or variables.

##### Prerequisites
- Packer installed (version 1.7.4)
- AWS credentials saved with required permissions
- Valid Packer template file ([webapp_ami.pkr.hcl](https://github.com/CSYE-6225-FALL23/webapp/blob/main/deployment/ami/webapp_ami.pkr.hcl))

```bash
cd deployment/ami
packer init ./
packer build \
  -var "aws_access_key=${{ secrets.AWS_ACCESS_KEY }}" \
  -var "aws_secret_access_key=${{ secrets.AWS_SECRET_ACCESS_KEY }}" \
  -var "source_ami=${{ vars.SOURCE_AMI }}" \
  -var "ami_region=${{ vars.AMI_REGION }}" \
  -var "zip_file_path=${{ vars.APP_ZIP_PATH }}" \
  -var "ssh_username=${{ vars.SSH_USERNAME }}" \
  -var "subnet_id=${{ vars.SUBNET_ID }}" \
  -var "instanceType=${{ vars.INSTANCE_TYPE }}" \
  -var "ebsVolumeSize=${{ vars.EBS_VOLUME_SIZE }}" \
  -var "ebsVolumeType=${{ vars.EBS_VOLUME_TYPE }}" \
  -var "webappDestinationFolder=${{ vars.WEBAPP_DESTINATION_PATH }}" .
```

## Post Build Steps
The launch template configured using Pulumi should be updated with the latest AMI ID. This template is saved as a new version which is then used by the auto-scaling-group to launch EC2 instances.

#### Update Launch Template
```bash
# Create Launch Template Version
launch_template_name="${{ vars.WEBAPP_PROJECT_NAME }}-${{ vars.WEBAPP_DEV_ACCOUNT }}-lt"
aws ec2 create-launch-template-version \
    --launch-template-name $launch_template_name \
    --launch-template-data file://updated_launch_template.json
```

#### Refresh Auto-Scaling-Group
```bash
# Set Latest Launch Template Version as Default
launch_template_name="${{ vars.WEBAPP_PROJECT_NAME }}-${{ vars.WEBAPP_DEV_ACCOUNT }}-lt"
aws ec2 modify-launch-template \
    --launch-template-name $launch_template_name \
    --default-version ${{ steps.template.outputs.latest_version }} \
    --output json
```

> [!TIP]
> The entire workflow can be found at [build-ami.yml](https://github.com/CSYE-6225-FALL23/webapp/blob/main/.github/workflows/biuld-ami.yml)