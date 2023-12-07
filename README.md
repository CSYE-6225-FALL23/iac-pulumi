# Infrastructure as Code for a webapp

AWS Infrastructure as code using pulumi for AWS and GCP

## Table of Contents

- [IAC for webapp](#iac-webapp)
  - [Table of Contents](#table-of-contents)
  - [Infrastructure Diagram](#infrastructure-diagram)
  - [Prerequisites](#prerequisites)
  - [Getting Started](#getting-started)
    - [Installation](#installation)
    - [Configuration](#configuration)
  - [Architecture Components](#architecture-components)
  - [Networking](#networking)
  - [Usage](#usage)
  - [License](#license)

# Infrastructure Diagram
<img src="./webapp/assets/architecture_diagram.png" width="1000" height="600">

# Architecture Components
## Route53
- Create

## Prerequisites
The following versions were the latest when I started the project. You could upgrade them as per requirements.
- Node.js v18.x
- Pulumi v3.87.0
- AWS CLI v2.13.24
- AWS Account
- GCP Account

## Getting Started

To get started with IAC with pulumi:

### Installation

```bash
# Create a new pulumi project in js
pulumi new aws-javascript

# Create a stck
pulumi stack init <stackname>

# Set aws profile and region
pulumi config set aws:profile <profilename>
pulumi config set aws:region <your-region>
```

### Configuration
Create a profile.<stackname>.yaml or append the following variables:
```yaml
config:
  aws:profile: dev
  aws:region: us-east-1
  gcp:project: csye6225-dev-406102
  gcp:zone: us-east1
  webapp:accessKeys: "./accesskeys.json"
  webapp:appGroup: "csye6225"
  webapp:appPassword: "csye6225"
  webapp:appUser: "csye6225"
  webapp:ebsVolumeSize: "25"
  webapp:ebsVolumeType: "gp2"
  webapp:ec2InstanceType: t2.micro
  webapp:ec2Keypair: csye6225-dev-key
  webapp:gcsBucketName: "csye6225-webapp"
  webapp:hostedZone: "dev.skudli.xyz"
  webapp:maxAllowedAzs: "3"
  webapp:myIp: "0.0.0.0/0"
  webapp:project: webapp
  webapp:rdsDB: "csye6225"
  webapp:rdsPassword: "csye6225"
  webapp:rdsUser: "csye6225"
  webapp:serverPort: "8000"
  webapp:vpcCidrBlock: 10.0.0.0/16
  webapp:dynamodbTableName: "webapp-dev-dynamodb"
  webapp:emailApiKey: "ffb00eeafe5baf861de1102fe3fe9b58-5d2b1caa-94c15328"
```

## Usage
```bash
# View pulumi configuration
pulumi config

# Switch stack
pulumi stack select <stackname>

# View all stacks
pulumi stack ls

# Create resources
pulumi up

# Destroy resources
pulumi destroy
```

## SSL Certificates
```bash
aws acm import-certificate --certificate fileb://ssl\certificate.crt --private-key fileb://ssl\private.key --certificate-chain fileb://ssl\ca_bundle.crt --region us-east-1 --profile demo
```

## Networking
Our project is set up within a VPC to isolate and secure resources. Subnets are strategically defined to control traffic and enhance network segmentation.

### Subnets
Subnets

## Snapshots
When you create an Amazon Machine Image (AMI) using Packer with Amazon Elastic Block Store (EBS) storage, Amazon EC2 automatically creates an EBS snapshot. This snapshot is essentially a point-in-time copy of the EBS volume attached to the instance used to create the AMI. They are managed by AWS and are stored in a highly durable and redundant manner within the AWS infrastructure. They are not directly exposed as objects in an S3 bucket, and users don't interact with the underlying storage mechanism. Below are some of the use cases.

> [!IMPORTANT]
> EBS snapshots are stored within the Amazon EBS service itself and costs $0.05/GB-month.

Some properties of EBS backup are as follows:
- Data Persistence - capture the state of the volumes at the time of the AMI creation.
- Reproducibility - provide a way to recreate the state of the EBS volume in the future. If the volume or the instance is terminated, the snapshot allows you to restore or create a new volume with the same data and configurations.
- Incremental Backups - snapshots are incremental, meaning that only the blocks that have changed since the last snapshot are stored.

> [!TIP]
> You could also configure the EC2 without a block storage
```bash
"block_device_mappings": [
  {
    "device_name": "/dev/sda1",
    "no_device": true
  }
]
```

## Cleanup
Running `pulumi destroy` will cleanup all the resources created by Pulumi.

> [!IMPORTANT]
> Note that **not** all services are created/deleted by Pulumi automatically. Some are created manually and others by AWS for us. Deleting these resources is our responsibility to avoid charges.

Services which may charge you
- Route53 - Delete the records followed by the hosted zone
- Snapshots - EBS snapshots standard storage costs

Other resources which do not incur cost
- SSL Certificates - Public SSL/TLS certificates provisioned through AWS Certificate Manager are free
- AMI's - AMI's itself are not chargable but the EBS associated with it will be

## License
This project is licensed under the MIT License. See the [LICENSE](.\LICENSE) file for details.
