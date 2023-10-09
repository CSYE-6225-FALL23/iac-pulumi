# DB Health Status Check

A healthz API to check Postgres database health status

## Table of Contents

- [Healthz App](#db-health-status-check)
  - [Table of Contents](#table-of-contents)
  - [Prerequisites](#prerequisites)
  - [Getting Started](#getting-started)
    - [Installation](#installation)
    - [Configuration](#configuration)
  - [Usage](#usage)
  - [Development](#development)
  - [Testing](#testing)
  - [Deployment](#deployment)
  - [Documentation](#documentation)
  - [License](#license)

## Prerequisites

- Node.js 18.x or higher
- Docker 20.x or higher
- Git

## Getting Started

To get started with Node.js healthz API, follow these steps:

### Installation

```bash
# Clone the repository
git clone https://github.com/CSYE-6225-FALL23/csye_6225.git
cd csye_6225

# Install DB dependencies
cd .\database
npm install

# Install server dependencies
cd .\server
npm install
```

### Configuration
Create a .env file in .\server and configure the following environment variables:
```env
SERVER_PORT=8000
```

Create a .env file in .\server and .\database and configure the following environment variables:
```env
POSTGRES_DB='postgres'
POSTGRES_USER='postgres'
POSTGRES_PASSWORD='postgres'
POSTGRES_URI='localhost'
```

## Usage
- Start the development server using a scipt: 
  - .\deployment\start.bat
- Access the API at http://localhost:8000

## Testing
To run tests, use the following command inside a package:
```bash
npm test
```
## License
This project is licensed under the MIT License. See the [LICENSE](.\LICENSE) file for details.