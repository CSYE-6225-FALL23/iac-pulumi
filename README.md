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
- AWS Account and CLI v2.13.24
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
## Command to import certificates to AWS
```bash
aws acm import-certificate --certificate fileb://ssl\certificate.crt --private-key fileb://ssl\private.key --certificate-chain fileb://ssl\ca_bundle.crt --region us-east-1 --profile demo
```

## License
This project is licensed under the MIT License. See the [LICENSE](.\LICENSE) file for details.
