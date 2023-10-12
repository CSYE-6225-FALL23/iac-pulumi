const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");

const config = new pulumi.Config();

// Import variables.
const project = config.require("project");
const vpcCidrBlock = config.require("vpcCidrBlock");
const numerOfAzs = config.require("numberOfAzs");

var azs = []

/**
 * Generate dynamic tags for resources.
 * @param {string} resourceName - Name of resource.
 * @param {string[]} additionalTags - Additional tags.
 * @returns {object} - An object of tags.
 */
function generateTags(resourceName, additionalTags = []) {
  const baseTags = {
    Name: `${project}-${pulumi.getStack()}-${resourceName}`,
  };
  const tags = { ...baseTags, ...additionalTags };
  return tags;
}

const loadAvailabilityZones = async () => {
  try {
    const zones = await aws.getAvailabilityZones({
      state: "available",
    });
    azs = zones.names.slice(0, Math.min(zones.names.length, numerOfAzs));
  } catch (error) {
    console.error(error);
  }
}

(async () => {
  //Load AZs for a given region
  await loadAvailabilityZones();
  
  // Create a new VPC.
  const myVpc = new aws.ec2.Vpc(generateTags('vpc').Name, {
    cidrBlock: vpcCidrBlock,
    defaultRouteTableAssociation: false,
    tags: generateTags('vpc'),
  });

  // Create an Internet Gateway and attach it to the VPC.
  const myInternetGateway = new aws.ec2.InternetGateway(generateTags('ig').Name, {
    vpcId: myVpc.id,
    tags: generateTags('ig'),
  });

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
      cidrBlock: `10.0.${index+azs.length}.0/24`,
      tags: generateTags(`pvt-sn-${index}`),
    });
  });

  // Create a public route table and associate it with public subnets.
  const publicRouteTable = new aws.ec2.RouteTable(generateTags('pub-rtable').Name, {
    vpcId: myVpc.id,
    routes: [
      {
        cidrBlock: "0.0.0.0/0",
        gatewayId: myInternetGateway.id,
      },
  ],
    tags: generateTags('pub-rtable'),
  });

  publicSubnets.forEach((subnetId, index) => {
    const subnetRouteTableAssociation = new aws.ec2.RouteTableAssociation(`pubRouteTableAssoc-${index}`, {
      subnetId: subnetId,
      routeTableId: publicRouteTable.id,
    });
  });

  // Create a private route table and associate it with private subnets.
  const privateRouteTable = new aws.ec2.RouteTable(generateTags('pvt-rtable').Name, {
    vpcId: myVpc.id,
    tags: generateTags('pvt-rtable'),
  });

  privateSubnets.forEach((subnetId, index) => {
    const subnetRouteTableAssociation = new aws.ec2.RouteTableAssociation(`pvtRouteTableAssoc-${index}`, {
      subnetId: subnetId,
      routeTableId: privateRouteTable.id,
    });
  });

  const routeTableAssociation = new aws.ec2.RouteTableAssociation("routeTableAssociation", {
      gatewayId: myInternetGateway.id,
      routeTableId: privateRouteTable.id,
  });

  // Export the VPC ID and other resources if needed.
  exports.vpcId = myVpc.id;
  exports.InternetGatewayId = myInternetGateway.id;
  exports.publicSubnetIds = publicSubnets.map((subnet) => subnet.id);
  exports.privateSubnetIds = privateSubnets.map((subnet) => subnet.id);
})()