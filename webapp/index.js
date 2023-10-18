const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");

const config = new pulumi.Config();

// Import variables.
const project = config.require("project");
const vpcCidrBlock = config.require("vpcCidrBlock");
const maxAllowedAzs = config.require("maxAllowedAzs");

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
          values: ['webapp-ami-*'],
        },
      ],
    });
    return ami;
  } catch (error) {
    console.error(error);
  }
};

(async () => {
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
          cidrBlocks: ["0.0.0.0/0"],
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
          fromPort: 8000,
          toPort: 8000,
          cidrBlocks: ["0.0.0.0/0"],
        },
      ],
      egress: [
        {
          fromPort: 0,
          toPort: 0,
          protocol: "-1",
          cidrBlocks: ["0.0.0.0/0"],
        },
      ],
    },
  );

  const userData =
    // <-- ADD THIS DEFINITION
    `#!/bin/bash
    cd /home/admin
    unzip webapp.zip
    cd database; npm i
    cd ../server; npm i
    npm start`;

  const ec2Instance = new aws.ec2.Instance(generateTags("ec2").Name, {
    ami: ami.id,
    instanceType: "t2.micro",
    keyName: "csye6225-dev-key",
    subnetId: publicSubnets[0].id,
    vpcSecurityGroupIds: [ec2SecurityGroup.id],
    associatePublicIpAddress: true,
    userData: userData,
    tags: generateTags("ec2"),
  });

  // Export the VPC ID and other resources if needed.
  exports.vpcId = myVpc.id;
  exports.InternetGatewayId = myInternetGateway.id;
  exports.publicSubnetIds = publicSubnets.map((subnet) => subnet.id);
  exports.privateSubnetIds = privateSubnets.map((subnet) => subnet.id);
  exports.ec2InstanceId = ec2Instance.id
})();
