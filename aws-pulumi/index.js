const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");

const config = new pulumi.Config();

// Import variables.
const project = config.require("project");
const vpcCidrBlock = config.require("vpcCidrBlock");
const publicSubnetCidrBlocks = JSON.parse(config.require("publicSubnetCidrBlocks"));
const privateSubnetCidrBlocks = JSON.parse(config.require("privateSubnetCidrBlocks"));

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
const publicSubnets = publicSubnetCidrBlocks.map((subnet) => {
  const sn = subnet[Object.keys(subnet)[0]];
  return new aws.ec2.Subnet(generateTags(`pub-sn-${Object.keys(subnet)[0]}`).Name, {
    vpcId: myVpc.id,
    availabilityZone: sn['az'],
    cidrBlock: sn['cidr'],
    tags: generateTags(`pub-sn-${Object.keys(subnet)[0]}`),
  });
});

// Create a private subnets in given availability zone.
const privateSubnets = privateSubnetCidrBlocks.map((subnet) => {
  const sn = subnet[Object.keys(subnet)[0]];
  return new aws.ec2.Subnet(generateTags(`pvt-sn-${Object.keys(subnet)[0]}`).Name, {
    vpcId: myVpc.id,
    availabilityZone: sn['az'],
    cidrBlock: sn['cidr'],
    tags: generateTags(`pvt-sn-${Object.keys(subnet)[0]}`),
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

exports.InternetGatewayId = myInternetGateway.id;
exports.publicSubnetIds = publicSubnets.map((subnet) => subnet.id);
exports.privateSubnetIds = privateSubnets.map((subnet) => subnet.id);
