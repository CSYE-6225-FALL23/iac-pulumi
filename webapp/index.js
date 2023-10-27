const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");

const config = new pulumi.Config();

// Import variables.
const project = config.require("project");
const vpcCidrBlock = config.require("vpcCidrBlock");
const maxAllowedAzs = config.require("maxAllowedAzs");
const myIp = config.require("myIp");
const serverPort = config.require("serverPort");

const ec2KeyPair = config.require("ec2Keypair");
const ec2InstanceType = config.require("ec2InstanceType");

const ebsVolumeSize = config.require("ebsVolumeSize");
const ebsVolumeType = config.require("ebsVolumeType");

const rdsDB = config.require("rdsDB");
const rdsUser = config.require("rdsUser");
const rdsPassword = config.require("rdsPassword");

const appUser = config.require("appUser");
const appPassword = config.require("appPassword");
const appGroup = config.require("appGroup");

var azs = [];

/**
 * Generate dynamic tags for resources.
 * @param {string} resourceName - Name of resource.
 * @param {string[]} additionalTags - Additional tags.
 * @returns {object} - An object of tags.
 */
const generateTags = (resourceName, additionalTags = []) => {
  const baseTags = {
    Name: `${project}-${pulumi.getStack()}-${resourceName}`,
  };
  const tags = { ...baseTags, ...additionalTags };
  return tags;
};

const loadAvailabilityZones = async () => {
  try {
    const zones = await aws.getAvailabilityZones({
      state: "available",
    });
    azs = zones.names.slice(0, Math.min(zones.names.length, maxAllowedAzs));
  } catch (error) {
    console.error(error);
  }
};

const getAmi = async () => {
  try {
    const ami = await aws.ec2.getAmi({
      owners: ["253323498692"],
      mostRecent: true,
      filters: [
        {
          name: "name",
          values: ["webapp-ami-*"],
        },
        {
          name: "state",
          values: ["available"],
        },
      ],
    });
    return ami;
  } catch (error) {
    console.error(error);
  }
};

const main = async () => {
  //Load AZs for a given region
  await loadAvailabilityZones();
  const ami = await getAmi();

  // Create a new VPC.
  const myVpc = new aws.ec2.Vpc(generateTags("vpc").Name, {
    cidrBlock: vpcCidrBlock,
    defaultRouteTableAssociation: false,
    tags: generateTags("vpc"),
  });

  // Create an Internet Gateway and attach it to the VPC.
  const myInternetGateway = new aws.ec2.InternetGateway(
    generateTags("ig").Name,
    {
      vpcId: myVpc.id,
      tags: generateTags("ig"),
    },
  );

  // Create a public subnets in given availability zone.
  const publicSubnets = azs.map((az, index) => {
    return new aws.ec2.Subnet(generateTags(`pub-sn-${index}`).Name, {
      vpcId: myVpc.id,
      availabilityZone: az,
      cidrBlock: `10.0.${index}.0/24`,
      tags: generateTags(`pub-sn-${index}`),
    });
  });

  // Create a private subnets in given availability zone.
  const privateSubnets = azs.map((az, index) => {
    return new aws.ec2.Subnet(generateTags(`pvt-sn-${index}`).Name, {
      vpcId: myVpc.id,
      availabilityZone: az,
      cidrBlock: `10.0.${index + azs.length}.0/24`,
      tags: generateTags(`pvt-sn-${index}`),
    });
  });

  // Create a public route table and associate it with public subnets.
  const publicRouteTable = new aws.ec2.RouteTable(
    generateTags("pub-rtable").Name,
    {
      vpcId: myVpc.id,
      routes: [
        {
          cidrBlock: "0.0.0.0/0",
          gatewayId: myInternetGateway.id,
        },
      ],
      tags: generateTags("pub-rtable"),
    },
  );

  publicSubnets.forEach((subnetId, index) => {
    const subnetRouteTableAssociation = new aws.ec2.RouteTableAssociation(
      `pubRouteTableAssoc-${index}`,
      {
        subnetId: subnetId,
        routeTableId: publicRouteTable.id,
      },
    );
  });

  // Create a private route table and associate it with private subnets.
  const privateRouteTable = new aws.ec2.RouteTable(
    generateTags("pvt-rtable").Name,
    {
      vpcId: myVpc.id,
      tags: generateTags("pvt-rtable"),
    },
  );

  privateSubnets.forEach((subnetId, index) => {
    const subnetRouteTableAssociation = new aws.ec2.RouteTableAssociation(
      `pvtRouteTableAssoc-${index}`,
      {
        subnetId: subnetId,
        routeTableId: privateRouteTable.id,
      },
    );
  });

  const routeTableAssociation = new aws.ec2.RouteTableAssociation(
    "routeTableAssociation",
    {
      gatewayId: myInternetGateway.id,
      routeTableId: privateRouteTable.id,
    },
  );

  const ec2SecurityGroup = new aws.ec2.SecurityGroup(
    generateTags("ec2-sg").Name,
    {
      name: generateTags("ec2-sg").Name,
      description: "Allow incoming SSH and TCP",
      vpcId: myVpc.id,
      ingress: [
        {
          protocol: "tcp",
          fromPort: 22,
          toPort: 22,
          cidrBlocks: [myIp],
        },
        {
          protocol: "tcp",
          fromPort: 443,
          toPort: 443,
          cidrBlocks: ["0.0.0.0/0"],
        },
        {
          protocol: "tcp",
          fromPort: 80,
          toPort: 80,
          cidrBlocks: ["0.0.0.0/0"],
        },
        {
          protocol: "tcp",
          fromPort: serverPort,
          toPort: serverPort,
          cidrBlocks: ["0.0.0.0/0"],
        },
        {
          protocol: "tcp",
          fromPort: serverPort,
          toPort: serverPort,
          ipv6CidrBlocks: ["::/0"],
        },
      ],
    },
  );

  const dbSecurityGroup = new aws.ec2.SecurityGroup(
    generateTags("db-sg").Name,
    {
      name: generateTags("db-sg").Name,
      description:
        "Allow access to the PostgreSQL database from the Web Server",
      dependsOn: [ec2SecurityGroup],
      vpcId: myVpc.id,
      ingress: [
        {
          protocol: "tcp",
          fromPort: 5432,
          toPort: 5432,
          securityGroups: [ec2SecurityGroup.id],
        },
      ],
    },
  );

  const allowOutboundToDBRule = new aws.ec2.SecurityGroupRule(
    "AllowOutboundToDB",
    {
      type: "egress",
      fromPort: 5432,
      toPort: 5432,
      protocol: "tcp",
      sourceSecurityGroupId: dbSecurityGroup.id,
      securityGroupId: ec2SecurityGroup.id,
    },
  );

  const dbSubnetGroup = new aws.rds.SubnetGroup(
    generateTags("db-pvt-sng").Name,
    {
      description: "Subnet group for the RDS instance",
      subnetIds: [privateSubnets[0].id, privateSubnets[1].id],
      name: generateTags("db-pvt-sng").Name,
    },
  );

  const dbParameterGroup = new aws.rds.ParameterGroup(
    generateTags("db-pg").Name,
    {
      name: generateTags("db-pg").Name,
      family: "postgres15",
    },
  );

  // const dbInstance = new aws.rds.Instance(generateTags("db").Name, {
  //   identifier: generateTags("db").Name,
  //   dbName: rdsDB,
  //   allocatedStorage: 20,
  //   instanceClass: "db.t3.micro",
  //   parameterGroupName: dbParameterGroup.name,
  //   engine: "postgres",
  //   username: rdsUser,
  //   password: rdsPassword,
  //   dbSubnetGroupName: dbSubnetGroup.name,
  //   publiclyAccessible: false,
  //   multiAz: false,
  //   availabilityZone: "us-east-1a",
  //   vpcSecurityGroupIds: [dbSecurityGroup.id],
  //   skipFinalSnapshot: true,
  //   deleteAutomatedBackups: true,
  //   deletionProtection: false,
  //   tags: generateTags("db"),
  // });

  const ec2Role = new aws.iam.Role("WebappEC2Role", {
    name: "WebappEC2Role",
    assumeRolePolicy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Action: "sts:AssumeRole",
          Effect: "Allow",
          Principal: {
            Service: "ec2.amazonaws.com",
          },
        },
      ],
    }),
  });

  const cloudWatchPolicy = new aws.iam.PolicyAttachment(
    "CloudWatchAgentPolicyAttachment",
    {
      policyArn: "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy",
      roles: [ec2Role.name],
    },
  );

  const instanceProfile = new aws.iam.InstanceProfile("WebappInstanceProfile", {
    name: "MyInstanceProfile",
    role: ec2Role.name,
  });

  const ec2Instance = new aws.ec2.Instance(generateTags("ec2").Name, {
    ami: ami.id,
    iamInstanceProfile: instanceProfile.name,
    instanceType: ec2InstanceType,
    keyName: ec2KeyPair,
    subnetId: publicSubnets[0].id,
    disableApiTermination: false,
    vpcSecurityGroupIds: [ec2SecurityGroup.id],
    associatePublicIpAddress: true,
    userData: pulumi.interpolate`#!/bin/bash

# Set your app-specific values
RDS_ENDPOINT=${dbInstance.endpoint}
RDS_DB=${rdsDB}
RDS_USER=${rdsUser}
RDS_PASSWORD=${rdsPassword}
SERVER_PORT=${serverPort}
APP_USER=${appUser}
APP_USER_PASSWORD=${appPassword}
APP_GROUP=${appGroup}
APP_DIR="/var/www/webapp"

# Create the user
sudo useradd -m $APP_USER
sudo groupadd $APP_GROUP

# Change user password
echo "$APP_USER:$APP_USER_PASSWORD" | sudo chpasswd

# Add the user to the group
sudo usermod -aG $APP_GROUP $APP_USER

sudo touch "$APP_DIR/server/.env.prod"

# Set directory permissions
sudo chown -R $APP_USER:$APP_GROUP $APP_DIR
sudo find $APP_DIR -type d -exec chmod 750 {} \\;
sudo find $APP_DIR -type f -exec chmod 640 {} \\;
sudo chmod 650 $APP_DIR/server/index.js
sudo chmod 660 $APP_DIR/server/.env.prod

#Add env variables
echo $APP_USER_PASSWORD | su -c "echo SERVER_PORT=$SERVER_PORT >> $APP_DIR/server/.env.prod" $APP_USER
echo $APP_USER_PASSWORD | su -c "echo POSTGRES_DB=$RDS_DB >> $APP_DIR/server/.env.prod" $APP_USER
echo $APP_USER_PASSWORD | su -c "echo POSTGRES_USER=$RDS_USER >> $APP_DIR/server/.env.prod" $APP_USER
echo $APP_USER_PASSWORD | su -c "echo POSTGRES_PASSWORD=$RDS_PASSWORD >> $APP_DIR/server/.env.prod" $APP_USER
echo $APP_USER_PASSWORD | su -c "echo POSTGRES_URI=$(echo $RDS_ENDPOINT | cut -d':' -f 1) >> $APP_DIR/server/.env.prod" $APP_USER
echo $APP_USER_PASSWORD | su -c "echo FILEPATH=$APP_DIR/deployment/user.csv >> $APP_DIR/server/.env.prod" $APP_USER

# Permission for systemd file
sudo chown $APP_USER:$APP_GROUP /lib/systemd/system/webapp.service
sudo chmod 550 /lib/systemd/system/webapp.service

# Permission for log file
sudo touch /var/log/webapp.log
sudo chown $APP_USER:$APP_GROUP /var/log/webapp.log
sudo chmod 550 /var/log/webapp.log

# Start cloudwatch service
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/bin/config.json -s

# Start systemd service
sudo systemctl daemon reload
sudo systemctl enable webapp.service
sudo systemctl start webapp.service
    `,
    rootBlockDevice: {
      volumeSize: ebsVolumeSize,
      volumeType: ebsVolumeType,
      deleteOnTermination: true,
    },
    tags: generateTags("ec2"),
  });

  // Export the VPC ID and other resources if needed.
  return {
    vpcId: myVpc.id,
    internetGatewayId: myInternetGateway.id,
    publicSubnetIds: publicSubnets.map((subnet) => subnet.id),
    privateSubnetIds: privateSubnets.map((subnet) => subnet.id),
    ec2InstanceIp: ec2Instance.publicIp,
    dbEndpoint: dbInstance.endpoint,
  };
};

const outputs = main();
exports.vpc = outputs.then((obj) => obj.vpcId);
exports.internetGateway = outputs.then((obj) => obj.internetGatewayId);
exports.publicSubnets = outputs.then((obj) => obj.publicSubnetIds);
exports.privateSubnets = outputs.then((obj) => obj.privateSubnetIds);
exports.ec2Ip = outputs.then((obj) => obj.ec2InstanceIp);
exports.dbEndpoint = outputs.then((obj) => obj.dbEndpoint);
