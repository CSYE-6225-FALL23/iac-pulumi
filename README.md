# Infrastructure as Code for a webapp

AWS Infrastructure as code using pulumi for AWS

## Table of Contents

- [IAC for webapp](#iac-webapp)
  - [Table of Contents](#table-of-contents)
  - [Prerequisites](#prerequisites)
  - [Getting Started](#getting-started)
    - [Installation](#installation)
    - [Configuration](#configuration)
  - [Usage](#usage)
  - [License](#license)

## Prerequisites

- Node.js 18.x or higher
- Pulumi

## Getting Started

To get started with IAC with pulumi:

### Installation

```bash
# Create a new pulumi project in js
pulumi new aws-javascript

# Set aws profile and region
pulumi config set aws:profile <profilename>
pulumi config set aws:region <your-region>
```

### Configuration
Create a profile.<stackname>.yaml (if it doesn't exist) file to configure the following variables:
```yaml
config:
  webapp:project: webapp
  aws:profile: dev
  aws:region: us-west-1
  webapp:numberOfAzs: 3
  webapp:vpcCidrBlock: 10.0.0.0/16
```

## Usage
```bash
# View pulumi configuration
pulumi config

# Create a new stack
pulumi stack init <stackname>

# Switch stack
pulumi stack select <stackname>

# View all stacks
pulumi stack ls

# Create resources
pulumi up

# Destroy resources
pulumi destroy
```

## License
This project is licensed under the MIT License. See the [LICENSE](.\LICENSE) file for details.